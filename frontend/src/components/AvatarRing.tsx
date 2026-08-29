import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../store';
import { colors, borderRadius } from '../theme';
import { getAuraDisplay, getAuraRing } from '../constants/aura';
import type { FamilyAuraId } from '../constants/aura';

interface AvatarRingProps {
  uri?: string;
  name: string;
  size?: number;
  /** @deprecated Use aura instead — only shown when aura is set */
  isActive?: boolean;
  aura?: FamilyAuraId | null;
  showStreak?: boolean;
  streak?: number;
}

export function AvatarRing({ uri, name, size = 48, aura, showStreak, streak }: AvatarRingProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = colors[mode];
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const auraDisplay = getAuraDisplay(aura);
  const showRing = !!auraDisplay;
  const ringColors = getAuraRing(aura);

  return (
    <View style={styles.container}>
      {showRing ? (
        <LinearGradient
          colors={[...ringColors]}
          style={[styles.ring, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]}
        >
          <View style={[styles.avatarWrapper, { width: size, height: size, borderRadius: size / 2 }]}>
            {uri ? (
              <Image source={{ uri }} style={[styles.avatar, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]} />
            ) : (
              <View style={[styles.placeholder, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2, backgroundColor: theme.primary }]}>
                <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      ) : (
        <View style={[styles.avatarWrapper, { width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: theme.border }]}>
          {uri ? (
            <Image source={{ uri }} style={[styles.avatar, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]} />
          ) : (
            <View style={[styles.placeholder, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2, backgroundColor: theme.surfaceSecondary }]}>
              <Text style={[styles.initials, { fontSize: size * 0.35, color: theme.text }]}>{initials}</Text>
            </View>
          )}
        </View>
      )}
      {auraDisplay && (
        <View
          style={[
            styles.auraBadge,
            {
              backgroundColor: theme.surface,
              borderColor: ringColors[0],
              width: Math.max(24, size * 0.38),
              height: Math.max(24, size * 0.38),
              borderRadius: Math.max(12, size * 0.19),
            },
          ]}
        >
          <Text style={{ fontSize: Math.max(11, size * 0.2) }}>{auraDisplay.emoji}</Text>
        </View>
      )}
      {showStreak && streak !== undefined && streak > 0 && (
        <View style={[styles.streakBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.streakText}>{streak}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  streakBadge: {
    position: 'absolute',
    bottom: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  streakText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  auraBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
});
