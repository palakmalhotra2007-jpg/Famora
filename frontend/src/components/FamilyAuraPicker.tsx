import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useResponsive, gridTileWidth } from '../hooks/useResponsive';
import { spacing, borderRadius, typography } from '../theme';
import { FAMILY_AURAS, FamilyAuraId, getAuraMeta } from '../constants/aura';

interface FamilyAuraPickerProps {
  value?: FamilyAuraId | null;
  onChange: (aura: FamilyAuraId | null) => void;
  loading?: boolean;
}

export function FamilyAuraPicker({ value, onChange, loading }: FamilyAuraPickerProps) {
  const theme = useTheme();
  const { auraGridColumns, isWide, isMedium } = useResponsive();
  const [gridWidth, setGridWidth] = useState(0);
  const current = getAuraMeta(value);

  const gap = spacing.sm;
  const tileWidth = gridTileWidth(gridWidth, auraGridColumns, gap);
  const previewEmojiSize = isWide ? 44 : isMedium ? 40 : 36;
  const tileEmojiSize = isWide ? 32 : 28;

  const onGridLayout = (event: LayoutChangeEvent) => {
    setGridWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.preview,
          isWide && styles.previewWide,
          {
            backgroundColor: current ? current.tint : theme.surfaceSecondary,
            borderColor: current ? current.accent + '44' : theme.border,
          },
        ]}
      >
        <Text style={[styles.previewEmoji, { fontSize: previewEmojiSize }]}>
          {current?.emoji ?? '🌈'}
        </Text>
        <View style={styles.previewText}>
          <Text style={[styles.previewTitle, { color: theme.text }]}>
            {current ? current.label : 'No aura set'}
          </Text>
          <Text style={[styles.previewSub, { color: theme.textSecondary }]}>
            {current
              ? 'Your family can see this vibe on your profile'
              : 'Pick a mood below — totally optional'}
          </Text>
        </View>
      </View>

      <Pressable
        style={[
          styles.clearRow,
          {
            borderColor: value == null ? theme.primary : theme.border,
            backgroundColor: value == null ? theme.primary + '10' : theme.surfaceSecondary,
          },
        ]}
        onPress={() => onChange(null)}
        disabled={loading}
      >
        <Ionicons
          name={value == null ? 'checkmark-circle' : 'eye-off-outline'}
          size={18}
          color={value == null ? theme.primary : theme.textTertiary}
        />
        <Text style={[styles.clearText, { color: value == null ? theme.primary : theme.textSecondary }]}>
          Keep private — no aura
        </Text>
      </Pressable>

      <View style={[styles.grid, { gap }]} onLayout={onGridLayout}>
        {FAMILY_AURAS.map((aura) => {
          const selected = value === aura.id;
          return (
            <Pressable
              key={aura.id}
              style={[
                styles.tile,
                tileWidth > 0 && { width: tileWidth },
                {
                  backgroundColor: selected ? aura.tint : theme.surfaceSecondary,
                  borderColor: selected ? aura.accent : theme.border,
                  paddingVertical: isWide ? spacing.lg : spacing.md,
                },
              ]}
              onPress={() => onChange(aura.id)}
              disabled={loading}
            >
              {selected && (
                <View style={[styles.check, { backgroundColor: aura.accent }]}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                </View>
              )}
              <Text style={[styles.tileEmoji, { fontSize: tileEmojiSize }]}>{aura.emoji}</Text>
              <Text
                style={[styles.tileLabel, { color: selected ? aura.accent : theme.text }]}
                numberOfLines={1}
              >
                {aura.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.primary} size="small" />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Updating aura…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  previewWide: {
    padding: spacing.lg,
  },
  previewEmoji: {},
  previewText: { flex: 1 },
  previewTitle: { ...typography.title, fontSize: 16 },
  previewSub: { ...typography.caption, marginTop: 4, textTransform: 'none', letterSpacing: 0 },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  clearText: { ...typography.caption, textTransform: 'none', letterSpacing: 0, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    position: 'relative',
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileEmoji: { marginBottom: 6 },
  tileLabel: { ...typography.caption, textTransform: 'none', letterSpacing: 0, fontWeight: '700', textAlign: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { ...typography.caption, textTransform: 'none', letterSpacing: 0 },
});
