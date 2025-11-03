import axios from 'axios';

// IMPORTANT: If you are testing on a physical Android device,
// you must replace 'localhost' with your computer's local IP address.
// On Windows, run `ipconfig`. On Mac/Linux, run `ifconfig` or `ip addr`.
const apiClient = axios.create({
  // Use http, not https, for local development
  //not my ip
  baseURL: 'http://192.168.1.152:8000/api', 
  // This helps manage cookies for sessions
  withCredentials: true,
});

export default apiClient;
