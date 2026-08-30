import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthLayout, AuthField, AuthButton } from '../../components/AuthLayout';
import { AuthStackParamList } from '../../navigation/types';
import { register } from '../../services/auth.service';
import { useAuthStore } from '../../store';
import { typography, spacing } from '../../theme';
import { authColors } from '../../theme/auth';

function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null;

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[^A-Za-z]/.test(password);
  const score = [hasLength, hasUpper, hasLower, hasNumberOrSymbol].filter(Boolean).length;

  const getColor = () =>
    score <= 1 ? '#EF4444' : score <= 2 ? '#F59E0B' : score === 3 ? '#10B981' : '#059669';
  const getLabel = () =>
    score <= 1 ? 'Weak' : score <= 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';

  const CheckItem = ({ met, text }: { met: boolean; text: string }) => (
    <View style={styles.checkItem}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={met ? '#10B981' : '#94A3B8'}
      />
      <Text style={[styles.checkText, { color: met ? '#334155' : '#94A3B8' }]}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthHeader}>
        <Text style={styles.strengthLabel}>Password strength:</Text>
        <Text style={[styles.strengthValue, { color: getColor() }]}>{getLabel()}</Text>
      </View>
      <View style={styles.barsRow}>
        {[1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={[styles.bar, { backgroundColor: score >= level ? getColor() : '#E2E8F0' }]}
          />
        ))}
      </View>
      <View style={styles.checksGrid}>
        <CheckItem met={hasLength} text="8+ characters" />
        <CheckItem met={hasUpper} text="Uppercase letter" />
        <CheckItem met={hasLower} text="Lowercase letter" />
        <CheckItem met={hasNumberOrSymbol} text="Number or symbol" />
      </View>
    </View>
  );
}

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    if (!displayName.trim() || !email.trim() || password.length < 8) {
      setError('Name, email, and password (8+ chars) are required.');
      return;
    }

    setLoading(true);
    try {
      const user = await register(email.trim().toLowerCase(), password, displayName.trim());
      setAuth(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Start your family's private home" error={error}>
      <AuthField
        label="Your name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Palak"
        autoCapitalize="words"
      />
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
        placeholder="Min 8 characters"
        secureTextEntry
      />

      <PasswordStrengthIndicator password={password} />

      <AuthButton label="Create Account" onPress={handleRegister} loading={loading} />
      <Pressable onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
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
  strengthContainer: { marginTop: -4, marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  strengthValue: { fontSize: 12, fontWeight: '700' },
  barsRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  checksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 4, width: '45%' },
  checkText: { fontSize: 11, fontWeight: '500' },
});
