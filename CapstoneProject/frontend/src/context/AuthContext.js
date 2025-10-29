import React, { createContext, useState } from 'react';
import { Alert } from 'react-native';
import apiClient from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // --- LOGIN FUNCTION UPDATED ---
  const login = async (username, password) => { // Changed 'email' to 'username'
    try {
      // Send 'username' in the request body
      const response = await apiClient.post('/auth/login', { username, password });
      if (response.data && response.data.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Login error:', error.response ? error.response.data : error.message);
      // More specific error based on backend response if available
      const message = error.response?.data?.error || 'Invalid credentials. Please try again.';
      Alert.alert('Login Failed', message);
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await apiClient.post('/auth/register', { username, email, password });
      if (response.status === 201) {
        Alert.alert('Registration Successful', 'You can now log in.');
        return true;
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Could not create account. Please try again.');
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};