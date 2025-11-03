import axios from 'axios';
const apiClient = axios.create({
  // test server local IP
  baseURL: 'http://192.168.1.152:8000/api', 
  withCredentials: true,
});

export default apiClient;
