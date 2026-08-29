import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, typography, borderRadius } from '../theme';
import { pinShadow } from '../theme/pin';
import { useThemeStore } from '../store';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: {
    label: string;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    disabled?: boolean;
    loading?: boolean;
  };
  style?: ViewStyle;
}

export function ScreenHeader({ title, subtitle, onBack, rightAction, style }: ScreenHeaderProps) {
  const theme = useTheme();
  const mode = useThemeStore((s) => s.mode);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }, pinShadow(mode), style]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={[styles.iconBtn, { backgroundColor: theme.surfaceSecondary }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
        ) : (
          <View style={styles.logoWrap}>
            <View style={[styles.logoDot, { backgroundColor: theme.pin }]} />
            <Text style={[styles.logoText, { color: theme.text }]}>Famora</Text>
          </View>
        )}
        <View style={styles.center}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textTertiary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightAction ? (
          <Pressable
            onPress={rightAction.disabled || rightAction.loading ? undefined : rightAction.onPress}
            style={[
              styles.actionBtn,
              { backgroundColor: theme.pin, opacity: rightAction.disabled || rightAction.loading ? 0.45 : 1 },
            ]}
          >
            {rightAction.loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : rightAction.icon ? (
              <Ionicons name={rightAction.icon} size={20} color="#FFF" />
            ) : (
              <Text style={styles.actionText}>{rightAction.label}</Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.iconSpacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 88 },
  logoDot: { width: 10, height: 10, borderRadius: 5 },
  logoText: { ...typography.title, fontSize: 17, fontWeight: '800' },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacer: { width: 38 },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xs },
  title: { ...typography.title, fontSize: 16 },
  subtitle: { ...typography.micro, marginTop: 2, textTransform: 'none', letterSpacing: 0 },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
});
