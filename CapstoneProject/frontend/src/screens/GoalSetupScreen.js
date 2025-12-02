// GoalSetupScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import apiClient from '../api/client';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function GoalSetupScreen({ navigation }) {
  const route = useRoute();
  const { currentGoal } = route.params || {};
  const [goalType, setGoalType] = useState(currentGoal || '');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const handleSave = async () => {
    if (!goalType || !targetWeight || !targetDate) {
      Alert.alert('Please fill in all fields');
      return;
    }

    // Convert lbs to kg before sending (assuming user input is in lbs)
    const weightInKg = parseFloat(targetWeight) / 2.20462;

    try {
      await apiClient.put('/user/goal', {
        goal: goalType,
        targetWeight: weightInKg,
        targetDate
      });

      Alert.alert('Goal saved successfully!');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save goal');
    }
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Your Goal</Text>

      <Text style={styles.label}>Goal Type</Text>
      <View style={styles.buttonRow}>
        {['Lose Weight', 'Gain Muscle', 'Maintain'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.selectButton, goalType === type && styles.activeButton]}
            onPress={() => setGoalType(type)}
          >
            <Text style={goalType === type ? styles.activeText : styles.buttonText}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Target Weight (lbs)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="e.g. 150"
        value={targetWeight}
        onChangeText={setTargetWeight}
      />

      <Text style={styles.label}>Target Date</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={targetDate}
        onChangeText={setTargetDate}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save Goal</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 12, fontSize: 16,
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  selectButton: {
    padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3f51b5',
    flex: 1, marginHorizontal: 4, alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#3f51b5',
  },
  buttonText: { color: '#3f51b5', fontWeight: '600' },
  activeText: { color: '#fff', fontWeight: '600' },
  saveButton: {
    backgroundColor: '#3f51b5', padding: 14,
    borderRadius: 8, marginTop: 28, alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
