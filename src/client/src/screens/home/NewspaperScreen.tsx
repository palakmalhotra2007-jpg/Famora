import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useFamilyStore, useAuthStore } from '../../store';
import { spacing } from '../../theme';
import { INK, PAPER, NP } from '../../theme/newspaperTypography';
import { NewspaperView, ResponsiveContainer } from '../../components';
import { fetchNewspaper } from '../../services/family.service';
import { NewspaperSection } from '../../types';

// ── Language catalogue ───────────────────────────────────────
const LANGS = [
  { id: 'en', label: 'English',            mm: 'en-GB' },
  { id: 'hi', label: 'Hindi (हिंदी)',      mm: 'hi-IN' },
  { id: 'bn', label: 'Bengali (বাংলা)',     mm: 'bn-IN' },
  { id: 'te', label: 'Telugu (తెలుగు)',     mm: 'te-IN' },
  { id: 'mr', label: 'Marathi (मराठी)',     mm: 'mr-IN' },
  { id: 'ta', label: 'Tamil (தமிழ்)',       mm: 'ta-IN' },
  { id: 'gu', label: 'Gujarati (ગુજરાતી)', mm: 'gu-IN' },
  { id: 'ur', label: 'Urdu (اردو)',         mm: 'ur-PK' },
  { id: 'kn', label: 'Kannada (ಕನ್ನಡ)',   mm: 'kn-IN' },
  { id: 'ml', label: 'Malayalam (മലയാളം)', mm: 'ml-IN' },
  { id: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)',   mm: 'pa-IN' },
  { id: 'es', label: 'Español',            mm: 'es-ES' },
  { id: 'fr', label: 'Français',           mm: 'fr-FR' },
  { id: 'ja', label: '日本語',              mm: 'ja-JP' },
];

// ── Translation — MyMemory free API ─────────────────────────
// Correct format: langpair=en-GB|hi-IN  (both sides need locale codes)
async function translateText(text: string, langId: string): Promise<string> {
  if (!text.trim() || langId === 'en') return text;
  const entry = LANGS.find((l) => l.id === langId);
  if (!entry) return text;
  try {
    const encoded = encodeURIComponent(text.slice(0, 500));
    const url =
      `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en-GB|${entry.mm}`;
    const res  = await fetch(url);
    const json = (await res.json()) as { responseData?: { translatedText?: string } };
    const out  = json.responseData?.translatedText ?? '';
    // MyMemory sometimes returns the same text or an error string — fall back
    if (!out || out.toLowerCase().startsWith('mymemory')) return text;
    return out;
  } catch {
    return text;
  }
}

async function translateSections(
  sections: NewspaperSection[],
  lang: string,
): Promise<NewspaperSection[]> {
  if (lang === 'en') return sections;
  // Translate sequentially to respect MyMemory rate limit
  const out: NewspaperSection[] = [];
  for (const s of sections) {
    out.push({
      ...s,
      title:   await translateText(s.title,   lang),
      content: await translateText(s.content, lang),
    });
  }
  return out;
}

// ── Default edition (shown when DB has no newspaper for today) ──
function buildDefaultEdition(
  familyName: string,
  userName: string,
): NewspaperSection[] {
  const greetings = [
    'Good morning! Every moment with your family is a memory in the making.',
    'A quiet day is still a day worth sharing. Check in with your loved ones today.',
    'No big news — just the best kind: your family is here.',
    'The best stories are the ones unfolding in your home right now.',
    'Slow days are sacred. Enjoy the silence together.',
  ];
  const tips = [
    'Share a photo from today to start your family feed.',
    'Add an event in the Planner to keep everyone in sync.',
    'Leave a Morning or Evening message on the Wall.',
    'Record a voice note for the weekly Family Podcast.',
    'Write a letter to someone in the family Mailbox.',
  ];
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  return [
    {
      type: 'headline',
      title: `Silence in ${familyName}`,
      content: `${pick(greetings)} Hi ${userName} — nothing has been posted yet today, but that is about to change. Open the Feed, share a photo, or leave a note on the Wall. The ${familyName} Times is waiting for your stories.`,
    },
    {
      type: 'general',
      title: 'Tip of the Day',
      content: pick(tips),
    },
    {
      type: 'general',
      title: 'About This Newspaper',
      content:
        'The Family Times is generated automatically from your family\'s activity — photos, events, bucket-list goals, and more. The more you share, the richer each edition becomes. Come back tomorrow for a full edition!',
    },
  ];
}

// ── Web Speech API TTS ───────────────────────────────────────
// Voices load async in Chrome — wait for them before speaking
function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) { resolve(voices); return; }
    const handler = () => { resolve(window.speechSynthesis.getVoices()); };
    window.speechSynthesis.addEventListener('voiceschanged', handler, { once: true });
    // Fallback after 1s in case event never fires
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
}

function findBestVoice(voices: SpeechSynthesisVoice[], bcp47: string): SpeechSynthesisVoice | null {
  const lang = bcp47.toLowerCase();
  const prefix = lang.split('-')[0]; // e.g. 'hi' from 'hi-IN'
  // Exact match first (e.g. hi-IN)
  const exact = voices.find((v) => v.lang.toLowerCase() === lang);
  if (exact) return exact;
  // Prefix match (e.g. any voice starting with 'hi')
  const prefix_match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
  if (prefix_match) return prefix_match;
  return null;
}

function webSpeak(text: string, langId: string, onEnd: () => void): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd();
    return () => {};
  }
  window.speechSynthesis.cancel();

  const entry = LANGS.find((l) => l.id === langId);
  const bcp47 = entry?.mm ?? 'en-GB';

  // Split into ≤180-char chunks to avoid Chrome cutting off long utterances
  const words = text.split(' ');
  const chunks: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > 180) { if (cur) chunks.push(cur); cur = w; }
    else { cur = next; }
  }
  if (cur) chunks.push(cur);

  let idx = 0;
  let cancelled = false;

  async function speakNext() {
    if (cancelled || idx >= chunks.length) { if (!cancelled) onEnd(); return; }
    const voices = await getVoicesAsync();
    const voice  = findBestVoice(voices, bcp47);

    const utt   = new SpeechSynthesisUtterance(chunks[idx++]);
    utt.lang    = bcp47;
    if (voice) utt.voice = voice;
    utt.rate    = 0.88;
    utt.pitch   = 1;
    utt.volume  = 1;
    utt.onend   = () => speakNext();
    utt.onerror = (_e) => { if (!cancelled) onEnd(); };
    window.speechSynthesis.speak(utt);
  }

  void speakNext();
  return () => { cancelled = true; window.speechSynthesis.cancel(); };
}

// ── Screen ───────────────────────────────────────────────────
export function NewspaperScreen() {
  const navigation = useNavigation();
  const family   = useFamilyStore((s) => s.currentFamily);
  const user     = useAuthStore((s) => s.user);
  const [lang, setLang] = useState('en');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['newspaper', family?.id],
    queryFn:  () => fetchNewspaper(family!.id),
    enabled:  !!family?.id,
  });

  const rawSections = (data?.sections as NewspaperSection[] | undefined) ?? [];
  const baseTitle   = String(data?.title ?? family?.newspaperName ?? 'Family Times');
  const editionDate = String(data?.editionDate ?? new Date().toISOString());

  // If DB has no edition today, synthesise one locally
  const hasRealEdition = rawSections.length > 0;
  const sourceSections: NewspaperSection[] = hasRealEdition
    ? rawSections
    : buildDefaultEdition(
        family?.name ?? 'Family',
        user?.displayName?.split(' ')[0] ?? 'there',
      );

  // Translated state — initialise to source
  const [translating, setTranslating]             = useState(false);
  const [translatedTitle, setTranslatedTitle]     = useState(baseTitle);
  const [translatedSections, setTranslatedSections] = useState<NewspaperSection[]>(sourceSections);

  // Re-translate whenever lang or source data changes
  useEffect(() => {
    // Always reset to source first so UI reflects immediately
    setTranslatedTitle(baseTitle);
    setTranslatedSections(sourceSections);

    if (lang === 'en') return; // nothing to translate

    let cancelled = false;
    setTranslating(true);

    (async () => {
      try {
        const [newTitle, newSecs] = await Promise.all([
          translateText(baseTitle, lang),
          translateSections(sourceSections, lang),
        ]);
        if (!cancelled) {
          setTranslatedTitle(newTitle);
          setTranslatedSections(newSecs);
        }
      } finally {
        if (!cancelled) setTranslating(false);
      }
    })();

    return () => { cancelled = true; };
  // sourceSections changes identity every render if we don't guard — use data?.id + lang as deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, data?.id, family?.id]);

  // ── TTS ──────────────────────────────────────────────────
  const [isPlaying, setIsPlaying]   = useState(false);
  const [noVoice, setNoVoice]       = useState(false);
  const stopTTSRef = useRef<(() => void) | null>(null);

  useEffect(() => () => { stopTTSRef.current?.(); }, []);
  useEffect(() => { stopTTSRef.current?.(); setIsPlaying(false); setNoVoice(false); }, [lang, data?.id]);

  const handleTTS = useCallback(() => {
    if (isPlaying) {
      stopTTSRef.current?.();
      setIsPlaying(false);
      return;
    }
    if (Platform.OS !== 'web') return;

    // Run async logic in a fire-and-forget wrapper
    (async () => {
      // Check if a voice exists for the selected language
      if (lang !== 'en') {
        const entry = LANGS.find((l) => l.id === lang);
        const bcp47 = entry?.mm ?? 'en-GB';
        const voices = await getVoicesAsync();
        const voice  = findBestVoice(voices, bcp47);
        if (!voice) {
          setNoVoice(true);
          return;
        }
        setNoVoice(false);
      }

      const fullText = [
        translatedTitle,
        ...translatedSections.map((s) => `${s.title}. ${s.content}`),
      ].join('. ');

      setIsPlaying(true);
      stopTTSRef.current = webSpeak(fullText, lang, () => setIsPlaying(false));
    })();
  }, [isPlaying, lang, translatedTitle, translatedSections]);

  const handleLangChange = (newLang: string) => {
    stopTTSRef.current?.();
    setIsPlaying(false);
    setLang(newLang);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Toolbar ──────────────────────────────────────── */}
      <View style={styles.toolbar}>
        <ResponsiveContainer style={styles.toolbarInner}>
          <Pressable onPress={() => navigation.goBack()} style={styles.toolBtn} hitSlop={10}>
            <Ionicons name="close" size={22} color={INK} />
          </Pressable>

          <Text style={styles.toolbarTitle} numberOfLines={1}>
            {translatedTitle}
          </Text>

          {/* TTS — web only */}
          {Platform.OS === 'web' && (
            <Pressable
              onPress={handleTTS}
              style={[styles.toolBtn, (isLoading || translating) && styles.toolBtnDisabled]}
              hitSlop={10}
              disabled={isLoading || translating}
            >
              <Ionicons
                name={isPlaying ? 'pause-circle' : 'volume-medium-outline'}
                size={22}
                color={INK}
              />
            </Pressable>
          )}

          <Pressable onPress={() => refetch()} style={styles.toolBtn} hitSlop={10}>
            {isRefetching
              ? <ActivityIndicator size="small" color={INK} />
              : <Ionicons name="refresh" size={20} color={INK} />}
          </Pressable>
        </ResponsiveContainer>
      </View>

      {/* ── Language bar ─────────────────────────────────── */}
      <View style={styles.langBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.langScroll}
        >
          <Text style={styles.langLabel}>EDITION:</Text>
          {LANGS.map((l) => (
            <Pressable
              key={l.id}
              style={[styles.langBtn, lang === l.id && styles.langBtnActive]}
              onPress={() => handleLangChange(l.id)}
            >
              <Text style={[styles.langText, lang === l.id && styles.langTextActive]}>
                {l.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── Translating indicator ────────────────────────── */}
      {translating && (
        <View style={styles.transRow}>
          <ActivityIndicator size="small" color={INK} />
          <Text style={styles.transText}>Translating edition…</Text>
        </View>
      )}

      {/* ── No voice warning ─────────────────────────────── */}
      {noVoice && (
        <View style={[styles.transRow, { backgroundColor: '#FFF8E1' }]}>
          <Ionicons name="warning-outline" size={14} color="#A0522D" />
          <Text style={[styles.transText, { color: '#A0522D' }]}>
            Your browser has no voice for this language. Install the language pack in Windows Settings → Time & Language → Language.
          </Text>
        </View>
      )}

      {/* ── Content ──────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={INK} />
          <Text style={styles.loadingText}>Setting type…</Text>
        </View>
      ) : (
        <NewspaperView
          title={translatedTitle}
          editionDate={editionDate}
          sections={translatedSections}
          familyName={family?.name}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#E8E4DC' },
  toolbar:         { backgroundColor: PAPER, borderBottomWidth: 2, borderBottomColor: INK },
  toolbarInner:    { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  toolBtn:         { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  toolBtnDisabled: { opacity: 0.35 },
  toolbarTitle:    { ...NP.masthead, flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: INK, letterSpacing: 0.5 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText:     { ...NP.body, fontSize: 14, fontStyle: 'italic', color: INK },
  langBar:         { backgroundColor: PAPER, borderBottomWidth: 1, borderBottomColor: INK + '40' },
  langScroll:      { paddingHorizontal: spacing.lg, paddingVertical: 10, gap: spacing.md, alignItems: 'center' },
  langLabel:       { ...NP.sans, color: INK, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginRight: 4 },
  langBtn:         { paddingHorizontal: 4, paddingVertical: 2, borderBottomWidth: 2, borderColor: 'transparent' },
  langBtnActive:   { borderColor: INK },
  langText:        { ...NP.sans, color: INK + '99', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  langTextActive:  { color: INK, fontWeight: '800' },
  transRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 6, backgroundColor: PAPER, borderBottomWidth: 1, borderBottomColor: INK + '20' },
  transText:       { ...NP.sans, fontSize: 12, color: INK + 'AA', fontStyle: 'italic' },
});
