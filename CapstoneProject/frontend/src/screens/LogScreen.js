import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, Dimensions, ActivityIndicator,
  Modal, TouchableOpacity, Platform, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import apiClient from '../api/client';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

const screenWidth = Dimensions.get('window').width;

export default function LogScreen() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [newLogDate, setNewLogDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchLogData = useCallback(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [logsResponse, statsResponse] = await Promise.all([
          apiClient.get('/meallogs'),
          apiClient.get('/meallogs/stats')
        ]);
        setLogs(logsResponse.data);
        setStats(statsResponse.data);
      } catch (error) {
        console.error("Failed to fetch log data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useFocusEffect(fetchLogData);

  const openEditModal = (log) => {
    setSelectedLog(log);
    setNewLogDate(new Date(log.loggedAt));
    setIsEditModalVisible(true);
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || newLogDate;
    setShowDatePicker(Platform.OS === 'ios');
    setNewLogDate(currentDate);
  };

  const handleUpdateLogTime = async () => {
    if (!selectedLog) return;
    try {
      await apiClient.put(`/meallogs/${selectedLog._id}`, {
        loggedAt: newLogDate.toISOString(),
      });
      setIsEditModalVisible(false);
      Alert.alert('Success', 'Log time has been updated.');
      fetchLogData(); // Refetch all data to update the screen
    } catch (error) {
      console.error('Failed to update log time:', error);
      Alert.alert('Error', 'Could not update the log time.');
    }
  };

  const chartData = {
    labels: stats.map(s => format(new Date(s._id), 'd')),
    datasets: [{
      data: stats.length ? stats.map(s => Math.round(s.totalCalories)) : [0],
      color: (opacity = 1) => `rgba(14, 175, 233, ${opacity})`, strokeWidth: 2
    }],
    legend: ["Daily Calories (kcal)"]
  };

  if (isLoading) {
    return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color="#0eafe9" /></SafeAreaView>;
  }

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView>
        <Text style={styles.header}>Your Progress</Text>
        {stats.length > 0 ? (<LineChart data={chartData} width={screenWidth - 30} height={220} chartConfig={chartConfig} bezier style={styles.chart} />) : (<Text style={styles.emptyText}>Log meals to see your progress chart!</Text>)}
        <Text style={styles.header}>Recent Meals</Text>
        {logs.length > 0 ? (<FlatList data={logs} keyExtractor={(item) => item._id} renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openEditModal(item)}>
            <View style={styles.logItem}>
              <View>
                <Text style={styles.logItemName}>{item.foodId.name}</Text>
                <Text style={styles.logItemDetails}>{item.mealType} - {format(new Date(item.loggedAt), 'p, MMM d')}</Text>
              </View>
              <Text style={styles.logItemCalories}>{Math.round(item.foodId.nutrients.calories * item.quantity)} kcal</Text>
            </View>
          </TouchableOpacity>
        )} scrollEnabled={false} />) : (<Text style={styles.emptyText}>No meals logged yet.</Text>)}

        <Modal animationType="slide" transparent={true} visible={isEditModalVisible} onRequestClose={() => setIsEditModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Log Time</Text>
              <Text style={styles.modalLabel}>Consumption Date & Time</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)}><Text style={styles.datePickerText}>{format(newLogDate, 'p, MMM d, yyyy')}</Text></TouchableOpacity>
              {showDatePicker && (<DateTimePicker value={newLogDate} mode="datetime" is24Hour={true} display="default" onChange={onChangeDate} />)}
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsEditModalVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleUpdateLogTime}><Text style={styles.confirmButtonText}>Update Time</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ScrollView>
  );
}

const chartConfig = { backgroundColor: '#ffffff', backgroundGradientFrom: '#ffffff', backgroundGradientTo: '#ffffff', decimalPlaces: 0, color: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`, labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`, style: { borderRadius: 16 }, propsForDots: { r: '4', strokeWidth: '2', stroke: '#0eafe9' } };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' }, loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }, header: { fontSize: 24, fontWeight: 'bold', paddingHorizontal: 15, paddingTop: 20, paddingBottom: 10 }, chart: { marginVertical: 8, borderRadius: 16, alignSelf: 'center' }, logItem: { backgroundColor: 'white', padding: 15, marginVertical: 4, marginHorizontal: 15, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' }, logItemName: { fontSize: 16, fontWeight: '600' }, logItemDetails: { fontSize: 14, color: '#6b7280', paddingTop: 4 }, logItemCalories: { fontSize: 16, fontWeight: 'bold', color: '#0eafe9' }, emptyText: { textAlign: 'center', color: '#6b7280', padding: 20, fontSize: 16 }, modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', }, modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20, alignItems: 'stretch', }, modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, }, modalLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8, }, modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 10 }, modalButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', }, cancelButton: { backgroundColor: '#e5e7eb', }, cancelButtonText: { color: '#374151', fontSize: 16, fontWeight: '600', }, confirmButton: { backgroundColor: '#0eafe9', }, confirmButtonText: { color: 'white', fontSize: 16, fontWeight: '600', }, datePickerText: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 20, textAlign: 'center', color: '#374151', },
});