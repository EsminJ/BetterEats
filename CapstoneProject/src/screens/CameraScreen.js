import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  const [detections, setDetections] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraRef, setCameraRef] = useState(null);
  const [showROI, setShowROI] = useState(true);

  // Early returns after all hooks
  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  function toggleFlash() {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  }


  const testServerConnection = async () => {
    try {
      const response = await fetch('http://192.168.1.4:5000/health');
      const result = await response.json();
      
      Alert.alert(
        'Server Status',
        `Status: ${result.status}\nModel Loaded: ${result.model_loaded}\nProcessing: ${result.processing}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Connection Error', `Cannot connect to Flask server: ${error.message}`);
    }
  };

  const captureAndPredict = async () => {
    if (!cameraRef) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    setIsProcessing(true);
    setDetections([]);

    try {
      // Take a photo
      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: false,
      });

      // Send to Flask server
      const response = await fetch('http://192.168.1.4:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: photo.base64,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setDetections(result.detections);
        Alert.alert(
          'Detection Complete',
          `Found ${result.count} objects: ${result.detections.map(d => d.class).join(', ')}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to process image');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to capture or process image. Make sure the Flask server is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing} 
        flash={flash}
        ref={setCameraRef}
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.buttonText}> Flip </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={toggleFlash}>
            <Text style={styles.buttonText}>
              {flash === 'off' ? '🔦' : '🔆'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={() => setShowROI(!showROI)}>
            <Text style={styles.buttonText}>
              {showROI ? '📐' : '📐'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        
        {/* Capture Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={[styles.controlButton, styles.captureButton]} 
            onPress={captureAndPredict}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.controlButtonText}>📷 Scan Food</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Test Server Button */}
        <View style={styles.testContainer}>
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={testServerConnection}
          >
            <Text style={styles.testButtonText}>🔍 Test Server</Text>
          </TouchableOpacity>
        </View>

        {/* Debug Info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            Camera: {cameraRef ? 'Ready' : 'Not Ready'} | 
            Processing: {isProcessing ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.debugText}>
            Detections: {detections.length} | 
            Last Update: {new Date().toLocaleTimeString()}
          </Text>
        </View>

        {/* ROI Detection Box */}
        {showROI && (
          <View style={styles.roiContainer}>
            <View style={styles.roiBox} />
            <View style={styles.roiLabel}>
              <Text style={styles.roiLabelText}>Detection Area</Text>
            </View>
          </View>
        )}

        {/* Bounding Box Overlays */}
        {detections.map((detection, index) => {
          const width = detection.bbox.x2 - detection.bbox.x1;
          const height = detection.bbox.y2 - detection.bbox.y1;
          const confidencePercent = (detection.confidence * 100).toFixed(1);
          
          return (
            <View key={index}>
              {/* Bounding Box */}
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
              {/* Label */}
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
      </CameraView>
      
      {/* Detection Results */}
      {detections.length > 0 && (
        <View style={styles.resultsContainer}>
          <ScrollView style={styles.resultsScroll}>
            <Text style={styles.resultsTitle}>Detected Foods:</Text>
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
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    margin: 64,
    justifyContent: 'space-between',
  },
  button: {
    flex: 0.3,
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 15,
    borderRadius: 10,
  },
  backButton: {
    flex: 0.3,
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  text: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginTop: 100,
  },
  subText: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    marginHorizontal: 20,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 10,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#007AFF',
    minWidth: 120,
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    borderColor: '#007AFF',
    minWidth: 200,
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  testContainer: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    zIndex: 10,
  },
  testButton: {
    backgroundColor: 'rgba(255, 165, 0, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultsContainer: {
    position: 'absolute',
    top: 50,
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
  debugContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#00FF00',
    backgroundColor: 'transparent',
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  boundingBoxLabel: {
    position: 'absolute',
    backgroundColor: '#00FF00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    zIndex: 6,
  },
  boundingBoxText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: '#FFF',
    textShadowOffset: {
      width: 0,
      height: 0,
    },
    textShadowRadius: 1,
  },
  roiContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    width: 250,
    height: 250,
  },
  roiBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: '#FFFF00',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    borderRadius: 8,
    shadowColor: '#FFFF00',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  roiLabel: {
    position: 'absolute',
    top: -30,
    backgroundColor: 'rgba(255, 255, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roiLabelText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
