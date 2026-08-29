import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useThemeStore } from '../store';
import { useResponsive } from '../hooks/useResponsive';
import { spacing } from '../theme';
import { pinShadow } from '../theme/pin';
import { MainTabParamList } from './types';

import { MemoriesScreen } from '../screens/memories/MemoriesScreen';
import { FamilyScreen } from '../screens/family/FamilyScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { HomeStackNavigator } from './HomeStackNavigator';
import { LocationSharingSync } from '../components/LocationSharingSync';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Memories: { active: 'grid', inactive: 'grid-outline' },
  Family: { active: 'people', inactive: 'people-outline' },
  Profile: { active: 'person-circle', inactive: 'person-circle-outline' },
};

export function MainTabNavigator() {
  const theme = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const { isWide, isWeb, contentMaxWidth } = useResponsive();

  return (
    <>
      <LocationSharingSync />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopWidth: 0,
            borderRadius: 24,
            marginBottom: Platform.OS === 'ios' ? 12 : 10,
            marginHorizontal: 12,
            height: Platform.OS === 'ios' ? 78 : 68,
            paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.xs,
            paddingTop: spacing.xs,
            paddingHorizontal: spacing.sm,
            position: 'absolute',
            left: 0,
            right: 0,
            elevation: 12,
            shadowColor: theme.shadow,
            shadowOpacity: 0.18,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            ...(isWeb && isWide
              ? {
                  maxWidth: contentMaxWidth,
                  width: '100%',
                  alignSelf: 'center' as const,
                  left: '50%',
                  right: 'auto',
                  transform: [{ translateX: -contentMaxWidth / 2 }],
                }
              : {}),
          },
          tabBarActiveTintColor: theme.pin,
          tabBarInactiveTintColor: theme.textTertiary,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
          tabBarIcon: ({ focused, color, size }) => {
            const icons = TAB_ICONS[route.name];
            const iconName = focused ? icons.active : icons.inactive;
            return <Ionicons name={iconName} size={size - 1} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeStackNavigator} options={{ tabBarLabel: 'Home' }} />
        <Tab.Screen name="Memories" component={MemoriesScreen} options={{ tabBarLabel: 'Feed' }} />
        <Tab.Screen name="Family" component={FamilyScreen} options={{ tabBarLabel: 'Family' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
      </Tab.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  tabLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  tabItem: { paddingTop: 2, borderRadius: 16, justifyContent: 'center' },
});
