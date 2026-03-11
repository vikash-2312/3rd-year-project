import {
  Add01Icon,
  Analytics01Icon,
  Cancel01Icon,
  CrownIcon,
  Dumbbell01Icon,
  DropletIcon,
  Home01Icon,
  ScanIcon,
  SearchSquareIcon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function TabsLayout() {
  const [isModalVisible, setModalVisible] = useState(false);

  const handleFabPress = () => {
    setModalVisible(true);
  };

  const handleOptionPress = (option: string) => {
    setModalVisible(false);
    console.log(`Selected: ${option}`);
    // TODO: Navigate to the relevant screen for each option
  };

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#009050',
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
        style={[styles.fab, isModalVisible && styles.fabActive]}
        onPress={() => isModalVisible ? setModalVisible(false) : handleFabPress()}
        activeOpacity={0.8}
      >
        <HugeiconsIcon
          icon={isModalVisible ? Cancel01Icon : Add01Icon}
          size={25}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {/* Bottom Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        {/* Overlay: tap to dismiss */}
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          {/* Modal Content */}
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* Grid: 2 cards per row */}
            <View style={styles.optionsGrid}>
              {/* Log Exercise */}
              <TouchableOpacity
                style={styles.optionCard}
                activeOpacity={0.7}
                onPress={() => handleOptionPress('Log Exercise')}
              >
                <View style={[styles.optionIconCircle, { backgroundColor: '#FFF5F5' }]}>
                  <HugeiconsIcon icon={Dumbbell01Icon} size={24} color="#E53E3E" />
                </View>
                <Text style={styles.optionLabel}>Log Exercise</Text>
              </TouchableOpacity>

              {/* Add Drink Water */}
              <TouchableOpacity
                style={styles.optionCard}
                activeOpacity={0.7}
                onPress={() => handleOptionPress('Add Drink Water')}
              >
                <View style={[styles.optionIconCircle, { backgroundColor: '#EBF8FF' }]}>
                  <HugeiconsIcon icon={DropletIcon} size={24} color="#3182CE" />
                </View>
                <Text style={styles.optionLabel}>Add Drink Water</Text>
              </TouchableOpacity>

              {/* Food Database */}
              <TouchableOpacity
                style={styles.optionCard}
                activeOpacity={0.7}
                onPress={() => handleOptionPress('Food Database')}
              >
                <View style={[styles.optionIconCircle, { backgroundColor: '#FFFBEB' }]}>
                  <HugeiconsIcon icon={SearchSquareIcon} size={24} color="#DD6B20" />
                </View>
                <Text style={styles.optionLabel}>Food Database</Text>
              </TouchableOpacity>

              {/* Scan Food (Premium) */}
              <TouchableOpacity
                style={styles.optionCard}
                activeOpacity={0.7}
                onPress={() => handleOptionPress('Scan Food')}
              >
                <View style={[styles.optionIconCircle, { backgroundColor: '#F0FFF4' }]}>
                  <HugeiconsIcon icon={ScanIcon} size={24} color="#009050" />
                </View>
                <Text style={styles.optionLabel}>Scan Food</Text>
                {/* Premium Badge */}
                <View style={styles.premiumBadge}>
                  <HugeiconsIcon icon={CrownIcon} size={10} color="#D69E2E" />
                  <Text style={styles.premiumText}>PRO</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
  },
  tabBar: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
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
    paddingLeft: 16,
    paddingRight: 64,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#009050',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 9,
    shadowColor: '#009050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 1000,
  },
  fabActive: {
    backgroundColor: '#E53E3E',
    shadowColor: '#E53E3E',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 110, // Space to clear the floating tab bar + FAB
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '47%',
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    position: 'relative',
  },
  optionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
  },

  // Premium badge
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFF0',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FEFCBF',
  },
  premiumText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#D69E2E',
    marginLeft: 2,
  },
});
