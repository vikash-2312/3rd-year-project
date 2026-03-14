import { useUser } from '@clerk/expo';
import { ArrowLeft01Icon, Activity01Icon, CheckmarkCircle02Icon, Apple01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { format, subDays } from 'date-fns';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../lib/firebase';
import { Button } from '../components/Button';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

interface InsightData {
  summary: string;
  negativeEffects: string[];
  researchMethods: { title: string; description: string }[];
}

export default function AIInsightsScreen() {
  const router = useRouter();
  const { user } = useUser();

  const [isLoading, setIsLoading] = useState(true);
  const [insightData, setInsightData] = useState<InsightData | null>(null);
  const [hasLogs, setHasLogs] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchAndAnalyzeLogs = async () => {
      if (!user) return;
      
      if (!GEMINI_API_KEY) {
        if (isMounted) {
          Alert.alert('Configuration Error', 'Missing Gemini API Key in .env');
          setIsLoading(false);
        }
        return;
      }

      try {
        const endStr = format(new Date(), 'yyyy-MM-dd');
        const startStr = format(subDays(new Date(), 6), 'yyyy-MM-dd');

        const logsQuery = query(
          collection(db, 'logs'),
          where('userId', '==', user.id),
          where('date', '>=', startStr),
          where('date', '<=', endStr),
          where('type', 'in', ['food', 'water'])
        );

        const logsSnapshot = await getDocs(logsQuery);
        
        if (logsSnapshot.empty) {
          if (isMounted) {
            setHasLogs(false);
            setIsLoading(false);
          }
          return;
        }

        const formattedLogs = logsSnapshot.docs.map(doc => {
          const data = doc.data();
          if (data.type === 'food') {
            return `- Food: ${data.name}: ${data.calories} kcal, ${data.protein}g protein, ${data.carbs}g carbs, ${data.fat}g fat (${data.date})`;
          } else if (data.type === 'water') {
            return `- Water logged: ${data.waterLiters} liters (${data.date})`;
          }
          return '';
        }).filter(Boolean).join('\n');

        const prompt = `You are an expert nutritionist and health researcher. 
Your goal is to analyze the user's logged food and water intake to identify long-term positive and negative health effects, and suggest concrete, science-based methods for improvement.
Analyze these food and water logs from the user's past 7 days:
${formattedLogs}

Please do the following:
1. Provide a short, encouraging summary of their overall diet and hydration.
2. Identify how this diet and hydration level may affect their health over time. Specifically, highlight any potential negative effects over time (e.g., lack of fiber, high sugar, low protein, insufficient water intake).
3. Suggest 2-3 step-by-step, science-based research methods or dietary interventions the user can apply to improve their long-term health. Focus on addressing the negative effects identified.

Return ONLY a valid JSON object matching this exact structure, with no markdown formatting or extra text:
{
  "summary": "Overall summary...",
  "negativeEffects": [
    "Potential negative effect 1",
    "Potential negative effect 2"
  ],
  "researchMethods": [
    {
      "title": "Method Title",
      "description": "How to apply this science-based method."
    }
  ]
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }],
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Gemini API returned ${response.status}`);
        }

        const data = await response.json();
        let textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const parsedData = JSON.parse(textResponse) as InsightData;

        if (isMounted) {
          setInsightData(parsedData);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('AI Analysis Error:', error);
        if (isMounted) {
          Alert.alert('Analysis Failed', 'Could not generate health insights at this time. Please try again later.');
          setIsLoading(false);
        }
      }
    };

    fetchAndAnalyzeLogs();

    return () => { isMounted = false; };
  }, [user]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Health Insights</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#009050" />
            <Text style={styles.loadingText}>Analyzing your nutrition over the last 7 days...</Text>
          </View>
        ) : !hasLogs ? (
          <View style={styles.centerContainer}>
            <View style={styles.iconCircle}>
              <HugeiconsIcon icon={Apple01Icon} size={32} color="#A0AEC0" />
            </View>
            <Text style={styles.noLogsTitle}>No Food Logs Found</Text>
            <Text style={styles.noLogsText}>Log your meals for a few days to get personalized, AI-driven health insights and science-backed recommendations.</Text>
            <Button title="Go to Dashboard" onPress={() => router.replace('/(tabs)')} style={{ marginTop: 20 }} />
          </View>
        ) : insightData ? (
          <View style={styles.insightsContainer}>
            {/* Summary Card */}
            <View style={[styles.card, styles.summaryCard]}>
              <View style={styles.cardHeaderRow}>
                <HugeiconsIcon icon={Activity01Icon} size={24} color="#3182CE" />
                <Text style={[styles.cardTitle, { color: '#3182CE' }]}>Diet Summary</Text>
              </View>
              <Text style={styles.summaryText}>{insightData.summary}</Text>
            </View>

            {/* Negative Effects Card */}
            <View style={[styles.card, styles.warningCard]}>
              <View style={styles.cardHeaderRow}>
                <Text style={{ fontSize: 20 }}>⚠️</Text>
                <Text style={[styles.cardTitle, { color: '#E53E3E' }]}>Health Impact Over Time</Text>
              </View>
              {insightData.negativeEffects.map((item, index) => (
                <View key={index} style={styles.bulletRow}>
                  <View style={styles.bulletDotWarning} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Research Methods Card */}
            <View style={[styles.card, styles.researchCard]}>
              <View style={styles.cardHeaderRow}>
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} color="#009050" />
                <Text style={[styles.cardTitle, { color: '#009050' }]}>Science-Based Methods</Text>
              </View>
              {insightData.researchMethods.map((method, index) => (
                <View key={index} style={styles.methodItem}>
                  <View style={styles.methodHeader}>
                    <Text style={styles.methodNumber}>{index + 1}</Text>
                    <Text style={styles.methodTitle}>{method.title}</Text>
                  </View>
                  <Text style={styles.methodDescription}>{method.description}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    fontWeight: '500',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noLogsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  noLogsText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
  },
  insightsContainer: {
    gap: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3182CE',
  },
  summaryText: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 24,
  },
  warningCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#E53E3E',
    backgroundColor: '#FFF5F5',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 10,
  },
  bulletDotWarning: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53E3E',
    marginTop: 8,
    marginRight: 12,
  },
  bulletText: {
    fontSize: 15,
    color: '#2D3748',
    lineHeight: 24,
    flex: 1,
  },
  researchCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#009050',
    backgroundColor: '#F0FFF4',
  },
  methodItem: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  methodNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E6FFFA',
    color: '#009050',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: 'bold',
    fontSize: 12,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    flex: 1,
  },
  methodDescription: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
    paddingLeft: 34,
  }
});
