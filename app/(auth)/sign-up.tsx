import React from 'react';
import { View, Text, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSignUp, useAuth, useOAuth } from '@clerk/expo';
import { InputField } from '../../components/InputField';
import { Button } from '../../components/Button';
import { saveUserToFirestore } from '../../lib/firebase';
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function SignUp() {
  useWarmUpBrowser();
  const signUpResult = useSignUp() as any;
  const { isSignedIn, signOut } = useAuth();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();

  const [name, setName] = React.useState('');
  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [showVerification, setShowVerification] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Get signUp resource - handle both old (isLoaded/signUp) and new Signal API patterns
  const signUp = signUpResult?.signUp ?? signUpResult;
  const setActive = signUpResult?.setActive;

  if (isSignedIn) {
    return null;
  }

  const handleSubmit = async () => {
    if (!emailAddress || !password) {
      Alert.alert('Error', 'Please fill in email and password.');
      return;
    }

    if (!signUp) {
      Alert.alert('Error', 'Sign up not ready. Please try again.');
      return;
    }

    // Debug: log available methods
    console.log('[SignUp] Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(signUp)));

    setIsLoading(true);
    try {
      // STEP 1 - Create signup attempt
      await signUp.create({
        emailAddress: emailAddress,
        password: password,
        firstName: name.split(' ')[0] || '',
        lastName: name.split(' ').slice(1).join(' ') || '',
      });

      // STEP 2 - Send verification email code
      try {
        await signUp.sendEmailCode();
      } catch (prepareErr: any) {
        console.error('[SignUp] sendEmailCode failed:', prepareErr?.errors?.[0]?.longMessage || prepareErr?.message || String(prepareErr));
      }

      // STEP 3 - Show verification screen
      setShowVerification(true);
    } catch (err: any) {
      console.error('[SignUp] Error:', JSON.stringify(err, null, 2));
      const msg = err?.errors?.[0]?.message ?? err?.message ?? 'Sign up failed. Please try again.';
      Alert.alert('Sign Up Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter the verification code.');
      return;
    }

    if (!signUp) {
      Alert.alert('Error', 'Sign up not ready. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      // STEP 4 - Verify the email code
      const result = await signUp.verifyEmailCode({ code });
      
      console.log('[SignUp] verifyEmailCode full result:', JSON.stringify(result, null, 2));
      console.log('[SignUp] signUp object status after verify:', signUp.status);

      // In the new API, result.status or signUp.status might dictate completion
      const currentStatus = result?.status || signUp.status;

      if (currentStatus === 'complete' || currentStatus === 'missing_requirements') {
        // Save to Firebase first so the document exists before redirection
        try {
          if (result.createdUserId) {
            await saveUserToFirestore(result.createdUserId, emailAddress, name);
          }
        } catch (fbErr) {
          console.error('[SignUp] Firebase error:', fbErr);
        }

        // STEP 5 - Finalize signup
        await signUp.finalize();

        // Enforce a strict log-out in case Clerk auto-signed them in via session creation
        // If they are signed in, app/_layout.tsx will forcefully redirect them to "/"
        if (signOut) {
          try {
            await signOut();
          } catch (e) {
            console.log('Skipping signout error:', e);
          }
        }

        // Redirect to sign-in screen instead of auto-logging in
        Alert.alert('Success', 'Account created successfully! Please sign in.');
        router.replace('/sign-in');
      } else {
        const errorStatus = result?.status || signUp.status || 'unknown';
        Alert.alert('Verification Incomplete', `Status: ${errorStatus}. Please check your code.`);
      }
    } catch (err: any) {
      console.error('[SignUp] Verify error array:', JSON.stringify(err?.errors, null, 2));
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? 'Verification failed. Try again.';
      Alert.alert('Verification Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const onResendPress = async () => {
    if (!signUp) return;
    try {
      await signUp.sendEmailCode();
      Alert.alert('Success', 'Verification code resent to your email.');
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message ?? err?.message ?? 'Failed to resend.';
      Alert.alert('Error', msg);
    }
  };

  const onGoogleSignUpPress = React.useCallback(async () => {
    try {
      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow();
      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
        router.replace('/');
      }
    } catch (err) {
      console.error('OAuth error:', err);
      Alert.alert('Error', 'Google sign up failed. Please try again.');
    }
  }, [startOAuthFlow, router]);

  // ── Verification Screen ────────────────────────────────────────────
  if (showVerification) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.headerContainer}>
            <TouchableOpacity
              onPress={() => setShowVerification(false)}
              style={styles.backButton}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#2D3748" />
            </TouchableOpacity>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a verification code to {emailAddress}
            </Text>
          </View>

          <View style={styles.formContainer}>
            <InputField
              key="verification-code"
              icon="keypad-outline"
              placeholder="Verification Code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
            />

            <Button
              title="Verify Email"
              onPress={handleVerify}
              loading={isLoading}
              style={styles.signUpBtn}
            />

            <Button
              title="Resend Code"
              variant="outline"
              onPress={onResendPress}
              style={styles.resendBtn}
            />

            <TouchableOpacity
              onPress={() => setShowVerification(false)}
              style={styles.editEmailBtn}
            >
              <Text style={styles.editEmailText}>Entered wrong email? Go back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Sign-Up Form ───────────────────────────────────────────────────
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start tracking your calories intelligently</Text>
        </View>

        <View style={styles.formContainer}>
          <InputField
            key="name"
            icon="person-outline"
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

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
            title="Sign Up"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!emailAddress || !password || isLoading}
            style={styles.signUpBtn}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <Button
            title="Continue with Google"
            variant="outline"
            onPress={onGoogleSignUpPress}
            style={styles.googleBtn}
          />
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/sign-in" asChild>
            <Text style={styles.footerLink}>Sign In</Text>
          </Link>
        </View>

        {/* Required for Clerk bot protection */}
        <View nativeID="clerk-captcha" />
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
    position: 'relative',
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
    zIndex: 10,
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
  signUpBtn: {
    marginTop: 24,
  },
  resendBtn: {
    marginTop: 12,
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
  editEmailBtn: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  editEmailText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
