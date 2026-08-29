import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '../store';
import { colors, spacing, borderRadius, typography } from '../theme';

interface QuickActionProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

export function QuickAction({ icon, label, onPress, color }: QuickActionProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = colors[mode];

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[styles.container, { backgroundColor: theme.surface }]}
    >
      <View style={[styles.iconContainer, { backgroundColor: (color ?? theme.primary) + '20' }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.label, { color: theme.text }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

interface QuickActionsRowProps {
  actions: QuickActionProps[];
}

export function QuickActionsRow({ actions }: QuickActionsRowProps) {
  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <QuickAction key={action.label} {...action} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  label: {
    ...typography.micro,
    textAlign: 'center',
  },
});
