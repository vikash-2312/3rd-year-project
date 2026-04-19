import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useUser } from '@clerk/expo';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// --- Color Token Definitions ---

export const LightColors = {
  background: '#ECFDF5',
  card: '#FFFFFF',
  cardAlt: '#F7FAFC',
  text: '#2D3748',
  textSecondary: '#4A5568',
  textTertiary: '#718096',
  textMuted: '#A0AEC0',
  border: '#EDF2F7',
  accent: '#009050',
  accentLight: '#F0FFF4',
  danger: '#E53E3E',
  dangerLight: '#FFF5F5',
  warning: '#D69E2E',
  blue: '#3182CE',
  blueLight: '#EBF8FF',
  purple: '#805AD5',
  purpleLight: '#FAF5FF',
  purpleBorder: '#E9D8FD',
  purpleText: '#322659',
  purpleSubtext: '#553C9A',
  modalOverlay: 'rgba(0, 0, 0, 0.4)',
  tabBar: '#FFFFFF',
  chartBg: '#FFFFFF',
  switchTrack: '#EDF2F7',
  inputBg: '#F7FAFC',
  statusBar: 'dark' as 'dark' | 'light',
};

export type ThemeColors = typeof LightColors;

export const DarkColors: ThemeColors = {
  background: '#090C12', // Deeper, more expansive navy
  card: '#12161F',       // Sleek surface
  cardAlt: '#1A1F2B',    // Highlighted elevation
  text: '#F8FAFC',       // High contrast text
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textMuted: '#64748B',
  border: '#1E293B',     // More defined borders
  accent: '#00DC82',     // Neon Mint (Vibrant & High Performance)
  accentLight: '#0A2D1F', // Deep glow background
  danger: '#FF4D4C',     // Vibrant "Apex" Red
  dangerLight: '#2D1616',
  warning: '#FBBF24',    // Bright Amber
  blue: '#3B82F6',       // Electric Blue
  blueLight: '#0F1E35',
  purple: '#A855F7',
  purpleLight: '#2D1B4E',
  purpleBorder: '#6B21A8',
  purpleText: '#F3E8FF',
  purpleSubtext: '#D8B4FE',
  modalOverlay: 'rgba(0, 0, 0, 0.8)',
  tabBar: '#12161F',
  chartBg: '#12161F',
  switchTrack: '#1E293B',
  inputBg: '#1A1F2B',
  statusBar: 'light' as 'dark' | 'light',
};

// --- Context ---

type ThemeType = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeType;
  isDark: boolean;
  colors: typeof LightColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  isDark: false,
  colors: LightColors,
});

export function useTheme() {
  return useContext(ThemeContext);
}

// --- Provider ---

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>('light');

  useEffect(() => {
    if (user?.id) {
      const settingsRef = doc(db, 'users', user.id, 'settings', 'preferences');
      const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
          const newTheme = snapshot.data().theme || 'system';
          setTheme(prev => prev !== newTheme ? newTheme : prev);
        }
      });

      return () => unsubscribe();
    } else {
      setTheme(prev => prev !== 'system' ? 'system' : prev);
    }
  }, [user?.id]);

  const isDark =
    theme === 'dark' || (theme === 'system' && systemScheme === 'dark');

  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}
