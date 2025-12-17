# Edge Computing Setup Guide

This guide explains how to set up on-device TFLite inference using react-native-vision-camera for real-time food detection.

## Overview

The app now supports two modes:
1. **Server Mode** (CameraScreen.js) - Uses Flask server for inference
2. **Edge Mode** (CameraScreenEdge.js) - Uses on-device TFLite model

## Prerequisites

### 1. Install Dependencies

```bash
cd CapstoneProject/frontend
npm install react-native-vision-camera @tensorflow/tfjs @tensorflow/tfjs-react-native @tensorflow/tfjs-platform-react-native react-native-reanimated expo-file-system
```

### 2. iOS Setup

```bash
cd ios
pod install
```

Add to `ios/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>This app uses the camera to scan meals for food detection.</string>
```

### 3. Android Setup

Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

## TFLite Model Integration

### Option 1: Use react-native-fast-tflite (Recommended)

For native TFLite support, use `react-native-fast-tflite`:

```bash
npm install react-native-fast-tflite
```

This provides native TFLite inference without conversion.

### Option 2: Convert TFLite to TensorFlow.js

TFLite models need to be converted to TensorFlow.js format:

1. **Convert using TensorFlow.js converter:**
```bash
pip install tensorflowjs
tensorflowjs_converter --input_format=tf_lite --output_format=tfjs_graph_model best_yolov11_float16.tflite ./model_js
```

2. **Copy model files to assets:**
```bash
# Copy model.json and weight files to:
CapstoneProject/frontend/assets/models/
```

3. **Update model loading in CameraScreenEdge.js:**
```javascript
const modelPath = bundleResourceIO('./assets/models/model.json');
modelRef.current = await tf.loadGraphModel(modelPath);
```

### Option 3: Use ONNX Runtime

Alternatively, use ONNX format with `onnxruntime-react-native`:

```bash
npm install onnxruntime-react-native
```

## Model File Placement

Place your TFLite model file in one of these locations:

1. **For bundled assets:** `CapstoneProject/frontend/assets/models/best_yolov11_float16.tflite`
2. **For runtime loading:** Copy to device storage and load from `FileSystem.documentDirectory`

## Usage

### Switching Between Modes

1. **From Server Mode:** Tap "Switch to Edge Mode" button
2. **From Edge Mode:** Tap "Switch to Server Mode" button

### Testing Edge Mode

1. Ensure model is loaded (check status indicator)
2. Point camera at food
3. Detections appear in real-time
4. Check FPS and inference time in status overlay

## Performance Considerations

### Float16 vs Float32

- **Float16**: ~10-15 MB, faster inference, good accuracy ✅ Recommended
- **Float32**: ~20-25 MB, slower inference, maximum accuracy

### Optimization Tips

1. **Frame Processing:**
   - Process every 3rd frame (already implemented)
   - Adjust `frameCountRef.current % 3` for different rates

2. **Model Size:**
   - Use Float16 quantization
   - Consider INT8 for even smaller size (may reduce accuracy)

3. **Input Size:**
   - Current: 640x640 (good balance)
   - Smaller (416x416): Faster but less accurate
   - Larger (832x832): Slower but more accurate

## Troubleshooting

### Model Not Loading

1. Check file path is correct
2. Verify model file exists
3. Check console for error messages
4. Ensure TensorFlow.js is initialized: `await tf.ready()`

### Slow Performance

1. Reduce frame processing rate
2. Use Float16 model
3. Reduce input image size
4. Check device capabilities

### No Detections

1. Verify model classes match FOOD_CLASSES array
2. Adjust CONFIDENCE_THRESHOLD
3. Check preprocessing is correct
4. Verify post-processing logic

## Current Implementation Status

⚠️ **Note:** The current implementation includes placeholder code for:
- Frame to tensor conversion
- Model loading (needs actual TFLite integration)
- Post-processing (needs YOLO-specific logic)

**Next Steps:**
1. Choose integration method (fast-tflite, TensorFlow.js, or ONNX)
2. Implement actual model loading
3. Complete frame processing pipeline
4. Test and optimize performance

## References

- [react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera)
- [TensorFlow.js React Native](https://www.tensorflow.org/js/guide/platform_react_native)
- [TFLite Tutorial](https://medium.com/@amitvermaphd/integrating-tflite-models-into-a-react-native-app-for-real-time-currency-recognition-6e19006bdcbb)

