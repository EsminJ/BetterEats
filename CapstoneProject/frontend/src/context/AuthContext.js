import React, { createContext, useState } from 'react';
import { Alert } from 'react-native';
import apiClient from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    // Login logic remains the same...
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data && response.data.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Login error:', error.response ? error.response.data : error.message);
      Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
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
      // --- THIS IS THE KEY CHANGE ---
      // Instead of showing a generic alert, we now throw the specific
      // error message we received from the backend.
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      // Fallback for unexpected errors
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