import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, G, Rect } from 'react-native-svg';
import { SparklesIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';

const { width } = Dimensions.get('window');

interface MuscleHeatmapProps {
  activeMuscles: string[]; // ['chest', 'legs', 'back', etc]
  title?: string;
}

/**
 * A Premium Muscle Heatmap component.
 * Visualizes targeted muscle groups on a human silhouette.
 */
export const MuscleHeatmap: React.FC<MuscleHeatmapProps> = ({ activeMuscles, title = "Muscle Targeting" }) => {
  const isActive = (m: string) => activeMuscles.some(am => am.toLowerCase().includes(m.toLowerCase()));

  // Theme colors
  const activeColor = '#009050';
  const inactiveColor = '#E2E8F0';
  const glowColor = 'rgba(0, 144, 80, 0.2)';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HugeiconsIcon icon={SparklesIcon} size={18} color="#009050" />
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.bodyWrapper}>
        {/* Front View */}
        <View style={styles.bodyColumn}>
          <Text style={styles.bodyLabel}>FRONT</Text>
          <Svg width="100" height="160" viewBox="0 0 100 180">
            {/* Silhouette Outline */}
            <Path
              d="M50 10c-5 0-9 4-9 9s4 9 9 9 9-4 9-9-4-9-9-9zM35 30h30c4 0 7 3 7 7v40c0 4-3 7-7 7H35c-4 0-7-3-7-7V37c0-4 3-7 7-7zM25 40l-8 50c-1 5 3 10 8 10h5s5-5 5-10l8-50h-18zm55 0l8 50c1 5-3 10-8 10h-5s-5-5-5-10l-8-50h18zM35 90l-5 70c-1 8 5 15 13 15h2s7-7 7-15l-3-70h-14zm30 0l5 70c1 8-5 15-13 15h-2s-7-7-7-15l3-70h14z"
              fill="#F7FAFC"
              stroke="#CBD5E0"
              strokeWidth="1"
            />
            
            {/* Muscle Overlays */}
            <G opacity={0.9}>
              {/* Shoulders */}
              <Path d="M28 35h10v10h-10zM62 35h10v10h-10z" fill={isActive('shoulders') ? activeColor : 'transparent'} />
              {/* Chest */}
              <Path d="M35 45h30v15H35z" fill={isActive('chest') ? activeColor : 'transparent'} />
              {/* Abs */}
              <Path d="M40 65h20v20H40z" fill={isActive('abs') ? activeColor : 'transparent'} />
              {/* Biceps */}
              <Path d="M22 55h8v15h-8zM70 55h8v15h-8z" fill={isActive('biceps') ? activeColor : 'transparent'} />
              {/* Quads */}
              <Path d="M35 100h12v40H35zM53 100h12v40H53z" fill={isActive('legs') ? activeColor : 'transparent'} />
            </G>
          </Svg>
        </View>

        {/* Back View */}
        <View style={styles.bodyColumn}>
          <Text style={styles.bodyLabel}>BACK</Text>
          <Svg width="100" height="160" viewBox="0 0 100 180">
             <Path
              d="M50 10c-5 0-9 4-9 9s4 9 9 9 9-4 9-9-4-9-9-9zM35 30h30c4 0 7 3 7 7v40c0 4-3 7-7 7H35c-4 0-7-3-7-7V37c0-4 3-7 7-7zM25 40l-8 50c-1 5 3 10 8 10h5s5-5 5-10l8-50h-18zm55 0l8 50c1 5-3 10-8 10h-5s-5-5-5-10l-8-50h18zM35 90l-5 70c-1 8 5 15 13 15h2s7-7 7-15l-3-70h-14zm30 0l5 70c1 8-5 15-13 15h-2s-7-7-7-15l3-70h14z"
              fill="#F7FAFC"
              stroke="#CBD5E0"
              strokeWidth="1"
            />
            {/* Muscle Overlays */}
            <G opacity={0.9}>
              {/* Back (Lats/Traps) */}
              <Path d="M35 40h30l-5 40h-20z" fill={isActive('back') ? activeColor : 'transparent'} />
              {/* Triceps */}
              <Path d="M22 55h8v15h-8zM70 55h8v15h-8z" fill={isActive('triceps') ? activeColor : 'transparent'} />
              {/* Glutes */}
              <Path d="M35 85h30v15H35z" fill={isActive('glutes') ? activeColor : 'transparent'} />
              {/* Hamstrings */}
              <Path d="M35 100h12v40H35zM53 100h12v40H53z" fill={isActive('legs') ? activeColor : 'transparent'} />
              {/* Calves */}
              <Path d="M32 150h10v20h-10zM58 150h10v20h-10z" fill={isActive('calves') ? activeColor : 'transparent'} />
            </G>
          </Svg>
        </View>

        {/* Legend / Stats */}
        <View style={styles.legend}>
          {['Shoulders', 'Chest', 'Back', 'Arms', 'Legs', 'Core'].map(m => (
            <View key={m} style={styles.legendItem}>
              <View style={[styles.dot, isActive(m) && styles.dotActive]} />
              <Text style={[styles.legendText, isActive(m) && styles.legendTextActive]}>{m}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Targeting {activeMuscles.length} major muscle groups
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D3748',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bodyColumn: {
    alignItems: 'center',
  },
  bodyLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#A0AEC0',
    marginBottom: 8,
    letterSpacing: 1,
  },
  legend: {
    flex: 1,
    paddingLeft: 20,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EDF2F7',
  },
  dotActive: {
    backgroundColor: '#009050',
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  legendTextActive: {
    color: '#2D3748',
    fontWeight: '700',
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
});
