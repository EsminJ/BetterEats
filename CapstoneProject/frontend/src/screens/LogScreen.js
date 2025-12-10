import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, Dimensions, ActivityIndicator,
  Modal, TouchableOpacity, Platform, TextInput, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';
import { 
  format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  startOfYear, endOfYear, subWeeks, subMonths, subYears, 
  eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth, addDays, isAfter, startOfDay 
} from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

const nutrients = [
  { key: 'totalCalories', label: 'Calories', unit: 'kcal', logKey: 'caloriesPerServing' },
  { key: 'totalProtein', label: 'Protein', unit: 'g', logKey: 'proteinPerServing' },
  { key: 'totalFat', label: 'Fat', unit: 'g', logKey: 'fatPerServing' },
  { key: 'totalCarbs', label: 'Carbs', unit: 'g', logKey: 'carbohydratesPerServing' },
];

// --- Helper: Clean Max/Min for Y-Axis ---
const getCleanAxis = (dataPoints) => {
  if (!dataPoints || dataPoints.length === 0) return { min: 0, max: 100 };
  
  let minVal = 0;
  let maxVal = Math.max(...dataPoints);

  if (maxVal === 0) maxVal = 100;

  const padding = maxVal * 0.15; 
  maxVal = Math.ceil(maxVal + padding);

  return { min: 0, max: maxVal };
};

// --- Helper: Process Data ---
const processData = (stats, startDate, endDate, range, nutrientKey) => {
  let timePoints = [];
  let isMonthly = range === '1y';

  if (isMonthly) {
    timePoints = eachMonthOfInterval({ start: startDate, end: endDate });
  } else {
    timePoints = eachDayOfInterval({ start: startDate, end: endDate });
  }

  // REMOVED: The 31-day padding block is gone. 
  // The chart will now reflect exactly the number of days in the month/week.

  const filledData = [];
  const labels = [];
  const tooltipLabels = [];
  const today = startOfDay(new Date());
  
  timePoints.forEach((date, index) => {
    // --- Stop at Today ---
    // If the date is in the future relative to "now", we skip adding it entirely.
    // This cuts the chart off at the current day.
    if (isAfter(date, today)) {
      return; 
    }

    // --- Value Logic ---
    const match = stats.find(s => {
      const statDate = parseISO(s._id);
      return isMonthly ? isSameMonth(statDate, date) : isSameDay(statDate, date);
    });

    if (match) {
      const val = Math.round(match[nutrientKey] || 0);
      filledData.push(val);
    } else {
      filledData.push(0); 
    }

    // --- Label Logic ---
    if (range === '1w') {
      labels.push(format(date, 'EEE')); 
      tooltipLabels.push(format(date, 'EEE'));
    } else if (range === '1y') {
      labels.push(format(date, 'MMM')); 
      tooltipLabels.push(format(date, 'MMM yyyy'));
    } else {
      // 1M: Show label every 3 days (1, 4, 7, 10...)
      labels.push(index % 3 === 0 ? format(date, 'd') : '');
      tooltipLabels.push(format(date, 'MMM d'));
    }
  });

  return { data: filledData, labels, tooltipLabels };
};

// --- Sub-Component: Individual Chart Page ---
const MealChartPage = React.memo(({ startDate, endDate, range, nutrient }) => {
  const [chartData, setChartData] = useState({ data: [0], labels: [], tooltipLabels: [] });
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState({ visible: false, value: 0, date: '', x: 0, y: 0, index: -1 });

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await apiClient.get('/meallogs/stats', { 
          params: { 
            startDate: startDate.toISOString(), 
            endDate: endDate.toISOString(), 
            range, 
            tz: userTimeZone 
          } 
        });
        
        if (isMounted) {
          const processed = processData(response.data, startDate, endDate, range, nutrient.key);
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
  }, [startDate, endDate, range, nutrient]);

  const { max } = getCleanAxis(chartData.data);

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

  const hasData = chartData.data.length > 0;

  // Prevent tooltip from going off screen edges
  let tooltipLeft = tooltip.x - 35; 
  if (tooltipLeft < 0) tooltipLeft = 0;
  if (tooltipLeft > screenWidth - 100) tooltipLeft = screenWidth - 100;

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
            fromZero={true}
            withVerticalLines={true}
            segments={4}
            yAxisSuffix="" 
            verticalLabelRotation={0}
            chartConfig={{
              backgroundColor: '#ffffff', backgroundGradientFrom: '#ffffff', backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(63, 81, 181, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(85, 85, 85, ${opacity})`,
              propsForLabels: { fontSize: 10, fontWeight: '400' },
              style: { borderRadius: 8 },
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#3f51b5' },
              propsForBackgroundLines: { stroke: '#e0e0e0' },
              count: 4,
              data: [0, max], 
            }}
            bezier
            style={styles.chart}
            onDataPointClick={handleDataPointClick}
            getDotColor={(dataPoint, dataPointIndex) => tooltip.index === dataPointIndex ? '#ff9800' : '#3f51b5'}
          />
          {tooltip.visible && (
            <View style={[
              styles.tooltip, 
              { left: tooltipLeft },
              // Flip tooltip if point is high (y < 50 pixels from top)
              tooltip.y < 50 ? { top: tooltip.y + 10 } : { top: tooltip.y - 55 }
            ]}>
              <Text style={styles.tooltipText}>{tooltip.value} {nutrient.unit}</Text>
              <Text style={styles.tooltipDate}>{tooltip.date}</Text>
              
              {/* Flip Arrow */}
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
          <Text style={styles.emptyText}>No meals logged for this period</Text>
        </View>
      )}
    </View>
  );
});

// --- Main Screen ---
export default function LogScreen() {
  const [range, setRange] = useState('1w'); 
  const [selectedNutrient, setSelectedNutrient] = useState(nutrients[0]); 
  const [recentLogs, setRecentLogs] = useState([]);
  
  const flatListRef = useRef(null);
  const rangeRef = useRef(range);
  useEffect(() => { rangeRef.current = range; }, [range]);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [newLogDate, setNewLogDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isNutritionModalVisible, setIsNutritionModalVisible] = useState(false);
  const [editingFood, setEditingFood] = useState({ name: '', servings: [{ nutrients: {} }] });

  const [timeOffsets] = useState(Array.from({ length: 52 }, (_, i) => i)); 
  const [visibleDateRange, setVisibleDateRange] = useState('');

  useEffect(() => {
    fetchRecentLogs();
  }, []);

  // Refresh logs whenever the screen regains focus (e.g., after leaving Home)
  useFocusEffect(
    useCallback(() => {
      fetchRecentLogs();
    }, [])
  );

  useEffect(() => {
    const { start, end } = calculateDateRange(0, range); 
    if (range === '1y') setVisibleDateRange(format(start, 'yyyy'));
    else if (range === '1m') setVisibleDateRange(format(start, 'MMMM yyyy'));
    else setVisibleDateRange(`${format(start, 'MMM d')} - ${format(end, 'MMM d')}`);

    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: 0, animated: false });
    }
  }, [range]);

  const fetchRecentLogs = async () => {
    try {
      const logsRes = await apiClient.get('/meallogs');
      setRecentLogs(logsRes.data);
    } catch (e) { console.error(e); }
  };

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
    return (
      <MealChartPage 
        startDate={start} 
        endDate={end} 
        range={range} 
        nutrient={selectedNutrient} 
      />
    );
  };

  // Handlers
  const openEditModal = (log) => { setSelectedLog(log); setNewLogDate(new Date(log.loggedAt)); setIsEditModalVisible(true); };
  const openNutritionModal = () => {
    if (!selectedLog) return;
    const foodToEdit = JSON.parse(JSON.stringify(selectedLog.foodId));
    if (!foodToEdit.servings || foodToEdit.servings.length === 0) foodToEdit.servings = [{ description: '1 serving', nutrients: { calories: 0, protein: 0, fat: 0, carbohydrates: 0 } }];
    setEditingFood(foodToEdit); setIsEditModalVisible(false); setIsNutritionModalVisible(true);
  };
  const onChangeDate = (event, selectedDate) => { const currentDate = selectedDate || newLogDate; setShowDatePicker(Platform.OS === 'ios'); setNewLogDate(currentDate); };
  const handleUpdateLogTime = async () => { if (!selectedLog) return; try { await apiClient.put(`/meallogs/${selectedLog._id}`, { loggedAt: newLogDate.toISOString() }); setIsEditModalVisible(false); fetchRecentLogs(); } catch (error) { console.error(error); } };
  const handleDeleteLog = () => { if (!selectedLog) return; try { apiClient.delete(`/meallogs/${selectedLog._id}`).then(() => { setIsEditModalVisible(false); fetchRecentLogs(); }); } catch (error) { console.error(error); } };
  const handleUpdateNutrition = async () => { if (!selectedLog || !editingFood) return; try { const foodResponse = await apiClient.put(`/foods/${selectedLog.foodId._id}`, editingFood); const newFood = foodResponse.data; await apiClient.put(`/meallogs/${selectedLog._id}`, { foodId: newFood._id }); setIsNutritionModalVisible(false); fetchRecentLogs(); } catch (error) { console.error(error); } };
  const handleNutrientChange = (nutrient, value) => { setEditingFood(currentFood => { const newFood = JSON.parse(JSON.stringify(currentFood)); if (!newFood.servings[0]) newFood.servings[0] = { nutrients: {} }; newFood.servings[0].nutrients[nutrient] = value.replace(/[^0-9.]/g, ''); return newFood; }); };

  return (
    <ScrollView style={styles.container} scrollEnabled={true}>
      <SafeAreaView>
        <Text style={styles.header}>Nutrition Progress</Text>
        <View style={styles.rangeContainer}>
          {['1w', '1m', '1y'].map((r) => (
            <TouchableOpacity key={r} style={[styles.rangeButton, range === r && styles.rangeButtonActive]} onPress={() => setRange(r)}>
              <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.nutrientSelectorContainer}>
          {nutrients.map((nutrient) => (
            <TouchableOpacity key={nutrient.key} style={[styles.nutrientButton, selectedNutrient.key === nutrient.key && styles.nutrientButtonSelected]} onPress={() => setSelectedNutrient(nutrient)}>
              <Text style={[styles.nutrientButtonText, selectedNutrient.key === nutrient.key && styles.nutrientButtonTextSelected]}>{nutrient.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.dateNav}><Text style={styles.dateNavText}>{visibleDateRange || 'Loading...'}</Text></View>
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={timeOffsets} keyExtractor={(item) => item.toString()} horizontal pagingEnabled inverted={true}
            showsHorizontalScrollIndicator={false} renderItem={renderItem} onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }} initialNumToRender={1} maxToRenderPerBatch={2} windowSize={3}
          />
        </View>
        <Text style={styles.header}>Recent Meals</Text>
        {recentLogs.length > 0 ? (<FlatList
          data={recentLogs} keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const valuePerServing = item[selectedNutrient.logKey] || 0;
            const totalValue = valuePerServing * (item.quantity || 1);
            const score = item.mealEffectivenessScore;
            const grade = item.scoreGrade;
            const breakdown = item.scoreBreakdown;
            const explanation = item.scoreExplanation;
            return (
              <TouchableOpacity onPress={() => openEditModal(item)}>
                <View style={styles.logItem}>
                  <View style={styles.logItemTextContainer}>
                    <Text style={styles.logItemName}>{item.foodId?.name || 'Deleted Food'}</Text>
                    <Text style={styles.logItemDetails}>{item.mealType} - {format(new Date(item.loggedAt), 'p, MMM d')}</Text>
                    {score != null && (
                      <View style={styles.scoreRow}>
                        <View style={styles.scoreBadge}>
                          <Text style={styles.scoreBadgeText}>{Math.round(score)}</Text>
                        </View>
                        <Text style={styles.scoreGradeText}>{grade || 'Scored'}</Text>
                        {breakdown && (
                          <Text style={styles.scoreBreakdownText}>
                            Cal {breakdown.calorie_alignment_score?.toFixed(0) ?? '--'} • Pro {breakdown.protein_alignment_score?.toFixed(0) ?? '--'} • Mac {breakdown.macro_balance_score?.toFixed(0) ?? '--'}
                          </Text>
                        )}
                      </View>
                    )}
                    {score == null && <Text style={styles.scorePending}>Score unavailable</Text>}
                    {explanation && explanation.length > 0 && (
                      <Text style={styles.scoreHint}>{explanation[0]}</Text>
                    )}
                  </View>
                  <Text style={styles.logItemCalories}>{Math.round(totalValue)} {selectedNutrient.unit}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          scrollEnabled={false} contentContainerStyle={{ paddingBottom: 20 }}
        />) : (<Text style={styles.emptyText}>No meals logged yet.</Text>)}
        <Modal animationType="slide" transparent={true} visible={isEditModalVisible} onRequestClose={() => setIsEditModalVisible(false)}>
          <View style={styles.modalContainer}><View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Log</Text>

              {selectedLog?.mealEffectivenessScore != null && (
                <View style={styles.modalScoreCard}>
                  <View style={styles.modalScoreHeader}>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreBadgeText}>{Math.round(selectedLog.mealEffectivenessScore)}</Text>
                    </View>
                    <Text style={styles.modalScoreGrade}>{selectedLog.scoreGrade || 'Scored'}</Text>
                  </View>
                  {selectedLog.scoreBreakdown && (
                    <Text style={styles.modalScoreBreakdown}>
                      Cal {selectedLog.scoreBreakdown.calorie_alignment_score?.toFixed(0) ?? '--'} • Pro {selectedLog.scoreBreakdown.protein_alignment_score?.toFixed(0) ?? '--'} • Mac {selectedLog.scoreBreakdown.macro_balance_score?.toFixed(0) ?? '--'}
                    </Text>
                  )}
                  {Array.isArray(selectedLog.scoreExplanation) && selectedLog.scoreExplanation.length > 0 && (
                    <View style={styles.modalScoreList}>
                      {selectedLog.scoreExplanation.map((note, idx) => (
                        <Text key={idx} style={styles.modalScoreNote}>• {note}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.modalLabel}>Consumption Date & Time</Text><TouchableOpacity onPress={() => setShowDatePicker(true)}><Text style={styles.modalInputDisplay}>{format(newLogDate, 'p, MMM d, yyyy')}</Text></TouchableOpacity>
              {showDatePicker && (<DateTimePicker value={newLogDate} mode="datetime" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onChangeDate} themeVariant="light"/>)}
              <TouchableOpacity style={styles.editNutritionButton} onPress={openNutritionModal}><Text style={styles.editNutritionButtonText}>Edit Nutrition Info</Text></TouchableOpacity><TouchableOpacity style={styles.deleteButton} onPress={handleDeleteLog}><Text style={styles.deleteButtonText}>Delete Log</Text></TouchableOpacity>
              <View style={styles.modalActions}><TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsEditModalVisible(false)}><Text style={styles.modalButtonTextCancel}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleUpdateLogTime}><Text style={styles.modalButtonTextConfirm}>Done</Text></TouchableOpacity></View>
          </View></View>
        </Modal>
        <Modal animationType="slide" transparent={true} visible={isNutritionModalVisible} onRequestClose={() => setIsNutritionModalVisible(false)}>
          <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={styles.modalContent}><ScrollView>
                <Text style={styles.modalTitle}>Edit Nutrition</Text><Text style={styles.modalLabel}>Food Name</Text><TextInput style={styles.modalInput} value={editingFood.name} onChangeText={(text) => setEditingFood({...editingFood, name: text})} /><Text style={styles.modalLabel}>Calories</Text><TextInput style={styles.modalInput} value={String(editingFood.servings?.[0]?.nutrients.calories ?? '')} onChangeText={(text) => handleNutrientChange('calories', text)} keyboardType="numeric" /><Text style={styles.modalLabel}>Protein</Text><TextInput style={styles.modalInput} value={String(editingFood.servings?.[0]?.nutrients.protein ?? '')} onChangeText={(text) => handleNutrientChange('protein', text)} keyboardType="numeric" /><Text style={styles.modalLabel}>Fat</Text><TextInput style={styles.modalInput} value={String(editingFood.servings?.[0]?.nutrients.fat ?? '')} onChangeText={(text) => handleNutrientChange('fat', text)} keyboardType="numeric" /><Text style={styles.modalLabel}>Carbs</Text><TextInput style={styles.modalInput} value={String(editingFood.servings?.[0]?.nutrients.carbohydrates ?? '')} onChangeText={(text) => handleNutrientChange('carbohydrates', text)} keyboardType="numeric" /><View style={styles.modalActions}><TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsNutritionModalVisible(false)}><Text style={styles.modalButtonTextCancel}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleUpdateNutrition}><Text style={styles.modalButtonTextConfirm}>Save Changes</Text></TouchableOpacity></View>
            </ScrollView></View></KeyboardAvoidingView>
        </Modal>

      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5ff' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#333', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  rangeContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10, backgroundColor: '#e8eaf6', marginHorizontal: 24, borderRadius: 8, padding: 2 },
  rangeButton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
  rangeButtonActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  rangeText: { fontSize: 14, fontWeight: '600', color: '#7986cb' },
  rangeTextActive: { color: '#3f51b5' },
  nutrientSelectorContainer: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 24, marginBottom: 16 },
  nutrientButton: { flex: 1, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#3f51b5', backgroundColor: '#fff', alignItems: 'center', marginHorizontal: 4 },
  nutrientButtonSelected: { backgroundColor: '#3f51b5' },
  nutrientButtonText: { fontSize: 12, color: '#3f51b5', fontWeight: '600' },
  nutrientButtonTextSelected: { color: 'white' },
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
  logItemCalories: { fontSize: 16, fontWeight: 'bold', color: '#3f51b5' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  scoreBadge: { backgroundColor: '#3f51b5', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 2 },
  scoreBadgeText: { color: 'white', fontWeight: '700', fontSize: 12 },
  scoreGradeText: { fontSize: 12, color: '#333', fontWeight: '600' },
  scoreBreakdownText: { fontSize: 11, color: '#666' },
  scoreHint: { fontSize: 11, color: '#999', marginTop: 2 },
  scorePending: { fontSize: 12, color: '#999', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#555', padding: 20, fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContent: { width: '90%', maxHeight: '85%', backgroundColor: 'white', borderRadius: 12, padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: '#333' },
  modalScoreCard: { backgroundColor: '#f5f7ff', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#dfe3f5' },
  modalScoreHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalScoreGrade: { fontSize: 14, fontWeight: '700', color: '#3f51b5' },
  modalScoreBreakdown: { marginTop: 6, fontSize: 12, color: '#555' },
  modalScoreList: { marginTop: 6, gap: 4 },
  modalScoreNote: { fontSize: 12, color: '#444' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  modalInput: { width: '100%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f0f0f0', fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#ddd', height: 50 },
  modalInputDisplay: { width: '100%', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f0f0f0', fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#ddd', textAlign: 'center', color: '#333', overflow: 'hidden', height: 50 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingTop: 10 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#3f51b5' },
  modalButtonTextCancel: { color: '#3f51b5', fontSize: 16, fontWeight: '600' },
  confirmButton: { backgroundColor: '#3f51b5' },
  modalButtonTextConfirm: { color: 'white', fontSize: 16, fontWeight: '600' },
  editNutritionButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1.5, borderColor: '#3f51b5', marginTop: 10, marginBottom: 16 },
  editNutritionButtonText: { color: '#3f51b5', fontSize: 16, fontWeight: '600' },
  deleteButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1.5, borderColor: '#c62828', marginBottom: 24 },
  deleteButtonText: { color: '#c62828', fontSize: 16, fontWeight: '600' },
});
