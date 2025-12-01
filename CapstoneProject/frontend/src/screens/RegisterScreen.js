import React, { useState, useContext, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, Alert
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

const GOALS = ["Lose Weight", "Gain Muscle", "Maintain Weight"];
const ACTIVITIES = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"];
const IMPERIAL = 'imperial';
const METRIC = 'metric';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [goal, setGoal] = useState(GOALS[0]);
  const [error, setError] = useState('');

  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [activityLevel, setActivityLevel] = useState('Sedentary');

  // Unit System State
  const [unit, setUnit] = useState(IMPERIAL);
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const { register } = useContext(AuthContext);

  // Refs
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const ageRef = useRef(null);

  const handleRegister = async () => {
    setError('');

    const isHeightMissing = unit === IMPERIAL ? (!heightFt) : !heightCm; 
    const isWeightMissing = unit === IMPERIAL ? !weightLbs : !weightKg;

    if (!username || !email || !password || !confirmPassword || isHeightMissing || isWeightMissing || !age) {
       setError('Please fill in all fields.');
       return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const success = await register(
        username, email, password,
        unit, heightFt, heightIn, heightCm, weightLbs, weightKg, goal,
        age, gender, activityLevel
      );
      if (success) {
        navigation.navigate('Login');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Set up your profile</Text>

          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} placeholder="Enter username" value={username} onChangeText={setUsername} autoCapitalize="none" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />

          <Text style={styles.label}>Email</Text>
          <TextInput ref={emailRef} style={styles.input} placeholder="Enter email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />

          <Text style={styles.label}>Password</Text>
          <TextInput ref={passwordRef} style={styles.input} placeholder="Enter password" value={password} onChangeText={setPassword} secureTextEntry returnKeyType="next" onSubmitEditing={() => confirmPasswordRef.current?.focus()} />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput ref={confirmPasswordRef} style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry returnKeyType="next" onSubmitEditing={() => ageRef.current?.focus()} />

          {/* --- Personal Details --- */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Age</Text>
              <TextInput ref={ageRef} style={styles.input} placeholder="Age" keyboardType="numeric" value={age} onChangeText={setAge} returnKeyType="next" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity onPress={() => setGender('Male')} style={[styles.genderBtn, gender === 'Male' && styles.genderBtnActive]}>
                  <Text style={[styles.genderText, gender === 'Male' && styles.genderTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setGender('Female')} style={[styles.genderBtn, gender === 'Female' && styles.genderBtnActive]}>
                  <Text style={[styles.genderText, gender === 'Female' && styles.genderTextActive]}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* --- Units & Measurements --- */}
          <Text style={styles.label}>Height & Weight</Text>
          <View style={styles.unitRow}>
            <TouchableOpacity onPress={() => setUnit(IMPERIAL)} style={[styles.chip, unit === IMPERIAL && styles.chipActive]}>
              <Text style={[styles.chipText, unit === IMPERIAL && styles.chipTextActive]}>Imperial</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setUnit(METRIC)} style={[styles.chip, unit === METRIC && styles.chipActive]}>
              <Text style={[styles.chipText, unit === METRIC && styles.chipTextActive]}>Metric</Text>
            </TouchableOpacity>
          </View>

          {unit === IMPERIAL ? (
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="ft" keyboardType="numeric" value={heightFt} onChangeText={setHeightFt} />
              <TextInput style={[styles.input, { flex: 1, marginLeft: 10 }]} placeholder="in" keyboardType="numeric" value={heightIn} onChangeText={setHeightIn} />
              <TextInput style={[styles.input, { flex: 2, marginLeft: 10 }]} placeholder="lbs" keyboardType="numeric" value={weightLbs} onChangeText={setWeightLbs} />
            </View>
          ) : (
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="cm" keyboardType="numeric" value={heightCm} onChangeText={setHeightCm} />
              <TextInput style={[styles.input, { flex: 1, marginLeft: 10 }]} placeholder="kg" keyboardType="numeric" value={weightKg} onChangeText={setWeightKg} />
            </View>
          )}

          <Text style={styles.label}>Activity Level</Text>
          <View style={styles.chipContainer}>
            {ACTIVITIES.map(a => (
              <TouchableOpacity key={a} onPress={() => setActivityLevel(a)} style={[styles.chip, activityLevel === a && styles.chipActive]}>
                <Text style={[styles.chipText, activityLevel === a && styles.chipTextActive]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Goal</Text>
          <View style={styles.chipContainer}>
            {GOALS.map(g => (
              <TouchableOpacity key={g} onPress={() => setGoal(g)} style={[styles.chip, goal === g && styles.chipActive]}>
                <Text style={[styles.chipText, goal === g && styles.chipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.primary} onPress={handleRegister} activeOpacity={0.85}>
            <Text style={styles.primaryText}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, },
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 24, },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8, marginTop: 20, textAlign: 'center', },
  subtitle: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 24, },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, },
  input:{ width: '100%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#fff', fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#ddd' },
  row:{ flexDirection: 'row', marginBottom: 16 },
  genderRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', overflow: 'hidden' },
  genderBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  genderBtnActive: { backgroundColor: '#3f51b5' },
  genderText: { fontSize: 14, color: '#555', fontWeight: '600' },
  genderTextActive: { color: '#fff' },
  unitRow: { flexDirection:'row', gap: 10, marginBottom: 10 },
  chipContainer:{ flexDirection:'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip:{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#3f51b5' },
  chipActive:{ backgroundColor:'#3f51b5', },
  chipText:{ color: '#3f51b5', fontWeight: '600', fontSize: 13 },
  chipTextActive:{ color:'#fff' },
  primary:{ backgroundColor:'#3f51b5', paddingVertical: 14, borderRadius: 8, alignItems:'center', marginTop: 16, },
  primaryText:{ color:'#fff', fontSize: 16, fontWeight:'600' },
  linkBtn: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#3f51b5', fontWeight: '600' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 12, fontSize: 14, },
});