import React, { useState, useContext, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, Alert
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

// Constants and Helper Functions
const GOALS = ["Lose Weight", "Gain Muscle", "Maintain Weight"];
const IMPERIAL = 'imperial';
const METRIC = 'metric';

const inToCm = (ft, inch) => {
  return ((Number(ft) || 0) * 12 + (Number(inch) || 0)) * 2.54;
};
const cmToFtIn = (cm) => {
  const totalIn = (Number(cm) || 0) / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return { ft, inch };
};
const lbsToKg = (lbs) => {
  return (Number(lbs) || 0) * 0.45359237;
};
const kgToLbs = (kg) => {
  return (Number(kg) || 0) / 0.45359237;
};

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [goal, setGoal] = useState(GOALS[0]);
  const [error, setError] = useState('');

  // Unit System State
  const [unit, setUnit] = useState(IMPERIAL);
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const { register } = useContext(AuthContext);

  // Refs for focusing next input
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const heightFtRef = useRef(null);
  const heightInRef = useRef(null);
  const heightCmRef = useRef(null);
  const weightLbsRef = useRef(null);
  const weightKgRef = useRef(null);

  const switchUnit = (next) => {
    if (next === unit) return;
    if (next === METRIC) {
      const cm = inToCm(heightFt, heightIn);
      if (cm > 0) { setHeightCm(String(Math.round(cm))); } else { setHeightCm(''); }
      if (weightLbs) { const kg = lbsToKg(weightLbs); setWeightKg(String(Math.round(kg))); } else { setWeightKg(''); }
    } else { // Switching to Imperial
      const { ft, inch } = cmToFtIn(heightCm);
      if (ft > 0) { setHeightFt(String(ft)); } else { setHeightFt(''); }
      if (inch > 0) { setHeightIn(String(inch)); } else { setHeightIn(''); }
      if (weightKg) { const lbs = kgToLbs(weightKg); setWeightLbs(String(Math.round(lbs))); } else { setWeightLbs(''); }
    }
    setUnit(next);
  };

  const handleRegister = async () => {
    setError('');

    const isHeightMissing = unit === IMPERIAL ? (!heightFt && !heightIn) : !heightCm; // Allow 0 inches
    const isWeightMissing = unit === IMPERIAL ? !weightLbs : !weightKg;

    if (!username || !email || !password || !confirmPassword || isHeightMissing || isWeightMissing) {
       setError('Please fill in all fields.');
       return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      // Pass all relevant data to the context function
      const success = await register(
        username, email, password,
        unit, heightFt, heightIn, heightCm, weightLbs, weightKg, goal
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Use height for Android if needed
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Set up your profile</Text>

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input} placeholder="Enter username" placeholderTextColor="#8c8c8c"
            value={username} onChangeText={setUsername} autoCapitalize="none" returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            ref={emailRef} style={styles.input} placeholder="Enter email" placeholderTextColor="#8c8c8c"
            value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            ref={passwordRef} style={styles.input} placeholder="Enter password (min. 6 characters)" placeholderTextColor="#8c8c8c"
            value={password} onChangeText={setPassword} secureTextEntry returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            ref={confirmPasswordRef} style={styles.input} placeholder="Confirm Password" placeholderTextColor="#8c8c8c"
            value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry returnKeyType="next"
            onSubmitEditing={() => unit === IMPERIAL ? heightFtRef.current?.focus() : heightCmRef.current?.focus()}
          />

          <Text style={styles.label}>Units</Text>
          <View style={styles.goalRow}>
            <TouchableOpacity onPress={() => switchUnit(IMPERIAL)} style={[styles.chip, unit === IMPERIAL && styles.chipActive]}>
              <Text style={[styles.chipText, unit === IMPERIAL && styles.chipTextActive]}>Imperial (ft/in, lbs)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => switchUnit(METRIC)} style={[styles.chip, unit === METRIC && styles.chipActive]}>
              <Text style={[styles.chipText, unit === METRIC && styles.chipTextActive]}>Metric (cm, kg)</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Height</Text>
          {unit === IMPERIAL ? (
            <View style={styles.row}>
              <TextInput ref={heightFtRef} style={[styles.input, styles.half]} placeholder="ft" keyboardType="numeric" value={heightFt} onChangeText={setHeightFt} returnKeyType="next" onSubmitEditing={() => heightInRef.current?.focus()} />
              <TextInput ref={heightInRef} style={[styles.input, styles.half]} placeholder="in" keyboardType="numeric" value={heightIn} onChangeText={setHeightIn} returnKeyType="next" onSubmitEditing={() => weightLbsRef.current?.focus()} />
            </View>
          ) : (
            <TextInput ref={heightCmRef} style={styles.input} placeholder="cm" keyboardType="numeric" value={heightCm} onChangeText={setHeightCm} returnKeyType="next" onSubmitEditing={() => weightKgRef.current?.focus()} />
          )}

          <Text style={styles.label}>Weight</Text>
          {unit === IMPERIAL ? (
            <TextInput ref={weightLbsRef} style={styles.input} placeholder="lbs" keyboardType="numeric" value={weightLbs} onChangeText={setWeightLbs} returnKeyType="done" />
          ) : (
            <TextInput ref={weightKgRef} style={styles.input} placeholder="kg" keyboardType="numeric" value={weightKg} onChangeText={setWeightKg} returnKeyType="done" />
          )}

          <Text style={styles.label}>Goal</Text>
          <View style={styles.goalRow}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g} onPress={() => setGoal(g)} style={[styles.chip, goal === g && styles.chipActive]} activeOpacity={0.8}>
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
  subtitle: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 32, },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, },
  input:{ width: '100%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#fff', fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#ddd' },
  row:{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, },
  half: { flex: 1, },
  goalRow:{ flexDirection:'row', flexWrap: 'wrap', gap: 8, marginBottom: 24, marginTop: 4 },
  chip:{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 9999, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#3f51b5' },
  chipActive:{ backgroundColor:'#3f51b5', },
  chipText:{ color: '#3f51b5', fontWeight: '600', },
  chipTextActive:{ color:'#fff' },
  primary:{ backgroundColor:'#3f51b5', paddingVertical: 14, borderRadius: 8, alignItems:'center', marginTop: 16, },
  primaryText:{ color:'#fff', fontSize: 16, fontWeight:'600' },
  linkBtn: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#3f51b5', fontWeight: '600' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 12, marginTop: -4, fontSize: 14, },
});