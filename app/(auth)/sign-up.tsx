import { useAuth, useOAuth, useSignUp, useClerk } from '@clerk/expo';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser';
import { saveUserToFirestore, db } from '../../lib/firebase';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';

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
  const { isLoaded: isLoadedAuth, isSignedIn } = useAuth();
  const { setActive } = useClerk();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();

  // Handle Signal API: favor the object that has the methods (create, etc.)
  const isLoaded = signUpResult?.isLoaded ?? !!signUpResult?.signUp;
  const signUp = (signUpResult?.create || signUpResult?.id)
    ? signUpResult
    : (signUpResult?.signUp?.create ? signUpResult.signUp : (signUpResult?.signUp || null));

  const [name, setName] = React.useState('');
  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [showVerification, setShowVerification] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  console.log('[SignUp] render - isLoaded:', isLoaded, 'hasSignUp:', !!signUp, 'hasSetActive:', !!setActive);
  
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
      Alert.alert('Error', 'Please fill in email and password.');
      return;
    }

    if (!isLoaded || !signUp) {
      Alert.alert('Error', 'Sign up not ready. Please try again.');
      return;
    }

    const trimmedEmail = emailAddress.trim().toLowerCase();
    setIsLoading(true);
    try {
      let createResult = await signUp.create({
        emailAddress: trimmedEmail,
        password: password,
        firstName: name.split(' ')[0] || '',
        lastName: name.split(' ').slice(1).join(' ') || '',
      });

      // Safe unnesting: only unnest if createResult is an object and has .result
      if (createResult && typeof createResult === 'object' && 'result' in createResult && createResult.result) {
        if (createResult.error && createResult.error !== 'null') throw createResult.error;
      }

      const status = (createResult as any)?.status || signUp.status;
      console.log('[SignUp] Create status:', status);

      if (status === 'missing_requirements') {
        console.log('[SignUp] Finding preparation method...');
        const prepareMethod = findClerkMethod(signUp, ['prepareEmailAddressVerification', 'prepare', 'sendEmailCode']);
        
        if (prepareMethod) {
          try {
            console.log('[SignUp] Preparing verification...');
            await prepareMethod({ strategy: 'email_code' });
            setShowVerification(true);
          } catch (prepErr) {
            console.error('[SignUp] Preparation failed:', prepErr);
            Alert.alert('Error', 'Failed to send verification code. ' + formatClerkError(prepErr));
          }
        } else {
          console.warn('[SignUp] No preparation method found, showing screen anyway');
          setShowVerification(true);
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
        Alert.alert(
          'Account Exists',
          'This email is already registered. Would you like to sign in instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.replace('/sign-in') }
          ]
        );
      } else {
        Alert.alert('Sign Up Error', formatClerkError(err));
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
      
      const rootSu = signUpResult as any;
      let result;
      
      const verifyMethod = findClerkMethod(signUp, ['attemptEmailAddressVerification', 'verifyEmailCode', 'verify', 'attempt'])
        || findClerkMethod(rootSu, ['attemptEmailAddressVerification', 'verifyEmailCode', 'verify', 'attempt']);

      if (verifyMethod) {
        console.log('[SignUp] Found verification method, calling...');
        try {
          result = await verifyMethod({ code });
        } catch (e) {
          console.log('[SignUp] Verification failed, retrying with raw code...');
          result = await verifyMethod(code);
        }
      } else {
        throw new Error('No method found to verify email code');
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
            
            // Check if this newly signed-up email actually belongs to an orphaned/legacy Firebase profile
            let foundProfile = false;
            try {
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', trimmedEmail));
              const snap = await getDocs(q);

              const checkOnboardingData = (data: any) => {
                if (!data) return false;
                
                // 1. Explicit flags
                if (data.hasOnboarded === true || data.onboardingCompleted === true) return true;

                // 2. Strict field verification (nested in 'profile' OR legacy flat)
                const profile = data.profile || {};
                const measurements = profile.measurements || data.measurements || {};
                
                const hasGender = profile.gender || data.gender;
                const hasGoal = profile.goal || data.goal;
                const hasActivity = profile.activityLevel || data.activityLevel;
                const hasWeight = measurements.weightKg || data.weight || data.weightKg;
                const hasHeight = measurements.heightFt || data.heightFt || data.height;

                return !!(hasGender && hasGoal && hasActivity && hasWeight && hasHeight);
              };

              for (const docSnap of snap.docs) {
                if (docSnap.id !== userId && checkOnboardingData(docSnap.data())) {
                  console.log('[SignUp] Found legacy profile for email, migrating to new ID:', userId);
                  const oldData = docSnap.data();
                  await setDoc(doc(db, 'users', userId), oldData, { merge: true });
                  await AsyncStorage.setItem(`has_onboarded_${userId}`, 'true');
                  foundProfile = true;
                  break; 
                }
              }
            } catch (fbQueryErr) {
              console.error('[SignUp] Failed checking for legacy profile:', fbQueryErr);
            }

            // If no prior profile existed, create a brand new bare document.
            if (!foundProfile) {
              await saveUserToFirestore(userId, trimmedEmail, name).catch(console.error);
            }

            // Activate session
            await setActive({ session: sessionId });
            
            // Route intelligently
            await AsyncStorage.removeItem('is_signing_in');
            Alert.alert('Success', 'Account created successfully!');
            router.replace(foundProfile ? '/(tabs)' : '/(onboarding)/1');

          } catch (fbErr) {
            console.error('[SignUp] Critical Firebase/routing error:', fbErr);
            await AsyncStorage.removeItem('is_signing_in');
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
      if (signUp.prepareEmailAddressVerification) {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else if (signUp.sendEmailCode) {
        await signUp.sendEmailCode();
      }
      Alert.alert('Success', 'Verification code resent to your email.');
    } catch (err: any) {
      Alert.alert('Error', formatClerkError(err));
    }
  };

  const onGoogleSignUpPress = React.useCallback(async () => {
    try {
      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow();
      if (createdSessionId && setOAuthActive) {
        await AsyncStorage.setItem('is_signing_in', 'true');
        await setOAuthActive({ session: createdSessionId });
        await AsyncStorage.removeItem('is_signing_in');
        router.replace('/');
      }
    } catch (err) {
      await AsyncStorage.removeItem('is_signing_in');
      console.error('OAuth error:', err);
      Alert.alert('Error', 'Google sign up failed. Please try again.');
    }
  }, [startOAuthFlow, router]);

  // ── Verification Screen ────────────────────────────────────────────
  if (isSignedIn) {
    return null;
  }

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
