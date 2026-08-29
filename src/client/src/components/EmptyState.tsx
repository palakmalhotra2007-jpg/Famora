import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useThemeStore } from '../store';
import { spacing, typography, borderRadius } from '../theme';
import { pinCardShell } from '../theme/pin';
import { AuthButton } from './AuthLayout';

interface EmptyStateProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ iconName = 'albums-outline', title, message, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  const mode = useThemeStore((s) => s.mode);

  return (
    <View style={[styles.container, pinCardShell(mode), { borderColor: theme.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.surfaceSecondary }]}>
        <Ionicons name={iconName} size={28} color={theme.pin} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
      {actionLabel && onAction && (
        <View style={styles.action}>
          <AuthButton label={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.title, textAlign: 'center' },
  message: { ...typography.caption, textAlign: 'center', marginTop: spacing.xs, textTransform: 'none', letterSpacing: 0 },
  action: { width: '100%', marginTop: spacing.md },
});
