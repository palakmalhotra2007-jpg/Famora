import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getAuraMeta } from '../constants/aura';
import type { FamilyAuraId } from '../constants/aura';
import { borderRadius, typography } from '../theme';

type AuraBadgeSize = 'sm' | 'md';

interface AuraBadgeProps {
  aura: FamilyAuraId;
  size?: AuraBadgeSize;
}

export function AuraBadge({ aura, size = 'md' }: AuraBadgeProps) {
  const meta = getAuraMeta(aura);
  if (!meta) return null;

  const compact = size === 'sm';

  return (
    <View style={[styles.badge, compact ? styles.badgeSm : styles.badgeMd, { backgroundColor: meta.tint }]}>
      <Text style={[styles.emoji, compact && styles.emojiSm]}>{meta.emoji}</Text>
      <Text style={[styles.label, compact && styles.labelSm, { color: meta.accent }]} numberOfLines={1}>
        {meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
  },
  badgeSm: {
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeMd: {
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  emoji: { fontSize: 14 },
  emojiSm: { fontSize: 12 },
  label: { ...typography.caption, textTransform: 'none', letterSpacing: 0, fontWeight: '700', fontSize: 12 },
  labelSm: { fontSize: 11 },
});
