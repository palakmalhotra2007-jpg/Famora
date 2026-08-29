import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store';
import { spacing, borderRadius, typography } from '../../theme';
import { authColors } from '../../theme/auth';
import { ScreenHeader, FamilyLeaderboard } from '../../components';
import { fetchGameSession, submitGameScore } from '../../services/family.service';
import { gameFromType, scoreLabel } from '../../data/gameCatalog';
import { GameSession } from '../../games/types';
import {
  TapSprintGame,
  ReactionRushGame,
  TypingSpeedGame,
  QuickMathGame,
  MemoryFlashGame,
  BalloonBlitzGame,
} from '../../games/SkillGames';

interface GamePlayScreenProps {
  visible: boolean;
  familyId: string;
  sessionId: string | null;
  onClose: () => void;
}

type Phase = 'lobby' | 'playing' | 'results';

export function GamePlayScreen({ visible, familyId, sessionId, onClose }: GamePlayScreenProps) {
  const theme = useTheme();
  const userId = useAuthStore((s) => s.user?.id);
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('lobby');

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    const data = await fetchGameSession(familyId, sessionId);
    setSession(data);
  }, [familyId, sessionId]);

  useEffect(() => {
    if (!visible || !sessionId) {
      setSession(null);
      setError(null);
      setPhase('lobby');
      return;
    }

    setLoading(true);
    loadSession()
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load game'))
      .finally(() => setLoading(false));
  }, [visible, sessionId, loadSession]);

  const handleFinish = async (score: number) => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      const result = await submitGameScore(familyId, sessionId, score);
      setSession(result);
      setPhase('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save score');
    } finally {
      setSubmitting(false);
    }
  };

  const gameName = session ? gameFromType(session.gameType).name : 'Challenge';
  const mode = session?.config.mode ?? 'tap_sprint';
  const myScore = userId ? session?.scores[userId] : undefined;

  const renderGame = () => {
    if (!session) return null;
    switch (mode) {
      case 'tap_sprint':
        return <TapSprintGame durationSeconds={session.config.durationSeconds ?? 10} onComplete={handleFinish} />;
      case 'reaction_rush':
        return <ReactionRushGame rounds={session.config.rounds ?? 5} onComplete={handleFinish} />;
      case 'typing_speed':
        return (
          <TypingSpeedGame
            durationSeconds={session.config.durationSeconds ?? 60}
            phrases={session.config.phrases}
            onComplete={handleFinish}
          />
        );
      case 'quick_math':
        return <QuickMathGame durationSeconds={session.config.durationSeconds ?? 45} onComplete={handleFinish} />;
      case 'memory_flash':
        return <MemoryFlashGame maxRounds={session.config.rounds ?? 10} onComplete={handleFinish} />;
      case 'balloon_blitz':
        return <BalloonBlitzGame durationSeconds={session.config.durationSeconds ?? 30} onComplete={handleFinish} />;
      default:
        return <TapSprintGame durationSeconds={session.config.durationSeconds ?? 10} onComplete={handleFinish} />;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader
          title={gameName}
          subtitle="Play together — beat the family high score!"
          onBack={onClose}
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={authColors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            <Pressable style={[styles.primaryBtn, { backgroundColor: authColors.primary }]} onPress={onClose}>
              <Text style={styles.primaryBtnText}>Close</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            {session?.standings && (
              <FamilyLeaderboard
                standings={session.standings}
                leaderName={session.leaderName}
                leaderScore={session.leaderScore}
                mode={mode}
                currentUserId={userId}
              />
            )}

            {phase === 'lobby' && (
              <>
                <Text style={[styles.instructions, { color: theme.textSecondary }]}>
                  Everyone in your family can play. Highest score wins! 🏆
                  {myScore !== undefined ? ` Your best: ${myScore} ${scoreLabel(mode)}.` : ' Tap start when you are ready.'}
                </Text>
                <Pressable
                  style={[styles.primaryBtn, { backgroundColor: authColors.primary }]}
                  onPress={() => setPhase('playing')}
                >
                  <Text style={styles.primaryBtnText}>Let&apos;s play! 🎮</Text>
                </Pressable>
              </>
            )}

            {phase === 'playing' && !submitting && renderGame()}
            {submitting && (
              <View style={styles.center}>
                <ActivityIndicator color={authColors.primary} />
                <Text style={[styles.hint, { color: theme.textSecondary }]}>Saving your score...</Text>
              </View>
            )}

            {phase === 'results' && session && (
              <View style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.resultTitle, { color: theme.text }]}>
                  {session.improved ? 'New personal best!' : 'Score saved'}
                </Text>
                <Text style={[styles.resultScore, { color: authColors.primary }]}>
                  {session.yourScore ?? myScore} {scoreLabel(mode)}
                </Text>
                {session.leaderName && (
                  <Text style={[styles.resultHint, { color: theme.textSecondary }]}>
                    {session.yourScore === session.leaderScore
                      ? 'You are in first place!'
                      : `Beat ${session.leaderName}'s ${session.leaderScore} ${scoreLabel(mode)} to take the lead.`}
                  </Text>
                )}
                <Pressable
                  style={[styles.secondaryBtn, { borderColor: authColors.primary }]}
                  onPress={() => setPhase('playing')}
                >
                  <Text style={[styles.secondaryBtnText, { color: authColors.primary }]}>Play again</Text>
                </Pressable>
                <Pressable style={[styles.primaryBtn, { backgroundColor: authColors.primary }]} onPress={onClose}>
                  <Text style={styles.primaryBtnText}>Done</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  body: { padding: spacing.md, paddingBottom: spacing.xxl },
  instructions: { ...typography.body, marginBottom: spacing.lg, lineHeight: 22 },
  hint: { ...typography.caption, marginTop: spacing.sm },
  errorText: { ...typography.body, textAlign: 'center', marginBottom: spacing.md },
  primaryBtn: { borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  secondaryBtnText: { fontWeight: '700', fontSize: 15 },
  resultCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resultTitle: { ...typography.title, fontSize: 20 },
  resultScore: { ...typography.display, fontSize: 40, marginTop: spacing.sm },
  resultHint: { ...typography.body, textAlign: 'center', marginTop: spacing.md },
});
