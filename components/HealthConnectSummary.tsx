import React from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useHealthData } from '../hooks/useHealthData';
import { useTheme } from '../lib/ThemeContext';

export const HealthConnectSummary = () => {
  const { colors } = useTheme();
  const { data, loading, error, isAvailable, permissionGranted, refresh } = useHealthData();

  if (Platform.OS !== 'android') {
    return null; // Health connect is android only
  }

  const handleInstall = () => {
    Linking.openURL('market://details?id=com.google.android.apps.healthdata');
  };

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading health data...</Text>
      </View>
    );
  }

  if (!isAvailable) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Health Connect</Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Health Connect is not installed on this device.
        </Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleInstall}>
          <Text style={styles.buttonText}>Install Health Connect</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error || !permissionGranted) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Health Connect</Text>
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {error || 'Permissions not granted.'}
        </Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={refresh}>
          <Text style={styles.buttonText}>Retry Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Health Data Overview</Text>
        <TouchableOpacity onPress={refresh}>
          <Text style={[styles.refreshText, { color: colors.accent }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.text }]}>{data.steps}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Steps</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.text }]}>{data.calories}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cal Burned</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.text }]}>{data.sleepHours}h</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sleep</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.text }]}>{data.distance} km</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Distance</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  errorText: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
});
