/**
 * Typography System
 * 
 * Single source of truth for all font sizes and weights.
 * Usage: import { typography } from '../lib/typography';
 *        style={[typography.heading1, { color: colors.text }]}
 * 
 * If you ever change the app font (e.g. to Inter or Outfit), update it here only.
 */

import { TextStyle } from 'react-native';

export const typography = {
  // Display / Hero
  display: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  } as TextStyle,

  // Page & Section Headings
  heading1: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  } as TextStyle,

  heading2: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  } as TextStyle,

  heading3: {
    fontSize: 17,
    fontWeight: '700',
  } as TextStyle,

  // Card Titles
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  } as TextStyle,

  // Body Text
  bodyLarge: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  } as TextStyle,

  body: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
  } as TextStyle,

  bodySmall: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  } as TextStyle,

  // Labels & Badges
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  } as TextStyle,

  labelCaps: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,

  // Captions & Hints
  caption: {
    fontSize: 11,
    fontWeight: '500',
  } as TextStyle,

  captionBold: {
    fontSize: 11,
    fontWeight: '700',
  } as TextStyle,

  // Numeric values (stats, calorie numbers)
  stat: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  } as TextStyle,

  statSmall: {
    fontSize: 20,
    fontWeight: '800',
  } as TextStyle,

  // Button Text
  button: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  } as TextStyle,

  buttonSmall: {
    fontSize: 13,
    fontWeight: '700',
  } as TextStyle,
} as const;
