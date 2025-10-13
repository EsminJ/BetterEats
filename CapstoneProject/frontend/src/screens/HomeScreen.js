import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator,
  Keyboard, FlatList, Modal, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import apiClient from '../api/client';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

export default function HomeScreen({ navigation, route }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const didSelectSuggestion = useRef(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('Breakfast');
  const [quantity, setQuantity] = useState('1');

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // --- New state to manage the auto-opening of the modal ---
  const [isModalTriggered, setIsModalTriggered] = useState(false);

  // --- Effect 1: Catches the new food from the previous screen ---
  useEffect(() => {
    if (route.params?.newFood) {
      const { newFood } = route.params;
      setSearchResult(newFood); // Set the result for the UI card
      setIsModalTriggered(true); // Set the trigger to open the modal
      navigation.setParams({ newFood: null }); // Clear the param
    }
  }, [route.params?.newFood]);

  // --- Effect 2: Opens the modal only AFTER searchResult is updated ---
  useEffect(() => {
    if (isModalTriggered && searchResult) {
      handleLogMeal(); // Now, searchResult is guaranteed to be set
      setIsModalTriggered(false); // Reset the trigger
    }
  }, [isModalTriggered, searchResult]);

  // Fetches full details for a selected food
  const handleSearch = async (query) => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setIsLoading(true);
    setSearchResult(null);
    setError(null);
    setSuggestions([]);

    try {
      const response = await apiClient.get('/foods/search', { params: { query } });
      setSearchResult(response.data);
    } catch (err) {
      setError('Food not found or an error occurred. Please try again.');
      console.error('Search error:', err.response || err);
    } finally {
      setIsLoading(false);
    }
  };

  // Called when a user selects an item from the dropdown
  const handleSelectSuggestion = (suggestion) => {
    didSelectSuggestion.current = true;
    setSearchQuery(suggestion.name);
    setSuggestions([]);
    handleSearch(suggestion.name);
  };

  // This effect runs when the user types in the search bar
  useEffect(() => {
    if (didSelectSuggestion.current) {
      didSelectSuggestion.current = false;
      return;
    }
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const handler = setTimeout(() => {
      const fetchSuggestions = async () => {
        try {
          const response = await apiClient.get('/foods/suggest', { params: { query: searchQuery } });
          setSuggestions(response.data);
        } catch (err) {
          console.error('Suggestion fetch error:', err);
          setSuggestions([]);
        }
      };
      fetchSuggestions();
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Handles date changes from the picker
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };
  
  // This function now opens the modal
  const handleLogMeal = () => {
    if (!searchResult) {
      Alert.alert('No Food Selected', 'Please search for and select a food before logging a meal.');
      return;
    }
    setDate(new Date()); // Reset date to now each time modal opens
    setSelectedMealType('Breakfast');
    setQuantity('1');
    setIsModalVisible(true);
  };

  // This function sends the data to the backend
  const handleConfirmLogMeal = async () => {
    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid number greater than 0.');
      return;
    }

    try {
      const mealData = {
        foodId: searchResult._id,
        mealType: selectedMealType,
        quantity: numQuantity,
        loggedAt: date.toISOString(), // Add the selected date to the request
      };

      const response = await apiClient.post('/meallogs', mealData);

      if (response.status === 201) {
        Alert.alert('Success!', 'Your meal has been logged.');
        setIsModalVisible(false);
      }
    } catch (err) {
      console.error('Meal log error:', err.response || err);
      Alert.alert('Error', 'Could not log your meal. Please try again.');
    }
  };

  const handleLogWeight = () => {
    Alert.alert('Log Weight', 'This feature is coming soon!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Track your meals, goals, and progress</Text>

      <View>
        <TextInput
          placeholder="Search for foods/meals"
          placeholderTextColor="#929aa8"
          style={styles.search}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setSearchResult(null);
            setError(null);
          }}
          returnKeyType="search"
        />

        {suggestions.length > 0 && (
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.fdcId.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectSuggestion(item)}>
                <Text style={styles.suggestionText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            style={styles.suggestionsContainer}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      {isLoading && <ActivityIndicator size="large" color="#0eafe9" style={{ marginTop: 20 }} />}
      {error && <Text style={styles.errorText}>{error}</Text>}
      {searchResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>{searchResult.name}</Text>
          <Text style={styles.nutrientText}>Calories: {searchResult.nutrients.calories.toFixed(0)} kcal</Text>
          <Text style={styles.nutrientText}>Protein: {searchResult.nutrients.protein.toFixed(1)}g</Text>
          <Text style={styles.nutrientText}>Fat: {searchResult.nutrients.fat.toFixed(1)}g</Text>
          <Text style={styles.nutrientText}>Carbs: {searchResult.nutrients.carbohydrates.toFixed(1)}g</Text>
        </View>
      )}

      {!searchResult && !isLoading && (
        <TouchableOpacity onPress={() => navigation.navigate('AddFood')}>
          <Text style={styles.manualAddText}>Can't find your food? Add it manually.</Text>
        </TouchableOpacity>
      )}

      <View style={styles.row}>
        <Button title="Log Meal" onPress={handleLogMeal} />
        <Button title="Log Weight" onPress={handleLogWeight} />
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log "{searchResult?.name}"</Text>
            <Text style={styles.modalLabel}>Meal Type</Text>
            <View style={styles.mealTypeContainer}>
              {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[ styles.mealTypeButton, selectedMealType === type && styles.mealTypeButtonSelected ]}
                  onPress={() => setSelectedMealType(type)}
                >
                  <Text style={[ styles.mealTypeButtonText, selectedMealType === type && styles.mealTypeButtonTextSelected ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Quantity / Servings</Text>
            <TextInput
              style={styles.quantityInput}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              returnKeyType="done"
            />
            
            <Text style={styles.modalLabel}>Date & Time</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <Text style={styles.datePickerText}>{format(date, 'p, MMM d, yyyy')}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={date}
                mode="datetime"
                is24Hour={true}
                display="default"
                onChange={onChangeDate}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleConfirmLogMeal}>
                <Text style={styles.confirmButtonText}>Confirm Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Button({ title, onPress }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold' },
  subtitle: { color: '#929aa8', marginTop: 8, marginBottom: 20, fontSize: 16 },
  search: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, },
  row: { flexDirection: 'row', gap: 12, marginTop: 'auto' },
  button: { flex: 1, backgroundColor: '#0eafe9', paddingVertical: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  resultContainer: { marginTop: 20, padding: 16, backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', },
  resultTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, },
  nutrientText: { fontSize: 16, lineHeight: 24, color: '#374151', },
  errorText: { marginTop: 20, color: '#ef4444', textAlign: 'center', fontSize: 16, },
  suggestionsContainer: { position: 'absolute', top: 55, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, maxHeight: 200, zIndex: 1, },
  suggestionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', },
  suggestionText: { fontSize: 16, },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', },
  modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20, alignItems: 'stretch', },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, },
  modalLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8, },
  mealTypeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, },
  mealTypeButton: { flex: 1, marginHorizontal: 4, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  mealTypeButtonSelected: { backgroundColor: '#0eafe9', borderColor: '#0eafe9', },
  mealTypeButtonText: { fontSize: 14, color: '#374151', },
  mealTypeButtonTextSelected: { color: 'white', fontWeight: 'bold', },
  quantityInput: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 20, },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 10, },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', },
  cancelButton: { backgroundColor: '#e5e7eb', },
  cancelButtonText: { color: '#374151', fontSize: 16, fontWeight: '600', },
  confirmButton: { backgroundColor: '#0eafe9', },
  confirmButtonText: { color: 'white', fontSize: 16, fontWeight: '600', },
  datePickerText: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 25, textAlign: 'center', color: '#374151', },
  manualAddText: { textAlign: 'center', color: '#0eafe9', fontSize: 16, paddingVertical: 20, },
});