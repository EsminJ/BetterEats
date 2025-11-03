import Constants from 'expo-constants';

const getExpoExtra = () => {
  const expoConfig = Constants?.expoConfig;
  if (expoConfig?.extra) {
    return expoConfig.extra;
  }

  const manifest = Constants?.manifest;
  if (manifest?.extra) {
    return manifest.extra;
  }

  return {};
};

const extra = getExpoExtra();

export const API_HOST =
  extra.API_URL ?? process.env.EXPO_PUBLIC_API_URL ?? '192.168.1.152';

export const NODE_API_BASE_URL =
  extra.NODE_API_BASE_URL ?? `http://${API_HOST}:8000/api`;

export const FLASK_API_BASE_URL =
  extra.FLASK_API_BASE_URL ?? `http://${API_HOST}:8001`;
