import { Activity01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ActivityItem = {
  id: string;
  name: string;
  calories: number;
  time: string;
  icon?: string;
};

type RecentActivityProps = {
  activities?: ActivityItem[];
};

export function RecentActivity({ activities = [] }: RecentActivityProps) {
  const isEmpty = activities.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
      </View>

      {isEmpty ? (
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyIconContainer}>
            <HugeiconsIcon icon={Activity01Icon} size={48} color="#CBD5E0" />
          </View>
          <Text style={styles.emptyTitle}>No activities logged yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button to log your first meal or workout for the day!
          </Text>
        </View>
      ) : (
        <View style={styles.activityList}>
          {activities.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityIconCircle}>
                <HugeiconsIcon icon={Activity01Icon} size={20} color="#009050" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityName}>{activity.name}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
              <Text style={styles.activityCalories}>{activity.calories} cal</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },

  // Empty State
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Activity List (for when data exists)
  activityList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  activityTime: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 2,
  },
  activityCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: '#009050',
  },
});
