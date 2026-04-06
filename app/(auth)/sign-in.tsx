import { useClerk, useOAuth, useSignIn } from '@clerk/expo';
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
    // 1. Check direct property
    if (typeof obj[name] === 'function') return obj[name].bind(obj);

    // 2. Check nested objects (exhaustive search of common Clerk managers)
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

const formatError = (err: any) => {
  if (err === null) return 'Error: literal null';
  if (err === undefined) return 'Error: literal undefined';
  if (typeof err === 'string') {
    if (err === 'null') return 'Sign in failed. Please try again.';
    if (err.includes('Identifier is invalid.')) return 'Invalid email or password. Please try again.';
    return err;
  }

  if (err.errors && Array.isArray(err.errors)) {
    const firstError = err.errors[0];
    if (firstError?.code === 'form_password_incorrect' || firstError?.code === 'form_identifier_not_found' || firstError?.code === 'strategy_for_user_invalid') {
      return 'Invalid email or password. Please try again.';
    }
    return firstError?.longMessage || firstError?.message || 'Authentication error';
  }

  const detail: any = {};
  try {
    if (err.name) detail.name = err.name;
    if (err.message) detail.message = err.message;
    if (err.code) detail.code = err.code;
    if (err.status) detail.status = err.status;

    if (err.name === 'TypeError') return `System Error: ${err.message}`;

    if (err.message && typeof err.message === 'string') {
      if (err.message.includes('Identifier is invalid.')) {
        return 'Invalid email or password. Please try again.';
      }
      return err.message;
    }

    const combined = { ...detail, ...err };
    return JSON.stringify(combined, null, 2);
  } catch (e) {
    return String(err?.message || err);
  }
};

export default function SignIn() {
  useWarmUpBrowser();
  const signInResult = useSignIn() as any;
  const clerk = useClerk();
  const setActive = clerk.setActive;

  // Handle Signal API: favor the object that has the methods (create, etc.)
  const isLoaded = signInResult?.isLoaded ?? !!signInResult?.signIn;
  const signIn = (signInResult?.create || signInResult?.id)
    ? signInResult
    : (signInResult?.signIn?.create ? signInResult.signIn : (signInResult?.signIn || null));
  const { startOAuthFlow } = useOAuth({
    strategy: 'oauth_google',
    redirectUrl: AuthSession.makeRedirectUri()
  });
  const router = useRouter();

  const { colors } = useTheme();
  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Second factor verification state (for Client Trust / MFA)
  const [showVerification, setShowVerification] = React.useState(false);
  const [verificationCode, setVerificationCode] = React.useState('');
  const [secondFactorStrategy, setSecondFactorStrategy] = React.useState<string>('');

  console.log('[SignIn] Component render - isLoaded:', isLoaded, 'hasSignIn:', !!signIn);

  // Helper to handle factor preparation and state updates
  const prepareFactorIfNeeded = async (result: any) => {
    const si = signIn as any;
    const res = result as any;

    const currentStatus = res?.status || si?.status;
    console.log('[SignIn] Status check for preparation:', currentStatus);

    if (currentStatus === 'needs_client_trust' || currentStatus === 'needs_second_factor' || currentStatus === 'needs_first_factor') {
      const isSecondFactor = currentStatus === 'needs_second_factor';
      console.log(`[SignIn] Handling ${currentStatus} flow. Finding prep method...`);

      const prepareMethod = findClerkMethod(res, ['prepareSecondFactor', 'prepareFirstFactor', 'prepareMFA', 'prepare', 'sendEmailCode', 'sendPhoneCode', 'create'])
        || findClerkMethod(si, ['prepareSecondFactor', 'prepareFirstFactor', 'prepareMFA', 'prepare', 'sendEmailCode', 'sendPhoneCode', 'create'])
        || findClerkMethod(signInResult, ['prepareSecondFactor', 'prepareFirstFactor', 'prepareMFA', 'prepare', 'sendEmailCode', 'sendPhoneCode', 'create']);

      const supportedFactors = (currentStatus === 'needs_first_factor')
        ? (res?.supportedFirstFactors || si?.supportedFirstFactors || [])
        : (res?.supportedSecondFactors || si?.supportedSecondFactors || []);

      const factor = supportedFactors[0];

      if (factor) {
        setSecondFactorStrategy(factor.strategy);
        console.log('[SignIn] Found factor:', factor.strategy);

        if (prepareMethod) {
          try {
            console.log('[SignIn] Attempting to prepare factor:', factor.strategy);
            await prepareMethod({ strategy: factor.strategy });
            console.log('[SignIn] Factor prepared successfully');
            if (isSecondFactor) {
              Alert.alert('Security Check', 'A second verification code has been sent.');
            }
          } catch (prepErr) {
            console.error('[SignIn] Factor preparation error (possibly already prepared):', formatError(prepErr));
          }
        } else {
          console.log('[SignIn] No preparation method found, showing screen anyway');
        }

        setShowVerification(true);
        setVerificationCode(''); // Clear code for next factor
        return true;
      } else {
        console.warn('[SignIn] Verification required but no factors found');
        Alert.alert('Authentication Error', 'Verification is required but no methods were found.');
        return false;
      }
    }
    return false;
  };
  //
  const handleSubmit = async () => {
    if (!signIn) return;
    setIsLoading(true);
    setError('');
    const trimmedEmail = emailAddress.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError('Please enter your email and password');
      setIsLoading(false);
      return;
    }

    try {
      console.log('[SignIn] Attempting sign-in for:', trimmedEmail);

      let result = await (signIn as any).create({
        identifier: trimmedEmail,
        password,
      });

      if (result && typeof result === 'object') {
        if (result.errors) throw result;
        if (result.error && result.error !== 'null') throw result.error;
        if ('result' in result && result.result) {
          result = result.result;
        }
      }

      const currentStatus = (result as any)?.status || (signIn as any)?.status;
      console.log('[SignIn] Initial sign-in status:', currentStatus);

      if (currentStatus === 'complete') {
        await handleSignInCompletion(result);
        return;
      }

      const handled = await prepareFactorIfNeeded(result);
      if (!handled && currentStatus !== 'complete') {
        throw new Error('Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      console.error('[SignIn] Submit error:', formatError(err));
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };
  // Helper: wait for clerk.user to hydrate after setActive (polls up to 3s)
  const waitForClerkUser = async (maxMs = 3000): Promise<string | null> => {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      if (clerk.user?.id) return clerk.user.id;
      await new Promise(r => setTimeout(r, 150));
    }
    return clerk.user?.id || null;
  };

  const handleSignInCompletion = async (result: any) => {
    const si = signIn as any;
    const currentResult = result || si;
    const sessionId = currentResult?.createdSessionId || si?.createdSessionId;

    console.log('[SignIn] Sign-in complete, activating session:', sessionId);

    if (!sessionId) {
      Alert.alert('Error', 'Session ID not found after completion.');
      return;
    }

    // Support finalize if it exists (newer SDKs)
    const finalizeMethod = findClerkMethod(si, ['finalize']) || findClerkMethod(signInResult, ['finalize']);
    if (finalizeMethod) {
      try {
        await finalizeMethod();
        console.log('[SignIn] Finalize complete');
      } catch (fErr) {
        console.log('[SignIn] Finalize failed (non-critical):', fErr);
      }
    }

    try {
      // Set a flag to tell index.tsx to NOT interfere with this sign-in's routing
      await AsyncStorage.setItem('is_signing_in', 'true');

      await setActive({ session: sessionId });
      console.log('[SignIn] Session activated successfully.');

      // Wait for Clerk to hydrate the user object after session activation
      const hydratedUserId = await waitForClerkUser();

      // Fallback chain for user ID if hydration didn't yield one
      const activeClerkSession = clerk.client?.sessions?.find((s: any) => s.id === sessionId);
      const activeUserId =
        hydratedUserId ||
        activeClerkSession?.user?.id ||
        currentResult?.createdUserId ||
        si?.createdUserId ||
        currentResult?.userData?.id ||
        si?.userData?.id;

      console.log('[SignIn] Resolved User ID:', activeUserId);

      let targetRoute: '/(tabs)' | '/(onboarding)/1' | '/' = '/';

      if (activeUserId) {
        try {
          // Centralized onboarding & migration check
          const { route } = await checkAndMigrateProfile(
            activeUserId,
            emailAddress.trim().toLowerCase() || clerk.user?.primaryEmailAddress?.emailAddress
          );
          targetRoute = route;
        } catch (storageErr) {
          console.error('[SignIn] Unified check failed:', formatError(storageErr));
          targetRoute = '/';
        }
      } else {
        console.warn('[SignIn] Could not resolve user ID, falling back to index hub');
        targetRoute = '/';
      }

      // We do NOT remove 'is_signing_in' here anymore. 
      // The Root Layout (InitialLayout) will clear it once it detects isSignedIn is true.
      console.log('[SignIn] Navigating to:', targetRoute);
      router.replace(targetRoute as any);
    } catch (activeErr) {
      console.error('[SignIn] setActive failed:', formatError(activeErr));
      Alert.alert('Activation Error', formatError(activeErr));
    }
  };

  const handleVerifySecondFactor = async () => {
    if (!signIn) return;
    if (!verificationCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[SignIn] Verifying:', secondFactorStrategy, 'code length:', verificationCode.length);

      const si = signIn as any;
      const rootSi = signInResult as any;
      let result;

      const verifyMethod = findClerkMethod(si, ['authenticateWithSecondFactor', 'attemptSecondFactor', 'attemptFirstFactor', 'verifyEmailCode', 'verifyPhoneCode', 'verify', 'attempt'])
        || findClerkMethod(rootSi, ['authenticateWithSecondFactor', 'attemptSecondFactor', 'attemptFirstFactor', 'verifyEmailCode', 'verifyPhoneCode', 'verify', 'attempt']);

      if (verifyMethod) {
        console.log('[SignIn] Using verification method...');
        try {
          result = await verifyMethod({ strategy: secondFactorStrategy, code: verificationCode });
        } catch (e) {
          console.log('[SignIn] Retrying with just code...');
          result = await verifyMethod({ code: verificationCode });
        }
      } else {
        throw new Error('Verification method not found.');
      }

      let actualResult = result;
      if (result && 'result' in result) {
        if (result.error && result.error !== 'null') throw result.error;
        actualResult = result.result;
      }

      const currentStatus = actualResult?.status || si?.status;
      console.log('[SignIn] Verification result status:', currentStatus);

      if (currentStatus === 'complete') {
        console.log('[SignIn] Verification complete, calling handleSignInCompletion');
        await handleSignInCompletion(actualResult);
      } else if (currentStatus === 'needs_second_factor' || currentStatus === 'needs_first_factor' || currentStatus === 'needs_client_trust') {
        console.log('[SignIn] Transitioning to next factor...');
        await prepareFactorIfNeeded(actualResult);
      } else {
        console.error('[SignIn] Unexpected status:', currentStatus);
        Alert.alert('Verification Incomplete', `Status: ${currentStatus}`);
      }
    } catch (err: any) {
      console.error('[SignIn] Verification error:', formatError(err));
      Alert.alert('Verification Error', formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const onResendCode = async () => {
    if (!signIn) return;
    try {
      const si = signIn as any;
      console.log('[SignIn] Resending code for:', secondFactorStrategy);

      if (secondFactorStrategy === 'email_code' && si.sendMFAEmailCode) {
        await si.sendMFAEmailCode();
      } else if (secondFactorStrategy === 'phone_code' && si.sendMFAPhoneCode) {
        await si.sendMFAPhoneCode();
      } else if (si.prepareSecondFactor) {
        await si.prepareSecondFactor({
          strategy: secondFactorStrategy as any,
        });
      } else if (si.prepareFirstFactor) {
        await si.prepareFirstFactor({
          strategy: secondFactorStrategy as any,
        });
      }

      console.log('[SignIn] Resend successful');
      Alert.alert('Success', 'Verification code has been resent.');
    } catch (err: any) {
      console.error('[SignIn] Resend error:', formatError(err));
      Alert.alert('Error', formatError(err));
    }
  };

  const onGoogleSignInPress = React.useCallback(async () => {
    if (isLoading) return;

    // 🛡️ Zero-Latency Shield: Lock the gate INSTANTLY (0ms)
    authBridge.isSigningIn = true;
    setIsLoading(true);

    try {
      // Also set persistent storage for backgrounding resilience
      await AsyncStorage.setItem('is_signing_in', 'true');

      // Use explicit scheme for reliable native redirects
      const redirectUrl = `aicaltrack://expo-auth-session`;
      console.log('[SignIn] Starting OAuth flow with redirect:', redirectUrl);

      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow({
        redirectUrl
      });

      console.log('[SignIn] OAuth flow returned. SessionId:', createdSessionId);

      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });

        // Wait for session to stabilize
        const userId = await waitForClerkUser();
        if (userId) {
          const { route } = await checkAndMigrateProfile(
            userId,
            clerk.user?.primaryEmailAddress?.emailAddress
          );
          router.replace(route as any);
        } else {
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
        Alert.alert('Error', 'Google sign in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [startOAuthFlow, router, isLoading]);

  // ── Verification Screen (for Client Trust / MFA) ────────────────────
  if (showVerification) {
    const verificationMessage = secondFactorStrategy === 'email_code'
      ? `We've sent a verification code to your email address.`
      : secondFactorStrategy === 'phone_code'
        ? `We've sent a verification code to your phone number.`
        : `Enter the code from your authenticator app.`;

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContainer}>
              <TouchableOpacity
                onPress={() => {
                  setShowVerification(false);
                  setVerificationCode('');
                }}
                style={styles.backButton}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={colors.text} />
              </TouchableOpacity>
              <Image
                source={require('../../assets/images/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={[styles.title, { color: colors.text }]}>Verify Your Identity</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{verificationMessage}</Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.formContainer}>
              <InputField
                key="verification-code"
                icon="keypad-outline"
                placeholder="Verification Code"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
              />

              <Button
                title="Verify"
                onPress={handleVerifySecondFactor}
                loading={isLoading}
                disabled={!verificationCode.trim() || isLoading}
                style={styles.signInBtn}
              />

              {secondFactorStrategy !== 'totp' && (
                <Button
                  title="Resend Code"
                  variant="outline"
                  onPress={onResendCode}
                  style={styles.resendBtn}
                />
              )}

              <TouchableOpacity
                onPress={() => {
                  setShowVerification(false);
                  setVerificationCode('');
                }}
                style={styles.editEmailBtn}
              >
                <Text style={[styles.editEmailText, { color: colors.textTertiary }]}>Go back to sign in</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    );
  }

  // ── Sign-In Form ───────────────────────────────────────────────────
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
            <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to continue your fitness journey</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.formContainer}>
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
              title="Sign In"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              style={styles.signInBtn}
            />

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textTertiary }]}>OR</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>

            <Button
              title="Continue with Google"
              variant="outline"
              onPress={onGoogleSignInPress}
              leftIcon={<HugeiconsIcon icon={GoogleIcon} size={32} color="#EA4335" />}
              style={styles.googleBtn}
              textStyle={{ color: colors.text }}
            />
          </Animated.View>

          <View style={styles.footerContainer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <Text style={[styles.footerLink, { color: colors.accent }]}>Sign Up</Text>
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
  backButtonText: {
    fontSize: 24,
    color: '#2D3748',
    fontWeight: 'bold',
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
  signInBtn: {
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
