from flask import Flask, request, jsonify, Response, send_file
from flask_cors import CORS
import torch
import cv2
import numpy as np
from PIL import Image
import io
import base64
import os
import time
from ultralytics import YOLO
import logging
import threading
from queue import Queue

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

model = None
frame_queue = Queue(maxsize=10)
result_queue = Queue(maxsize=10)
processing = False
fps_counter = 0
last_fps_time = time.time()

def select_best_device():
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"

# load yolo model
def load_model():
    global model
    try:
        # Try multiple possible model paths - accounting for nested BE directories
        # From BE/Cap/backend/ to BE/model/
        possible_paths = [
            os.path.join(os.path.dirname(__file__), '..', '..', 'model', 'best.pt'),  # BE/model/best.pt
            os.path.join(os.path.dirname(__file__), '..', '..', '..', 'model', 'best.pt'),  # If there's an extra level
            os.path.join(os.path.dirname(__file__), '..', '..', '..', 'BE', 'model', 'best.pt'),  # Account for nested BE
            os.path.join(os.path.dirname(__file__), '..', '..', 'best.pt'),  # BE/best.pt (if moved to root)
        ]
        
        model_path = None
        for path in possible_paths:
            abs_path = os.path.abspath(path)
            logger.info(f"Checking model path: {abs_path}")
            if os.path.exists(abs_path):
                model_path = abs_path
                logger.info(f"✓ Found model at: {abs_path}")
                break
        
        if model_path is None:
            logger.error(f"Model file not found. Tried paths:")
            for path in possible_paths:
                abs_path = os.path.abspath(path)
                logger.error(f"  - {abs_path} (exists: {os.path.exists(abs_path)})")
            return False
        
        model = YOLO(model_path)
        device = select_best_device()
        logger.info(f"Model loaded successfully from {model_path}")
        logger.info(f"Using device: {device}")
        return True
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

# process frames
def process_frames():
    global processing, fps_counter, last_fps_time
    
    logger.info("Frame processing thread started")
    while processing:
        try:
            if not frame_queue.empty():
                frame_data = frame_queue.get_nowait()
                logger.info(f"Processing frame, queue size: {frame_queue.qsize()}")
                
                # decode frame
                image_bytes = base64.b64decode(frame_data)
                image = Image.open(io.BytesIO(image_bytes))
                frame_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                
                # apply ROI processing
                h, w = frame_cv.shape[:2]
                roi_fraction = 0.6
                side = int(min(h, w) * roi_fraction)
                cx, cy = w // 2, h // 2
                x0 = max(0, cx - side // 2)
                y0 = max(0, cy - side // 2)
                x1 = min(w, x0 + side)
                y1 = min(h, y0 + side)
                
                roi_cv = frame_cv[y0:y1, x0:x1]
                
                # run inference on ROI
                results = model.predict(
                    source=roi_cv,
                    imgsz=640,
                    conf=0.01,  # Lowered from 0.05 to 0.01 (1% confidence threshold)
                    iou=0.45, 
                    verbose=False
                )
                result = results[0]
                
                # get detections and adjust coordinates for ROI offset
                detections = []
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        roi_x1, roi_y1, roi_x2, roi_y2 = box.xyxy[0].cpu().numpy()
                        confidence = box.conf[0].cpu().numpy()
                        class_id = int(box.cls[0].cpu().numpy())
                        class_name = model.names[class_id]
                        
                        # convert ROI coordinates back to full frame coordinates
                        full_x1 = float(roi_x1 + x0)
                        full_y1 = float(roi_y1 + y0)
                        full_x2 = float(roi_x2 + x0)
                        full_y2 = float(roi_y2 + y0)
                        
                        detection = {
                            'class': class_name,
                            'confidence': float(confidence),
                            'bbox': {
                                'x1': full_x1,
                                'y1': full_y1,
                                'x2': full_x2,
                                'y2': full_y2
                            }
                        }
                        detections.append(detection)
                
                fps_counter += 1
                current_time = time.time()
                if current_time - last_fps_time >= 1.0:
                    fps = fps_counter / (current_time - last_fps_time)
                    fps_counter = 0
                    last_fps_time = current_time
                    
                    # put result in queue
                    result_data = {
                        'detections': detections,
                        'fps': fps,
                        'timestamp': current_time
                    }
                    
                    # clear old results and add new one
                    while not result_queue.empty():
                        try:
                            result_queue.get_nowait()
                        except:
                            break
                    result_queue.put_nowait(result_data)
                
        except Exception as e:
            logger.error(f"Error processing frame: {str(e)}")
            time.sleep(0.01) 

processing_thread = None

# start processing thread
def start_processing():
    global processing, processing_thread
    processing = True
    processing_thread = threading.Thread(target=process_frames, daemon=True)
    processing_thread.start()
    logger.info("Frame processing thread started")

# stop processing thread
def stop_processing():
    global processing
    processing = False
    logger.info("Frame processing thread stopped")

# health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'processing': processing,
        'queue_size': frame_queue.qsize()
    })

# start stream endpoint
@app.route('/start_stream', methods=['POST'])
def start_stream():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    start_processing()
    return jsonify({'success': True, 'message': 'Streaming started'})

# stop stream endpoint
@app.route('/stop_stream', methods=['POST'])
def stop_stream():
    stop_processing()
    return jsonify({'success': True, 'message': 'Streaming stopped'})

#  process a single frame
@app.route('/stream_frame', methods=['POST'])
def stream_frame():
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500
        
        if not processing:
            return jsonify({'error': 'Streaming not started'}), 400
        
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        image_data = data['image']
        
        try:
            frame_queue.put_nowait(image_data)
            logger.info(f"Frame added to queue, size: {frame_queue.qsize()}")
        except:
            logger.warning("Frame queue is full, skipping frame")
            pass
        
        latest_result = None
        try:
            latest_result = result_queue.get_nowait()
        except:
            pass
        
        if latest_result:
            response = {
                'success': True,
                'detections': latest_result['detections'],
                'fps': latest_result['fps'],
                'timestamp': latest_result['timestamp']
            }
        else:
            response = {
                'success': True,
                'detections': [],
                'fps': 0,
                'timestamp': time.time()
            }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in stream_frame endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

# single image prediction
@app.route('/predict', methods=['POST'])
def predict():
    try:
        if model is None:
            logger.error("Model is None - model not loaded")
            return jsonify({'success': False, 'error': 'Model not loaded. Check server logs.'}), 500
        
        data = request.get_json()
        if not data:
            logger.error("No JSON data in request")
            return jsonify({'success': False, 'error': 'No data provided'}), 400
            
        if 'image' not in data:
            logger.error("No 'image' key in request data")
            return jsonify({'success': False, 'error': 'No image data provided'}), 400
        
        image_data = data['image']
        if not image_data:
            logger.error("Image data is empty")
            return jsonify({'success': False, 'error': 'Empty image data'}), 400
        
        # Decode base64 image
        try:
            # Handle data URL format if present (data:image/jpeg;base64,...)
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            frame_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            logger.info(f"Image decoded successfully. Size: {frame_cv.shape}")
        except Exception as decode_error:
            logger.error(f"Error decoding image: {str(decode_error)}")
            import traceback
            logger.error(traceback.format_exc())
            return jsonify({'success': False, 'error': f'Failed to decode image: {str(decode_error)}'}), 400
        
        # Run prediction on FULL image (restore original behavior)
        try:
            logger.info("Starting prediction on full image...")
            results = model.predict(
                source=frame_cv,  # Use full image, not ROI
                imgsz=640,
                conf=0.25,  # Restore original 25% confidence threshold
                iou=0.45,
                verbose=False
            )
            result = results[0]
            logger.info(f"Prediction completed. Result type: {type(result)}")
        except Exception as predict_error:
            logger.error(f"Error during prediction: {str(predict_error)}")
            import traceback
            logger.error(traceback.format_exc())
            return jsonify({'success': False, 'error': f'Prediction failed: {str(predict_error)}'}), 500
        
        # Process detections (no ROI offset needed since we use full image)
        detections = []
        boxes = result.boxes
        
        if boxes is not None and len(boxes) > 0:
            logger.info(f"Found {len(boxes)} detections")
            for i, box in enumerate(boxes):
                try:
                    # Get coordinates (already in full image space)
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = float(box.conf[0].cpu().numpy())
                    class_id = int(box.cls[0].cpu().numpy())
                    class_name = model.names[class_id] if class_id < len(model.names) else f"Class_{class_id}"
                    
                    logger.info(f"Detection {i}: {class_name} with confidence {confidence:.4f} ({confidence*100:.2f}%)")
                    
                    detection = {
                        'class': class_name,
                        'confidence': confidence,
                        'bbox': {
                            'x1': float(x1),
                            'y1': float(y1),
                            'x2': float(x2),
                            'y2': float(y2)
                        }
                    }
                    detections.append(detection)
                except Exception as box_error:
                    logger.warning(f"Error processing box {i}: {str(box_error)}")
                    continue
        else:
            logger.info("No boxes detected by model")
        
        # Sort detections by confidence (highest first)
        detections.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Always return success, even if no detections
        response = {
            'success': True,
            'detections': detections,
            'count': len(detections)
        }
        
        logger.info(f"Prediction successful. Found {len(detections)} detections.")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in predict endpoint: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

# Test endpoint to verify model is working
@app.route('/test_model', methods=['GET'])
def test_model():
    """Test endpoint to verify model is loaded and can make predictions"""
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500
        
        # Create a simple test image (random noise)
        import numpy as np
        test_image = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
        
        logger.info("Running test prediction on random image...")
        results = model.predict(
            source=test_image,
            imgsz=640,
            conf=0.001,
            verbose=True
        )
        
        result = results[0]
        boxes = result.boxes
        
        return jsonify({
            'model_loaded': True,
            'model_path': str(model.ckpt_path if hasattr(model, 'ckpt_path') else 'unknown'),
            'test_detections': len(boxes) if boxes is not None else 0,
            'model_names': model.names if hasattr(model, 'names') else 'unknown'
        })
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/model/<filename>', methods=['GET'])
def download_model(filename):
    """Serve TFLite model files for edge computing"""
    try:
        # Path to your model directory - try multiple paths
        possible_dirs = [
            os.path.join(os.path.dirname(__file__), '..', '..', 'model'),  # BE/model/
            os.path.join(os.path.dirname(__file__), '..', '..', '..', 'model'),  # If extra level
            os.path.join(os.path.dirname(__file__), '..', '..', '..', 'BE', 'model'),  # Nested BE
        ]
        
        model_dir = None
        for dir_path in possible_dirs:
            abs_dir = os.path.abspath(dir_path)
            logger.info(f"Checking model directory: {abs_dir}")
            if os.path.exists(abs_dir):
                model_dir = abs_dir
                logger.info(f"✓ Found model directory at: {abs_dir}")
                break
        
        if model_dir is None:
            logger.error("Model directory not found in any expected location")
            return jsonify({'error': 'Model directory not found'}), 404
        
        model_path = os.path.join(model_dir, filename)
        
        # Debug: log the paths
        logger.info(f"Looking for model in: {model_dir}")
        logger.info(f"Full model path: {model_path}")
        logger.info(f"Model exists: {os.path.exists(model_path)}")
        
        # Security: only allow .tflite files
        if not filename.endswith('.tflite'):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Check if file exists
        if not os.path.exists(model_path):
            return jsonify({'error': f'Model file not found at {model_path}'}), 404
        
        logger.info(f"Serving model file: {filename}")
        # Use attachment_filename for compatibility with older Flask versions
        return send_file(model_path, as_attachment=True, attachment_filename=filename)
        
    except Exception as e:
        logger.error(f"Error serving model file: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    if load_model():
        logger.info("Starting real-time Flask server...")
        app.run(host='0.0.0.0', port=8001, debug=True, threaded=True)
    else:
        logger.error("Failed to load model. Server not started.")
