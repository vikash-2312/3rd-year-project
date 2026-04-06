import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, TouchableOpacity, Platform } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  ViewIcon, 
  ViewOffSlashIcon,
  Mail01Icon,
  LockPasswordIcon,
  Key01Icon,
  UserIcon
} from '@hugeicons/core-free-icons';

interface InputFieldProps extends TextInputProps {
  icon?: 'mail-outline' | 'lock-closed-outline' | 'keypad-outline' | 'person-outline';
  isPassword?: boolean;
}

const getIcon = (name?: string) => {
  switch (name) {
    case 'mail-outline': return Mail01Icon;
    case 'lock-closed-outline': return LockPasswordIcon;
    case 'keypad-outline': return Key01Icon;
    case 'person-outline': return UserIcon;
    default: return null;
  }
};

export const InputField = ({ icon, isPassword, onFocus, onBlur, ...props }: InputFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const IconComponent = getIcon(icon);

  return (
    <View style={[styles.container, isFocused && styles.focusedContainer]}>
      {IconComponent && (
        <HugeiconsIcon 
          icon={IconComponent} 
          size={18} 
          color={isFocused ? "#FF6B6B" : "#A0AEC0"} 
          style={styles.icon}
        />
      )}
      <TextInput
        style={styles.input}
        placeholderTextColor="#A0AEC0"
        secureTextEntry={isPassword && !showPassword}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {isPassword && (
        <TouchableOpacity 
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
          activeOpacity={0.6}
        >
          <HugeiconsIcon 
            icon={showPassword ? ViewOffSlashIcon : ViewIcon} 
            size={18} 
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
