import React, { useState } from 'react';
import { Text, StyleSheet, Alert, Pressable } from 'react-native';
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

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Family name required', 'Give your family a name.');
      return;
    }

    setLoading(true);
    try {
      const family = await createFamily(name.trim(), newspaperName.trim() || undefined);
      setCurrentFamily(family);
      setFamilies([family]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not create family');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your family" subtitle="Set up your private family space">
      <AuthField label="Family name" value={name} onChangeText={setName} placeholder="The Sharma Family" autoCapitalize="words" />
      <AuthField
        label="Newspaper name (optional)"
        value={newspaperName}
        onChangeText={setNewspaperName}
        placeholder="The Sharma Times"
        autoCapitalize="words"
      />
      <Text style={styles.hint}>
        You&apos;ll get an invite code to share with family members.
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
  link: { ...typography.caption, textAlign: 'center', fontWeight: '600', marginTop: spacing.md, color: authColors.primary },
});
