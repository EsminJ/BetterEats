import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, SafeAreaView, Image
} from 'react-native';
import apiClient from '../api/client';
import { Ionicons } from '@expo/vector-icons';

// This handles bold text and bullet points from Gemini
const MarkdownText = ({ children }) => {
  if (!children) return null;

  const parts = children.split(/(\*\*.*?\*\*|\n\* )/g);

  return (
    <Text style={styles.suggestionText}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Render bold text
          return (
            <Text key={index} style={styles.boldText}>
              {part.slice(2, -2)}
            </Text>
          );
        } else if (part.startsWith('\n* ')) {
          // Render bullet point
          return (
            <Text key={index} style={styles.bulletPoint}>
              {'\n• ' + part.slice(3)}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

export default function AiCoachScreen() {
  const [suggestion, setSuggestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGetAiAdvice = async () => {
    setIsLoading(true);
    setSuggestion('');
    setError('');
    
    try {
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await apiClient.get('/ai/suggestion', {
        params: { tz: userTimeZone }
      });
      setSuggestion(response.data.suggestion);
    } catch (err) {
      const message = err.response?.data?.error || 'Could not connect to AI Coach.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={32} color="#3f51b5" />
          </View>
          <Text style={styles.title}>Your AI Coach</Text>
          <Text style={styles.subtitle}>
            Personalized nutrition & fitness advice based on your recent logs.
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetAiAdvice}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.buttonText}>Analyzing data...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>
              {suggestion ? 'Refresh Advice' : 'Generate Report'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color="#c62828" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Content Area */}
        {suggestion ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Analysis Report</Text>
              <Text style={styles.cardDate}>{new Date().toLocaleDateString()}</Text>
            </View>
            <View style={styles.cardBody}>
              <MarkdownText>{suggestion}</MarkdownText>
            </View>
          </View>
        ) : (
          !isLoading && !error && (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={64} color="#ddd" />
              <Text style={styles.emptyStateText}>
                Tap the button above to analyze your meal and weight trends.
              </Text>
            </View>
          )
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e8eaf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#3f51b5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#3f51b5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Card Styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  cardDate: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  cardBody: {
    padding: 20,
  },
  // Markdown Styles
  suggestionText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#444',
  },
  boldText: {
    fontWeight: '700',
    color: '#1a1a1a',
  },
  bulletPoint: {
    fontWeight: '400',
  },
  // Empty & Error States
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 16,
    maxWidth: 260,
    lineHeight: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    flex: 1,
  },
});