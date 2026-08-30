import React, { useState } from 'react';
import { Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthLayout, AuthField, AuthButton } from '../../components/AuthLayout';
import { AuthStackParamList } from '../../navigation/types';
import { joinFamily, login, fetchFamilies } from '../../services/auth.service';
import { useAuthStore, useFamilyStore } from '../../store';
import { typography } from '../../theme';
import { authColors } from '../../theme/auth';

export function JoinFamilyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const { setCurrentFamily, setFamilies } = useFamilyStore();

  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Invite code required', 'Enter the code shared by your family.');
      return;
    }

    setLoading(true);
    try {
      if (!isAuthenticated) {
        if (!email.trim() || !password) {
          Alert.alert('Sign in first', 'Enter your email and password to join.');
          setLoading(false);
          return;
        }
        const user = await login(email.trim().toLowerCase(), password);
        setAuth(user);
      }

      const family = await joinFamily(inviteCode.trim().toUpperCase());
      setCurrentFamily(family);
      const families = await fetchFamilies();
      setFamilies(families);
    } catch (error) {
      Alert.alert(
        'Could not join',
        error instanceof Error ? error.message : 'Invalid invite code or credentials'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Join a family" subtitle="Enter the invite code from your family admin">
      {!isAuthenticated && (
        <>
          <AuthField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AuthField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />
        </>
      )}
      <AuthField
        label="Invite code"
        value={inviteCode}
        onChangeText={(text) => setInviteCode(text.toUpperCase())}
        placeholder="ABC12345"
        autoCapitalize="none"
      />
      <AuthButton label="Join Family" onPress={handleJoin} loading={loading} />
      <Pressable onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Need an account? Create one first</Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  link: {
    ...typography.caption,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 8,
    color: authColors.primary,
  },
});
