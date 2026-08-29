import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import { useFamilyStore } from '../../store';
import { spacing } from '../../theme';
import { INK, PAPER, NP } from '../../theme/newspaperTypography';
import { NewspaperView, ResponsiveContainer } from '../../components';
import { fetchNewspaper, fetchNewspaperAudio, resolveMediaUrl } from '../../services/family.service';
import { NewspaperSection } from '../../types';

export function NewspaperScreen() {
  const navigation = useNavigation();
  const family = useFamilyStore((s) => s.currentFamily);
  const [lang, setLang] = useState('en');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['newspaper', family?.id, lang],
    queryFn: () => fetchNewspaper(family!.id, lang),
    enabled: !!family?.id,
  });

  const sections = (data?.sections as NewspaperSection[]) ?? [];
  const title = String(data?.title ?? family?.newspaperName ?? 'Family Times');
  const editionDate = String(data?.editionDate ?? new Date().toISOString());

  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Stop/Unload sound when unmounting
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Stop sound if language or newspaper changes
  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
      setIsPlaying(false);
      setCurrentAudioUrl(null);
    }
  }, [lang, data?.id]);

  const playNewspaper = async () => {
    if (!data?.id || !family?.id) return;

    // If playing, pause it
    if (isPlaying && soundRef.current) {
      try {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        return;
      } catch (err) {
        console.error('Failed to pause sound', err);
      }
    }

    // If paused and same audio, resume play
    if (!isPlaying && soundRef.current && currentAudioUrl) {
      try {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      } catch (err) {
        console.error('Failed to resume sound', err);
      }
    }

    // Otherwise, fetch new audio
    setIsAudioLoading(true);
    try {
      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const res = await fetchNewspaperAudio(family.id, String(data.id), lang);
      
      if (res.isDemo) {
        Alert.alert(
          'Demo Mode',
          'OpenAI API Key is not configured on the backend. Playing a demo music track instead.'
        );
      }

      const resolvedUrl = resolveMediaUrl(res.url) ?? res.url;

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: resolvedUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setCurrentAudioUrl(resolvedUrl);
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          if (soundRef.current) {
            soundRef.current.unloadAsync().catch(() => {});
            soundRef.current = null;
          }
        }
      });
    } catch (error) {
      console.error('Failed to play newspaper audio', error);
      Alert.alert('Playback Error', 'Could not play newspaper audio.');
    } finally {
      setIsAudioLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.toolbar}>
        <ResponsiveContainer style={styles.toolbarInner}>
          <Pressable onPress={() => navigation.goBack()} style={styles.toolBtn} hitSlop={10}>
            <Ionicons name="close" size={22} color={INK} />
          </Pressable>
          <Text style={styles.toolbarTitle} numberOfLines={1}>
            {title}
          </Text>
          <Pressable 
            onPress={playNewspaper} 
            style={[styles.toolBtn, !data?.id && { opacity: 0.5 }]} 
            hitSlop={10}
            disabled={!data?.id || isLoading}
          >
            {isAudioLoading ? (
              <ActivityIndicator size="small" color={INK} />
            ) : (
              <Ionicons name={isPlaying ? "pause" : "volume-medium"} size={22} color={INK} />
            )}
          </Pressable>
          <Pressable onPress={() => refetch()} style={styles.toolBtn} hitSlop={10}>
            {isRefetching ? (
              <ActivityIndicator size="small" color={INK} />
            ) : (
              <Ionicons name="refresh" size={20} color={INK} />
            )}
          </Pressable>
        </ResponsiveContainer>
      </View>
      
      <View style={styles.langBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langScroll}>
          <Text style={styles.langLabel}>EDITION:</Text>
          {[
            { id: 'en', label: 'English' },
            { id: 'hi', label: 'Hindi (हिंदी)' },
            { id: 'bn', label: 'Bengali (বাংলা)' },
            { id: 'te', label: 'Telugu (తెలుగు)' },
            { id: 'mr', label: 'Marathi (मराठी)' },
            { id: 'ta', label: 'Tamil (தமிழ்)' },
            { id: 'gu', label: 'Gujarati (ગુજરાતી)' },
            { id: 'ur', label: 'Urdu (اردو)' },
            { id: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
            { id: 'ml', label: 'Malayalam (മലയാളം)' },
            { id: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
            { id: 'es', label: 'Español' },
            { id: 'fr', label: 'Français' },
            { id: 'ja', label: '日本語' },
          ].map(l => (
            <Pressable 
              key={l.id} 
              style={[styles.langBtn, lang === l.id && styles.langBtnActive]}
              onPress={() => setLang(l.id)}
            >
              <Text style={[styles.langText, lang === l.id && styles.langTextActive]}>{l.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={INK} />
          <Text style={styles.loadingText}>Setting type…</Text>
        </View>
      ) : (
        <NewspaperView
          title={title}
          editionDate={editionDate}
          sections={sections}
          familyName={family?.name}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8E4DC' },
  toolbar: {
    backgroundColor: PAPER,
    borderBottomWidth: 2,
    borderBottomColor: INK,
  },
  toolbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  toolBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarTitle: {
    ...NP.masthead,
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: INK,
    letterSpacing: 0.5,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...NP.body, fontSize: 14, fontStyle: 'italic', color: INK },
  langBar: { backgroundColor: PAPER, borderBottomWidth: 1, borderBottomColor: INK + '40' },
  langScroll: { paddingHorizontal: spacing.lg, paddingVertical: 10, gap: spacing.md, alignItems: 'center' },
  langLabel: { ...NP.sans, color: INK, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginRight: 4 },
  langBtn: { paddingHorizontal: 4, paddingVertical: 2, borderBottomWidth: 2, borderColor: 'transparent' },
  langBtnActive: { borderColor: INK },
  langText: { ...NP.sans, color: INK + '99', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  langTextActive: { color: INK, fontWeight: '800' },
});
