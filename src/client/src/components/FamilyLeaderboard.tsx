import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, borderRadius, typography } from '../theme';
import { authColors } from '../theme/auth';
import { AvatarRing } from './AvatarRing';
import { StandingEntry } from '../games/types';
import { scoreLabel } from '../data/gameCatalog';

interface FamilyLeaderboardProps {
  standings: StandingEntry[];
  leaderName?: string | null;
  leaderScore?: number | null;
  mode: string;
  currentUserId?: string;
  title?: string;
}

export function FamilyLeaderboard({
  standings,
  leaderName,
  leaderScore,
  mode,
  currentUserId,
  title = 'Family standings',
}: FamilyLeaderboardProps) {
  const theme = useTheme();
  const unit = scoreLabel(mode);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {leaderName && leaderScore !== null && leaderScore !== undefined && (
        <Text style={[styles.leader, { color: authColors.primary }]}>
          Leading: {leaderName} — {leaderScore} {unit}
        </Text>
      )}
      {standings.map((entry, index) => (
        <View
          key={entry.userId}
          style={[
            styles.row,
            { borderBottomColor: theme.borderLight },
            entry.userId === currentUserId && { backgroundColor: authColors.primary + '10' },
          ]}
        >
          <Text style={[styles.rank, { color: theme.textTertiary }]}>{index + 1}</Text>
          <AvatarRing uri={entry.avatarUrl} name={entry.displayName} size={32} />
          <View style={styles.meta}>
            <Text style={[styles.name, { color: theme.text }]}>
              {entry.displayName}
              {entry.userId === currentUserId ? ' (you)' : ''}
            </Text>
            <Text style={[styles.status, { color: theme.textSecondary }]}>
              {entry.hasPlayed ? 'Played' : 'Not yet played'}
            </Text>
          </View>
          <Text style={[styles.score, { color: entry.score !== null ? theme.text : theme.textTertiary }]}>
            {entry.score !== null ? `${entry.score} ${unit}` : '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: { ...typography.title, fontSize: 16, marginBottom: spacing.sm },
  leader: { ...typography.caption, fontWeight: '700', marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  rank: { width: 20, ...typography.caption, fontWeight: '700' },
  meta: { flex: 1 },
  name: { ...typography.body, fontWeight: '600', fontSize: 14 },
  status: { ...typography.micro, textTransform: 'none', letterSpacing: 0 },
  score: { ...typography.caption, fontWeight: '700' },
});
