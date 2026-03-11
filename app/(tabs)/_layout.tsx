import {
  Add01Icon,
  Analytics01Icon,
  Home01Icon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Tabs } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#009050', // Updated to match the green in the image
          tabBarInactiveTintColor: '#A0AEC0',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <HugeiconsIcon icon={Home01Icon} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color }) => (
              <HugeiconsIcon icon={Analytics01Icon} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <HugeiconsIcon icon={UserCircleIcon} size={24} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => console.log('+ button pressed')}
        activeOpacity={0.8}
      >
        <HugeiconsIcon icon={Add01Icon} size={25} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: 'center',
    // alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  tabBar: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24, // Tab bar spans edge-to-edge minus margins
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    height: 60,
    borderTopWidth: 0,
    paddingBottom: 0,
    paddingLeft: 16, // Padding left for symmetry
    paddingRight: 64, // Keep the icons centered in the remaining space but pushed away from the right side overlapping FAB
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#009050', // Match the green color from the image
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 9, // Slightly higher elevation than tab bar
    shadowColor: '#009050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  }
});
