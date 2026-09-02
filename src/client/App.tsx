import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform } from 'react-native';
import { useThemeStore, useAuthStore, useFamilyStore } from './src/store';
import { colors } from './src/theme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { supabase } from './src/lib/supabase';
import { fetchMe, fetchFamilies } from './src/services/auth.service';

// Inject global CSS on web to ensure the app viewport centers content
// and doesn't bleed off-screen. This runs once at module level.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root { height: 100%; margin: 0; padding: 0; }
    body { display: flex; justify-content: center; background: #F8FAFC; overflow-x: hidden; }
    #root { width: 100%; max-width: 100vw; position: relative; }
    * { box-sizing: border-box; }
  `;
  document.head.appendChild(style);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2,
    },
  },
});

function AppNavigator() {
  const mode = useThemeStore((s) => s.mode);
  const theme = colors[mode];
  const { setAuth, logout } = useAuthStore();
  const { setFamilies, setCurrentFamily, clearFamily, currentFamily } = useFamilyStore();

  // Wire Supabase auth state changes to Zustand store
  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const user = await fetchMe();
          setAuth(user, session.access_token);
          const families = await fetchFamilies();
          setFamilies(families);
          if (!currentFamily && families.length > 0) {
            setCurrentFamily(families[0]);
          }
        } catch {
          // Profile not ready yet (e.g. email not confirmed) — stay on auth screens
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const user = await fetchMe();
            setAuth(user, session.access_token);
            const families = await fetchFamilies();
            setFamilies(families);
            if (families.length > 0) {
              setCurrentFamily(families[0]);
            }
          } catch {
            // ignore transient errors
          }
        }

        if (event === 'SIGNED_OUT') {
          logout();
          clearFamily();
          queryClient.clear();
        }

        if (event === 'TOKEN_REFRESHED' && session) {
          // Keep token in sync
          useAuthStore.setState({ accessToken: session.access_token });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigationTheme =
    mode === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            primary: theme.primary,
            background: theme.background,
            card: theme.surface,
            text: theme.text,
            border: theme.border,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            primary: theme.primary,
            background: theme.background,
            card: theme.surface,
            text: theme.text,
            border: theme.border,
          },
        };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AppNavigator />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    ...(Platform.OS === 'web' ? {
      minHeight: '100vh' as unknown as number,
      width: '100%' as unknown as number,
      overflow: 'hidden',
    } : {}),
  },
});
