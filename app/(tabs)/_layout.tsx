import {
  Add01Icon,
  Analytics01Icon,
  Camera02Icon,
  Cancel01Icon,
  DropletIcon,
  Dumbbell01Icon,
  Home01Icon,
  ScanIcon,
  SearchSquareIcon,
  SparklesIcon,
  UserCircleIcon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Tabs, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withSpring,
  withRepeat,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import React, { useState, useEffect } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform
} from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_MARGIN = 20;
const TAB_BAR_WIDTH = SCREEN_WIDTH - (TAB_BAR_MARGIN * 2);
const TAB_COUNT = 3; // Home, Analytics, Profile
const TAB_WIDTH = (TAB_BAR_WIDTH - 32) / TAB_COUNT;

const PulseTabIcon = ({ icon, color, size, focused }: { icon: any, color: string, size: number, focused: boolean }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withRepeat(
        withTiming(1.1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      opacity.value = withRepeat(
        withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(0.6, { duration: 200 });
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, styles.tabIconContainer]}>
      <HugeiconsIcon icon={icon} size={size} color={color} />
      {focused && (
        <Animated.View 
          entering={FadeInDown.duration(200)}
          style={[styles.activeDot, { backgroundColor: color }]} 
        />
      )}
    </Animated.View>
  );
};

const HybridTabBackground = ({ colors, isDark, stateIndex }: { colors: any, isDark: boolean, stateIndex: number }) => {
  const translateX = useSharedValue(stateIndex * TAB_WIDTH);

  useEffect(() => {
    translateX.value = withSpring(stateIndex * TAB_WIDTH, {
      damping: 15,
      stiffness: 90,
    });
  }, [stateIndex]);

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={isDark ? 85 : 100}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.blurShell,
          { 
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.7)'
          }
        ]}
      />
      <View style={styles.sliderContainer}>
        <Animated.View style={[styles.activeSlider, sliderStyle, { backgroundColor: `${colors.accent}15` }]} />
      </View>
    </View>
  );
};

function TabsLayout() {
  const [isModalVisible, setModalVisible] = useState(false);
  const [isPhotoModalVisible, setPhotoModalVisible] = useState(false);
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const handleFabPress = () => {
    setModalVisible(true);
  };

  const handleOptionPress = (option: string) => {
    setModalVisible(false);
    setTimeout(() => {
      if (option === 'Food Database') {
        router.push('/food-search');
      } else if (option === 'Scan Food') {
        setPhotoModalVisible(true);
      } else if (option === 'Log Exercise') {
        router.push('/log-exercise');
      } else if (option === 'Add Drink Water') {
        router.push('/log-water');
      } else if (option === 'AI Workout') {
        router.push('/ai-workout' as any);
      }
    }, 300);
  };

  const pickImage = async (useCamera: boolean) => {
    setPhotoModalVisible(false);
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return;
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [4, 3], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [4, 3], quality: 0.8 });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        router.push({
          pathname: '/analyze-food',
          params: { imageUri: encodeURIComponent(result.assets[0].uri) }
        });
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };



  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarItemStyle: {
            height: 60,
            justifyContent: 'center',
            alignItems: 'center',
          }
        }}
        screenListeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        tabBar={(props) => {
          // Filter out the _placeholder route for the custom tab bar UI
          const visibleRoutes = props.state.routes.filter(r => r.name !== '_placeholder');
          
          return (
            <View style={styles.tabBarWrapper}>
              <HybridTabBackground colors={colors} isDark={isDark} stateIndex={props.state.index} />
              <View style={styles.tabIconsRow}>
                {visibleRoutes.map((route, index) => {
                  const { options } = props.descriptors[route.key];
                  const isFocused = props.state.index === index;

                  const onPress = () => {
                    const event = props.navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                      props.navigation.navigate(route.name);
                    }
                  };

                  return (
                    <TouchableOpacity
                      key={route.key}
                      onPress={onPress}
                      style={{ width: TAB_WIDTH, alignItems: 'center', justifyContent: 'center' }}
                      activeOpacity={0.7}
                    >
                      {options.tabBarIcon?.({ color: isFocused ? colors.accent : colors.textTertiary, focused: isFocused, size: 24 })}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <PulseTabIcon icon={Home01Icon} size={24} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, focused }) => (
              <PulseTabIcon icon={Analytics01Icon} size={24} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <PulseTabIcon icon={UserCircleIcon} size={24} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="_placeholder"
          options={{
            title: '',
            tabBarIcon: () => null,
            href: null, // Completely hide from Tabs
          }}
        />
      </Tabs>

      {!isModalVisible && (
        <TouchableOpacity
          style={[styles.fab, styles.fabFloating]}
          onPress={handleFabPress}
          activeOpacity={0.8}
        >
          <HugeiconsIcon icon={Add01Icon} size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <View style={styles.optionsGrid}>
              <TouchableOpacity style={[styles.optionCard, { backgroundColor: colors.card }]} onPress={() => handleOptionPress('Log Exercise')}>
                <View style={[styles.optionIconCircle, { backgroundColor: isDark ? '#3B1A1A' : '#FFF5F5' }]}>
                  <HugeiconsIcon icon={Dumbbell01Icon} size={24} color={isDark ? '#FC8181' : '#E53E3E'} />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>Log Exercise</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.optionCard, { backgroundColor: colors.card }]} onPress={() => handleOptionPress('Add Drink Water')}>
                <View style={[styles.optionIconCircle, { backgroundColor: colors.blueLight }]}>
                  <HugeiconsIcon icon={DropletIcon} size={24} color={colors.blue} />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>Add Drink Water</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.optionCard, { backgroundColor: colors.card }]} onPress={() => handleOptionPress('Food Database')}>
                <View style={[styles.optionIconCircle, { backgroundColor: isDark ? '#3B2A1A' : '#FFFBEB' }]}>
                  <HugeiconsIcon icon={SearchSquareIcon} size={24} color={isDark ? '#FBD38D' : '#DD6B20'} />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>Food Database</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.optionCard, { backgroundColor: colors.card }]} onPress={() => handleOptionPress('Scan Food')}>
                <View style={[styles.optionIconCircle, { backgroundColor: colors.accentLight }]}>
                  <HugeiconsIcon icon={ScanIcon} size={24} color={colors.accent} />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>Scan Food</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.optionCard, { backgroundColor: colors.card }]} onPress={() => handleOptionPress('AI Workout')}>
                <View style={[styles.optionIconCircle, { backgroundColor: isDark ? '#1C3829' : '#F0FFF4' }]}>
                  <HugeiconsIcon icon={SparklesIcon} size={24} color={colors.accent} />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>AI Workout</Text>
              </TouchableOpacity>
            </View>
          </Pressable>

          <TouchableOpacity
            style={[styles.fab, styles.fabFloating, styles.fabActive]}
            onPress={() => setModalVisible(false)}
            activeOpacity={0.8}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

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
            <TouchableOpacity style={styles.photoOptionButton} onPress={() => pickImage(true)}>
              <Text style={[styles.photoOptionText, { color: colors.accent }]}>Take a Photo</Text>
            </TouchableOpacity>
            <View style={[styles.photoDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.photoOptionButton} onPress={() => pickImage(false)}>
              <Text style={[styles.photoOptionText, { color: colors.accent }]}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.photoCancelButton, { backgroundColor: colors.cardAlt }]} onPress={() => setPhotoModalVisible(false)}>
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
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: 24,
    left: TAB_BAR_MARGIN,
    right: TAB_BAR_MARGIN,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  blurShell: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
  },
  tabIconsRow: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 2,
  },
  sliderContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  activeSlider: {
    width: TAB_WIDTH,
    height: 44,
    borderRadius: 22,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'transparent',
    elevation: 0,
    borderTopWidth: 0,
    height: 0,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#009050',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 1001,
  },
  fabFloating: {
    bottom: 94, // (24 padding + 60 height + 10 gap)
    left: SCREEN_WIDTH / 2 - 26, // Horizontal center
  },
  fabActive: {
    backgroundColor: '#E53E3E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 160, // Restored to lower value for 2 rows
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '47%',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
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
    fontWeight: '700',
    textAlign: 'center',
  },
  photoModalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  photoOptionButton: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  photoOptionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  photoDivider: {
    height: 1,
  },
  photoCancelButton: {
    marginTop: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 20,
  },
  photoCancelText: {
    fontSize: 16,
    fontWeight: '800',
  }
});

export default TabsLayout;
