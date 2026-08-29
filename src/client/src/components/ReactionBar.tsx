import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '../store';
import { colors, spacing, borderRadius, typography } from '../theme';
import { REACTIONS } from '../types';

interface ReactionBarProps {
  selectedReaction?: string;
  onReact: (type: string) => void;
  compact?: boolean;
}

export function ReactionBar({ selectedReaction, onReact, compact }: ReactionBarProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = colors[mode];

  const handlePress = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReact(type);
  };

  return (
    <View style={[styles.container, compact && styles.compact]}>
      {REACTIONS.map((reaction) => {
        const isSelected = selectedReaction === reaction.type;
        return (
          <Pressable
            key={reaction.type}
            onPress={() => handlePress(reaction.type)}
            style={[
              styles.reaction,
              {
                backgroundColor: isSelected ? theme.primary + '20' : theme.surfaceSecondary,
                borderColor: isSelected ? theme.primary : 'transparent',
              },
            ]}
          >
            <Text style={styles.emoji}>{reaction.emoji}</Text>
            {!compact && (
              <Text style={[styles.label, { color: isSelected ? theme.primary : theme.textSecondary }]}>
                {reaction.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  compact: {
    gap: spacing.xs,
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    gap: 4,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    ...typography.micro,
  },
});
