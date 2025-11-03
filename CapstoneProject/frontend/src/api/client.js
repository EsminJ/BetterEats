import axios from 'axios';
import Constants from 'expo-constants';

const config = Constants?.expoConfig?.extra || {};
const ipFromEnv = config.API_URL;
const baseURL = ipFromEnv ? `http://${ipFromEnv}:8000/api` : 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

export default apiClient;
