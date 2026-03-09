import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputFieldProps extends TextInputProps {
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export const InputField = ({ icon, isPassword, onFocus, onBlur, ...props }: InputFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View style={[styles.container, isFocused && styles.focusedContainer]}>
      {icon && (
        <Ionicons 
          name={icon} 
          size={20} 
          color={isFocused ? "#FF6B6B" : "#A0AEC0"} 
          style={styles.icon}
        />
      )}
      <TextInput
        style={styles.input}
        placeholderTextColor="#A0AEC0"
        secureTextEntry={isPassword && !showPassword}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      {isPassword && (
        <TouchableOpacity 
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons 
            name={showPassword ? "eye-off-outline" : "eye-outline"} 
            size={20} 
            color="#A0AEC0" 
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginVertical: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  focusedContainer: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFFFFF',
    // Removed elevation/shadow on focus to prevent Android layout flicker/jumping
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#FF6B6B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    } : {
      // Small elevation only if absolutely needed, but let's try without it first
      // elevation: 1, 
    }),
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    paddingVertical: 8,
    color: '#2D3748',
    fontSize: 16,
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 8,
  },
});
