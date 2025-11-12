import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, SafeAreaView
} from 'react-native';
import apiClient from '../api/client';

export default function AiCoachScreen() {
  const [suggestion, setSuggestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGetAiAdvice = async () => {
    setIsLoading(true);
    setSuggestion(''); // Clear old suggestion
    try {
      // Get the user's timezone to pass to the backend
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await apiClient.get('/ai/suggestion', {
        params: { tz: userTimeZone }
      });

      // Set the AI-generated text to be displayed
      setSuggestion(response.data.suggestion);

    } catch (error) {
      const message = error.response?.data?.error || 'Could not get AI advice.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Your AI Coach</Text>
        <Text style={styles.subtitle}>
          Get personalized feedback on your progress based on your goals and logged data.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleGetAiAdvice}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Get Fresh Advice</Text>
          )}
        </TouchableOpacity>

        {suggestion ? (
          <View style={styles.suggestionBox}>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        ) : (
          !isLoading && (
            <Text style={styles.emptyText}>Tap the button to generate your first report!</Text>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#3f51b5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  suggestionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#555',
    fontSize: 16,
    marginTop: 20,
  }
});