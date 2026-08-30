import React, { useState } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthLayout, AuthField, AuthButton } from '../../components/AuthLayout';
import { createFamily } from '../../services/auth.service';
import { useFamilyStore } from '../../store';
import { typography, spacing } from '../../theme';
import { authColors } from '../../theme/auth';
import { FamilySetupParamList } from '../../navigation/types';

export function CreateFamilyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<FamilySetupParamList>>();
  const setCurrentFamily = useFamilyStore((s) => s.setCurrentFamily);
  const setFamilies = useFamilyStore((s) => s.setFamilies);

  const [name, setName] = useState('');
  const [newspaperName, setNewspaperName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Please enter a family name.');
      return;
    }

    setLoading(true);
    try {
      const family = await createFamily(name.trim(), newspaperName.trim() || undefined);
      setCurrentFamily(family);
      setFamilies([family]);
    } catch (err) {
      // Show full error on screen so we can see what's happening
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[CreateFamily] error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your family" subtitle="Set up your private family space" error={error}>
      <AuthField
        label="Family name"
        value={name}
        onChangeText={setName}
        placeholder="The Malhotra Family"
        autoCapitalize="words"
      />
      <AuthField
        label="Newspaper name (optional)"
        value={newspaperName}
        onChangeText={setNewspaperName}
        placeholder="The Malhotra Times"
        autoCapitalize="words"
      />
      <Text style={styles.hint}>
        You'll get an invite code to share with family members.
      </Text>
      <AuthButton label="Create Family" onPress={handleCreate} loading={loading} />
      <Pressable onPress={() => navigation.navigate('JoinFamily')}>
        <Text style={styles.link}>Have an invite code? Join a family →</Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  hint: { ...typography.caption, marginTop: -4, color: '#64748B' },
  link: {
    ...typography.caption,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: spacing.md,
    color: authColors.primary,
  },
});
