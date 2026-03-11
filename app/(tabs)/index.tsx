import { Text, View, StyleSheet } from "react-native";
import { useAuth, useUser } from "@clerk/expo";
import { Button } from "../../components/Button";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Home() {
  const { signOut } = useAuth();
  const { user } = useUser();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Home!</Text>
      <Text style={styles.subtitle}>
        {user?.fullName ? `Hello, ${user.fullName}!` : "You are successfully authenticated."}
      </Text>
      
      {/* Temporary clear button for testing */}
      <Button 
        title="Reset Onboarding (Debug)"
        variant="outline"
        style={{ marginBottom: 16, width: '100%' }}
        onPress={async () => {
           await AsyncStorage.removeItem('has_onboarded');
           await AsyncStorage.removeItem('onboarding_gender');
           await AsyncStorage.removeItem('onboarding_goal');
           await AsyncStorage.removeItem('onboarding_activity');
           await AsyncStorage.removeItem('onboarding_birthdate');
           await AsyncStorage.removeItem('onboarding_weight');
           await AsyncStorage.removeItem('onboarding_height_ft');
           await AsyncStorage.removeItem('onboarding_height_in');
           alert('Cleared! Quit the app to re-onboard');
        }} 
      />

      <Button 
        title="Sign Out" 
        onPress={() => signOut()} 
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#FFFFFF',
    padding: 24,
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
    marginBottom: 32,
  },
  button: {
    width: '100%',
  }
});
