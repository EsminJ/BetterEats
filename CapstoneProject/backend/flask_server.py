from flask import Flask, request, jsonify, Response
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
    """Return the best available device"""
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"

def load_model():
    """Load the YOLO model"""
    global model
    try:
        model_path = os.path.join(os.path.dirname(__file__), '..', '..', 'best.pt')
        model = YOLO(model_path)
        device = select_best_device()
        logger.info(f"Model loaded successfully from {model_path}")
        logger.info(f"Using device: {device}")
        return True
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        return False

def process_frames():
    """Background thread to process video frames"""
    global processing, fps_counter, last_fps_time
    
    logger.info("Frame processing thread started")
    while processing:
        try:
            # Get frame from queue (non-blocking)
            if not frame_queue.empty():
                frame_data = frame_queue.get_nowait()
                logger.info(f"Processing frame, queue size: {frame_queue.qsize()}")
                
                # Decode frame
                image_bytes = base64.b64decode(frame_data)
                image = Image.open(io.BytesIO(image_bytes))
                frame_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                
                # Apply ROI processing like run_webcam.py
                h, w = frame_cv.shape[:2]
                roi_fraction = 0.6
                side = int(min(h, w) * roi_fraction)
                cx, cy = w // 2, h // 2
                x0 = max(0, cx - side // 2)
                y0 = max(0, cy - side // 2)
                x1 = min(w, x0 + side)
                y1 = min(h, y0 + side)
                
                # Extract ROI
                roi_cv = frame_cv[y0:y1, x0:x1]
                
                # Run inference on ROI with very low confidence threshold
                results = model.predict(
                    source=roi_cv,
                    imgsz=640,
                    conf=0.05,  # Very low confidence threshold - more sensitive
                    iou=0.45,   # IoU threshold for NMS
                    verbose=False
                )
                result = results[0]
                
                # Get detections and adjust coordinates for ROI offset
                detections = []
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Get coordinates relative to ROI
                        roi_x1, roi_y1, roi_x2, roi_y2 = box.xyxy[0].cpu().numpy()
                        confidence = box.conf[0].cpu().numpy()
                        class_id = int(box.cls[0].cpu().numpy())
                        class_name = model.names[class_id]
                        
                        # Convert ROI coordinates back to full frame coordinates
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
                
                # Update FPS counter
                fps_counter += 1
                current_time = time.time()
                if current_time - last_fps_time >= 1.0:
                    fps = fps_counter / (current_time - last_fps_time)
                    fps_counter = 0
                    last_fps_time = current_time
                    
                    # Put result in queue
                    result_data = {
                        'detections': detections,
                        'fps': fps,
                        'timestamp': current_time
                    }
                    
                    # Clear old results and add new one
                    while not result_queue.empty():
                        try:
                            result_queue.get_nowait()
                        except:
                            break
                    result_queue.put_nowait(result_data)
                
        except Exception as e:
            logger.error(f"Error processing frame: {str(e)}")
            time.sleep(0.01)  # Small delay to prevent busy waiting

# Start processing thread
processing_thread = None

def start_processing():
    """Start the frame processing thread"""
    global processing, processing_thread
    processing = True
    processing_thread = threading.Thread(target=process_frames, daemon=True)
    processing_thread.start()
    logger.info("Frame processing thread started")

def stop_processing():
    """Stop the frame processing thread"""
    global processing
    processing = False
    logger.info("Frame processing thread stopped")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'processing': processing,
        'queue_size': frame_queue.qsize()
    })

@app.route('/start_stream', methods=['POST'])
def start_stream():
    """Start real-time processing"""
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    start_processing()
    return jsonify({'success': True, 'message': 'Streaming started'})

@app.route('/stop_stream', methods=['POST'])
def stop_stream():
    """Stop real-time processing"""
    stop_processing()
    return jsonify({'success': True, 'message': 'Streaming stopped'})

@app.route('/stream_frame', methods=['POST'])
def stream_frame():
    """Process a single frame for real-time detection"""
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500
        
        if not processing:
            return jsonify({'error': 'Streaming not started'}), 400
        
        # Get image data from request
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        image_data = data['image']
        
        # Add frame to processing queue
        try:
            frame_queue.put_nowait(image_data)
            logger.info(f"Frame added to queue, size: {frame_queue.qsize()}")
        except:
            # Queue is full, skip this frame
            logger.warning("Frame queue is full, skipping frame")
            pass
        
        # Get latest result
        latest_result = None
        try:
            latest_result = result_queue.get_nowait()
        except:
            # No results available yet
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

@app.route('/predict', methods=['POST'])
def predict():
    """Single image prediction (keeping original functionality)"""
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500
        
        # Get image data from request
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        image_data = data['image']
        
        # Process image directly
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        frame_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Run inference with very low confidence threshold
        results = model.predict(
            source=frame_cv,
            imgsz=640,
            conf=0.05,  # Very low confidence threshold - more sensitive
            iou=0.45,   # IoU threshold for NMS
            verbose=False
        )
        result = results[0]
        
        # Process results
        detections = []
        boxes = result.boxes
        if boxes is not None:
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                confidence = box.conf[0].cpu().numpy()
                class_id = int(box.cls[0].cpu().numpy())
                class_name = model.names[class_id]
                
                detection = {
                    'class': class_name,
                    'confidence': float(confidence),
                    'bbox': {
                        'x1': float(x1),
                        'y1': float(y1),
                        'x2': float(x2),
                        'y2': float(y2)
                    }
                }
                detections.append(detection)
        
        response = {
            'success': True,
            'detections': detections,
            'count': len(detections)
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in predict endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Load model on startup
    if load_model():
        logger.info("Starting real-time Flask server...")
        app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
    else:
        logger.error("Failed to load model. Server not started.")
