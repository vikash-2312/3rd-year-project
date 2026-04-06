import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacityProps, 
  View, 
  Image, 
  ImageSourcePropType 
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  leftIcon?: React.ReactNode;
  imageSource?: ImageSourcePropType;
  textStyle?: any;
}

export const Button = ({ 
  title, 
  loading, 
  variant = 'primary', 
  leftIcon, 
  imageSource,
  style, 
  textStyle,
  ...props 
}: ButtonProps) => {
  const isOutline = variant === 'outline';
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        isOutline && styles.outline,
        style,
        (props.disabled || loading) && styles.disabled
      ]}
      activeOpacity={0.7}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? '#FF6B6B' : '#FFF'} />
      ) : (
        <View style={styles.contentContainer}>
          {imageSource && (
            <Image source={imageSource} style={styles.imageIcon} />
          )}
          {leftIcon && (
            <View style={styles.iconContainer}>{leftIcon}</View>
          )}
          <Text
            style={[
              styles.text,
              variant === 'primary' && styles.textLight,
              variant === 'secondary' && styles.textLight,
              isOutline && styles.textPrimary,
              textStyle
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 8,
    shadowColor: '#FF6B6B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primary: {
    backgroundColor: '#FF6B6B',
  },
  secondary: {
    backgroundColor: '#2D3436',
    shadowColor: '#2D3436',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textLight: {
    color: '#FFFFFF',
  },
  textPrimary: {
    color: '#FF6B6B',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 10,
  },
  imageIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
    resizeMode: 'contain',
  },
});
