
/**
 * CameraScreenEdge - Edge Computing Version
 * Uses expo-camera with TFLite for on-device inference
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { loadModel, runInference, isModelReady, unloadModel } from '../utils/tfliteInference';
import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODEL_INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.25;

// Lazy load jpeg-js only when needed
let jpegDecoder = null;
const getJpegDecoder = () => {
  if (jpegDecoder === null) {
    try {
      jpegDecoder = require('jpeg-js');
      console.log('jpeg-js loaded successfully');
    } catch (error) {
      console.error('Failed to load jpeg-js:', error);
      jpegDecoder = false; // Mark as failed
    }
  }
  return jpegDecoder;
};

export default function CameraScreenEdge({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [detections, setDetections] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [tfliteError, setTfliteError] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  
  const cameraRef = useRef(null);
  const processingRef = useRef(false);
  const modelLoadingRef = useRef(false);

  // DISABLE automatic model loading - let user manually load it
  // Comment out or remove the useEffect for model loading (lines 67-178)
  // We'll add a manual load button instead

  /**
   * Manual model loading function - actually loads the model
   */
  const loadModelManually = async () => {
    if (modelLoadingRef.current || modelLoaded) {
      return;
    }

    modelLoadingRef.current = true;
    setLoadingModel(true);
    setTfliteError(null);

    try {
      console.log('Attempting to load TFLite model...');

      // Use Android assets path
      const androidAssetPath = 'file:///android_asset/best_yolov11_float16.tflite';
      const modelSource = { url: androidAssetPath };
      
      console.log('Loading model with source:', modelSource);
      
      // Load the model - the loadModel function will handle initialization
      const loadPromise = loadModel(modelSource);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Model loading timeout after 30 seconds')), 30000)
      );
      
      await Promise.race([loadPromise, timeoutPromise]);
      
      setModelLoaded(true);
      console.log('✅ Model loaded successfully!');
      
      Alert.alert(
        'Model Loaded',
        'TFLite model loaded successfully! You can now capture images for detection.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error loading model:', error);
      const errorMessage = error.message || 'Failed to load TFLite model';
      setTfliteError(errorMessage);
      
      Alert.alert(
        'Model Load Failed',
        `${errorMessage}\n\n` +
        `Troubleshooting:\n` +
        `1. Make sure metro.config.js includes 'tflite' in assetExts\n` +
        `2. Model file exists in Android assets folder\n` +
        `3. Rebuild the app: npx expo run:android\n` +
        `4. Check console logs for more details`,
        [
          { text: 'OK' },
          { 
            text: 'Switch to Server Mode', 
            onPress: () => navigation.navigate('Camera')
          }
        ]
      );
    } finally {
      setLoadingModel(false);
      modelLoadingRef.current = false;
    }
  };

  /**
   * Convert image URI to RGB pixel array - with lazy jpeg loading
   */
  const convertImageToRGB = async (imageUri, targetWidth, targetHeight) => {
    try {
      // Step 1: Resize image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: targetWidth, height: targetHeight } }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
      );

      console.log('Resized image URI:', manipulatedImage.uri);

      // Step 2: Read as base64
      const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 3: Lazy load jpeg decoder
      const jpeg = getJpegDecoder();
      if (!jpeg || jpeg === false) {
        throw new Error('JPEG decoder not available. Please restart the app.');
      }

      // Step 4: Convert to buffer
      let imageBuffer;
      try {
        imageBuffer = Buffer.from(base64, 'base64');
      } catch (bufferError) {
        console.error('Buffer creation error:', bufferError);
        throw new Error('Failed to create image buffer');
      }

      // Step 5: Decode JPEG
      let decodedImage;
      try {
        decodedImage = jpeg.decode(imageBuffer, {
          useTArray: true,
          colorTransform: false,
        });
      } catch (decodeError) {
        console.error('JPEG decode error:', decodeError);
        throw new Error(`Failed to decode JPEG: ${decodeError.message}`);
      }

      if (!decodedImage || !decodedImage.data) {
        throw new Error('Invalid decoded image data');
      }

      console.log('Decoded image dimensions:', decodedImage.width, 'x', decodedImage.height);

      // Step 6: Extract RGB
      const rgbData = new Uint8Array(targetWidth * targetHeight * 3);
      const maxPixels = Math.min(decodedImage.data.length / 4, targetWidth * targetHeight);
      
      for (let i = 0; i < decodedImage.data.length && i < maxPixels * 4; i += 4) {
        const pixelIndex = Math.floor(i / 4);
        if (pixelIndex < rgbData.length / 3) {
          rgbData[pixelIndex * 3] = decodedImage.data[i] || 0;
          rgbData[pixelIndex * 3 + 1] = decodedImage.data[i + 1] || 0;
          rgbData[pixelIndex * 3 + 2] = decodedImage.data[i + 2] || 0;
        }
      }

      console.log('RGB data extracted, length:', rgbData.length);

      return {
        data: rgbData,
        width: decodedImage.width,
        height: decodedImage.height,
      };
    } catch (error) {
      console.error('Error converting image to RGB:', error);
      throw new Error(`Failed to convert image to RGB: ${error.message}`);
    }
  };

  /**
   * Capture and process single image
   */
  const captureAndPredict = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    if (processingRef.current || loadingModel) {
      return;
    }

    if (!modelLoaded || !isModelReady()) {
      Alert.alert(
        'Model Not Ready',
        modelLoaded 
          ? 'Model is still initializing. Please wait...'
          : 'Model failed to load. Please check the error message or use Server Mode.',
        [
          { text: 'OK' },
          { 
            text: 'Switch to Server Mode', 
            onPress: () => navigation.navigate('Camera')
          }
        ]
      );
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setDetections([]);

    try {
      // Take a photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7, // Reduced quality to save memory
        base64: false,
        skipProcessing: false,
      });

      if (!photo || !photo.uri) {
        throw new Error('Failed to capture image');
      }

      console.log('Processing image with TFLite...');
      console.log('Image URI:', photo.uri);

      // Add timeout for image conversion
      const convertPromise = convertImageToRGB(
        photo.uri,
        MODEL_INPUT_SIZE,
        MODEL_INPUT_SIZE
      );
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Image conversion timeout')), 10000)
      );
      
      const { data: rgbData, width, height } = await Promise.race([
        convertPromise,
        timeoutPromise
      ]);

      // Add timeout for inference
      const inferencePromise = runInference(rgbData, width, height);
      const inferenceTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Inference timeout')), 15000)
      );
      
      const result = await Promise.race([inferencePromise, inferenceTimeout]);
      
      setDetections(result.detections || []);
      setInferenceTime(result.inferenceTime || 0);

      if (result.detections && result.detections.length > 0) {
        const detectedFood = result.detections[0].class;
        Alert.alert(
          'Detection Complete',
          `Found ${result.count} food(s): ${result.detections.map(d => d.class).join(', ')}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Search', 
              onPress: () => {
                navigation.navigate('MainApp', {
                  screen: 'Home',
                  params: { scannedFood: detectedFood }
                });
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'No Detections',
          'No food items detected in this image.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Capture and predict error:', error);
      Alert.alert(
        'Error', 
        `Failed to process image: ${error.message}`
      );
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing="back"
        ref={cameraRef}
      />
      
      {/* All overlays outside CameraView to fix the warning */}
      {/* Status Overlay */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Mode: Edge Computing {modelLoaded ? '✅' : '📷 Ready'}
        </Text>
        {inferenceTime > 0 && (
          <Text style={styles.statusText}>
            Inference: {inferenceTime}ms
          </Text>
        )}
        <Text style={styles.statusText}>
          Detections: {detections.length}
        </Text>
      </View>

      {/* ROI Detection Box */}
      <View style={styles.roiContainer}>
        <View style={styles.roiBox} />
        <View style={styles.roiLabel}>
          <Text style={styles.roiLabelText}>Detection Area</Text>
        </View>
      </View>

      {/* Bounding Box Overlays */}
      {detections.map((detection, index) => {
        const width = detection.bbox.x2 - detection.bbox.x1;
        const height = detection.bbox.y2 - detection.bbox.y1;
        const confidencePercent = (detection.confidence * 100).toFixed(1);
        
        return (
          <View key={index} style={styles.overlayContainer}>
            <View
              style={[
                styles.boundingBox,
                {
                  left: detection.bbox.x1,
                  top: detection.bbox.y1,
                  width: width,
                  height: height,
                }
              ]}
            />
            <View
              style={[
                styles.boundingBoxLabel,
                {
                  left: detection.bbox.x1,
                  top: Math.max(0, detection.bbox.y1 - 25),
                }
              ]}
            >
              <Text style={styles.boundingBoxText}>
                {detection.class} {confidencePercent}%
              </Text>
            </View>
          </View>
        );
      })}

      {/* Capture Controls */}
      <View style={styles.controlsContainer}>
        {/* Add Load Model Button if model not loaded */}
        {!modelLoaded && !loadingModel && (
          <TouchableOpacity 
            style={styles.loadModelButton}
            onPress={loadModelManually}
          >
            <Text style={styles.loadModelButtonText}>Load Model</Text>
          </TouchableOpacity>
        )}
        
        {loadingModel && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="white" size="large" />
            <Text style={styles.loadingText}>Loading Model...</Text>
          </View>
        )}

        {modelLoaded && (
          <TouchableOpacity 
            style={[styles.captureButton, (isProcessing || loadingModel) && styles.captureButtonDisabled]} 
            onPress={captureAndPredict}
            disabled={isProcessing || loadingModel}
          >
            {isProcessing ? (
              <View style={styles.processingIndicator}>
                <ActivityIndicator color="white" size="large" />
              </View>
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Switch Mode Button */}
      <View style={styles.switchContainer}>
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => {
            navigation.navigate('Camera');
          }}
        >
          <Text style={styles.switchButtonText}>Switch to Server Mode</Text>
        </TouchableOpacity>
      </View>

      {/* Detection Results */}
      {detections.length > 0 && (
        <View style={styles.resultsContainer}>
          <ScrollView style={styles.resultsScroll}>
            <Text style={styles.resultsTitle}>Detected Foods (Edge):</Text>
            {detections.map((detection, index) => (
              <View key={index} style={styles.detectionItem}>
                <Text style={styles.detectionText}>
                  {detection.class} ({(detection.confidence * 100).toFixed(1)}%)
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  text: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginTop: 100,
  },
  button: {
    backgroundColor: '#3f51b5',
    padding: 15,
    borderRadius: 10,
    margin: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
    maxWidth: '70%',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    marginVertical: 2,
  },
  roiContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -125 }, { translateY: -125 }],
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  roiBox: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#00FF00',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  roiLabel: {
    position: 'absolute',
    top: -30,
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roiLabelText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#00FF00',
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  boundingBoxLabel: {
    position: 'absolute',
    backgroundColor: '#00FF00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 6,
  },
  boundingBoxText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  processingIndicator: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchContainer: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  switchButton: {
    backgroundColor: 'rgba(63, 81, 181, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#3f51b5',
  },
  switchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultsContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 15,
    maxHeight: 200,
  },
  resultsScroll: {
    flexGrow: 0,
  },
  resultsTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detectionItem: {
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  detectionText: {
    fontSize: 14,
    color: 'white',
  },
  loadModelButton: {
    backgroundColor: 'rgba(63, 81, 181, 0.9)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#3f51b5',
  },
  loadModelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 14,
  },
});

