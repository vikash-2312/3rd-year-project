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
  background: '#0F1117',
  card: '#1A1D27',
  cardAlt: '#22262F',
  text: '#E2E8F0',
  textSecondary: '#CBD5E0',
  textTertiary: '#A0AEC0',
  textMuted: '#718096',
  border: '#2D3748',
  accent: '#38A169',
  accentLight: '#1C3829',
  danger: '#FC8181',
  dangerLight: '#3B1A1A',
  warning: '#ECC94B',
  blue: '#63B3ED',
  blueLight: '#1A2A3B',
  purple: '#B794F4',
  purpleLight: '#2D1F4E',
  purpleBorder: '#553C9A',
  purpleText: '#E9D8FD',
  purpleSubtext: '#D6BCFA',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
  tabBar: '#1A1D27',
  chartBg: '#1A1D27',
  switchTrack: '#2D3748',
  inputBg: '#22262F',
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
    if (!user) return;

    const settingsRef = doc(db, 'users', user.id, 'settings', 'preferences');
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTheme(data.theme || 'light');
      }
    });

    return () => unsubscribe();
  }, [user]);

  const isDark =
    theme === 'dark' || (theme === 'system' && systemScheme === 'dark');

  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}
