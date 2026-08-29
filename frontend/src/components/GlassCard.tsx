import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, PressableProps } from 'react-native';
import { useThemeStore } from '../store';
import { colors, borderRadius, spacing } from '../theme';
import { pinCardShell } from '../theme/pin';

interface GlassCardProps extends PressableProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  padding?: number;
}

export function GlassCard({ children, style, padding = spacing.md, ...pressableProps }: GlassCardProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = colors[mode];

  const content = (
    <View style={[styles.inner, { padding }]}>
      {children}
    </View>
  );

  if (pressableProps.onPress) {
    return (
      <Pressable
        {...pressableProps}
        style={({ pressed }) => [
          styles.card,
          pinCardShell(mode, pressed),
          { borderColor: theme.border },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, pinCardShell(mode), { borderColor: theme.border }, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  inner: {
    width: '100%',
  },
});
