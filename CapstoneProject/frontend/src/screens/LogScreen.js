import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, Dimensions, ActivityIndicator,
  Modal, TouchableOpacity, Platform, Alert, TextInput, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import apiClient from '../api/client';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

const screenWidth = Dimensions.get('window').width;

const nutrients = [
  { key: 'totalCalories', label: 'Calories', unit: 'kcal', logKey: 'caloriesPerServing' },
  { key: 'totalProtein', label: 'Protein', unit: 'g', logKey: 'proteinPerServing' },
  { key: 'totalFat', label: 'Fat', unit: 'g', logKey: 'fatPerServing' },
  { key: 'totalCarbs', label: 'Carbs', unit: 'g', logKey: 'carbohydratesPerServing' },
];

export default function LogScreen() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedNutrient, setSelectedNutrient] = useState(nutrients[0]); // default to Calories

  // states for modals
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [newLogDate, setNewLogDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isNutritionModalVisible, setIsNutritionModalVisible] = useState(false);
  const [editingFood, setEditingFood] = useState({ name: '', servings: [{ nutrients: {} }] });

  // refs for inputs
  const caloriesRef = useRef(null);
  const proteinRef = useRef(null);
  const fatRef = useRef(null);
  const carbsRef = useRef(null);

  const fetchLogData = useCallback(() => {
    const fetchData = async () => {
      try {
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        const [logsResponse, statsResponse] = await Promise.all([
          apiClient.get('/meallogs'),
          apiClient.get('/meallogs/stats', { params: { tz: userTimeZone } })
        ]);
        
        setLogs(logsResponse.data);
        setStats(statsResponse.data);
      } catch (error) { console.error("Failed to fetch log data:", error); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  useFocusEffect(
     useCallback(() => {
      setIsLoading(true);
      fetchLogData();
    }, [fetchLogData])
  );

  const openEditModal = (log) => {
    setSelectedLog(log);
    setNewLogDate(new Date(log.loggedAt));
    setIsEditModalVisible(true);
  };

  const openNutritionModal = () => {
    if (!selectedLog) return;
    const foodToEdit = JSON.parse(JSON.stringify(selectedLog.foodId));
    if (!foodToEdit.servings || foodToEdit.servings.length === 0) {
      foodToEdit.servings = [{ description: '1 serving', nutrients: { calories: 0, protein: 0, fat: 0, carbohydrates: 0 } }];
    }
    setEditingFood(foodToEdit);
    setIsEditModalVisible(false);
    setIsNutritionModalVisible(true);
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || newLogDate;
    setShowDatePicker(Platform.OS === 'ios');
    setNewLogDate(currentDate);
  };

  const handleUpdateLogTime = async () => {
    if (!selectedLog) return;
    try {
      await apiClient.put(`/meallogs/${selectedLog._id}`, { loggedAt: newLogDate.toISOString() });
      setIsEditModalVisible(false);
      Alert.alert('Success', 'Log time has been updated.');
      fetchLogData();
    } catch (error) {
      console.error('Failed to update log time:', error);
      Alert.alert('Error', 'Could not update the log time.');
    }
  };
  
  const handleUpdateNutrition = async () => {
    if (!selectedLog || !editingFood) return;
    
    try {
      const foodResponse = await apiClient.put(`/foods/${selectedLog.foodId._id}`, editingFood);
      const newFood = foodResponse.data;
      await apiClient.put(`/meallogs/${selectedLog._id}`, { foodId: newFood._id });
      setIsNutritionModalVisible(false);
      Alert.alert('Success', 'Nutritional information has been updated.');
      fetchLogData();
    } catch (error) {
      console.error('Failed to update nutrition:', error);
      Alert.alert('Error', 'Could not update nutrition information.');
    }
  };
  
  const handleDeleteLog = () => {
    if (!selectedLog) return;
    Alert.alert(
      "Delete Log?",
      `Are you sure you want to permanently delete this log for "${selectedLog.foodId.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.delete(`/meallogs/${selectedLog._id}`);
              setIsEditModalVisible(false);
              Alert.alert('Success', 'The meal log has been deleted.');
              fetchLogData();
            } catch (error) {
              console.error('Failed to delete log:', error);
              Alert.alert('Error', 'Could not delete the meal log.');
            }
          },
        },
      ]
    );
  };

  const handleNutrientChange = (nutrient, value) => {
    setEditingFood(currentFood => {
      const newFood = JSON.parse(JSON.stringify(currentFood));
      if (!newFood.servings[0]) {
        newFood.servings[0] = { nutrients: {} };
      }
      newFood.servings[0].nutrients[nutrient] = value.replace(/[^0-9.]/g, '');
      return newFood;
    });
  };

  const getChartData = () => {
    const { key, label, unit } = selectedNutrient;
    const dataPoints = stats.map(s => Math.round(s[key] || 0));
    
    return {
      labels: stats.map(s => format(new Date(s._id + 'T00:00:00'), 'M/d')),
      datasets: [{
        data: dataPoints.length ? dataPoints : [0],
        color: (opacity = 1) => `#3f51b5`,
        strokeWidth: 2
      }],
      legend: [`Daily ${label} (${unit})`]
    };
  };

  if (isLoading) {
    return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color="#3f51b5" /></SafeAreaView>;
  }

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView>
        <Text style={styles.header}>Your Progress</Text>
        
        {stats.length > 0 ? (
          <>
            <View style={styles.nutrientSelectorContainer}>
              {nutrients.map((nutrient) => (
                <TouchableOpacity
                  key={nutrient.key}
                  style={[
                    styles.nutrientButton,
                    selectedNutrient.key === nutrient.key && styles.nutrientButtonSelected
                  ]}
                  onPress={() => setSelectedNutrient(nutrient)}
                >
                  <Text style={[
                    styles.nutrientButtonText,
                    selectedNutrient.key === nutrient.key && styles.nutrientButtonTextSelected
                  ]}>
                    {nutrient.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.chartContainer}>
              <LineChart
                data={getChartData()}
                width={screenWidth - 48}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                fromZero
              />
            </View>
          </>
        ) : (<Text style={styles.emptyText}>Log meals to see your progress chart!</Text>)}
        
        <Text style={styles.header}>Recent Meals</Text>
        {logs.length > 0 ? (<FlatList
          data={logs}
          keyExtractor={(item) => item._id}
          // --- *** THIS BLOCK IS MODIFIED *** ---
          renderItem={({ item }) => {
            // Get the "per serving" value using the dynamic logKey
            const valuePerServing = item[selectedNutrient.logKey] || 0;
            const quantity = item.quantity || 1;
            const totalValue = valuePerServing * quantity;

            return (
              <TouchableOpacity onPress={() => openEditModal(item)}>
                <View style={styles.logItem}>
                  <View style={styles.logItemTextContainer}>
                    <Text style={styles.logItemName}>{item.foodId?.name || 'Deleted Food'}</Text>
                    <Text style={styles.logItemDetails}>{item.mealType} - {format(new Date(item.loggedAt), 'p, MMM d')}</Text>
                  </View>
                  <Text style={styles.logItemCalories}>
                    {/* Display the selected nutrient's value and unit */}
                    {Math.round(totalValue)} {selectedNutrient.unit}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          // --- *** END OF MODIFICATION *** ---
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />) : (<Text style={styles.emptyText}>No meals logged yet.</Text>)}

        {/* Edit Log Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isEditModalVisible}
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Log</Text>
              
              <Text style={styles.modalLabel}>Consumption Date & Time</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <Text style={styles.modalInputDisplay}>{format(newLogDate, 'p, MMM d, yyyy')}</Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker 
                  value={newLogDate} 
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onChangeDate} _
                  themeVariant="light"
                />
              )}
              
              <TouchableOpacity style={styles.editNutritionButton} onPress={openNutritionModal}>
                <Text style={styles.editNutritionButtonText}>Edit Nutrition Info</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteLog}>
                <Text style={styles.deleteButtonText}>Delete Log</Text>
              </TouchableOpacity>
              
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsEditModalVisible(false)}>
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleUpdateLogTime}>
                  <Text style={styles.modalButtonTextConfirm}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Nutrition Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isNutritionModalVisible}
          onRequestClose={() => setIsNutritionModalVisible(false)}
        >
          <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalContent}>
              <ScrollView>
                <Text style={styles.modalTitle}>Edit Nutrition</Text>
                
                <Text style={styles.modalLabel}>Food Name</Text>
                <TextInput style={styles.modalInput} value={editingFood.name} onChangeText={(text) => setEditingFood({...editingFood, name: text})} returnKeyType="next" onSubmitEditing={() => caloriesRef.current.focus()} />
                
                <Text style={styles.modalLabel}>Calories (kcal)</Text>
                <TextInput ref={caloriesRef} style={styles.modalInput} value={String(editingFood.servings?.[0]?.nutrients.calories ?? '')} onChangeText={(text) => handleNutrientChange('calories', text)} keyboardType="numeric" returnKeyType="next" onSubmitEditing={() => proteinRef.current.focus()} />
                
                <Text style={styles.modalLabel}>Protein (g)</Text>
                <TextInput ref={proteinRef} style={styles.modalInput} value={String(editingFood.servings?.[0]?.nutrients.protein ?? '')} onChangeText={(text) => handleNutrientChange('protein', text)} keyboardType="numeric" returnKeyType="next" onSubmitEditing={() => fatRef.current.focus()} />
                
                <Text style={styles.modalLabel}>Fat (g)</Text>
                <TextInput ref={fatRef} style={styles.modalInput} value={String(editingFood.servings?.[0]?.nutrients.fat ?? '')} onChangeText={(text) => handleNutrientChange('fat', text)} keyboardType="numeric" returnKeyType="next" onSubmitEditing={() => carbsRef.current.focus()} />
                
                <Text style={styles.modalLabel}>Carbohydrates (g)</Text>
                <TextInput ref={carbsRef} style={styles.modalInput} value={String(editingFood.servings?.[0]?.nutrients.carbohydrates ?? '')} onChangeText={(text) => handleNutrientChange('carbohydrates', text)} keyboardType="numeric" returnKeyType="done" onSubmitEditing={handleUpdateNutrition} />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsNutritionModalVisible(false)}><Text style={styles.modalButtonTextCancel}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleUpdateNutrition}><Text style={styles.modalButtonTextConfirm}>Save Changes</Text></TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </SafeAreaView>
    </ScrollView>
  );
}

const chartConfig = {
  backgroundColor: '#ffffff', backgroundGradientFrom: '#ffffff', backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(63, 81, 181, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(85, 85, 85, ${opacity})`,
  style: { borderRadius: 8 },
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#3f51b5' },
  propsForBackgroundLines: { stroke: '#e0e0e0' }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5ff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#333', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  
  nutrientSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  nutrientButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#3f51b5',
    backgroundColor: '#fff',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  nutrientButtonSelected: {
    backgroundColor: '#3f51b5',
  },
  nutrientButtonText: {
    fontSize: 14,
    color: '#3f51b5',
    fontWeight: '600',
  },
  nutrientButtonTextSelected: {
    color: 'white',
  },

  chartContainer: {
    backgroundColor: '#ffffff', borderRadius: 8, marginHorizontal: 24, paddingVertical: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#ddd'
   },
  chart: { borderRadius: 8, alignSelf: 'center' },
  logItem: {
    backgroundColor: 'white', padding: 16, marginVertical: 6, marginHorizontal: 24, borderRadius: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ddd'
  },
  logItemTextContainer: { flex: 1, marginRight: 10 },
  logItemName: { fontSize: 16, fontWeight: '600', color: '#333' },
  logItemDetails: { fontSize: 14, color: '#555', paddingTop: 4 },
  logItemCalories: { fontSize: 16, fontWeight: 'bold', color: '#3f51b5' },
  emptyText: { textAlign: 'center', color: '#555', padding: 20, fontSize: 16 },
  // Modal styles
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', },
  modalContent: { width: '90%', maxHeight: '85%', backgroundColor: 'white', borderRadius: 12, padding: 24, },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: '#333' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, },
  modalInput: {
    width: '100%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8,
    backgroundColor: '#f0f0f0', fontSize: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#ddd', height: 50
  },
  modalInputDisplay: {
    width: '100%', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8,
    backgroundColor: '#f0f0f0', fontSize: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#ddd', textAlign: 'center', color: '#333', overflow: 'hidden', height: 50
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingTop: 10 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', },
  cancelButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#3f51b5' },
  modalButtonTextCancel: { color: '#3f51b5', fontSize: 16, fontWeight: '600', },
  confirmButton: { backgroundColor: '#3f51b5', },
  modalButtonTextConfirm: { color: 'white', fontSize: 16, fontWeight: '600', },
  editNutritionButton: {
    paddingVertical: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1.5,
    borderColor: '#3f51b5', marginTop: 10, marginBottom: 16
  },
  editNutritionButtonText: { color: '#3f51b5', fontSize: 16, fontWeight: '600', },
  deleteButton: {
    paddingVertical: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1.5,
    borderColor: '#c62828', marginBottom: 24
  },
  deleteButtonText: { color: '#c62828', fontSize: 16, fontWeight: '600', },
});