import { View, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * 🕵️‍♂️ The Invisible Catcher
 * This file exists purely to provide a valid destination for the native 
 * Google Sign-In redirect URI (`aicaltrack://expo-auth-session`). 
 * 
 * By having 
 * this route, we prevent Expo Router from showing the "Unmatched Route" 
 * black screen.
 */
export default function AuthSessionCatcher() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF6B6B" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
