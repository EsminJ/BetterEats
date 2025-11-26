import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

const GOALS = ["Lose Weight", "Gain Muscle", "Maintain Weight"];
const ACTIVITIES = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"];

export default function ProfileScreen({ navigation }) {
  const { logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Local state for Age editing
  const [editAge, setEditAge] = useState('');
  const [isEditingAge, setIsEditingAge] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/user/profile');
      setProfile(res.data);
      setEditAge(String(res.data.age));
    } catch (error) {
      Alert.alert('Error', 'Could not load profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (updates) => {
    setSaving(true);
    try {
      const res = await apiClient.put('/user/goal', updates);
      setProfile(res.data); 
    } catch (error) {
      Alert.alert('Error', 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const saveAge = async () => {
    if (!editAge || isNaN(editAge)) return;
    await handleUpdate({ age: editAge });
    setIsEditingAge(false);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure?", [{ text: "Cancel", style: "cancel" }, { text: "Sign Out", style: "destructive", onPress: logout }]);
  };

  const getDisplayHeight = () => {
    if (!profile?.heightCm) return '--';
    if (profile.unitPreference === 'imperial') {
      const totalInches = profile.heightCm / 2.54;
      const ft = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${ft}' ${inches}"`;
    }
    return `${Math.round(profile.heightCm)} cm`;
  };

  const getDisplayWeight = () => {
    if (!profile?.weightKg) return '--';
    if (profile.unitPreference === 'imperial') {
      return `${Math.round(profile.weightKg * 2.20462)} lbs`;
    }
    return `${Math.round(profile.weightKg)} kg`;
  };

  if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3f51b5" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{profile?.username?.charAt(0).toUpperCase()}</Text></View>
          <Text style={styles.username}>{profile?.username}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
        </View>

        {/* Personal Details Grid */}
        <View style={styles.statsContainer}>
          {/* Height */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Height</Text>
            <Text style={styles.statValue}>{getDisplayHeight()}</Text>
          </View>
          
          {/* Weight */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Start Weight</Text>
            <Text style={styles.statValue}>{getDisplayWeight()}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          {/* Age (Editable) */}
          <TouchableOpacity style={styles.statBox} onPress={() => setIsEditingAge(true)}>
            <Text style={styles.statLabel}>Age</Text>
            {isEditingAge ? (
              <TextInput 
                style={styles.miniInput} 
                value={editAge} 
                onChangeText={setEditAge} 
                keyboardType="numeric" 
                autoFocus 
                onBlur={saveAge} 
                onSubmitEditing={saveAge}
              />
            ) : (
              <Text style={styles.statValue}>{profile?.age} <Ionicons name="pencil" size={12} color="#999" /></Text>
            )}
          </TouchableOpacity>
          
          {/* Gender (Toggleable) */}
          <TouchableOpacity 
            style={styles.statBox} 
            onPress={() => handleUpdate({ gender: profile?.gender === 'Male' ? 'Female' : 'Male' })}
          >
            <Text style={styles.statLabel}>Gender</Text>
            <Text style={styles.statValue}>{profile?.gender} <Ionicons name="refresh" size={12} color="#999" /></Text>
          </TouchableOpacity>
        </View>

        {/* Activity Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Level</Text>
          <View style={styles.goalsContainer}>
            {ACTIVITIES.map((a) => (
              <TouchableOpacity key={a} style={[styles.goalButton, profile?.activityLevel === a && styles.goalButtonActive]} onPress={() => handleUpdate({ activityLevel: a })} disabled={saving}>
                <Text style={[styles.goalText, profile?.activityLevel === a && styles.goalTextActive]}>{a}</Text>
                {profile?.activityLevel === a && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Unit Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Units</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.optionBtn, profile?.unitPreference === 'imperial' && styles.optionBtnActive]} onPress={() => handleUpdate({ unitPreference: 'imperial'})}>
              <Text style={[styles.optionText, profile?.unitPreference === 'imperial' && styles.optionTextActive]}>Imperial (lbs)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionBtn, profile?.unitPreference === 'metric' && styles.optionBtnActive]} onPress={() => handleUpdate({ unitPreference: 'metric'})}>
              <Text style={[styles.optionText, profile?.unitPreference === 'metric' && styles.optionTextActive]}>Metric (kg)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Goal Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Goal</Text>
          <View style={styles.goalsContainer}>
            {GOALS.map((g) => (
              <TouchableOpacity key={g} style={[styles.goalButton, profile?.goal === g && styles.goalButtonActive]} onPress={() => handleUpdate({ goal: g })} disabled={saving}>
                <Text style={[styles.goalText, profile?.goal === g && styles.goalTextActive]}>{g}</Text>
                {profile?.goal === g && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
           <Ionicons name="log-out-outline" size={20} color="#c62828" style={{ marginRight: 8 }} />
           <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3f51b5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  username: { fontSize: 24, fontWeight: '700', color: '#333' },
  email: { fontSize: 16, color: '#666', marginTop: 4 },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, borderWidth: 1, borderColor: '#eee' },
  statLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#333' },
  miniInput: { fontSize: 18, fontWeight: '700', color: '#3f51b5', borderBottomWidth: 1, borderBottomColor: '#3f51b5', padding: 0, width: 40, textAlign: 'center' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  optionBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  optionBtnActive: { backgroundColor: '#3f51b5', borderColor: '#3f51b5' },
  optionText: { fontSize: 14, fontWeight: '600', color: '#555' },
  optionTextActive: { color: '#fff' },
  goalsContainer: { gap: 12 },
  goalButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
  goalButtonActive: { backgroundColor: '#3f51b5', borderColor: '#3f51b5' },
  goalText: { fontSize: 16, color: '#333', fontWeight: '500' },
  goalTextActive: { color: '#fff', fontWeight: '700' },
  logoutButton: { marginTop: 24, backgroundColor: '#ffebee', padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: '#ffcdd2', marginBottom: 40 },
  logoutButtonText: { color: '#c62828', fontSize: 16, fontWeight: '700' },
});