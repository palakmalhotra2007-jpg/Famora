import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';
import { AuthStackParamList } from '../../navigation/types';

const BRAND   = '#2563EB';
const BRAND_D = '#1D4ED8';
const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const MUTED   = '#64748B';

export function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { isWide, isMedium } = useResponsive();
  const cardWidth = isWide ? 420 : isMedium ? 400 : '100%' as const;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <View style={[styles.card, { width: cardWidth }]}>
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="heart" size={20} color="#FFF" />
            </View>
            <Text style={styles.brandLabel}>FAMORA</Text>
          </View>

          {/* Headline */}
          <Text style={styles.headline}>Your family's private space</Text>
          <Text style={styles.sub}>
            Share memories, stay connected, and celebrate every moment — just with the people who matter most.
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Actions */}
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.btnPrimaryText}>Create account</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.btnOutlineText}>Sign in</Text>
          </Pressable>

          {/* Ghost link */}
          <Pressable
            style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
            onPress={() => navigation.navigate('JoinFamily')}
          >
            <Ionicons name="key-outline" size={15} color={MUTED} />
            <Text style={styles.btnGhostText}>Join with invite code</Text>
          </Pressable>

          {/* Footer */}
          <Text style={styles.footer}>Private by design · Only your family sees what you share</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 36,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: BRAND,
    letterSpacing: 2,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 22,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 24,
  },
  btnPrimary: {
    height: 48,
    backgroundColor: BRAND,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  btnOutline: {
    height: 48,
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  btnOutlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND,
  },
  btnGhost: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
  },
  footer: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  pressed: { opacity: 0.82 },
});
