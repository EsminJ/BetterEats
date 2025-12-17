import axios from 'axios';
import Constants from 'expo-constants';

const config = Constants?.expoConfig?.extra || {};
const ipFromEnv = config.API_URL;
const baseURL = ipFromEnv ? `http://${ipFromEnv}:8000/api` : 'http://localhost:8000/api';

console.log('=== API Configuration ===');
console.log('API_URL from env:', ipFromEnv);
console.log('API Base URL:', baseURL);
console.log('Full config:', config);
console.log('========================');

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  config => {
    console.log('API Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  error => {
    console.log('Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  response => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  error => {
    console.log('Response Error:', error.message, error.config?.url);
    return Promise.reject(error);
  }
);

export default apiClient;
