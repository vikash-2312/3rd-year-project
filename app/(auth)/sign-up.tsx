import { useAuth, useClerk, useOAuth, useSignUp } from '@clerk/expo';
import {
  ArrowLeft01Icon,
  GoogleIcon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { checkAndMigrateProfile } from '../../hooks/useAuthCheck';
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser';
import { authBridge } from '../../lib/auth-bridge';
import { useTheme } from '../../lib/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

// Helper to find methods on the resource, its prototype, or its nested objects
const findClerkMethod = (obj: any, names: string[]): Function | null => {
  if (!obj || typeof obj !== 'object') return null;

  for (const name of names) {
    if (typeof obj[name] === 'function') return obj[name].bind(obj);

    // Exhaustive search of common Clerk managers
    const nestedKeys = [
      'mfa', 'emailCode', 'phoneCode', 'emailAddress', 'phoneNumber',
      'verifications', 'clientTrust', 'password', 'firstFactor', 'secondFactor'
    ];
    for (const key of nestedKeys) {
      const nested = obj[key];
      if (nested && typeof nested === 'object' && typeof nested[name] === 'function') {
        return nested[name].bind(nested);
      }
    }
  }
  return null;
};

export default function SignUp() {
  useWarmUpBrowser();
  const signUpResult = useSignUp() as any;
  const { setActive } = useClerk();
  
  // Handle Signal API or legacy structure: favor the object that has the methods (create, etc.)
  const isLoaded = signUpResult?.isLoaded ?? !!signUpResult?.signUp;
  const signUp = (signUpResult?.create || signUpResult?.id)
    ? signUpResult
    : (signUpResult?.signUp?.create ? signUpResult.signUp : (signUpResult?.signUp || null));

  const { isLoaded: isLoadedAuth, isSignedIn } = useAuth();
  
  const { startOAuthFlow } = useOAuth({
    strategy: 'oauth_google',
    redirectUrl: AuthSession.makeRedirectUri()
  });
  const router = useRouter();

  const { colors } = useTheme();
  const [name, setName] = React.useState('');
  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [showVerification, setShowVerification] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  console.log('[SignUp] render - isLoaded:', isLoaded, 'hasSignUp:', !!signUp);

  const formatClerkError = (err: any) => {
    try {
      if (err === null) return 'Error: literal null';
      if (err === undefined) return 'Error: literal undefined';
      if (typeof err === 'string') return err === 'null' ? 'Sign up failed.' : err;

      if (err?.errors) return err.errors[0]?.longMessage || err.errors[0]?.message || 'An error occurred';
      if (err?.name === 'TypeError') return `System Error: ${err.message}`;

      return err?.message || 'An error occurred';
    } catch {
      return 'An error occurred';
    }
  };

  const handleSubmit = async () => {
    if (!emailAddress || !password) {
      setError('Please fill in email and password.');
      return;
    }

    if (!isLoaded || !signUp) {
      setError('Sign up not ready. Please try again.');
      return;
    }

    setError('');
    const trimmedEmail = emailAddress.trim().toLowerCase();
    setIsLoading(true);
    try {
      // 1. Check if we already have an unverified session for this exact email
      if (
        ((signUp.status as any) === 'unverified' || signUp.status === 'missing_requirements') &&
        signUp.emailAddress === trimmedEmail
      ) {
        console.log('[SignUp] Resuming existing unverified session for:', trimmedEmail);
        try {
          if (typeof signUp.prepareEmailAddressVerification === 'function') {
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          } else if (signUp.verifications && typeof signUp.verifications.sendEmailCode === 'function') {
             await signUp.verifications.sendEmailCode();
          } else {
             throw new Error("Unable to locate verification dispatcher on Clerk object.");
          }
          setShowVerification(true);
        } catch (prepErr: any) {
          console.error('[SignUp] Preparation failed on resume:', prepErr);
          const errMsg = formatClerkError(prepErr);
          setError('Failed to send verification code. ' + errMsg);
          Alert.alert('Verification Error', errMsg);
        }
        return;
      }

      // 2. Normal creation flow
      let createResult = await signUp.create({
        emailAddress: trimmedEmail,
        password: password,
        firstName: name.split(' ')[0] || '',
        lastName: name.split(' ').slice(1).join(' ') || '',
      }) as any;

      // Safe unnesting
      if (createResult && typeof createResult === 'object' && 'result' in createResult && createResult.result) {
        if (createResult.error && createResult.error !== 'null') throw createResult.error;
        createResult = createResult.result;
      }

      const status = createResult?.status || signUp.status;
      console.log('[SignUp] Create status:', status);

      if (status === 'unverified' || status === 'missing_requirements') {
        try {
          console.log('[SignUp] Preparing verification with result...');
          
          // Try all possible method names on the create result first
          const prep = createResult.prepareEmailAddressVerification 
            || createResult.prepare 
            || signUp.prepareEmailAddressVerification 
            || signUp.prepare;

          if (typeof prep === 'function') {
            await prep.call(createResult || signUp, { strategy: 'email_code' });
          } else if (signUp.verifications?.sendEmailCode) {
             await signUp.verifications.sendEmailCode();
          } else {
             throw new Error("Unable to locate verification dispatcher (prepareEmailAddressVerification) on Clerk resource.");
          }
          
          setShowVerification(true);
        } catch (prepErr: any) {
          console.error('[SignUp] Preparation failed:', prepErr);
          const errMsg = formatClerkError(prepErr);
          setError('Failed to send verification code. ' + errMsg);
          Alert.alert('Verification Error', errMsg);
        }
      } else if (status === 'complete') {
        const sessionId = (createResult as any)?.createdSessionId || signUp.createdSessionId;
        if (setActive && sessionId) {
          await setActive({ session: sessionId });
          router.replace('/');
        }
      }
    } catch (err: any) {
      console.error('[SignUp] Create error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));

      const firstError = err?.errors?.[0];
      const errorCode = firstError?.code || err?.code;

      if (errorCode === 'form_identifier_exists' || errorCode === 'form_identifier_taken' || errorCode === 'user_already_exists') {
        const msg = 'An account with this email already exists. Please Sign In instead.';
        setError(msg);
        Alert.alert('Already Registered', msg);
      } else {
        const msg = formatClerkError(err);
        setError(msg);
        Alert.alert('Sign Up Failed', msg);
      }
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
      const trimmedEmail = emailAddress.trim().toLowerCase();
      console.log('[SignUp] Verifying code:', code);

      let result;
      if (typeof signUp.attemptEmailAddressVerification === 'function') {
         result = await signUp.attemptEmailAddressVerification({ code });
      } else if (signUp.verifications && typeof signUp.verifications.verifyEmailCode === 'function') {
         result = await signUp.verifications.verifyEmailCode({ code });
      } else {
         throw new Error("Unable to locate verification validation method on Clerk object.");
      }

      // Safe unnesting: only unnest if result is an object and has .result
      if (result && typeof result === 'object' && 'result' in result && result.result) {
        if (result.error && result.error !== 'null') throw result.error;
        result = result.result;
      }

      const currentStatus = (result as any)?.status || (signUp as any)?.status;
      console.log('[SignUp] Verification status:', currentStatus);

      if (currentStatus === 'complete') {
        const sessionId = result?.createdSessionId || (signUp as any)?.createdSessionId;
        const userId = result?.createdUserId || (signUp as any)?.createdUserId;

        if (sessionId && userId) {
          try {
            // Lock index routing
            await AsyncStorage.setItem('is_signing_in', 'true');

            // Centralized profile check & migration
            const { route } = await checkAndMigrateProfile(userId, trimmedEmail, name);

            // Activate session
            await setActive({ session: sessionId });

            // Route intelligently
            Alert.alert('Success', 'Account created successfully!');
            router.replace(route as any);
          } catch (fbErr) {
            console.error('[SignUp] Critical Firebase/routing error:', fbErr);
            router.replace('/');
          }
        } else {
          Alert.alert('Error', 'Session ID or User ID not found after completion.');
          router.replace('/(auth)/sign-in'); // Fallback
        }
      } else {
        Alert.alert('Verification Incomplete', `Status: ${currentStatus}. Please check your verification code.`);
      }
    } catch (err: any) {
      console.error('[SignUp] Verify error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      Alert.alert('Verification Error', formatClerkError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const onResendPress = async () => {
    if (!signUp) return;
    try {
      if (typeof signUp.prepareEmailAddressVerification === 'function') {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else if (signUp.verifications && typeof signUp.verifications.sendEmailCode === 'function') {
        await signUp.verifications.sendEmailCode();
      } else {
        throw new Error("Unable to resend: Verification dispatcher not found.");
      }
      Alert.alert('Success', 'Verification code resent to your email.');
    } catch (err: any) {
      Alert.alert('Error', formatClerkError(err));
    }
  };

  const onGoogleSignUpPress = React.useCallback(async () => {
    if (isLoading) return;

    // 🛡️ Zero-Latency Shield: Lock the gate INSTANTLY (0ms)
    authBridge.isSigningIn = true;
    setIsLoading(true);

    try {
      // Also set persistent storage
      await AsyncStorage.setItem('is_signing_in', 'true');

      // Use explicit scheme for reliable native redirects
      const redirectUrl = `aicaltrack://expo-auth-session`;
      console.log('[SignUp] Starting OAuth flow with redirect:', redirectUrl);

      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow({
        redirectUrl
      });

      console.log('[SignUp] OAuth flow returned. SessionId:', createdSessionId);

      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });

        // Wait for session to stabilize
        const userId = signUp?.createdUserId;
        if (userId) {
          const { route } = await checkAndMigrateProfile(
            userId,
            signUp.emailAddress
          );
          router.replace(route as any);
        } else {
          // Fallback if userId isn't immediately available
          router.replace('/');
        }
      }
    } catch (err: any) {
      console.error('OAuth error:', err);
      // 🛡️ Release shield instantly on error/cancel
      authBridge.isSigningIn = false;
      await AsyncStorage.removeItem('is_signing_in').catch(() => { });

      // Clean up session if it's in an invalid state
      await WebBrowser.coolDownAsync();

      const errMsg = err?.message || '';
      if (!errMsg.includes('cancel') && !errMsg.includes('dismiss')) {
        Alert.alert('Error', 'Google sign up failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [startOAuthFlow, router, isLoading, signUp]);

  // ── Verification Screen ────────────────────────────────────────────
  if (isSignedIn) {
    return null;
  }

  if (showVerification) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContainer}>
              <TouchableOpacity
                onPress={() => setShowVerification(false)}
                style={styles.backButton}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={colors.text} />
              </TouchableOpacity>
              <Image
                source={require('../../assets/images/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={[styles.title, { color: colors.text }]}>Verify Your Email</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                We've sent a verification code to {emailAddress}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.formContainer}>
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
                <Text style={[styles.editEmailText, { color: colors.textTertiary }]}>Entered wrong email? Go back</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    );
  }

  // ── Sign-Up Form ───────────────────────────────────────────────────
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(600)} style={styles.headerContainer}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Start tracking your calories intelligently</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.formContainer}>
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

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button
              title="Sign Up"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              style={styles.signUpBtn}
            />

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textTertiary }]}>OR</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>

            <Button
              title="Continue with Google"
              variant="outline"
              onPress={onGoogleSignUpPress}
              leftIcon={<HugeiconsIcon icon={GoogleIcon} size={30} color="#EA4335" />}
              style={styles.googleBtn}
              textStyle={{ color: colors.text }}
            />
          </Animated.View>

          <View style={styles.footerContainer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <Text style={[styles.footerLink, { color: colors.accent }]}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Required for Clerk bot protection */}
          <View nativeID="clerk-captcha" />
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
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
  },
  dividerText: {
    paddingHorizontal: 16,
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
    fontSize: 15,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  editEmailBtn: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  editEmailText: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
