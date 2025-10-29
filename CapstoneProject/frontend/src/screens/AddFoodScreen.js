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

    // Use the servings structure expected by the backend
    const foodData = {
      name,
      nutrients: { // Keep sending nutrients, backend createCustomFood expects this
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        fat: parseFloat(fat) || 0,
        carbohydrates: parseFloat(carbs) || 0,
      },
    };

    try {
      const response = await apiClient.post('/foods/custom', foodData);

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
      style={{ flex: 1, backgroundColor: styles.container.backgroundColor }} // Match background
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0} // Adjust as needed
    >
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Title style matches RegisterScreen */}
          <Text style={styles.title}>Add a Custom Food</Text>

          <Text style={styles.label}>Food Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Homemade Lasagna"
            placeholderTextColor="#8c8c8c" // Consistent placeholder color
            returnKeyType="next"
            onSubmitEditing={() => caloriesRef.current?.focus()}
          />

          <Text style={styles.label}>Calories (kcal)</Text>
          <TextInput
            ref={caloriesRef}
            style={styles.input}
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            placeholder="e.g., 350"
            placeholderTextColor="#8c8c8c"
            returnKeyType="next"
            onSubmitEditing={() => proteinRef.current?.focus()}
          />

          <Text style={styles.label}>Protein (g)</Text>
          <TextInput
            ref={proteinRef}
            style={styles.input}
            value={protein}
            onChangeText={setProtein}
            keyboardType="numeric"
            placeholder="e.g., 25"
            placeholderTextColor="#8c8c8c"
            returnKeyType="next"
            onSubmitEditing={() => fatRef.current?.focus()}
          />

          <Text style={styles.label}>Fat (g)</Text>
          <TextInput
            ref={fatRef}
            style={styles.input}
            value={fat}
            onChangeText={setFat}
            keyboardType="numeric"
            placeholder="e.g., 15"
            placeholderTextColor="#8c8c8c"
            returnKeyType="next"
            onSubmitEditing={() => carbsRef.current?.focus()}
          />

          <Text style={styles.label}>Carbohydrates (g)</Text>
          <TextInput
            ref={carbsRef}
            style={styles.input}
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="numeric"
            placeholder="e.g., 30"
            placeholderTextColor="#8c8c8c"
            returnKeyType="done"
            onSubmitEditing={handleSaveFood}
          />

          {/* Button style matches RegisterScreen */}
          <TouchableOpacity style={styles.button} onPress={handleSaveFood} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Save Food</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// Updated styles for consistency
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' }, // Consistent background
  content: { paddingHorizontal: 24, paddingBottom: 40 }, // Consistent padding
  title: {
    fontSize: 28, fontWeight: '700', textAlign: 'center',
    marginBottom: 32, // Consistent margin
    marginTop: 20, // Consistent margin
    color: '#333', // Consistent color
  },
  label: {
    fontSize: 14, fontWeight: '600', color: '#333',
    marginBottom: 6,
  },
  input: {
    width: '100%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8,
    backgroundColor: '#fff', fontSize: 16, marginBottom: 16, // Consistent spacing
    borderWidth: 1, borderColor: '#ddd'
  },
  button: {
    backgroundColor: '#3f51b5', // Consistent primary color
    paddingVertical: 14, borderRadius: 8, alignItems: 'center',
    marginTop: 16, // Consistent margin
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' }, // Consistent text
});