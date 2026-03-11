import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/expo';
import { Stack, useSegments, Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
console.log('[RootLayout] Publishable Key exists:', !!publishableKey);

if (!publishableKey) {
  throw new Error('Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env');
}

const InitialLayout = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();

  console.log('[InitialLayout] isLoaded:', isLoaded, 'isSignedIn:', isSignedIn);

  const inAuthGroup = segments[0] === '(auth)';

  if (isSignedIn && inAuthGroup) {
    return <Redirect href="/" />;
  }

  if (!isSignedIn && !inAuthGroup) {
    return <Redirect href="/welcome" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="food-search" 
        options={{ 
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name="log-food" 
        options={{ 
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }} 
      />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <InitialLayout />
      </ClerkLoaded>
    </ClerkProvider>
  );
}
