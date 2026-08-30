import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore, useFamilyStore } from '../store';
import { AuthNavigator, FamilySetupNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { supabase } from '../lib/supabase';

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentFamily   = useFamilyStore((s) => s.currentFamily);
  const logout          = useAuthStore((s) => s.logout);
  const clearFamily     = useFamilyStore((s) => s.clearFamily);

  // On web, validate that the Supabase session is still alive before
  // trusting the persisted Zustand auth state. This prevents the app
  // from showing the main screen after a hard reload when the session
  // has expired or doesn't exist.
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // No active Supabase session — clear stale persisted state
        logout();
        clearFamily();
      }
      setChecking(false);
    });
  }, [logout, clearFamily]);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  if (!currentFamily) {
    return <FamilySetupNavigator />;
  }

  return <MainTabNavigator />;
}
