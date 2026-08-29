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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useResponsive } from '../hooks/useResponsive';
import { ResponsiveContainer } from './ResponsiveContainer';
import { spacing, typography, borderRadius } from '../theme';
import { authColors } from '../theme/auth';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  error?: string | null;
  children: React.ReactNode;
  showBack?: boolean;
}

export function AuthLayout({ title, subtitle, error, children, showBack = true }: AuthLayoutProps) {
  const theme = useTheme();
  const navigation = useNavigation();
  const { isWide, contentMaxWidth } = useResponsive();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F0F9FF' }]}>
      <LinearGradient 
        colors={['#E0F2FE', '#BAE6FD', '#7DD3FC']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bgGradient} 
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ResponsiveContainer style={styles.page}>
            <View style={[styles.cardWrap, { maxWidth: isWide ? 440 : contentMaxWidth }]}>
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  {showBack && navigation.canGoBack() ? (
                    <Pressable
                      onPress={() => navigation.goBack()}
                      style={[styles.backBtn]}
                      hitSlop={8}
                    >
                      <Ionicons name="arrow-back" size={20} color="#0284C7" />
                    </Pressable>
                  ) : (
                    <View style={styles.backSpacer} />
                  )}
                  <View style={styles.logoBadge}>
                    <Ionicons name="heart" size={18} color="#FFF" />
                  </View>
                </View>

                <Text style={styles.logo}>Famora</Text>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? (
                  <Text style={styles.subtitle}>{subtitle}</Text>
                ) : null}
                
                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="warning" size={18} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.form}>{children}</View>
              </View>
            </View>
          </ResponsiveContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  icon,
}: AuthFieldProps) {
  const theme = useTheme();
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        {icon ? (
          <Ionicons name={icon} size={20} color="#94A3B8" style={styles.inputIcon} />
        ) : null}
        <TextInput
          style={[styles.inputField, { color: '#0F172A' }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isSecure}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoCorrect={false}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setIsSecure(!isSecure)} style={styles.eyeBtn}>
            <Ionicons name={isSecure ? 'eye-outline' : 'eye-off-outline'} size={20} color={theme.textTertiary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}

export function AuthButton({ label, onPress, variant = 'primary', loading, disabled }: AuthButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isPrimary
          ? { backgroundColor: '#0284C7' }
          : variant === 'secondary'
            ? { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#0284C7' }
            : { backgroundColor: 'transparent' },
        pressed && { opacity: 0.88 },
        (disabled || loading) && styles.buttonDisabled,
      ]}
    >
      {isPrimary && !loading ? (
        <Ionicons name="log-in-outline" size={18} color="#FFF" style={styles.btnIcon} />
      ) : null}
      <Text style={[styles.buttonText, { color: isPrimary ? '#FFF' : '#0284C7' }]}>
        {loading ? 'Please wait...' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGradient: {
    ...StyleSheet.absoluteFill,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  page: { alignItems: 'center' },
  cardWrap: { width: '100%' },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    padding: spacing.xl,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: { width: 40 },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  logo: {
    ...typography.label,
    color: '#0284C7',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 12,
    fontWeight: '800',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#64748B', marginTop: spacing.xs, lineHeight: 22 },
  errorBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FEF2F2', 
    padding: spacing.sm, 
    borderRadius: 8, 
    marginTop: spacing.md, 
    gap: spacing.xs 
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  form: { marginTop: spacing.lg, gap: spacing.md },
  inputGroup: { gap: spacing.xs + 2 },
  label: { fontSize: 13, fontWeight: '700', color: '#475569' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 56,
  },
  inputIcon: { marginLeft: spacing.md },
  inputField: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
  },
  eyeBtn: {
    padding: spacing.md,
  },
  button: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    shadowColor: '#0284C7',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  btnIcon: { marginRight: spacing.sm },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontWeight: '700', fontSize: 16 },
});
