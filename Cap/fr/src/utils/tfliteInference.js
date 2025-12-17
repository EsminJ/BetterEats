/**
 * TFLite Inference Utility for Food Detection
 * Uses react-native-fast-tflite for native on-device inference
 */

import { NativeModules } from 'react-native';

// Import with error handling - try different import patterns
let Tflite = null;
let importAttempted = false;
let importError = null;

// Model state variables
let model = null;
let isModelLoaded = false;

// Model configuration constants
const MODEL_INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.25;
const IOU_THRESHOLD = 0.45;

// Food class names (adjust based on your YOLO model)
const FOOD_CLASSES = [
  'apple', 'banana', 'bread', 'carrot', 'chicken', 'egg', 'fish', 
  'meat', 'milk', 'orange', 'pasta', 'rice', 'salad', 'sandwich', 
  'soup', 'vegetable', // Add your actual class names here
];

const initializeTflite = () => {
  if (importAttempted) {
    if (importError) {
      throw importError;
    }
    return Tflite;
  }
  
  importAttempted = true;
  
  // Check NativeModules first - but don't require yet
  try {
    const availableModules = Object.keys(NativeModules || {});
    console.log('Checking NativeModules... Total:', availableModules.length);
    
    if (availableModules.length > 0) {
      console.log('First 10 modules:', availableModules.slice(0, 10));
      
      const tfliteModuleNames = availableModules.filter(name => 
        name.toLowerCase().includes('tflite') || 
        name.toLowerCase().includes('tensorflow') ||
        name.toLowerCase().includes('fasttflite') ||
        name.toLowerCase().includes('rntflite')
      );
      
      if (tfliteModuleNames.length > 0) {
        console.log('Found TFLite modules in NativeModules:', tfliteModuleNames);
      }
    }
  } catch (nativeCheckError) {
    console.warn('Error checking NativeModules:', nativeCheckError);
  }
  
  // Mark that we attempted but don't actually require yet
  // The require will happen in loadModel when actually needed
  console.warn('TFLite module require deferred - will attempt when loading model');
  Tflite = null;
  importError = new Error('TFLite module require deferred to prevent crashes');
  
  return Tflite;
};

/**
 * Check if TFLite module is available
 */
export const isTfliteAvailable = () => {
  try {
    const tflite = initializeTflite();
    return tflite !== null && typeof tflite !== 'undefined';
  } catch (error) {
    // Don't log here to avoid spam - the error is already logged in initializeTflite
    return false;
  }
};

/**
 * Load the TFLite model
 * @param {string|object} modelPath - Path to the .tflite model file or require() result
 * @returns {Promise<boolean>} Success status
 */
export const loadModel = async (modelPath) => {
  try {
    console.log('Loading TFLite model from:', modelPath);
    
    // Prepare model source first
    let modelSource;
    
    if (typeof modelPath === 'object') {
      if (modelPath.url) {
        modelSource = modelPath;
      } else {
        modelSource = modelPath;
      }
    } else if (typeof modelPath === 'string') {
      let fileUrl = modelPath;
      if (!modelPath.startsWith('file://') && !modelPath.startsWith('http://') && !modelPath.startsWith('https://')) {
        fileUrl = modelPath.startsWith('/') ? `file://${modelPath}` : `file://${modelPath}`;
      }
      modelSource = { url: fileUrl };
    } else {
      throw new Error('Invalid model path format.');
    }
    
    console.log('Model source format:', modelSource);
    
    // Use a longer delay and wrap require in multiple layers
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to require the module NOW - with maximum defensive wrapping
    let tfliteModule;
    try {
      console.log('Attempting to require react-native-fast-tflite...');
      
      // Use direct require
      const requireFn = typeof require !== 'undefined' ? require : null;
      
      if (!requireFn) {
        throw new Error('require is not available in this context');
      }
      
      // Try to require the module
      let tfliteModuleRaw;
      try {
        tfliteModuleRaw = requireFn('react-native-fast-tflite');
      } catch (requireErr) {
        // If require throws, check if it's a Metro bundler error
        if (requireErr.message && requireErr.message.includes('unknown module')) {
          throw new Error(
            'Metro bundler does not recognize react-native-fast-tflite. ' +
            'Try: 1) Stop Metro, 2) Run: npx expo start --clear, 3) Rebuild: npx expo run:android'
          );
        }
        throw requireErr;
      }
      
      // Check if the result is valid
      if (tfliteModuleRaw === undefined || tfliteModuleRaw === null) {
        throw new Error(
          'Module require returned undefined. ' +
          'Metro bundler may not recognize the module. ' +
          'Try restarting Metro with --clear flag.'
        );
      }
      
      console.log('require() succeeded! Module type:', typeof tfliteModuleRaw);
      console.log('Module keys:', Object.keys(tfliteModuleRaw || {}));
      
      // Try different export patterns - but check if tfliteModuleRaw is valid first
      if (typeof tfliteModuleRaw === 'object' && tfliteModuleRaw !== null) {
        tfliteModule = tfliteModuleRaw.default || tfliteModuleRaw.Tflite || tfliteModuleRaw;
      } else {
        tfliteModule = tfliteModuleRaw;
      }
      
      if (!tfliteModule || tfliteModule === undefined) {
        throw new Error('Module loaded but no valid export found');
      }
      
      console.log('TFLite module loaded successfully');
      Tflite = tfliteModule; // Store for future use
      
    } catch (requireError) {
      console.error('Failed to require react-native-fast-tflite:', requireError);
      console.error('Error message:', requireError.message);
      console.error('This might indicate the module is not compatible with your setup');
      throw new Error(
        `Failed to load TFLite module: ${requireError.message}. ` +
        `The module may not be compatible with Expo or your Android setup. ` +
        `Please use Server Mode instead.`
      );
    }
    
    // Use loadTensorflowModel
    if (typeof tfliteModule.loadTensorflowModel === 'function') {
      console.log('Using loadTensorflowModel...');
      
      try {
        const loadedModel = await Promise.resolve(tfliteModule.loadTensorflowModel(modelSource));
        
        console.log('Model loaded, type:', typeof loadedModel);
        if (loadedModel && typeof loadedModel === 'object') {
          try {
            console.log('Model object keys:', Object.keys(loadedModel));
          } catch (keysError) {
            // Ignore
          }
        }
        
        model = loadedModel;
        isModelLoaded = true;
        console.log('✅ TFLite model loaded successfully');
        return true;
      } catch (loadError) {
        console.error('loadTensorflowModel error:', loadError);
        throw new Error(`Failed to load model: ${loadError.message}`);
      }
    } else {
      const availableMethods = tfliteModule ? Object.keys(tfliteModule).join(', ') : 'none';
      throw new Error(
        `loadTensorflowModel not found. ` +
        `Available methods: ${availableMethods}`
      );
    }
  } catch (error) {
    console.error('Error loading TFLite model:', error);
    isModelLoaded = false;
    model = null;
    throw error;
  }
};

/**
 * Preprocess image data for YOLO model input
 * @param {Uint8Array|ArrayBuffer} imageData - Raw image pixel data (RGB)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Float32Array} Preprocessed tensor data [1, 3, 640, 640]
 */
const preprocessImage = (imageData, width, height) => {
  // YOLO expects input in format: [batch, channels, height, width]
  // Input size: 640x640, normalized to [0, 1]
  const inputSize = MODEL_INPUT_SIZE;
  const inputData = new Float32Array(1 * 3 * inputSize * inputSize);
  
  // Calculate scaling factors
  const scaleX = inputSize / width;
  const scaleY = inputSize / height;
  const scale = Math.min(scaleX, scaleY);
  
  const scaledWidth = Math.floor(width * scale);
  const scaledHeight = Math.floor(height * scale);
  const offsetX = (inputSize - scaledWidth) / 2;
  const offsetY = (inputSize - scaledHeight) / 2;
  
  // Resize and normalize image
  for (let y = 0; y < inputSize; y++) {
    for (let x = 0; x < inputSize; x++) {
      const srcX = Math.floor((x - offsetX) / scale);
      const srcY = Math.floor((y - offsetY) / scale);
      
      let r = 0, g = 0, b = 0;
      
      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const idx = (srcY * width + srcX) * 3;
        r = imageData[idx] || 0;
        g = imageData[idx + 1] || 0;
        b = imageData[idx + 2] || 0;
      }
      
      // Normalize to [0, 1] and arrange in CHW format
      const rIdx = (0 * inputSize * inputSize) + (y * inputSize) + x;
      const gIdx = (1 * inputSize * inputSize) + (y * inputSize) + x;
      const bIdx = (2 * inputSize * inputSize) + (y * inputSize) + x;
      
      inputData[rIdx] = r / 255.0;
      inputData[gIdx] = g / 255.0;
      inputData[bIdx] = b / 255.0;
    }
  }
  
  return inputData;
};

/**
 * Post-process YOLO output to get detections
 * @param {Float32Array} output - Model output tensor
 * @param {number} originalWidth - Original image width
 * @param {number} originalHeight - Original image height
 * @returns {Array} Array of detection objects
 */
const postprocessOutput = (output, originalWidth, originalHeight) => {
  const detections = [];
  
  // YOLO v11 output format: [1, num_detections, 6]
  // Format: [x_center, y_center, width, height, confidence, class_id]
  // Or: [batch, num_detections, 4+1+num_classes] for class scores
  
  // Assuming output shape is [1, num_detections, 6] or flattened
  // Adjust based on your actual model output format
  const numDetections = output.length / 6; // Adjust based on actual output shape
  
  const scaleX = originalWidth / MODEL_INPUT_SIZE;
  const scaleY = originalHeight / MODEL_INPUT_SIZE;
  
  for (let i = 0; i < numDetections; i++) {
    const baseIdx = i * 6;
    
    // Extract detection data
    const xCenter = output[baseIdx] * MODEL_INPUT_SIZE;
    const yCenter = output[baseIdx + 1] * MODEL_INPUT_SIZE;
    const boxWidth = output[baseIdx + 2] * MODEL_INPUT_SIZE;
    const boxHeight = output[baseIdx + 3] * MODEL_INPUT_SIZE;
    const confidence = output[baseIdx + 4];
    const classId = Math.round(output[baseIdx + 5]);
    
    // Filter by confidence threshold
    if (confidence < CONFIDENCE_THRESHOLD) continue;
    
    // Convert from center format to corner format
    const x1 = (xCenter - boxWidth / 2) * scaleX;
    const y1 = (yCenter - boxHeight / 2) * scaleY;
    const x2 = (xCenter + boxWidth / 2) * scaleX;
    const y2 = (yCenter + boxHeight / 2) * scaleY;
    
    detections.push({
      class: FOOD_CLASSES[classId] || `Class_${classId}`,
      confidence: confidence,
      bbox: {
        x1: Math.max(0, x1),
        y1: Math.max(0, y1),
        x2: Math.min(originalWidth, x2),
        y2: Math.min(originalHeight, y2),
      },
    });
  }
  
  // Apply Non-Maximum Suppression (NMS)
  const nmsDetections = applyNMS(detections);
  
  // Sort by confidence (highest first)
  return nmsDetections.sort((a, b) => b.confidence - a.confidence);
};

/**
 * Apply Non-Maximum Suppression to remove overlapping detections
 */
const applyNMS = (detections) => {
  if (detections.length === 0) return [];
  
  const sorted = detections.sort((a, b) => b.confidence - a.confidence);
  const kept = [];
  
  while (sorted.length > 0) {
    const current = sorted.shift();
    kept.push(current);
    
    for (let i = sorted.length - 1; i >= 0; i--) {
      const iou = calculateIOU(current.bbox, sorted[i].bbox);
      if (iou > IOU_THRESHOLD) {
        sorted.splice(i, 1);
      }
    }
  }
  
  return kept;
};

/**
 * Calculate Intersection over Union (IOU)
 */
const calculateIOU = (box1, box2) => {
  const x1 = Math.max(box1.x1, box2.x1);
  const y1 = Math.max(box1.y1, box2.y1);
  const x2 = Math.min(box1.x2, box2.x2);
  const y2 = Math.min(box1.y2, box2.y2);
  
  if (x2 < x1 || y2 < y1) return 0;
  
  const intersection = (x2 - x1) * (y2 - y1);
  const area1 = (box1.x2 - box1.x1) * (box1.y2 - box1.y1);
  const area2 = (box2.x2 - box2.x1) * (box2.y2 - box2.y1);
  const union = area1 + area2 - intersection;
  
  return intersection / union;
};

/**
 * Run inference on image data
 * @param {Uint8Array} imageData - RGB image pixel data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Promise<Object>} Detection results
 */
export const runInference = async (imageData, width, height) => {
  if (!isModelLoaded || !model) {
    throw new Error('Model not loaded. Call loadModel() first.');
  }
  
  try {
    // Preprocess image
    const inputTensor = preprocessImage(imageData, width, height);
    
    // Run inference
    const startTime = Date.now();
    
    // react-native-fast-tflite model might have a different API
    // Check what methods the model object has
    console.log('Model object type:', typeof model);
    console.log('Model object keys:', model ? Object.keys(model) : 'null');
    
    let output;
    
    // Try different ways to run inference
    if (typeof model === 'function') {
      output = await model(inputTensor);
    } else if (model.predict && typeof model.predict === 'function') {
      output = await model.predict(inputTensor);
    } else if (model.run && typeof model.run === 'function') {
      output = await model.run(inputTensor);
    } else if (model.invoke && typeof model.invoke === 'function') {
      output = await model.invoke(inputTensor);
    } else {
      // Try calling it directly as an array/tensor
      // react-native-fast-tflite might expect the input differently
      output = await model(inputTensor);
    }
    
    const inferenceTime = Date.now() - startTime;
    
    console.log(`Inference time: ${inferenceTime}ms`);
    console.log('Output type:', typeof output);
    console.log('Output:', output);
    
    // Post-process results
    // Ensure output is a Float32Array or Array
    let outputArray;
    if (output instanceof Float32Array) {
      outputArray = output;
    } else if (Array.isArray(output)) {
      outputArray = new Float32Array(output);
    } else if (output && output.data) {
      outputArray = new Float32Array(output.data);
    } else if (output && typeof output === 'object') {
      // Try to extract data from the output object
      const data = output.data || output.output || output.result || output;
      if (data instanceof Float32Array || Array.isArray(data)) {
        outputArray = data instanceof Float32Array ? data : new Float32Array(data);
      } else {
        throw new Error('Unexpected output format from model');
      }
    } else {
      throw new Error('Unexpected output format from model');
    }
    
    const detections = postprocessOutput(outputArray, width, height);
    
    return {
      detections,
      inferenceTime,
      count: detections.length,
    };
  } catch (error) {
    console.error('Error during inference:', error);
    throw error;
  }
};

/**
 * Check if model is loaded
 */
export const isModelReady = () => {
  return isModelLoaded && model !== null;
};

/**
 * Unload model and free memory
 */
export const unloadModel = () => {
  if (model) {
    // Try different cleanup methods
    if (typeof model.close === 'function') {
      model.close();
    } else if (typeof model.dispose === 'function') {
      model.dispose();
    } else if (typeof model.unload === 'function') {
      model.unload();
    }
    model = null;
    isModelLoaded = false;
    console.log('Model unloaded');
  }
};

