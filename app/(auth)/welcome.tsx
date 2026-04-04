import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Redirect, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    console.log('[Welcome] Page mounted. Segments:', segments);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Branding/Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>CalorieTrack</Text>
          <Text style={styles.tagline}>Intelligent tracking for a healthier you</Text>
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          <Text style={styles.welcomeText}>Welcome!</Text>
          <Text style={styles.subText}>
            Join thousands of users who are reaching their fitness goals with precision tracking and AI insights.
          </Text>

          <View style={styles.buttonGroup}>
            <Button
              title="Get Started"
              onPress={() => {
                console.log('[Welcome] Navigating to sign-up');
                router.push('/(auth)/sign-up');
              }}
              style={styles.signUpBtn}
            />
            
            <TouchableOpacity 
              style={styles.signInLink} 
              onPress={() => {
                console.log('[Welcome] Navigating to sign-in');
                router.push('/(auth)/sign-in');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.alreadyText}>Already have an account? </Text>
              <Text style={styles.signInText}>Log In</Text>
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="#009050" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer/Trust */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Secure authentication powered by Clerk</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1A202C',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: '#718096',
    marginTop: 8,
    textAlign: 'center',
  },
  actionSection: {
    width: '100%',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 12,
  },
  subText: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 24,
    marginBottom: 40,
  },
  buttonGroup: {
    width: '100%',
  },
  signUpBtn: {
    height: 56,
    borderRadius: 16,
    marginBottom: 16,
  },
  signInLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  alreadyText: {
    fontSize: 15,
    color: '#718096',
  },
  signInText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#009050',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#A0AEC0',
  },
});
