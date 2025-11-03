import axios from 'axios';
const apiClient = axios.create({
  // test server local IP
  baseURL: 'http://fake/api', 
  withCredentials: true,
});

export default apiClient;
