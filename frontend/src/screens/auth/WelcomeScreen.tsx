import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { AuthStackParamList } from '../../navigation/types';
import { spacing, typography, borderRadius } from '../../theme';
import { authColors } from '../../theme/auth';

export function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const theme = useTheme();
  const { isWide, contentMaxWidth, horizontalPadding } = useResponsive();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: '#F0F6FF' }]}>
      <View style={styles.center}>
        <View
          style={[
            styles.cardWrap,
            {
              maxWidth: isWide ? 420 : contentMaxWidth,
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: '#E2E8F0' }]}>
              <View style={styles.logoBadge}>
                <Ionicons name="heart" size={22} color="#FFF" />
              </View>
              <Text style={styles.brand}>Famora</Text>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Get started</Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                Create your account or sign in to rejoin your family.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: authColors.primary },
                  pressed && styles.pressed,
                ]}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.primaryText}>Create account</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
                  pressed && styles.pressed,
                ]}
                onPress={() => navigation.navigate('Login')}
              >
                <Ionicons name="log-in-outline" size={18} color={authColors.primary} />
                <Text style={[styles.secondaryText, { color: authColors.primaryDark }]}>Sign in</Text>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={[styles.dividerText, { color: theme.textTertiary }]}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
                onPress={() => navigation.navigate('JoinFamily')}
              >
                <Ionicons name="key-outline" size={18} color={authColors.primary} />
                <Text style={[styles.ghostText, { color: authColors.primary }]}>Join with invite code</Text>
              </Pressable>
            </View>

            <Text style={[styles.footerNote, { color: theme.textTertiary }]}>
              Private by design · Only your family can see what you share
            </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cardWrap: { width: '100%', gap: spacing.md },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: authColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    ...typography.label,
    color: authColors.primary,
    marginTop: -spacing.xs,
  },
  cardTitle: { ...typography.headline, fontSize: 24, textAlign: 'center' },
  cardSub: { ...typography.body, lineHeight: 22, textAlign: 'center' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    width: '100%',
    marginTop: spacing.xs,
  },
  primaryText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    width: '100%',
  },
  secondaryText: { fontWeight: '600', fontSize: 16 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { ...typography.caption, textTransform: 'lowercase', letterSpacing: 0 },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  ghostText: { fontWeight: '600', fontSize: 15 },
  footerNote: {
    ...typography.caption,
    textAlign: 'center',
    textTransform: 'none',
    letterSpacing: 0,
  },
  pressed: { opacity: 0.88 },
});
