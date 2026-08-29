import React from 'react';
import { useAuthStore, useFamilyStore } from '../store';
import { AuthNavigator, FamilySetupNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentFamily = useFamilyStore((s) => s.currentFamily);

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  if (!currentFamily) {
    return <FamilySetupNavigator />;
  }

  return <MainTabNavigator />;
}
