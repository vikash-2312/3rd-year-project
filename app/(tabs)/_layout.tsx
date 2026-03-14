import {
  Add01Icon,
  Analytics01Icon,
  Cancel01Icon,
  DropletIcon,
  Dumbbell01Icon,
  Home01Icon,
  ScanIcon,
  SearchSquareIcon,
  UserCircleIcon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../../lib/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function TabsLayout() {
  const [isModalVisible, setModalVisible] = useState(false);
  const [isPhotoModalVisible, setPhotoModalVisible] = useState(false);
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const handleFabPress = () => {
    setModalVisible(true);
  };

  const handleOptionPress = (option: string) => {
    console.log(`[FAB] Option pressed: ${option}`);
    setModalVisible(false);

    // Small delay to let the modal close before navigating
    setTimeout(() => {
      if (option === 'Food Database') {
        router.push('/food-search');
      } else if (option === 'Scan Food') {
        setPhotoModalVisible(true);
      } else if (option === 'Log Exercise') {
        router.push('/log-exercise');
      } else if (option === 'Add Drink Water') {
        router.push('/log-water');
      } else {
        console.log(`[FAB] Other option: ${option}`);
        // TODO: Navigate to the relevant screen for each option
      }
    }, 300);
  };

  const pickImage = async (useCamera: boolean) => {
    setPhotoModalVisible(false);

    try {
      // Check if ImagePicker native module is available
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need camera permissions to make this work!');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need camera roll permissions to make this work!');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          base64: true,
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          base64: true,
        });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        const base64Data = result.assets[0].base64 || '';

        router.push({
          pathname: '/analyze-food',
          params: {
            imageUri: encodeURIComponent(imageUri),
            imageBase64: encodeURIComponent(base64Data)
          }
        });
      }
    } catch (error: any) {
      if (error?.message?.includes('native module')) {
        alert('Image Picker is not available in Expo Go. Please use a development build to scan food.');
      } else {
        console.error("Error picking image:", error);
        alert('Failed to pick image. Please try again.');
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: [styles.tabBar, { backgroundColor: colors.tabBar }],
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,

          tabBarItemStyle: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }
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
              <HugeiconsIcon icon={UserCircleIcon} size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="_placeholder"
          options={{
            title: '',
            tabBarIcon: () => null,
            tabBarButton: () => (
              <View style={{ flex: 1, pointerEvents: 'none' }} />
            ),
          }}
        />
      </Tabs>

      {/* Floating Action Button (Background trigger) */}
      {!isModalVisible && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleFabPress}
          activeOpacity={0.8}
        >
          <HugeiconsIcon
            icon={Add01Icon}
            size={25}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      )}

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
          <Pressable style={styles.modalContent} onPress={(e) => { /* Prevent clicks from reaching overlay */ }}>
            <View style={styles.optionsGrid}>
              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.card }]}
                activeOpacity={0.7}
                onPress={() => handleOptionPress('Log Exercise')}
              >
                <View style={[styles.optionIconCircle, { backgroundColor: isDark ? '#3B1A1A' : '#FFF5F5' }]}>
                  <HugeiconsIcon icon={Dumbbell01Icon} size={24} color={isDark ? '#FC8181' : '#E53E3E'} />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>Log Exercise</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.card }]}
                activeOpacity={0.7}
                onPress={() => handleOptionPress('Add Drink Water')}
              >
                <View style={[styles.optionIconCircle, { backgroundColor: colors.blueLight }]}>
                  <HugeiconsIcon icon={DropletIcon} size={24} color={colors.blue} />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>Add Drink Water</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.card }]}
                activeOpacity={0.7}
                onPress={() => handleOptionPress('Food Database')}
              >
                <View style={[styles.optionIconCircle, { backgroundColor: isDark ? '#3B2A1A' : '#FFFBEB' }]}>
                  <HugeiconsIcon icon={SearchSquareIcon} size={24} color={isDark ? '#FBD38D' : '#DD6B20'} />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>Food Database</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.card }]}
                activeOpacity={0.7}
                onPress={() => handleOptionPress('Scan Food')}
              >
                <View style={[styles.optionIconCircle, { backgroundColor: colors.accentLight }]}>
                  <HugeiconsIcon icon={ScanIcon} size={24} color={colors.accent} />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>Scan Food</Text>
              </TouchableOpacity>
            </View>
          </Pressable>

          {/* Fixed FAB Toggle inside Modal (to handle close) */}
          <TouchableOpacity
            style={[styles.fab, styles.fabActive]}
            onPress={() => setModalVisible(false)}
            activeOpacity={0.8}
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              size={25}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* Photo Source Modal */}
      <Modal
        visible={isPhotoModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPhotoModalVisible(false)}>
          <View style={[styles.photoModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.photoModalTitle, { color: colors.text }]}>Select Image Source</Text>

            <TouchableOpacity
              style={styles.photoOptionButton}
              onPress={() => pickImage(true)}
            >
              <Text style={[styles.photoOptionText, { color: colors.accent }]}>Take a Photo</Text>
            </TouchableOpacity>

            <View style={[styles.photoDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.photoOptionButton}
              onPress={() => pickImage(false)}
            >
              <Text style={[styles.photoOptionText, { color: colors.accent }]}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.photoCancelButton, { backgroundColor: colors.cardAlt }]}
              onPress={() => setPhotoModalVisible(false)}
            >
              <Text style={[styles.photoCancelText, { color: colors.danger }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
    marginHorizontal: 40,
    left: 20,
    right: 20,
    height: 60,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 6

  },
  fab: {
    position: 'absolute',
    bottom: 50, // Centered vertically in the 60px height tab bar ( (60-50)/2 + 24 )
    left: 10 + ((SCREEN_WIDTH - 40) * 0.875) - 25, // Centered in the 4th slot of 4 20  
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
    backgroundColor: 'transparent',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 120, // Space to clear the floating tab bar + FAB
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
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

  // Photo Source Modal Styles
  photoModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 16,
  },
  photoOptionButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  photoOptionText: {
    fontSize: 16,
    color: '#009050',
    fontWeight: '600',
  },
  photoDivider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginHorizontal: 16,
  },
  photoCancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
  },
  photoCancelText: {
    fontSize: 16,
    color: '#E53E3E',
    fontWeight: '600',
  }
});

export default TabsLayout;
