import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../hooks/useTheme';
import { useQueryClient } from '@tanstack/react-query';
import { addFamilyMember } from '../services/family.service';
import { spacing, borderRadius, typography } from '../theme';
import { GlassCard } from './GlassCard';

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  familyId: string;
  inviteCode?: string;
  familyName?: string;
}

const ROLES = ['Parent', 'Child', 'Sibling', 'Grandparent', 'Partner', 'Member'];

export function AddMemberModal({
  visible,
  onClose,
  familyId,
  inviteCode,
  familyName,
}: AddMemberModalProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(inviteCode);
    } else {
      await Clipboard.setStringAsync(inviteCode);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAddDirect = async () => {
    if (!displayName.trim()) {
      Alert.alert('Name required', 'Please enter a name for this family member.');
      return;
    }
    setSubmitting(true);
    try {
      await addFamilyMember(familyId, {
        displayName: displayName.trim(),
        email: email.trim() || undefined,
        role: role.toLowerCase(),
      });
      await queryClient.invalidateQueries({ queryKey: ['home', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['memberLocations', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['podcastStatus', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['me'] });

      Alert.alert(
        'Member Added! 🎉',
        `${displayName.trim()} is now part of ${familyName || 'your family'}.`
      );
      setDisplayName('');
      setEmail('');
      setRole('Member');
      onClose();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not add family member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>Add Family Member</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Add to {familyName ?? 'Family'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Quick Add Form */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Add</Text>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Instantly create a profile in your family account.
            </Text>

            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
              ]}
              placeholder="Name (e.g. Papa, Aarav, Priya)"
              placeholderTextColor={theme.textTertiary}
              value={displayName}
              onChangeText={setDisplayName}
            />

            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
              ]}
              placeholder="Email (optional)"
              placeholderTextColor={theme.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Role / Relation</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleScroll}>
              {ROLES.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRole(r)}
                  style={[
                    styles.roleChip,
                    {
                      borderColor: role === r ? theme.primary : theme.border,
                      backgroundColor: role === r ? theme.primary + '18' : theme.surfaceSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      { color: role === r ? theme.primary : theme.textSecondary },
                    ]}
                  >
                    {r}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
              onPress={handleAddDirect}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.addBtnText}>Add Member to Family</Text>
              )}
            </Pressable>

            {/* Invite Code Divider */}
            {inviteCode && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Or Share Invite Code</Text>
                <Text style={[styles.hint, { color: theme.textSecondary }]}>
                  Family members can download Famora and enter this code to join on their own device.
                </Text>

                <GlassCard style={{ ...styles.codeBox, borderColor: theme.primary + '44' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.codeLabel, { color: theme.textTertiary }]}>Invite Code</Text>
                    <Text style={[styles.codeText, { color: theme.primary }]}>{inviteCode}</Text>
                  </View>
                  <Pressable
                    style={[
                      styles.copyBtn,
                      { backgroundColor: copied ? theme.success : theme.primary },
                    ]}
                    onPress={handleCopyCode}
                  >
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#FFF" />
                    <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
                  </Pressable>
                </GlassCard>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    ...typography.title,
    fontSize: 18,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 15,
  },
  hint: {
    ...typography.caption,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.micro,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  input: {
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...typography.body,
    fontSize: 14,
  },
  roleScroll: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  roleChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  roleChipText: {
    ...typography.caption,
    fontWeight: '600',
  },
  addBtn: {
    height: 46,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  codeLabel: {
    ...typography.micro,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeText: {
    ...typography.title,
    fontSize: 22,
    letterSpacing: 3,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  copyBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
