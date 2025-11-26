import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Dimensions, ActivityIndicator, 
  TouchableOpacity, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import apiClient from '../api/client';
import { 
  format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  startOfYear, endOfYear, subWeeks, subMonths, subYears, 
  eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth, addDays, isAfter, startOfDay 
} from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;
const LBS_CONVERSION_FACTOR = 2.20462;

// --- Helper: Clean Max/Min for Y-Axis ---
const getCleanAxis = (dataPoints) => {
  if (!dataPoints || dataPoints.length === 0) return { min: 0, max: 100 };
  
  let minVal = Math.min(...dataPoints);
  let maxVal = Math.max(...dataPoints);

  if (minVal === maxVal) {
    minVal -= 2;
    maxVal += 2;
  }

  const padding = (maxVal - minVal) * 0.15; 
  minVal = Math.floor(minVal - padding);
  maxVal = Math.ceil(maxVal + padding);

  return { min: Math.max(0, minVal), max: maxVal };
};

// --- Helper: Process Data ---
const processData = (stats, startDate, endDate, range, unitPreference) => {
  const conversionFactor = unitPreference === 'imperial' ? LBS_CONVERSION_FACTOR : 1;
  
  let timePoints = [];
  let isMonthly = range === '1y';

  // Generate full timeline
  if (isMonthly) {
    timePoints = eachMonthOfInterval({ start: startDate, end: endDate });
  } else {
    timePoints = eachDayOfInterval({ start: startDate, end: endDate });
  }

  const filledData = [];
  const labels = [];
  const tooltipLabels = [];
  const indicesToHide = []; 
  const today = startOfDay(new Date());
  
  let lastVal = stats.length > 0 
    ? parseFloat((stats[0].averageWeightKg * conversionFactor).toFixed(1)) 
    : 0;

  // Loop through days/months
  for (let i = 0; i < timePoints.length; i++) {
    const date = timePoints[i];
    
    // --- STOP AT TODAY ---
    // If the date is in the future, we break the loop entirely.
    // This ensures the chart ends exactly at "Now" (no ghost space).
    if (isAfter(date, today)) {
      break; 
    }

    // --- Value Logic ---
    const match = stats.find(s => {
      const statDate = parseISO(s._id);
      return isMonthly ? isSameMonth(statDate, date) : isSameDay(statDate, date);
    });

    if (match) {
      const val = parseFloat((match.averageWeightKg * conversionFactor).toFixed(1));
      filledData.push(val);
      lastVal = val;
    } else {
      filledData.push(lastVal); // Forward fill
      indicesToHide.push(i); // Hide dot
    }

    // --- Label Logic (Hybrid) ---
    if (range === '1w') {
      labels.push(format(date, 'EEE'));       // "Mon"
      tooltipLabels.push(format(date, 'EEE'));
    } else if (range === '1y') {
      labels.push(format(date, 'MMM'));       // "Jan"
      tooltipLabels.push(format(date, 'MMM yyyy'));
    } else {
      labels.push('');                        // 1M: Empty X-Axis
      tooltipLabels.push(format(date, 'MMM d')); // Tooltip: "Nov 26"
    }
  }

  return { data: filledData, labels, tooltipLabels, indicesToHide };
};

// --- Sub-Component: Individual Chart Page ---
const WeightChartPage = React.memo(({ startDate, endDate, range, unitPreference }) => {
  const [chartData, setChartData] = useState({ data: [0], labels: [], tooltipLabels: [], indicesToHide: [] });
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState({ visible: false, value: 0, date: '', x: 0, y: 0, index: -1 });
  const displayUnit = unitPreference === 'imperial' ? 'lbs' : 'kg';

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/weightlogs/stats', { 
          params: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), range } 
        });
        
        if (isMounted) {
          const processed = processData(response.data, startDate, endDate, range, unitPreference);
          setChartData(processed);
        }
      } catch (error) {
        console.error("Chart fetch error", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [startDate, endDate, range, unitPreference]);

  const { min, max } = getCleanAxis(chartData.data);

  const handleDataPointClick = (data) => {
    const isSamePoint = tooltip.visible && tooltip.index === data.index;
    if (isSamePoint) {
      setTooltip({ ...tooltip, visible: false, index: -1 });
    } else {
      const dateLabel = chartData.tooltipLabels[data.index] || '';
      setTooltip({ 
        visible: true, 
        value: data.value, 
        date: dateLabel,
        x: data.x, 
        y: data.y, 
        index: data.index 
      });
    }
  };

  if (loading) {
    return <View style={styles.chartPlaceholder}><ActivityIndicator size="large" color="#3f51b5" /></View>;
  }

  const hasData = chartData.data.some(v => v > 0);

  return (
    <View style={styles.chartPage}>
      {hasData ? (
        <View>
          <LineChart
            data={{
              labels: chartData.labels,
              datasets: [{ data: chartData.data }]
            }}
            width={screenWidth - 48}
            height={220}
            fromZero={false}
            withVerticalLines={false}
            segments={4}
            yAxisSuffix="" 
            verticalLabelRotation={0}
            hidePointsAtIndex={chartData.indicesToHide}
            chartConfig={{
              backgroundColor: '#ffffff', backgroundGradientFrom: '#ffffff', backgroundGradientTo: '#ffffff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(63, 81, 181, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(85, 85, 85, ${opacity})`,
              propsForLabels: { fontSize: 10, fontWeight: '400' },
              style: { borderRadius: 8 },
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#3f51b5' },
              propsForBackgroundLines: { stroke: '#f0f0f0' },
              count: 4,
              data: [min, max], 
            }}
            bezier
            style={styles.chart}
            onDataPointClick={handleDataPointClick}
            getDotColor={(dataPoint, dataPointIndex) => tooltip.index === dataPointIndex ? '#ff9800' : '#3f51b5'}
          />
          {tooltip.visible && (
            <View style={[
              styles.tooltip, 
              { left: tooltip.x - 35 },
              tooltip.y < 50 ? { top: tooltip.y + 10 } : { top: tooltip.y - 55 }
            ]}>
              <Text style={styles.tooltipText}>{tooltip.value} {displayUnit}</Text>
              <Text style={styles.tooltipDate}>{tooltip.date}</Text>
              {tooltip.y < 50 ? (
                 <View style={[styles.tooltipArrow, { bottom: '100%', borderBottomColor: '#333', borderTopColor: 'transparent', marginTop: -6 }]} />
              ) : (
                 <View style={styles.tooltipArrow} />
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.chartPlaceholder}>
          <Text style={styles.emptyText}>No data logged for this period</Text>
        </View>
      )}
    </View>
  );
});

// --- Main Screen ---
export default function WeightScreen() {
  const [userUnit, setUserUnit] = useState('imperial'); 
  const [range, setRange] = useState('1w'); 
  const [recentLogs, setRecentLogs] = useState([]);
  
  const flatListRef = useRef(null);
  const rangeRef = useRef(range);
  useEffect(() => { rangeRef.current = range; }, [range]);

  const [timeOffsets] = useState(Array.from({ length: 52 }, (_, i) => i)); 
  const [visibleDateRange, setVisibleDateRange] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await apiClient.get('/user/profile');
        setUserUnit(profileRes.data.unitPreference || 'imperial');
        const logsRes = await apiClient.get('/weightlogs');
        setRecentLogs(logsRes.data);
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  useEffect(() => {
    const { start, end } = calculateDateRange(0, range);
    if (range === '1y') setVisibleDateRange(format(start, 'yyyy'));
    else if (range === '1m') setVisibleDateRange(format(start, 'MMMM yyyy'));
    else setVisibleDateRange(`${format(start, 'MMM d')} - ${format(end, 'MMM d')}`);

    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: 0, animated: false });
    }
  }, [range]);

  const calculateDateRange = (index, rangeMode) => {
    const now = new Date();
    let start, end;
    if (rangeMode === '1y') {
      const targetDate = subYears(now, index);
      start = startOfYear(targetDate);
      end = endOfYear(targetDate);
    } else if (rangeMode === '1m') {
      const targetDate = subMonths(now, index);
      start = startOfMonth(targetDate);
      end = endOfMonth(targetDate);
    } else {
      // 1w
      const targetDate = subWeeks(now, index);
      start = startOfWeek(targetDate, { weekStartsOn: 1 });
      end = endOfWeek(targetDate, { weekStartsOn: 1 });
    }
    return { start, end };
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].item;
      const currentRange = rangeRef.current; 
      const { start, end } = calculateDateRange(index, currentRange);
      
      if (currentRange === '1y') setVisibleDateRange(format(start, 'yyyy'));
      else if (currentRange === '1m') setVisibleDateRange(format(start, 'MMMM yyyy'));
      else setVisibleDateRange(`${format(start, 'MMM d')} - ${format(end, 'MMM d')}`);
    }
  }).current;

  const renderItem = ({ item }) => {
    const { start, end } = calculateDateRange(item, range);
    return <WeightChartPage startDate={start} endDate={end} range={range} unitPreference={userUnit} />;
  };

  return (
    <ScrollView style={styles.container} scrollEnabled={true}>
      <SafeAreaView>
        <Text style={styles.header}>Weight Progress</Text>

        <View style={styles.rangeContainer}>
          {['1w', '1m', '1y'].map((r) => (
            <TouchableOpacity key={r} style={[styles.rangeButton, range === r && styles.rangeButtonActive]} onPress={() => setRange(r)}>
              <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dateNav}>
          <Text style={styles.dateNavText}>{visibleDateRange || 'Loading...'}</Text>
        </View>

        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={timeOffsets} keyExtractor={(item) => item.toString()} horizontal pagingEnabled inverted={true}
            showsHorizontalScrollIndicator={false} renderItem={renderItem} onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }} initialNumToRender={1} maxToRenderPerBatch={2} windowSize={3}
          />
        </View>
        
        <Text style={styles.header}>Recent Logs</Text>
        {recentLogs.length > 0 ? (<FlatList
          data={recentLogs}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const displayUnit = userUnit === 'imperial' ? 'lbs' : 'kg';
            const displayVal = userUnit === 'imperial' && item.unit === 'kg' 
              ? item.weight * 2.20462 
              : (userUnit === 'metric' && item.unit === 'lbs' ? item.weight / 2.20462 : item.weight);
            
            return (
              <View style={styles.logItem}>
                <View style={styles.logItemTextContainer}>
                  <Text style={styles.logItemName}>{displayVal.toFixed(1)} {displayUnit}</Text>
                  <Text style={styles.logItemDetails}>{format(new Date(item.loggedAt), 'p, MMM d')}</Text>
                </View>
              </View>
            );
          }}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />) : (<Text style={styles.emptyText}>No weight logged yet.</Text>)}
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#333', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  rangeContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10, backgroundColor: '#e8eaf6', marginHorizontal: 24, borderRadius: 8, padding: 2 },
  rangeButton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
  rangeButtonActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  rangeText: { fontSize: 14, fontWeight: '600', color: '#7986cb' },
  rangeTextActive: { color: '#3f51b5' },
  dateNav: { alignItems: 'center', marginBottom: 10 },
  dateNavText: { fontSize: 14, fontWeight: '600', color: '#555' },
  carouselContainer: { height: 240 },
  chartPage: { width: screenWidth, alignItems: 'center', justifyContent: 'center' },
  chartPlaceholder: { height: 220, width: screenWidth - 48, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', marginHorizontal: 24 },
  chart: { borderRadius: 8, marginHorizontal: 24, paddingVertical: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  
  // Tooltip Styles
  tooltip: { position: 'absolute', backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, zIndex: 10, alignItems: 'center' },
  tooltipText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  tooltipDate: { color: '#ccc', fontSize: 11, marginTop: 2 },
  tooltipArrow: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#333', marginTop: 0 },
  
  logItem: { backgroundColor: 'white', padding: 16, marginVertical: 6, marginHorizontal: 24, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  logItemTextContainer: { flex: 1, marginRight: 10 },
  logItemName: { fontSize: 16, fontWeight: '600', color: '#333' },
  logItemDetails: { fontSize: 14, color: '#555', paddingTop: 4 },
  emptyText: { textAlign: 'center', color: '#555', padding: 20, fontSize: 16 },
});