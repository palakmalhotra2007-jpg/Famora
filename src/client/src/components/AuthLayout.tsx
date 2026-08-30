import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useResponsive } from '../hooks/useResponsive';

// ─── Constants ───────────────────────────────────────────────
const BRAND   = '#2563EB';
const BRAND_D = '#1D4ED8';
const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const MUTED   = '#64748B';
const ERROR_BG = '#FFF1F2';
const ERROR_TX = '#BE123C';

// ─── AuthLayout ──────────────────────────────────────────────

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  error?: string | null;
  children: React.ReactNode;
  showBack?: boolean;
}

export function AuthLayout({ title, subtitle, error, children, showBack = true }: AuthLayoutProps) {
  const navigation = useNavigation();
  const { isWide, isMedium } = useResponsive();
  const cardWidth = isWide ? 420 : isMedium ? 400 : '100%' as const;

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { width: cardWidth }]}>
            {/* Header row */}
            <View style={styles.cardHeader}>
              {showBack && navigation.canGoBack() ? (
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
                  <Ionicons name="arrow-back" size={18} color={BRAND} />
                </Pressable>
              ) : <View style={styles.backBtn} />}

              <View style={styles.logoBadge}>
                <Ionicons name="heart" size={16} color="#FFF" />
              </View>
            </View>

            {/* Brand + Title */}
            <Text style={styles.brandLabel}>FAMORA</Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={ERROR_TX} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={styles.form}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── AuthField ────────────────────────────────────────────────

interface AuthFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  keyboardType?: 'default' | 'email-address';
  icon?: keyof typeof Ionicons.glyphMap;
}

export function AuthField({
  label, value, onChangeText, placeholder,
  secureTextEntry, autoCapitalize = 'none',
  keyboardType = 'default', icon,
}: AuthFieldProps) {
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRow}>
        {icon ? <Ionicons name={icon} size={18} color={MUTED} style={styles.fieldIcon} /> : null}
        <TextInput
          style={[styles.fieldInput, !icon && styles.fieldInputNoIcon]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={hidden}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoCorrect={false}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden(!hidden)} style={styles.eyeBtn}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={MUTED} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ─── AuthButton ───────────────────────────────────────────────

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}

export function AuthButton({ label, onPress, variant = 'primary', loading, disabled }: AuthButtonProps) {
  const isPrimary   = variant === 'primary';
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        isPrimary   && styles.btnPrimary,
        isSecondary && styles.btnSecondary,
        variant === 'ghost' && styles.btnGhost,
        pressed && styles.btnPressed,
        (disabled || loading) && styles.btnDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFF' : BRAND} size="small" />
      ) : (
        <Text style={[styles.btnText, !isPrimary && styles.btnTextAlt]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 36,
    borderWidth: 1,
    borderColor: BORDER,
    // Clean shadow — no blur
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: BRAND,
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
    marginBottom: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ERROR_BG,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: ERROR_TX,
  },
  form: {
    marginTop: 24,
    gap: 16,
  },

  // Field
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    minHeight: 48,
  },
  fieldIcon: { marginLeft: 14 },
  fieldInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT,
  },
  fieldInputNoIcon: { paddingHorizontal: 14 },
  eyeBtn: { padding: 12 },

  // Button
  btn: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnPrimary: {
    backgroundColor: BRAND,
  },
  btnSecondary: {
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: BRAND,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnPressed: { opacity: 0.85 },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnTextAlt: {
    color: BRAND,
  },
});
