import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';

export default function AddFoodScreen({ navigation }) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');

  // Refs to control focus between TextInputs
  const caloriesRef = useRef(null);
  const proteinRef = useRef(null);
  const fatRef = useRef(null);
  const carbsRef = useRef(null);

  const handleSaveFood = async () => {
    if (!name.trim() || !calories.trim()) {
      Alert.alert('Error', 'Food name and calories are required.');
      return;
    }

    const foodData = {
      name,
      nutrients: {
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        fat: parseFloat(fat) || 0,
        carbohydrates: parseFloat(carbs) || 0,
      },
    };

    try {
      const response = await apiClient.post('/foods/custom', foodData);
      
      // --- THIS IS THE CORRECTED LINE ---
      // Navigate to the 'MainApp' screen, then to the 'Home' tab inside it, passing params.
      navigation.navigate('MainApp', {
        screen: 'Home',
        params: { newFood: response.data },
      });

    } catch (error) {
      console.error('Failed to save custom food:', error.response?.data || error);
      const errorMessage = error.response?.data?.error || 'Could not save your custom food.';
      Alert.alert('Server Error', errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView>
          <Text style={styles.title}>Add a Custom Food</Text>

          <Text style={styles.label}>Food Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g., Homemade Lasagna" returnKeyType="next" onSubmitEditing={() => caloriesRef.current.focus()} />

          <Text style={styles.label}>Calories (kcal)</Text>
          <TextInput ref={caloriesRef} style={styles.input} value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="e.g., 350" returnKeyType="next" onSubmitEditing={() => proteinRef.current.focus()} />

          <Text style={styles.label}>Protein (g)</Text>
          <TextInput ref={proteinRef} style={styles.input} value={protein} onChangeText={setProtein} keyboardType="numeric" placeholder="e.g., 25" returnKeyType="next" onSubmitEditing={() => fatRef.current.focus()} />

          <Text style={styles.label}>Fat (g)</Text>
          <TextInput ref={fatRef} style={styles.input} value={fat} onChangeText={setFat} keyboardType="numeric" placeholder="e.g., 15" returnKeyType="next" onSubmitEditing={() => carbsRef.current.focus()} />

          <Text style={styles.label}>Carbohydrates (g)</Text>
          <TextInput ref={carbsRef} style={styles.input} value={carbs} onChangeText={setCarbs} keyboardType="numeric" placeholder="e.g., 30" returnKeyType="done" onSubmitEditing={handleSaveFood} />

          <TouchableOpacity style={styles.button} onPress={handleSaveFood}>
            <Text style={styles.buttonText}>Save Food</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', margin: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8, paddingHorizontal: 20 },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    marginHorizontal: 20,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  button: {
    backgroundColor: '#0eafe9',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    margin: 20,
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});