import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // --- New state to hold the specific error message ---
  const [error, setError] = useState(''); 
  
  const { register } = useContext(AuthContext);

  const handleRegister = async () => {
    // Clear any previous errors when the user tries again
    setError(''); 

    if (!username || !email || !password) {
      setError('Please fill in all fields.'); // Set local error for empty fields
      return;
    }
    
    // --- New try...catch block to handle errors from the context ---
    try {
      const success = await register(username, email, password);
      if (success) {
        navigation.navigate('Login');
      }
    } catch (e) {
      // Catch the specific error message and set it in our state
      setError(e.message); 
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      {/* --- New component to display the error message --- */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#ffffff", padding: 20, justifyContent: 'center' },
    title: { fontSize: 32, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
    input: {
        height: 50,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 16,
        marginBottom: 16,
        fontSize: 16,
    },
    // --- New style for the error text ---
    errorText: {
      color: 'red',
      textAlign: 'center',
      marginBottom: 10,
      fontSize: 14,
    },
    button: {
        backgroundColor: '#0eafe9',
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
    linkText: {
        marginTop: 20,
        color: '#0eafe9',
        textAlign: 'center',
        fontSize: 16,
    }
});