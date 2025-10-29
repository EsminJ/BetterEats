import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import apiClient from '../api/client';
import { format } from 'date-fns';
// Note: We don't need edit/delete modals here yet

const screenWidth = Dimensions.get('window').width;

export default function WeightScreen() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const [logsResponse, statsResponse] = await Promise.all([
            apiClient.get('/weightlogs'), // Fetch weight logs
            apiClient.get('/weightlogs/stats') // Fetch weight stats
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

  // Prepare chart data
  const chartData = {
    labels: stats.map(s => format(new Date(s._id + 'T00:00:00'), 'd')), // Add time for correct date parsing
    datasets: [{
      data: stats.length ? stats.map(s => Math.round(s.averageWeight)) : [0],
      color: (opacity = 1) => `#3f51b5`, // Theme color
      strokeWidth: 2
    }],
    legend: ["Weight Trend"] // Updated legend
  };

  if (isLoading) {
    return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color="#3f51b5" /></SafeAreaView>;
  }

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView>
        <Text style={styles.header}>Your Progress</Text>
        {stats.length > 0 ? (
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              yAxisSuffix=" lbs" // Add unit suffix (assuming lbs for now)
              // Consider adding logic here to display kg based on user preference
            />
          </View>
        ) : (<Text style={styles.emptyText}>Log your weight to see your progress chart!</Text>)}
        
        <Text style={styles.header}>Recent Weight Logs</Text>
        {logs.length > 0 ? (<FlatList
          data={logs}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            // Make items non-interactive for now
            <View style={styles.logItem}>
              <View style={styles.logItemTextContainer}>
                {/* Display weight and unit */}
                <Text style={styles.logItemName}>{item.weight.toFixed(1)} {item.unit}</Text>
                <Text style={styles.logItemDetails}>{format(new Date(item.loggedAt), 'p, MMM d')}</Text>
              </View>
              {/* Maybe add change from previous log later */}
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

// Chart Config - can be shared or customized
const chartConfig = {
  backgroundColor: '#ffffff', backgroundGradientFrom: '#ffffff', backgroundGradientTo: '#ffffff',
  decimalPlaces: 1, // Show decimals for weight
  color: (opacity = 1) => `rgba(63, 81, 181, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(85, 85, 85, ${opacity})`,
  style: { borderRadius: 8 },
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#3f51b5' },
  propsForBackgroundLines: { stroke: '#e0e0e0' }
};

// Styles (very similar to LogScreen, reuse if possible in future)
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
});