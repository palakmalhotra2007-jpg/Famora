import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, borderRadius, typography } from '../theme';
import { uploadAudio } from '../services/family.service';

interface VoiceNoteRecorderProps {
  onRecorded: (payload: { audioUrl: string; durationSec: number }) => Promise<void>;
  caption?: string;
}

export function VoiceNoteRecorder({ onRecorded, caption }: VoiceNoteRecorderProps) {
  const theme = useTheme();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [permissionOk, setPermissionOk] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void Audio.requestPermissionsAsync().then(({ granted }) => setPermissionOk(granted));
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    if (!permissionOk) {
      const { granted } = await Audio.requestPermissionsAsync();
      setPermissionOk(granted);
      if (!granted) return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = rec;
    setRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopRecording = async () => {
    const rec = recordingRef.current;
    if (!rec) return;

    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    await rec.stopAndUnloadAsync();
    const uri = rec.getURI();
    recordingRef.current = null;
    if (!uri) return;

    setUploading(true);
    try {
      const url = await uploadAudio(uri);
      await onRecorded({ audioUrl: url, durationSec: Math.max(seconds, 1) });
    } finally {
      setUploading(false);
    }
  };

  if (permissionOk === false) {
    return (
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        Microphone permission is required for voice notes.
      </Text>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {caption ? (
        <Text style={[styles.caption, { color: theme.textSecondary }]}>{caption}</Text>
      ) : null}
      <Text style={[styles.timer, { color: theme.text }]}>
        {recording ? `${seconds}s` : uploading ? 'Uploading...' : 'Tap to record'}
      </Text>
      <Pressable
        style={[
          styles.recordBtn,
          { backgroundColor: recording ? theme.error : theme.primary },
        ]}
        onPress={recording ? stopRecording : startRecording}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Ionicons name={recording ? 'stop' : 'mic'} size={28} color="#FFF" />
        )}
      </Pressable>
      {Platform.OS === 'web' && (
        <Text style={[styles.hint, { color: theme.textTertiary }]}>
          Use a browser that supports microphone recording.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  caption: { ...typography.caption, textAlign: 'center' },
  timer: { ...typography.title, fontSize: 18 },
  recordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  hint: { ...typography.micro, textTransform: 'none', letterSpacing: 0, textAlign: 'center' },
});
