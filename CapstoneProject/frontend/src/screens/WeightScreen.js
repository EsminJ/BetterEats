import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import apiClient from '../api/client';
import { format } from 'date-fns';

const screenWidth = Dimensions.get('window').width;
const LBS_CONVERSION_FACTOR = 2.20462;

export default function WeightScreen() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayUnit, setDisplayUnit] = useState('lbs'); // 'lbs' or 'kg'

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          // Fetch both logs and stats
          const [logsResponse, statsResponse] = await Promise.all([
            apiClient.get('/weightlogs'),
            apiClient.get('/weightlogs/stats') // Now returns data in KG
          ]);
          setLogs(logsResponse.data);
          setStats(statsResponse.data);
        } catch (error) {
          console.error("Failed to fetch weight data:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }, [])
  );

  // --- New: Calculate chart data based on displayUnit ---
  const conversionFactor = displayUnit === 'lbs' ? LBS_CONVERSION_FACTOR : 1;
  const chartData = {
    labels: stats.map(s => format(new Date(s._id + 'T00:00:00'), 'd')),
    datasets: [{
      data: stats.length 
        ? stats.map(s => Math.round(s.averageWeightKg * conversionFactor)) // Convert KG to lbs if needed
        : [0],
      color: (opacity = 1) => `#3f51b5`,
      strokeWidth: 2
    }],
    legend: [`Weight Trend (${displayUnit})`] // Dynamic legend
  };

  if (isLoading) {
    return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color="#3f51b5" /></SafeAreaView>;
  }

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView>
        <Text style={styles.header}>Your Progress</Text>

        {/* --- New: Unit Toggle Buttons --- */}
        <View style={styles.unitToggleContainer}>
          <TouchableOpacity
            style={[styles.unitButton, displayUnit === 'lbs' && styles.unitButtonSelected]}
            onPress={() => setDisplayUnit('lbs')}
          >
            <Text style={[styles.unitButtonText, displayUnit === 'lbs' && styles.unitButtonTextSelected]}>Imperial (lbs)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitButton, displayUnit === 'kg' && styles.unitButtonSelected]}
            onPress={() => setDisplayUnit('kg')}
          >
            <Text style={[styles.unitButtonText, displayUnit === 'kg' && styles.unitButtonTextSelected]}>Metric (kg)</Text>
          </TouchableOpacity>
        </View>

        {stats.length > 0 ? (
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              yAxisSuffix={` ${displayUnit}`} // Dynamic unit suffix
              fromZero={true} // Start Y-axis at 0
            />
          </View>
        ) : (<Text style={styles.emptyText}>Log your weight to see your progress chart!</Text>)}
        
        <Text style={styles.header}>Recent Weight Logs</Text>
        {logs.length > 0 ? (<FlatList
          data={logs}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.logItem}>
              <View style={styles.logItemTextContainer}>
                {/* This list correctly shows what was logged (e.g., 80.0 kg) */}
                <Text style={styles.logItemName}>{item.weight.toFixed(1)} {item.unit}</Text>
                <Text style={styles.logItemDetails}>{format(new Date(item.loggedAt), 'p, MMM d')}</Text>
              </View>
            </View>
          )}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />)
        : (<Text style={styles.emptyText}>No weight logged yet.</Text>)}
      </SafeAreaView>
    </ScrollView>
  );
}

const chartConfig = {
  backgroundColor: '#ffffff', backgroundGradientFrom: '#ffffff', backgroundGradientTo: '#ffffff',
  decimalPlaces: 0, // Show rounded numbers on chart
  color: (opacity = 1) => `rgba(63, 81, 181, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(85, 85, 85, ${opacity})`,
  style: { borderRadius: 8 },
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#3f51b5' },
  propsForBackgroundLines: { stroke: '#e0e0e0' }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#333', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  chartContainer: { backgroundColor: '#ffffff', borderRadius: 8, marginHorizontal: 24, paddingVertical: 16, marginBottom: 20, borderWidth: 1, borderColor: '#ddd' },
  chart: { borderRadius: 8, alignSelf: 'center' },
  logItem: { backgroundColor: 'white', padding: 16, marginVertical: 6, marginHorizontal: 24, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  logItemTextContainer: { flex: 1, marginRight: 10 },
  logItemName: { fontSize: 16, fontWeight: '600', color: '#333' },
  logItemDetails: { fontSize: 14, color: '#555', paddingTop: 4 },
  emptyText: { textAlign: 'center', color: '#555', padding: 20, fontSize: 16 },
  // --- New Styles for Unit Toggle ---
  unitToggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#3f51b5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  unitButtonSelected: {
    backgroundColor: '#3f51b5',
  },
  unitButtonText: {
    color: '#3f51b5',
    fontSize: 14,
    fontWeight: '600',
  },
  unitButtonTextSelected: {
    color: '#fff',
  },
});