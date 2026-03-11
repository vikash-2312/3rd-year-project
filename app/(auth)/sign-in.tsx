import { useSignIn, useAuth } from '@clerk/expo';
import { type Href, Link, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  useWarmUpBrowser();
  const { signIn, setActive } = useSignIn() as Record<string, any>;
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!signIn) return;

    setIsLoading(true);
    try {
      const { error } = await signIn.password({
        emailAddress,
        password,
      });

      if (error) {
        Alert.alert('Error', error.message || 'Sign in failed');
        return;
      }
      
      if (signIn.status === 'complete') {
        await signIn.finalize();
        if (setActive && signIn.createdSessionId) {
          await setActive({ session: signIn.createdSessionId });
        }
      }
    } catch (err: any) {
      console.error('[SignIn] Error:', JSON.stringify(err, null, 2));
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? 'Sign in failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>
        </View>

        <View style={styles.formContainer}>
          <InputField
            key="email"
            icon="mail-outline"
            placeholder="Email Address"
            value={emailAddress}
            onChangeText={setEmailAddress}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <InputField
            key="password"
            icon="lock-closed-outline"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          <Button
            title="Sign In"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!emailAddress || !password || isLoading}
            style={styles.signInBtn}
          />
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Text style={styles.footerLink}>Sign Up</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
  },
  signInBtn: {
    marginTop: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#A0AEC0',
    fontSize: 14,
    fontWeight: '600',
  },
  googleBtn: {
    marginBottom: 16,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  footerText: {
    color: '#718096',
    fontSize: 15,
  },
  footerLink: {
    color: '#FF6B6B',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
