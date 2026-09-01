import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store';
import { spacing, borderRadius, typography } from '../theme';
import { GlassCard } from './GlassCard';
import { EmptyState } from './EmptyState';
import { AvatarRing } from './AvatarRing';
import {
  fetchWallTimeline,
  postWallEntry,
  uploadImage,
  resolveMediaUrl,
} from '../services/family.service';
import { showAlert } from '../utils/alert';

/** Returns 'morning' before 17:00, 'night' from 17:00 onwards. */
function currentSlot(): 'morning' | 'night' {
  return new Date().getHours() < 17 ? 'morning' : 'night';
}

interface GoodNightWallProps {
  familyId: string;
}

export function GoodNightWall({ familyId }: GoodNightWallProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [slot, setSlot] = useState<'morning' | 'night'>(currentSlot());
  const [message, setMessage] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ['wallTimeline', familyId],
    queryFn: () => fetchWallTimeline(familyId, 21),
  });

  const slotLabel = slot === 'morning' ? 'Good morning' : 'Good night';

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!message.trim()) {
      showAlert('Add a message', `Write your ${slotLabel.toLowerCase()} message.`);
      return;
    }
    setPosting(true);
    try {
      let photoUrl: string | undefined;
      if (photoUri) photoUrl = await uploadImage(photoUri);
      await postWallEntry(familyId, { slot, message: message.trim(), photoUrl });
      setMessage('');
      setPhotoUri(null);
      await queryClient.invalidateQueries({ queryKey: ['wallTimeline', familyId] });
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Could not post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <View>
      <Text style={[styles.intro, { color: theme.textSecondary }]}>
        Share one photo and message each morning and night. Over time it becomes a family timeline.
      </Text>

      <GlassCard style={{ ...styles.composeCard, borderColor: theme.border }}>
        <View style={styles.slotRow}>
          {(['morning', 'night'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSlot(s)}
              style={[
                styles.slotBtn,
                {
                  borderColor: slot === s ? theme.primary : theme.border,
                  backgroundColor: slot === s ? theme.primary + '12' : theme.surface,
                },
              ]}
            >
              <Text style={{ color: slot === s ? theme.primary : theme.text }}>
                {s === 'morning' ? 'Morning' : 'Night'}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder={`${slotLabel} from ${user?.displayName ?? 'you'}...`}
          placeholderTextColor={theme.textTertiary}
          value={message}
          onChangeText={setMessage}
        />
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
        ) : null}
        <View style={styles.actions}>
          <Pressable style={[styles.outlineBtn, { borderColor: theme.border }]} onPress={pickPhoto}>
            <Text style={{ color: theme.primary, fontWeight: '600' }}>Add photo</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={handlePost}
            disabled={posting}
          >
            {posting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Post to wall</Text>
            )}
          </Pressable>
        </View>
      </GlassCard>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Timeline</Text>
      {isLoading ? (
        <ActivityIndicator color={theme.primary} />
      ) : timeline.length === 0 ? (
        <EmptyState iconName="sunny-outline" title="Wall is empty" message="Be the first to post today." />
      ) : (
        timeline.map((day) => (
          <View key={day.date} style={styles.dayBlock}>
            <Text style={[styles.dayLabel, { color: theme.text }]}>
              {new Date(day.date).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            {day.entries.map((entry) => (
              <GlassCard key={entry.id} style={{ ...styles.entryCard, borderColor: theme.border }}>
                <View style={styles.entryHeader}>
                  <AvatarRing uri={entry.authorAvatar} name={entry.authorName ?? 'Member'} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.entryAuthor, { color: theme.text }]}>{entry.authorName}</Text>
                    <Text style={[styles.entrySlot, { color: theme.textSecondary }]}>
                      {entry.slot === 'morning' ? 'Morning' : 'Night'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.entryMessage, { color: theme.text }]}>{entry.message}</Text>
                {entry.photoUrl ? (
                  <Image
                    source={{ uri: resolveMediaUrl(entry.photoUrl) }}
                    style={styles.entryPhoto}
                    contentFit="cover"
                  />
                ) : null}
              </GlassCard>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { ...typography.body, marginBottom: spacing.md, lineHeight: 22 },
  composeCard: { borderWidth: 1, marginBottom: spacing.lg, gap: spacing.sm },
  slotRow: { flexDirection: 'row', gap: spacing.sm },
  slotBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  input: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.sm, ...typography.body },
  preview: { width: '100%', height: 160, borderRadius: borderRadius.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  primaryBtn: { flex: 1, borderRadius: borderRadius.md, padding: spacing.sm, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '700' },
  sectionLabel: { ...typography.label, marginBottom: spacing.sm },
  dayBlock: { marginBottom: spacing.md },
  dayLabel: { ...typography.title, fontSize: 15, marginBottom: spacing.sm },
  entryCard: { borderWidth: 1, marginBottom: spacing.sm, gap: spacing.sm },
  entryHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  entryAuthor: { ...typography.body, fontWeight: '600', fontSize: 14 },
  entrySlot: { ...typography.micro, textTransform: 'none', letterSpacing: 0 },
  entryMessage: { ...typography.body, lineHeight: 20 },
  entryPhoto: { width: '100%', height: 180, borderRadius: borderRadius.md },
});
