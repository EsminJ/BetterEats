import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {KeyboardAvoidingView, Platform, ScrollView,StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';

const GOALS = ["Lose Weight", "Gain Muscle", "Maintain Weight"]
const IMPERIAL = 'imperial';
const METRIC = 'metric';

const inToCm = (ft,inch) => {
  return ((Number(ft)||0) * 12 + (Number(inch)||0)) * 2.54;
}
const cmToFtIn = (cm) => {
  const totalIn = (Number(cm)||0)/2.54;
  const ft = Math.floor(totalIn/12); 
  const inch = Math.round(totalIn - ft * 12);
  return {ft,inch}
}

const lbsToKg = (lbs) => {
  return (Number(lbs)||0) * 0.45359237;
}
const kgToLbs = (kg) => {
  return (Number(kg)||0)/ 0.45359237;
}

export default function CreateAccount({ onBack }) {
  const[username,setUsername] = useState('');
  const[password, setPassword] = useState(''); 
  const[confirm, setConfirm] = useState(''); 
  const[height, setHeight] = useState(''); 
  const[weight, setWeight] = useState('');
  const[goal,setGoal] = useState(GOALS[0]);
  const[unit,setUnit] = useState(IMPERIAL); 
  const[heightFt, setHeightFt] = useState('');
  const[heightIn, setHeightIn] = useState(''); 
  const[heightCm, setHeightCm] = useState(''); 
  const[weightLbs, setWeightLbs] = useState(''); 
  const[weightKg, setWeightKg] = useState(''); 


  const switchUnit = (next) => {
    if(next === unit) return; 

    if(next === METRIC){
      const cm = inToCm(heightFt, heightIn)
    

      if(cm){
        setHeightCm(String(Math.round(cm)))
      }
      else{
        setHeightCm('');
      }

      if(weightLbs){
        const kg = lbsToKg(weightLbs);
        setWeightKg(String(Math.round(kg)));
      }
      else{
        setWeightKg(''); 
      }
    }  
    
    else{  
      const {ft, inch} = cmToFtIn(heightCm); 

      if(ft){
        setHeightFt(String(ft));
      }
      else{
        setHeightFt('');
      }

      if(inch){
        setHeightIn(String(inch));
      }
      else{
        setHeightIn('');
      }

      if(weightKg){
        const lbs = kgToLbs(weightKg);
        setWeightLbs(String(Math.round(lbs)));
      }
      else{
        setWeightLbs(''); 
      }

    }
    setUnit(next);
  };

  const onSubmit = () => {
    //Backend stuff for later 
  }

  return (
    <SafeAreaView style={{flex:1,backgroundColor:'#f5f5f5'}}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Set up your profile</Text>

    
        <Text style={styles.label}>Username</Text>
        <TextInput 
          style = {styles.input}
          palceholder= "Enter username"
          placeholderTextColor= "#8c8c8c"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        ></TextInput>

        <Text style={styles.label}>Password</Text>
        <TextInput 
        style = {styles.input}
        palceholder= "Enter password"
        placeholderTextColor= "#8c8c8c"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        ></TextInput>

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput 
          style = {styles.input}
          palceholder= "Confirm Password"
          placeholderTextColor= "#8c8c8c"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        ></TextInput>

        <Text style = {styles.label}>Units</Text>
        <View style={styles.goalRow}>
          <TouchableOpacity
            onPress = {() => switchUnit(IMPERIAL)}
            style = {[styles.chip, unit === IMPERIAL && styles.chipActive]}
            >
              <Text style={[styles.chipText, unit === IMPERIAL && styles.chipTextActive]}>
                Imperial (Feet/Inches,lb)
              </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress = {() => switchUnit(METRIC)}
            style = {[styles.chip, unit === METRIC && styles.chipActive]}
            >
            <Text style={[styles.chipText, unit === METRIC && styles.chipTextActive]}>
              Metric (Centimeters, Kilogorams)
            </Text>
          </TouchableOpacity>
        </View>

        <Text style = {styles.label}>Height</Text>
        {unit === IMPERIAL ? (
          <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="ft"
            keyboardType="numeric"
            value={heightFt}
            onChangeText={setHeightFt}
          />
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="in"
            keyboardType="numeric"
            value={heightIn}
            onChangeText={setHeightIn}
          />
        </View>
      ) : (
        <TextInput
          style={styles.input}
          placeholder="cm"
          keyboardType="numeric"
          value={heightCm}
          onChangeText={setHeightCm}
        />
        )}


        <Text style = {styles.label}>Weight</Text>
        {unit === IMPERIAL ?(
          <TextInput
            style={styles.input}
            placeholder="lb"
            keyboardType="numeric"
            value={weightLbs}
            onChangeText={setWeightLbs}
          />
        ):(
          <TextInput
            style={styles.input}
            placeholder="kg"
            keyboardType="numeric"
            value={weightKg}
            onChangeText={setWeightKg}
          />
        )}
      
        <Text style= {styles.label}>Goal</Text>
        <View style={styles.goalRow}>
          {GOALS.map ( g=> (
            <TouchableOpacity
              key={g}
              onPress={()=> setGoal(g)}
              style = {[styles.chip, goal === g && styles.chipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, goal === g && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>



      <TouchableOpacity style={styles.primary} onPress={onSubmit} activeOpacity={0.85}>
          <Text style={styles.primaryText}>Create Account</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkBtn} onPress={onBack}>
          <Text style={styles.linkText}>Back to Login</Text>
      </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content:{
    
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 40,
    marginTop:40
  },
  message: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#3f51b5',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input:{
    width: '100%', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    backgroundColor: '#fff',
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  row:{
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 4
  },
  goalRow:{
    flexDirection:'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom:16,
    marginTop:4
  },
  chip:{
    paddingVertical:8, 
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#3f51b5'
  },
  chipActive:{
    backgroundColor:'#3f51b5',
  },
  chipText:{
    color: '#3f51b5',
    frontWeight: '600'
  },
  chipTextActive:{
    color:'#fff'
  },
  primary:{
    backgroundColor:'#3f51b5',
    paddingVertical:14,
    borderRadius:8,
    alignItems:'center'
  },
  primaryText:{
    color:'#fff',
    fontSize:16,
    fontWeight:'700'
  },
  linkBtn: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#3f51b5', fontWeight: '600' },
  half: { flex: 1, minWidth: 150 },
});
