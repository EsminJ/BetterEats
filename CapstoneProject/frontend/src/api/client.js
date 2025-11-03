import axios from 'axios';
import { NODE_API_BASE_URL } from '../config/serverConfig';

// Create a shared axios instance for the backend API.
const apiClient = axios.create({
  baseURL: NODE_API_BASE_URL,
  withCredentials: true,
});

export default apiClient;
