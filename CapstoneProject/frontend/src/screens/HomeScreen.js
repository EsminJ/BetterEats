import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator,
  Keyboard, FlatList, Modal, Platform, ScrollView,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import apiClient from '../api/client';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { AuthContext } from '../context/AuthContext';
import { Picker } from '@react-native-picker/picker';

export default function HomeScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const didSelectSuggestion = useRef(false);

  // States for Log Meal modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('Breakfast');
  const [quantity, setQuantity] = useState('1');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isModalTriggered, setIsModalTriggered] = useState(false);
  const [selectedServingIndex, setSelectedServingIndex] = useState(0);

  // States for Log Weight Modal
  const [isWeightModalVisible, setIsWeightModalVisible] = useState(false);
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('lbs');

  // Reset serving index when a new food is searched
  useEffect(() => {
    setSelectedServingIndex(0);
  }, [searchResult]);

  // Effect 1: Catches the new food from the AddFoodScreen
  useEffect(() => {
    if (route.params?.newFood) {
      const { newFood } = route.params;
      setSearchResult(newFood);
      setIsModalTriggered(true);
      navigation.setParams({ newFood: null });
    }
  }, [route.params?.newFood]);

  // Effect 2: Opens the log meal modal only AFTER searchResult is updated
  useEffect(() => {
    if (isModalTriggered && searchResult) {
      handleLogMeal();
      setIsModalTriggered(false);
    }
  }, [isModalTriggered, searchResult]);

  // Fetches full details for a selected food
  const handleSearch = async (query) => {
    if (!query.trim()) return;
    Keyboard.dismiss(); setIsLoading(true); setSearchResult(null); setError(null); setSuggestions([]);
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

  // Helper function to determine meal type by time
  const getMealTypeByHour = (date) => {
    const hour = date.getHours(); // 0-23

    if (hour >= 5 && hour < 11) { // 5:00 AM - 10:59 AM
      return 'Breakfast';
    } else if (hour >= 11 && hour < 17) { // 11:00 AM - 4:59 PM
      return 'Lunch';
    } else if (hour >= 17 && hour < 22) { // 5:00 PM - 9:59 PM
      return 'Dinner';
    } else { // 10:00 PM - 4:59 AM
      return 'Snack';
    }
  };

  // Called when a user selects an item from the dropdown
  const handleSelectSuggestion = (suggestion) => {
    didSelectSuggestion.current = true;
    setSearchQuery(suggestion.name); // Keep setting text bar to the name
    setSuggestions([]);
    
    const id = suggestion.fdcId ? suggestion.fdcId.toString() : suggestion._id;

    if (id) {
      handleSearch(id); 
    } else {
      handleSearch(suggestion.name);
    }
  };

  // Effect for fetching suggestions as user types
  useEffect(() => {
    if (didSelectSuggestion.current) { didSelectSuggestion.current = false; return; }
    if (searchQuery.length < 2) { setSuggestions([]); return; }
    const handler = setTimeout(() => {
      const fetchSuggestions = async () => {
        try {
          const response = await apiClient.get('/foods/suggest', { params: { query: searchQuery } });
          setSuggestions(response.data);
        } catch (err) {
          console.error('Suggestion fetch error:', err); setSuggestions([]);
        }
      }; fetchSuggestions();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handles date changes from the picker (used by both modals)
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  // Opens the Log Meal modal
  const handleLogMeal = () => {
    if (!searchResult) { Alert.alert('No Food Selected', 'Please search for a food first.'); return; }
    
    const newLogDate = new Date();
    const newMealType = getMealTypeByHour(newLogDate);
    
    setDate(newLogDate);
    setSelectedMealType(newMealType);
    setQuantity('1'); 
    setIsModalVisible(true);
  };

  // --- *** THIS FUNCTION IS MODIFIED *** ---
  // Sends Log Meal data (including selected serving) to backend
  const handleConfirmLogMeal = async () => {
    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) { Alert.alert('Invalid Quantity', 'Please enter a number greater than 0.'); return; }

    // Get the currently selected serving's data
    const selectedServing = searchResult.servings[selectedServingIndex];
    const nutrients = selectedServing.nutrients; // Get the full nutrients object

    try {
      const mealData = {
        foodId: searchResult._id,
        mealType: selectedMealType,
        quantity: numQuantity,
        loggedAt: date.toISOString(),
        
        // --- SEND ALL NUTRIENTS ---
        servingDescription: selectedServing.description,
        caloriesPerServing: nutrients.calories,
        proteinPerServing: nutrients.protein,
        fatPerServing: nutrients.fat,
        carbohydratesPerServing: nutrients.carbohydrates,
      };
      
      const response = await apiClient.post('/meallogs', mealData);
      if (response.status === 201) {
        Alert.alert('Success!', 'Your meal has been logged.');
        setIsModalVisible(false);
      }
    } catch (err) {
      console.error('Meal log error:', err.response || err);
      Alert.alert('Error', 'Could not log your meal.');
    }
  };
  // --- *** END OF MODIFICATION *** ---

  // Opens the Log Weight modal
  const handleLogWeight = () => {
    setWeight(''); setDate(new Date()); setWeightUnit('lbs'); setIsWeightModalVisible(true);
  };

  // Sends Log Weight data to backend
  const handleConfirmLogWeight = async () => {
    const numWeight = parseFloat(weight);
    if (isNaN(numWeight) || numWeight <= 0) { Alert.alert('Invalid Weight', 'Please enter a valid weight number greater than 0.'); return; }
    try {
      const weightData = { weight: numWeight, unit: weightUnit, loggedAt: date.toISOString() };
      const response = await apiClient.post('/weightlogs', weightData);
      if (response.status === 201) { Alert.alert('Success!', 'Your weight has been logged.'); setIsWeightModalVisible(false); }
    } catch (err) {
      console.error('Weight log error:', err.response?.data || err);
      Alert.alert('Error', err.response?.data?.error || 'Could not log your weight.');
    }
  };

  // Get current nutrients based on selected serving size
  const currentNutrients = searchResult?.servings?.[selectedServingIndex]?.nutrients;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setSuggestions([]); }} accessible={false}>
        <View style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <View style={styles.header}>
            <Text style={styles.subtitle}>Welcome back</Text>
            <Text style={styles.title}>{user?.username || 'Guest'}</Text>
          </View>

          <View>
            <TextInput
              placeholder="Search for foods/meals"
              placeholderTextColor="#8c8c8c"
              style={styles.search}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text); setSearchResult(null); setError(null);
              }}
              returnKeyType="search"
              onSubmitEditing={() => handleSearch(searchQuery)}
              onPressIn={(e) => e.stopPropagation()}
            />
            {suggestions.length > 0 && (
              <FlatList
                data={suggestions}
                keyExtractor={(item) => (item.fdcId ? item.fdcId.toString() : item._id)}
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

          {isLoading && <ActivityIndicator size="large" color="#3f51b5" style={{ marginVertical: 20 }} />}
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          {searchResult && currentNutrients && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>{searchResult.name}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servingContainer}>
                {searchResult.servings.map((serving, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.servingButton, index === selectedServingIndex && styles.servingButtonSelected]}
                    onPress={() => setSelectedServingIndex(index)}
                  >
                    <Text style={[styles.servingButtonText, index === selectedServingIndex && styles.servingButtonTextSelected]}>
                      {serving.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {/* These nutrients are pulled from the search result for display */}
              <Text style={styles.nutrientText}>Calories: {currentNutrients.calories.toFixed(0)} kcal</Text>
              <Text style={styles.nutrientText}>Protein: {currentNutrients.protein.toFixed(1)}g</Text>
              <Text style={styles.nutrientText}>Fat: {currentNutrients.fat.toFixed(1)}g</Text>
              <Text style={styles.nutrientText}>Carbs: {currentNutrients.carbohydrates.toFixed(1)}g</Text>
            </View>
          )}

          {!searchResult && !isLoading && (
            <TouchableOpacity onPress={() => navigation.navigate('AddFood')}>
              <Text style={styles.manualAddText}>Can't find your food? Add it manually.</Text>
            </TouchableOpacity>
          )}
          
          <View style={{flex: 1}} />

          <View style={styles.row}>
            <Button title="Log Meal" onPress={handleLogMeal} />
            <Button title="Log Weight" onPress={handleLogWeight} />
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Log Meal Modal */}
      <Modal
        animationType="slide" transparent={true} visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
         <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log "{searchResult?.name}"</Text>
            <Text style={styles.modalLabel}>Meal Type</Text>
            <View style={styles.mealTypeContainer}>
              {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type) => (
                <TouchableOpacity key={type} style={[styles.mealTypeButton, selectedMealType === type && styles.mealTypeButtonSelected]} onPress={() => setSelectedMealType(type)}>
                  <Text style={[styles.mealTypeButtonText, selectedMealType === type && styles.mealTypeButtonTextSelected]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>Quantity / Servings</Text>
            <TextInput style={styles.modalInput} value={quantity} onChangeText={setQuantity} keyboardType="numeric" returnKeyType="done" />
            <Text style={styles.modalLabel}>Date & Time</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <Text style={styles.modalInputDisplay}>{format(date, 'p, MMM d, yyyy')}</Text>
            </TouchableOpacity>
            {showDatePicker && (<DateTimePicker testID="dateTimePickerMeal" value={date} mode="datetime" is24Hour={true} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onChangeDate} themeVariant="light"/>)}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsModalVisible(false)}><Text style={styles.modalButtonTextCancel}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleConfirmLogMeal}><Text style={styles.modalButtonTextConfirm}>Confirm Log</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Log Weight Modal */}
      <Modal
        animationType="slide" transparent={true} visible={isWeightModalVisible}
        onRequestClose={() => setIsWeightModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()} accessible={false}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Log Your Weight</Text>
                <Text style={styles.modalLabel}>Weight</Text>
                <View style={styles.weightInputRow}>
                  <TextInput
                    style={styles.weightInput}
                    value={weight} onChangeText={setWeight}
                    keyboardType="numeric" returnKeyType="done"
                    placeholderTextColor="#8c8c8c"
                  />
                  <View style={styles.unitButtonsContainer}>
                    <TouchableOpacity
                       style={[styles.unitButton, weightUnit === 'lbs' && styles.unitButtonSelected]}
                       onPress={() => setWeightUnit('lbs')}
                    >
                      <Text style={[styles.unitButtonText, weightUnit === 'lbs' && styles.unitButtonTextSelected]}>lbs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                       style={[styles.unitButton, styles.unitButtonKg, weightUnit === 'kg' && styles.unitButtonSelected]}
                       onPress={() => setWeightUnit('kg')}
                    >
                      <Text style={[styles.unitButtonText, weightUnit === 'kg' && styles.unitButtonTextSelected]}>kg</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.modalLabel}>Date & Time</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.modalInputDisplay}>{format(date, 'p, MMM d, yyyy')}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    testID="dateTimePickerWeight" value={date} mode="datetime" is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onChangeDate} themeVariant="light"
                  />
                )}
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsWeightModalVisible(false)}><Text style={styles.modalButtonTextCancel}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleConfirmLogWeight}><Text style={styles.modalButtonTextConfirm}>Confirm Log</Text></TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

function Button({ title, onPress }) {
  return (
    <TouchableOpacity style={styles.mainButton} onPress={onPress}>
      <Text style={styles.mainButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

// Merged Stylesheet
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", paddingHorizontal: 24, paddingBottom: 20 },
  header:{ marginTop: 40, marginBottom: 20, alignItems: "center" },
  title: { fontSize: 32, fontWeight: "700", textAlign: "center", color: '#333' },
  subtitle: { color: "#555", fontSize: 16, textAlign: "center", marginBottom: 4 },
  search: { width: '100%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#fff', fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#ddd' },
  row:{ flexDirection: "row", gap: 16, marginBottom: 10 },
  mainButton: { flex: 1, backgroundColor: "#3f51b5", paddingVertical: 14, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  mainButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  suggestionsContainer: { position: 'absolute', top: 58, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, maxHeight: 220, zIndex: 1, },
  suggestionItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  suggestionText: { fontSize: 16 },
  resultContainer: { marginTop: 0, padding: 16, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 16, },
  resultTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  nutrientText: { fontSize: 16, lineHeight: 24, color: '#555', },
  servingContainer: { flexDirection: 'row', marginVertical: 10, },
  servingButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#3f51b5', marginRight: 8, },
  servingButtonSelected: { backgroundColor: '#3f51b5', },
  servingButtonText: { color: '#3f51b5', fontWeight: '600', },
  servingButtonTextSelected: { color: '#ffffff', },
  manualAddText: { textAlign: 'center', color: '#3f51b5', fontSize: 16, paddingVertical: 15, fontWeight: '600' },
  errorText: { marginVertical: 10, color: '#c62828', textAlign: 'center', fontSize: 14, fontWeight: '500' },
  // Modal styles
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', },
  modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 12, padding: 24, alignItems: 'stretch', },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: '#333' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, },
  mealTypeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 8 },
  mealTypeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#3f51b5', backgroundColor: '#fff', alignItems: 'center' },
  mealTypeButtonSelected: { backgroundColor: '#3f51b5', },
  mealTypeButtonText: { fontSize: 14, color: '#3f51b5', fontWeight: '600', },
  mealTypeButtonTextSelected: { color: 'white', },
  modalInput: { width: '100%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f0f0f0', fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#ddd', height: 50 },
  modalInputDisplay: { width: '100%', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f0f0f0', fontSize: 16, marginBottom: 24, borderWidth: 1, borderColor: '#ddd', textAlign: 'center', color: '#333', overflow: 'hidden', height: 50 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingTop: 10, },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', },
  cancelButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#3f51b5' },
  modalButtonTextCancel: { color: '#3f51b5', fontSize: 16, fontWeight: '600', },
  confirmButton: { backgroundColor: '#3f51b5', },
  modalButtonTextConfirm: { color: 'white', fontSize: 16, fontWeight: '600', },
  // Weight Modal Specific Styles
  weightInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, },
  weightInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f0f0f0', fontSize: 16, borderWidth: 1, borderColor: '#ddd', marginRight: 10, height: 50 },
  unitButtonsContainer: { flexDirection: 'row', height: 50, },
  unitButton: {
    width: 60, paddingVertical: 14, borderRadius: 8, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1.5, borderColor: '#3f51b5',
    backgroundColor: '#fff', marginLeft: 8,
  },
  unitButtonSelected: { backgroundColor: '#3f51b5', borderColor: '#3f51b5', },
  unitButtonText: { color: '#3f51b5', fontWeight: '600', fontSize: 16, },
  unitButtonTextSelected: { color: '#ffffff', },
});