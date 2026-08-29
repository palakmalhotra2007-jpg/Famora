import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store';
import { colors, spacing, borderRadius, typography } from '../theme';
import { pinShadow } from '../theme/pin';

interface StreakBadgeProps {
  streak: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StreakBadge({ streak, label = 'day streak', size = 'md' }: StreakBadgeProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = colors[mode];

  const sizeStyles = {
    sm: { valueSize: 14, padding: spacing.sm, iconSize: 14 },
    md: { valueSize: 18, padding: spacing.md, iconSize: 16 },
    lg: { valueSize: 22, padding: spacing.lg, iconSize: 18 },
  };

  const s = sizeStyles[size];

  return (
    <View
      style={[
        styles.container,
        pinShadow(mode),
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          padding: s.padding,
        },
      ]}
    >
      <Ionicons name="flame" size={s.iconSize} color={theme.pin} />
      <Text style={[styles.streak, { color: theme.text, fontSize: s.valueSize }]}>{streak}</Text>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  streak: { fontWeight: '700' },
  label: { ...typography.caption },
});
