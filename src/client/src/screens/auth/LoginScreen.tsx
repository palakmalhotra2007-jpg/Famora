import React, { useState } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthLayout, AuthField, AuthButton } from '../../components/AuthLayout';
import { AuthStackParamList } from '../../navigation/types';
import { login, fetchFamilies } from '../../services/auth.service';
import { useAuthStore, useFamilyStore } from '../../store';
import { typography, spacing } from '../../theme';
import { authColors } from '../../theme/auth';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { setFamilies, setCurrentFamily } = useFamilyStore();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      setAuth(user);

      const families = await fetchFamilies();
      setFamilies(families);
      if (families.length > 0) {
        setCurrentFamily(families[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your family home" error={error}>
      <AuthField
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="you@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <AuthField
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
      />
      <AuthButton label="Sign in" onPress={handleLogin} loading={loading} />
      <Pressable onPress={() => navigation.navigate('Register')} style={styles.footerLink}>
        <Text style={styles.link}>
          New here?{' '}
          <Text style={styles.linkAccent}>Create an account</Text>
        </Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footerLink: { alignItems: 'center', marginTop: spacing.sm },
  link: {
    ...typography.caption,
    textAlign: 'center',
    textTransform: 'none',
    letterSpacing: 0,
    color: '#64748B',
  },
  linkAccent: { color: authColors.primary, fontWeight: '700' },
});
