import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator,
  Keyboard, FlatList, Modal, Platform, ScrollView, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import apiClient from '../api/client';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);

  // --- AI State ---
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [isAiConfirmVisible, setIsAiConfirmVisible] = useState(false);
  
  // New: AI Date/Time State
  const [aiDate, setAiDate] = useState(new Date());
  const [showAiDatePicker, setShowAiDatePicker] = useState(false);

  // --- Search State ---
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const didSelectSuggestion = useRef(false);

  // --- Log Meal Modal State ---
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('Breakfast');
  const [quantity, setQuantity] = useState('1');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedServingIndex, setSelectedServingIndex] = useState(0);

  // --- Log Weight State ---
  const [isWeightModalVisible, setIsWeightModalVisible] = useState(false);
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('lbs');

  // --- Helper: Get Meal Type by Hour ---
  const getMealTypeByHour = (d) => {
    const h = d.getHours();
    if (h >= 5 && h < 11) return 'Breakfast';
    if (h >= 11 && h < 17) return 'Lunch';
    if (h >= 17 && h < 22) return 'Dinner';
    return 'Snack';
  };

  // --- Effect: Handle Route Params (Scan/Custom Food) ---
  useEffect(() => {
    if (route.params?.newFood) {
      setSearchResult(route.params.newFood);
      openLogModal(route.params.newFood);
      navigation.setParams({ newFood: null });
    }
    if (route.params?.scannedFood) {
      const scanned = route.params.scannedFood;
      setSearchQuery(scanned);
      setIsSearchVisible(true);
      handleSearch(scanned);
      navigation.setParams({ scannedFood: null });
    }
  }, [route.params]);

  // --- Logic: Open Log Modal ---
  const openLogModal = (food) => {
    const now = new Date();
    setDate(now);
    setSelectedMealType(getMealTypeByHour(now));
    setQuantity('1');
    setIsSearchVisible(false);
    setIsLogModalVisible(true);
  };

  // ================= AI LOGGING LOGIC =================
  const handleAiAnalyze = async () => {
    if (!aiQuery.trim()) { Alert.alert("Empty Input", "Please describe your meal."); return; }
    Keyboard.dismiss();
    setIsAiLoading(true);
    try {
      const response = await apiClient.post('/ai/parse-meal', { query: aiQuery });
      const data = response.data;
      if (!data.foods || data.foods.length === 0) {
        Alert.alert("AI Error", "Could not identify any food. Please try again.");
      } else {
        setAiResult(data);
        setAiDate(new Date()); // Reset time to now
        setIsAiConfirmVisible(true);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to connect to AI.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const updateAiFoodName = (text, index) => {
    const updatedFoods = [...aiResult.foods];
    updatedFoods[index].foodName = text;
    setAiResult({ ...aiResult, foods: updatedFoods });
  };

  const onAiDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || aiDate;
    setShowAiDatePicker(Platform.OS === 'ios');
    setAiDate(currentDate);
  };

  const handleAiConfirm = async () => {
    if (!aiResult || !aiResult.foods) return;
    try {
      const logDate = aiDate;
      const mealType = getMealTypeByHour(logDate);
      let successCount = 0;

      for (const food of aiResult.foods) {
        const createRes = await apiClient.post('/foods/custom', {
          name: food.foodName,
          nutrients: { calories: food.calories, protein: food.protein, fat: food.fat, carbohydrates: food.carbs }
        });
        await apiClient.post('/meallogs', {
          foodId: createRes.data._id,
          mealType: mealType,
          quantity: food.quantity || 1,
          loggedAt: logDate.toISOString(),
          servingDescription: food.servingDescription || '1 serving',
          caloriesPerServing: food.calories, proteinPerServing: food.protein, fatPerServing: food.fat, carbohydratesPerServing: food.carbs
        });
        successCount++;
      }
      setIsAiConfirmVisible(false);
      setAiQuery('');
      setAiResult(null);
      Alert.alert("Success", `Logged ${successCount} items for ${mealType}.`);
    } catch (error) { Alert.alert("Error", "Failed to save meal logs."); }
  };

  // ================= SEARCH LOGIC =================
  const handleSearch = async (query) => {
    if (!query || !query.trim()) return;
    Keyboard.dismiss();
    setIsSearchLoading(true); setSearchResult(null); setSuggestions([]);
    try {
      const response = await apiClient.get('/foods/search', { params: { query } });
      setSearchResult(response.data);
      setSelectedServingIndex(0);
    } catch (err) {
      // silent fail
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleSuggestionTap = (item) => {
    didSelectSuggestion.current = true;
    setSearchQuery(item.name);
    setSuggestions([]);
    handleSearch(item.name);
  };

  useEffect(() => {
    if (didSelectSuggestion.current) { didSelectSuggestion.current = false; return; }
    if (searchQuery.length < 2) { setSuggestions([]); return; }
    const handler = setTimeout(async () => {
      try {
        const res = await apiClient.get('/foods/suggest', { params: { query: searchQuery } });
        setSuggestions(res.data);
      } catch (e) {}
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ================= MANUAL LOGGING LOGIC =================
  const handleConfirmLogMeal = async () => {
    if (!searchResult) return;
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) return Alert.alert('Error', 'Invalid quantity');
    
    const serving = searchResult.servings[selectedServingIndex];
    try {
      await apiClient.post('/meallogs', {
        foodId: searchResult._id,
        mealType: selectedMealType,
        quantity: numQty,
        loggedAt: date.toISOString(),
        servingDescription: serving.description,
        caloriesPerServing: serving.nutrients.calories,
        proteinPerServing: serving.nutrients.protein,
        fatPerServing: serving.nutrients.fat,
        carbohydratesPerServing: serving.nutrients.carbohydrates,
      });
      setIsLogModalVisible(false);
      Alert.alert('Success', 'Meal logged.');
    } catch (e) { Alert.alert('Error', 'Could not log meal.'); }
  };

  const handleConfirmWeight = async () => {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return Alert.alert('Error', 'Invalid weight');
    try {
      await apiClient.post('/weightlogs', { weight: w, unit: weightUnit, loggedAt: date.toISOString() });
      setIsWeightModalVisible(false);
      Alert.alert('Success', 'Weight logged.');
    } catch (e) { Alert.alert('Error', 'Could not log weight.'); }
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.username}>{user?.username || 'Guest'}</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
           <Ionicons name="person-circle-outline" size={36} color="#3f51b5" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.aiCard}>
          <View style={styles.aiHeaderRow}>
            <Ionicons name="sparkles" size={20} color="#3f51b5" />
            <Text style={styles.aiTitle}>AI Quick Log</Text>
          </View>
          <Text style={styles.aiSubtitle}>Describe your meal, and I'll log it for you.</Text>
          <View style={styles.aiInputWrapper}>
            <TextInput
              style={styles.aiInput} placeholder="e.g. 2 slices of pizza and a coke" placeholderTextColor="#999"
              value={aiQuery} onChangeText={setAiQuery} multiline
            />
            <TouchableOpacity style={styles.aiSendButton} onPress={handleAiAnalyze} disabled={isAiLoading}>
              {isAiLoading ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="arrow-up" size={24} color="white" />}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridButton} onPress={() => { setSearchQuery(''); setSearchResult(null); setIsSearchVisible(true); }}>
            <View style={[styles.iconBg, { backgroundColor: '#e3f2fd' }]}>
                <Ionicons name="search" size={24} color="#1976d2" />
            </View>
            <Text style={styles.gridLabel}>Search Food</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('Camera')}>
            <View style={[styles.iconBg, { backgroundColor: '#e8f5e9' }]}>
                <Ionicons name="camera" size={24} color="#2e7d32" />
            </View>
            <Text style={styles.gridLabel}>Scan Meal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridButton} onPress={() => { setWeight(''); setIsWeightModalVisible(true); }}>
             <View style={[styles.iconBg, { backgroundColor: '#fff3e0' }]}>
                <Ionicons name="scale" size={24} color="#ef6c00" />
             </View>
            <Text style={styles.gridLabel}>Log Weight</Text>
          </TouchableOpacity>

           <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('AddFood')}>
             <View style={[styles.iconBg, { backgroundColor: '#f3e5f5' }]}>
                <Ionicons name="add-circle" size={24} color="#7b1fa2" />
             </View>
            <Text style={styles.gridLabel}>Custom Food</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ================= MODALS ================= */}

      {/* 1. AI CONFIRMATION MODAL */}
      <Modal animationType="slide" transparent={true} visible={isAiConfirmVisible} onRequestClose={() => setIsAiConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.aiConfirmCard}>
            <Text style={styles.aiConfirmTitle}>✨ I found this:</Text>
            <Text style={styles.aiReplyText}>"{aiResult?.reply}"</Text>
            <View style={styles.divider} />

            {/* DATE SELECTOR */}
            <View style={styles.aiDateRow}>
              <Text style={styles.aiDateLabel}>When:</Text>
              <TouchableOpacity onPress={() => setShowAiDatePicker(true)} style={styles.aiDateButton}>
                <Text style={styles.aiDateText}>{format(aiDate, 'p, MMM d')}</Text>
              </TouchableOpacity>
            </View>
            {showAiDatePicker && (
              <DateTimePicker
                value={aiDate}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onAiDateChange}
                textColor="black" // FIX: Force black text for iOS
                themeVariant="light" // FIX: Force light theme for iOS
              />
            )}
            <View style={styles.divider} />
            
            <ScrollView style={{ maxHeight: 200 }}>
              {aiResult?.foods.map((food, idx) => (
                <View key={idx} style={styles.aiFoodItem}>
                  <TextInput style={styles.aiFoodNameInput} value={food.foodName} onChangeText={(text) => updateAiFoodName(text, idx)} />
                  <Text style={styles.aiFoodDetails}>{food.quantity} x {food.servingDescription} • {food.calories} kcal</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.aiActionRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsAiConfirmVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleAiConfirm}><Text style={styles.confirmButtonText}>Add to Log</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. SEARCH MODAL */}
      <Modal animationType="slide" visible={isSearchVisible} onRequestClose={() => setIsSearchVisible(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.searchModalHeader}>
            <TouchableOpacity onPress={() => setIsSearchVisible(false)}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <TextInput 
              style={styles.modalSearchBar} placeholder="Search food..." value={searchQuery} 
              onChangeText={(t) => { setSearchQuery(t); setSearchResult(null); }}
              onSubmitEditing={() => handleSearch(searchQuery)}
              autoFocus
            />
          </View>

          {isSearchLoading && <ActivityIndicator size="large" color="#3f51b5" style={{marginTop: 20}}/>}

          {!searchResult && suggestions.length > 0 && (
            <FlatList
              data={suggestions}
              keyExtractor={i => i.fdcId?.toString() || i._id}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSuggestionTap(item)}>
                  <Text style={styles.suggestionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {searchResult && (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.resultTitle}>{searchResult.name}</Text>
              <View style={styles.servingRow}>
                {searchResult.servings.map((s, i) => (
                  <TouchableOpacity key={i} onPress={() => setSelectedServingIndex(i)}
                    style={[styles.servingChip, selectedServingIndex === i && styles.servingChipActive]}>
                    <Text style={[styles.servingText, selectedServingIndex === i && styles.servingTextActive]}>{s.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.macroGrid}>
                <View style={styles.macroBox}><Text style={styles.macroVal}>{searchResult.servings[selectedServingIndex].nutrients.calories.toFixed(0)}</Text><Text style={styles.macroLabel}>Cals</Text></View>
                <View style={styles.macroBox}><Text style={styles.macroVal}>{searchResult.servings[selectedServingIndex].nutrients.protein.toFixed(1)}g</Text><Text style={styles.macroLabel}>Protein</Text></View>
                <View style={styles.macroBox}><Text style={styles.macroVal}>{searchResult.servings[selectedServingIndex].nutrients.carbohydrates.toFixed(1)}g</Text><Text style={styles.macroLabel}>Carbs</Text></View>
                 <View style={styles.macroBox}><Text style={styles.macroVal}>{searchResult.servings[selectedServingIndex].nutrients.fat.toFixed(1)}g</Text><Text style={styles.macroLabel}>Fat</Text></View>
              </View>
              <TouchableOpacity style={styles.bigLogButton} onPress={() => openLogModal(searchResult)}>
                <Text style={styles.bigLogButtonText}>Log This Food</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* 3. LOG MEAL MODAL */}
      <Modal animationType="slide" transparent={true} visible={isLogModalVisible} onRequestClose={() => setIsLogModalVisible(false)}>
         <View style={styles.modalOverlay}>
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
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsLogModalVisible(false)}><Text style={styles.modalButtonTextCancel}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleConfirmLogMeal}><Text style={styles.modalButtonTextConfirm}>Confirm Log</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. WEIGHT MODAL */}
      <Modal animationType="fade" transparent visible={isWeightModalVisible} onRequestClose={() => setIsWeightModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Weight</Text>
            <View style={styles.weightInputRow}>
              <TextInput
                style={styles.weightInput}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="0.0"
                placeholderTextColor="#ccc"
              />
              <View style={styles.unitButtonsContainer}>
                <TouchableOpacity
                  style={[styles.unitButton, weightUnit === 'lbs' && styles.unitButtonSelected]}
                  onPress={() => setWeightUnit('lbs')}
                >
                  <Text style={[styles.unitButtonText, weightUnit === 'lbs' && styles.unitButtonTextSelected]}>lbs</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, weightUnit === 'kg' && styles.unitButtonSelected]}
                  onPress={() => setWeightUnit('kg')}
                >
                  <Text style={[styles.unitButtonText, weightUnit === 'kg' && styles.unitButtonTextSelected]}>kg</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.aiActionRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsWeightModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmWeight}>
                <Text style={styles.confirmButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, marginBottom: 20 },
  greeting: { fontSize: 16, color: '#666' },
  username: { fontSize: 24, fontWeight: '800', color: '#333' },
  aiCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  aiHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  aiTitle: { fontSize: 18, fontWeight: '700', color: '#3f51b5' },
  aiSubtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  aiInputWrapper: { flexDirection: 'row', backgroundColor: '#f0f2f5', borderRadius: 12, padding: 4, alignItems: 'flex-end' },
  aiInput: { flex: 1, padding: 12, fontSize: 16, color: '#333', minHeight: 50 },
  aiSendButton: { backgroundColor: '#3f51b5', width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 15 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  gridButton: { width: '47%', backgroundColor: '#fff', padding: 15, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 },
  iconBg: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  gridLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  
  // Modals Shared Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20, alignItems: 'center' },
  modalContent: { width: '100%', backgroundColor: 'white', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: '#333' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  modalInput: { width: '100%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f0f0f0', fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#ddd', height: 50 },
  modalInputDisplay: { width: '100%', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f0f0f0', fontSize: 16, marginBottom: 24, borderWidth: 1, borderColor: '#ddd', textAlign: 'center', color: '#333', overflow: 'hidden', height: 50 },
  
  // Modal Actions (Shared)
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingTop: 10 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  cancelButton: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginRight: 10 },
  confirmButton: { flex: 1, backgroundColor: '#3f51b5', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginLeft: 10 },
  modalButtonTextCancel: { color: '#3f51b5', fontSize: 16, fontWeight: '600' },
  modalButtonTextConfirm: { color: 'white', fontSize: 16, fontWeight: '600' },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Meal Type Buttons
  mealTypeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 8 },
  mealTypeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#3f51b5', backgroundColor: '#fff', alignItems: 'center' },
  mealTypeButtonSelected: { backgroundColor: '#3f51b5' },
  mealTypeButtonText: { fontSize: 14, color: '#3f51b5', fontWeight: '600' },
  mealTypeButtonTextSelected: { color: 'white' },

  // Search Modal Specifics
  searchModalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 15, paddingTop: Platform.OS === 'ios' ? 50 : 15, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 15 },
  modalSearchBar: { flex: 1, fontSize: 18, padding: 5 },
  suggestionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  suggestionText: { fontSize: 16, color: '#333' },
  resultTitle: { fontSize: 24, fontWeight: '700', marginBottom: 15, textAlign: 'center' },
  servingRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 20 },
  servingChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#3f51b5' },
  servingChipActive: { backgroundColor: '#3f51b5' },
  servingText: { color: '#3f51b5' },
  servingTextActive: { color: '#fff' },
  macroGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  macroBox: { alignItems: 'center', flex: 1, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 10, marginHorizontal: 4 },
  macroVal: { fontSize: 18, fontWeight: '700', color: '#3f51b5' },
  macroLabel: { fontSize: 12, color: '#666' },
  bigLogButton: { backgroundColor: '#3f51b5', padding: 16, borderRadius: 12, alignItems: 'center' },
  bigLogButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // AI Confirm Specifics
  aiConfirmCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%' },
  aiConfirmTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 10 },
  aiReplyText: { fontSize: 16, color: '#555', fontStyle: 'italic', marginBottom: 20, lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 15 },
  aiFoodItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  aiFoodNameInput: { fontSize: 16, fontWeight: '600', color: '#333', borderBottomWidth: 1, borderBottomColor: '#ddd', flex: 1, paddingVertical: 2, marginRight: 10 },
  aiFoodDetails: { fontSize: 14, color: '#666' },
  aiActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, width: '100%' },
  
  // AI Date Row
  aiDateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  aiDateLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  aiDateButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0f2f5', borderRadius: 8 },
  aiDateText: { fontSize: 16, color: '#3f51b5', fontWeight: '500' },

  // Weight Modal Styles
  weightInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  weightInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f0f0f0', fontSize: 16, borderWidth: 1, borderColor: '#ddd', marginRight: 10, height: 50 },
  unitButtonsContainer: { flexDirection: 'row', height: 50 },
  unitButton: { width: 60, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#3f51b5', backgroundColor: '#fff', marginLeft: 8 },
  unitButtonSelected: { backgroundColor: '#3f51b5', borderColor: '#3f51b5' },
  unitButtonText: { color: '#3f51b5', fontWeight: '600', fontSize: 16 },
  unitButtonTextSelected: { color: '#ffffff' },
});