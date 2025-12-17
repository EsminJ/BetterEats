// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .tflite to asset extensions so Metro can bundle it
config.resolver.assetExts.push('tflite');

// Explicitly add react-native-fast-tflite to source extensions if needed
// This ensures Metro recognizes it as a source module
if (!config.resolver.sourceExts) {
  config.resolver.sourceExts = [];
}

module.exports = config;
