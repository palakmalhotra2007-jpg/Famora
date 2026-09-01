import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Audio } from 'expo-av';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store';
import { spacing, borderRadius, typography } from '../theme';
import { GlassCard } from './GlassCard';
import { EmptyState } from './EmptyState';
import { AvatarRing } from './AvatarRing';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import {
  fetchPodcastWeekStatus,
  fetchPodcastEpisode,
  fetchVoiceNotes,
  generatePodcastEpisode,
  submitVoiceNote,
  resolveMediaUrl,
} from '../services/family.service';
import { showAlert } from '../utils/alert';

interface FamilyPodcastProps {
  familyId: string;
  familyName: string;
}

export function FamilyPodcast({ familyId, familyName }: FamilyPodcastProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [caption, setCaption] = useState('');
  const [generating, setGenerating] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = React.useRef<Audio.Sound | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['podcastStatus', familyId],
    queryFn: () => fetchPodcastWeekStatus(familyId),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['voiceNotes', familyId],
    queryFn: () => fetchVoiceNotes(familyId),
  });

  const { data: episode } = useQuery({
    queryKey: ['podcastEpisode', familyId],
    queryFn: () => fetchPodcastEpisode(familyId),
  });

  const myStatus  = status?.members.find((m) => m.userId === userId);
  const hasRecorded = myStatus?.hasVoiceNote ?? false;

  // Unload the Audio.Sound object when the component unmounts to prevent
  // a native audio resource leak if playback is in progress.
  React.useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const handleRecorded = async (payload: { audioUrl: string; durationSec: number }) => {
    try {
      await submitVoiceNote(familyId, {
        ...payload,
        caption: caption.trim() || undefined,
      });
      setCaption('');
      await queryClient.invalidateQueries({ queryKey: ['podcastStatus', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['voiceNotes', familyId] });
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Could not save voice note');
    }
  };

  const handleGenerate = async () => {
    if (!hasRecorded) {
      showAlert('Voice note required', 'Record your weekly voice note before generating the podcast.');
      return;
    }
    setGenerating(true);
    try {
      await generatePodcastEpisode(familyId);
      await queryClient.invalidateQueries({ queryKey: ['podcastEpisode', familyId] });
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Could not generate podcast');
    } finally {
      setGenerating(false);
    }
  };

  const playNote = async (noteId: string, url: string) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (playingId === noteId) {
        setPlayingId(null);
        return;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: resolveMediaUrl(url) ?? url });
      soundRef.current = sound;
      setPlayingId(noteId);
      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.isLoaded && s.didJustFinish) setPlayingId(null);
      });
      await sound.playAsync();
    } catch {
      showAlert('Playback error', 'Could not play this voice note.');
    }
  };

  if (statusLoading) {
    return <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.lg }} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.intro, { color: theme.textSecondary }]}>
        Every family member records a weekly voice note. Famora combines them into{' '}
        <Text style={{ fontWeight: '700', color: theme.text }}>This Week in {familyName}</Text>.
      </Text>

      <GlassCard style={{ ...styles.card, borderColor: theme.border }}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Weekly voice note (required)</Text>
        <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
          {hasRecorded
            ? 'You recorded this week. You can re-record to replace it.'
            : 'Record before generating the family podcast.'}
        </Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Optional caption for your note"
          placeholderTextColor={theme.textTertiary}
          value={caption}
          onChangeText={setCaption}
        />
        <VoiceNoteRecorder
          caption="Hold to share your week in your own voice"
          onRecorded={handleRecorded}
        />
      </GlassCard>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>This week</Text>
      <View style={[styles.statusRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.statusText, { color: theme.text }]}>
          {status?.submittedCount ?? 0} of {status?.totalMembers ?? 0} recorded
        </Text>
      </View>
      {(status?.members ?? []).map((member) => (
        <View key={member.userId} style={[styles.memberRow, { borderBottomColor: theme.borderLight }]}>
          <AvatarRing uri={member.avatarUrl} name={member.displayName} size={32} />
          <Text style={[styles.memberName, { color: theme.text }]}>{member.displayName}</Text>
          <Text style={{ color: member.hasVoiceNote ? theme.success : theme.textTertiary, fontWeight: '600' }}>
            {member.hasVoiceNote ? 'Recorded' : 'Pending'}
          </Text>
        </View>
      ))}

      {notes.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Voice notes</Text>
          {notes.map((note) => (
            <Pressable
              key={note.id}
              style={[styles.noteRow, { borderColor: theme.border, backgroundColor: theme.surface }]}
              onPress={() => playNote(note.id, note.audioUrl)}
            >
              <AvatarRing uri={note.authorAvatar} name={note.authorName ?? 'Member'} size={28} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { color: theme.text }]}>{note.authorName}</Text>
                <Text style={[styles.noteMeta, { color: theme.textSecondary }]}>
                  {note.durationSec}s {note.caption ? `· ${note.caption}` : ''}
                </Text>
              </View>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>
                {playingId === note.id ? 'Playing' : 'Play'}
              </Text>
            </Pressable>
          ))}
        </>
      )}

      <Pressable
        style={[styles.generateBtn, { backgroundColor: theme.primary, opacity: hasRecorded ? 1 : 0.5 }]}
        onPress={handleGenerate}
        disabled={generating || !hasRecorded}
      >
        {generating ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.generateBtnText}>Generate family podcast</Text>
        )}
      </Pressable>

      {episode ? (
        <GlassCard style={{ ...styles.card, borderColor: theme.border }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{episode.title}</Text>
          {episode.generatedByName ? (
            <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
              Generated by {episode.generatedByName}
            </Text>
          ) : null}
          <Text style={[styles.script, { color: theme.text }]}>{episode.script}</Text>
        </GlassCard>
      ) : (
        <EmptyState
          iconName="mic-outline"
          title="No episode yet"
          message="Record voice notes, then generate this week's podcast."
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xxl, gap: spacing.sm },
  intro: { ...typography.body, lineHeight: 22, marginBottom: spacing.sm },
  card: { borderWidth: 1, gap: spacing.sm },
  cardTitle: { ...typography.title, fontSize: 16 },
  cardSub: { ...typography.caption },
  input: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.sm, ...typography.body },
  sectionLabel: { ...typography.label, marginTop: spacing.md },
  statusRow: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.sm },
  statusText: { ...typography.body, fontWeight: '600' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  memberName: { ...typography.body, fontWeight: '600', flex: 1, fontSize: 14 },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  noteMeta: { ...typography.micro, textTransform: 'none', letterSpacing: 0 },
  generateBtn: { borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  generateBtnText: { color: '#FFF', fontWeight: '700' },
  script: { ...typography.body, lineHeight: 22, marginTop: spacing.sm },
});
