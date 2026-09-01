import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store';
import { spacing, borderRadius, typography } from '../theme';
import { GlassCard } from './GlassCard';
import { EmptyState } from './EmptyState';
import { AvatarRing } from './AvatarRing';
import {
  fetchMailbox,
  sendMailboxLetter,
  openMailboxLetter,
  fetchHomeDashboard,
} from '../services/family.service';
import { showAlert } from '../utils/alert';
import { MailboxLetter, MailboxOpenCondition } from '../types';

const OPEN_CONDITIONS: { value: MailboxOpenCondition; label: string }[] = [
  { value: 'anytime', label: 'Open anytime' },
  { value: 'bad_day', label: 'Open when you are having a bad day' },
  { value: 'birthday', label: 'Open on your birthday' },
  { value: 'after_exams', label: 'Open after your exams' },
  { value: 'custom', label: 'Custom message' },
];

interface FamilyMailboxProps {
  familyId: string;
}

export function FamilyMailbox({ familyId }: FamilyMailboxProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [view, setView] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [openCondition, setOpenCondition] = useState<MailboxOpenCondition>('bad_day');
  const [customCondition, setCustomCondition] = useState('');
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const { data: mailbox, isLoading } = useQuery({
    queryKey: ['mailbox', familyId],
    queryFn: () => fetchMailbox(familyId),
  });

  const { data: home } = useQuery({
    queryKey: ['home', familyId],
    queryFn: () => fetchHomeDashboard(familyId),
  });

  const members = (home?.members ?? []).filter((m) => m.id !== userId);
  // If home dashboard hasn't loaded yet, show all members from mailbox participants
  const recipientOptions = members.length > 0 ? members : [];

  const resetCompose = () => {
    setRecipientId(null);
    setTitle('');
    setBody('');
    setOpenCondition('bad_day');
    setCustomCondition('');
    setView('inbox');
  };

  const handleSend = async () => {
    if (!recipientId || !title.trim() || !body.trim()) {
      showAlert('Missing fields', 'Choose a recipient, title, and letter body.');
      return;
    }
    setSaving(true);
    try {
      await sendMailboxLetter(familyId, {
        recipientId,
        title: title.trim(),
        body: body.trim(),
        openCondition,
        openConditionText: openCondition === 'custom' ? customCondition.trim() : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['mailbox', familyId] });
      resetCompose();
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Could not send letter');
    } finally {
      setSaving(false);
    }
  };

  const handleOpen = async (letter: MailboxLetter) => {
    setOpeningId(letter.id);
    try {
      await openMailboxLetter(familyId, letter.id);
      await queryClient.invalidateQueries({ queryKey: ['mailbox', familyId] });
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Could not open letter');
    } finally {
      setOpeningId(null);
    }
  };

  const renderLetter = (letter: MailboxLetter) => (
    <GlassCard key={letter.id} style={{ ...styles.letterCard, borderColor: theme.border }}>
      <View style={styles.letterHeader}>
        <AvatarRing
          uri={letter.isForMe ? letter.authorAvatar : letter.recipientAvatar}
          name={letter.isForMe ? letter.authorName ?? 'Family' : letter.recipientName ?? 'Family'}
          size={36}
        />
        <View style={styles.letterMeta}>
          <Text style={[styles.letterTitle, { color: theme.text }]}>{letter.title}</Text>
          <Text style={[styles.letterSub, { color: theme.textSecondary }]}>
            {letter.isForMe ? `From ${letter.authorName}` : `To ${letter.recipientName}`}
          </Text>
          <Text style={[styles.condition, { color: theme.primary }]}>{letter.openConditionLabel}</Text>
        </View>
      </View>

      {letter.isSealed ? (
        <Pressable
          style={[styles.openBtn, { borderColor: theme.primary }]}
          onPress={() => handleOpen(letter)}
          disabled={openingId === letter.id}
        >
          {openingId === letter.id ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={[styles.openBtnText, { color: theme.primary }]}>Open letter</Text>
          )}
        </Pressable>
      ) : letter.body ? (
        <Text style={[styles.letterBody, { color: theme.text }]}>{letter.body}</Text>
      ) : null}
    </GlassCard>
  );

  if (view === 'compose') {
    return (
      <ScrollView contentContainerStyle={styles.compose}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Send to</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {recipientOptions.length === 0 ? (
            <Text style={[styles.noMembers, { color: theme.textTertiary }]}>
              Add family members first (Family → Add Member).
            </Text>
          ) : (
            recipientOptions.map((member) => (
              <Pressable
                key={member.id}
                onPress={() => setRecipientId(member.id)}
                style={[
                  styles.memberChip,
                  {
                    borderColor: recipientId === member.id ? theme.primary : theme.border,
                    backgroundColor: recipientId === member.id ? theme.primary + '12' : theme.surface,
                  },
                ]}
              >
                <Text style={{ color: recipientId === member.id ? theme.primary : theme.text }}>
                  {member.displayName}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>

        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Letter title"
          placeholderTextColor={theme.textTertiary}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border }]}
          placeholder="Write your letter..."
          placeholderTextColor={theme.textTertiary}
          value={body}
          onChangeText={setBody}
          multiline
        />

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Open when</Text>
        {OPEN_CONDITIONS.map((c) => (
          <Pressable
            key={c.value}
            onPress={() => setOpenCondition(c.value)}
            style={[
              styles.conditionRow,
              { borderColor: openCondition === c.value ? theme.primary : theme.border },
            ]}
          >
            <Text style={{ color: openCondition === c.value ? theme.primary : theme.text }}>{c.label}</Text>
          </Pressable>
        ))}
        {openCondition === 'custom' && (
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder='e.g. "Open when you miss home"'
            placeholderTextColor={theme.textTertiary}
            value={customCondition}
            onChangeText={setCustomCondition}
          />
        )}

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
          onPress={handleSend}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Send letter</Text>
          )}
        </Pressable>
        <Pressable onPress={resetCompose}>
          <Text style={[styles.link, { color: theme.textSecondary }]}>Cancel</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const letters = view === 'inbox' ? mailbox?.inbox ?? [] : mailbox?.sent ?? [];

  return (
    <View>
      <View style={styles.toolbar}>
        <Pressable onPress={() => setView('inbox')}>
          <Text style={[styles.tabText, { color: view === 'inbox' ? theme.primary : theme.textSecondary }]}>
            Inbox
          </Text>
        </Pressable>
        <Pressable onPress={() => setView('sent')}>
          <Text style={[styles.tabText, { color: view === 'sent' ? theme.primary : theme.textSecondary }]}>
            Sent
          </Text>
        </Pressable>
        <Pressable
          style={[styles.composeBtn, { backgroundColor: theme.primary }]}
          onPress={() => setView('compose')}
        >
          <Text style={styles.composeBtnText}>Write</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.lg }} />
      ) : letters.length === 0 ? (
        <EmptyState
          iconName="mail-outline"
          title={view === 'inbox' ? 'No letters yet' : 'Nothing sent'}
          message="Leave a handwritten-style letter for someone you love."
        />
      ) : (
        letters.map(renderLetter)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  tabText: { ...typography.body, fontWeight: '600' },
  composeBtn: { marginLeft: 'auto', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  composeBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  letterCard: { borderWidth: 1, marginBottom: spacing.sm },
  letterHeader: { flexDirection: 'row', gap: spacing.sm },
  letterMeta: { flex: 1 },
  letterTitle: { ...typography.body, fontWeight: '700' },
  letterSub: { ...typography.caption, marginTop: 2 },
  condition: { ...typography.micro, marginTop: 4, textTransform: 'none', letterSpacing: 0 },
  letterBody: { ...typography.body, marginTop: spacing.md, lineHeight: 22 },
  openBtn: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  openBtnText: { fontWeight: '700' },
  compose: { gap: spacing.sm, paddingBottom: spacing.lg },
  sectionLabel: { ...typography.label, marginTop: spacing.sm },
  chipRow: { marginBottom: spacing.sm },
  noMembers: { ...typography.caption, marginBottom: spacing.sm, fontStyle: 'italic' },
  memberChip: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  input: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.sm, ...typography.body },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  conditionRow: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  primaryBtn: { borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  primaryBtnText: { color: '#FFF', fontWeight: '700' },
  link: { textAlign: 'center', marginTop: spacing.sm },
});
