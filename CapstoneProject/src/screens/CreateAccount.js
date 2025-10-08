import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {KeyboardAvoidingView, Platform, ScrollView,StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';

const GOALS = ["Lose Weight", "Gain Muscle", "Maintain Weight"]

export default function CreateAccount({ onBack }) {
  const[username,setUsername] = useState('');
  const[password, setPassword] = useState(''); 
  const[confirm, setConfirm] = useState(''); 
  const[height, setHeight] = useState(''); 
  const[weight, setWeight] = useState('');
  const[goal,setGoal] = useState(GOALS[0]);

  const onSubmit = () => {
    //Backend stuff for later 
  }

  return (
    <SafeAreaView style={{flex:1,backgroundColor:'#f5f5f5'}}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Set up your profile</Text>

        //Username
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

        <View style={styles.row}>
          <View style={[styles.half]}>
            <Text style={styles.label}>Height</Text>
            <TextInput
            style={styles.input}
            placeholder=""
            keyboardType="numeric"
            value={height}
            onChangeText={setHeight}
            ></TextInput>
          </View>
        </View>
        <View styles= {styles.row}>
            <Text style={styles.label}>Weight</Text>
            <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor="#8c8c8c"
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
            ></TextInput>
        </View>
      
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
