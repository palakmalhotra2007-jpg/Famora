import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore, useFamilyStore } from '../../store';
import { useThemeStore } from '../../store';
import { spacing, borderRadius, typography } from '../../theme';
import { pinCardShell } from '../../theme/pin';
import { GlassCard, AvatarRing, StreakBadge, EmptyState, ScreenHeader, FamilyAuraPicker, AuraBadge, ResponsiveContainer } from '../../components';
import { fetchMe, setFamilyAura, logout as supabaseLogout } from '../../services/auth.service';
import type { FamilyAuraId } from '../../constants/aura';
import { fetchHomeDashboard, fetchAchievements, fetchMemberLocations, setLocationSharing, updateMyLocation } from '../../services/family.service';
import { useResponsive } from '../../hooks/useResponsive';
import { showAlert } from '../../utils/alert';

export function ProfileScreen() {
  const theme = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const { isWide, isMedium, horizontalPadding } = useResponsive();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const clearFamily = useFamilyStore((s) => s.clearFamily);
  const family = useFamilyStore((s) => s.currentFamily);
  const localUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    initialData: localUser ?? undefined,
  });

  const { data: home } = useQuery({
    queryKey: ['home', family?.id],
    queryFn: () => fetchHomeDashboard(family!.id),
    enabled: !!family?.id,
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', family?.id],
    queryFn: () => fetchAchievements(family!.id),
    enabled: !!family?.id,
  });

  const { data: locations } = useQuery({
    queryKey: ['memberLocations', family?.id],
    queryFn: () => fetchMemberLocations(family!.id),
    enabled: !!family?.id,
  });

  const myLocation = locations?.members.find((m) => m.isSelf);
  const [updatingSharing, setUpdatingSharing] = useState(false);
  const [updatingAura, setUpdatingAura] = useState(false);

  const handleToggleSharing = async (enabled: boolean) => {
    if (!family?.id) return;
    setUpdatingSharing(true);
    try {
      await setLocationSharing(family.id, enabled);
      if (enabled) {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                await updateMyLocation(family.id, {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy ?? undefined,
                });
                await queryClient.invalidateQueries({ queryKey: ['memberLocations', family.id] });
              } catch (e) {}
            },
            () => {},
            { enableHighAccuracy: true, timeout: 15000 }
          );
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['memberLocations', family.id] });
      await queryClient.invalidateQueries({ queryKey: ['home', family.id] });
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Could not update location sharing');
    } finally {
      setUpdatingSharing(false);
    }
  };

  const handleAuraChange = async (aura: FamilyAuraId | null) => {
    if (!family?.id) return;
    setUpdatingAura(true);
    try {
      const updated = await setFamilyAura(aura);
      setUser(updated);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['home', family.id] });
      await queryClient.invalidateQueries({ queryKey: ['memberLocations', family.id] });
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Could not update aura');
    } finally {
      setUpdatingAura(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabaseLogout();
    } catch {
      // ignore
    }
    logout();
    clearFamily();
    queryClient.clear();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ResponsiveContainer style={{ paddingHorizontal: 0 }}>
        <View style={{ paddingHorizontal: horizontalPadding }}>
          <ScreenHeader title="Profile" subtitle={user?.email} />
        </View>
      </ResponsiveContainer>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ResponsiveContainer>
          <View style={[isWide && styles.wideTopRow]}>
            <View style={[styles.profileCard, pinCardShell(mode), isWide && styles.profileCardWide, { borderColor: theme.border }]}>
              <AvatarRing
                uri={user?.avatarUrl}
                name={user?.displayName ?? 'User'}
                size={isWide ? 88 : 72}
                aura={user?.aura}
                showStreak
                streak={user?.photoStreak}
              />
              <Text style={[styles.profileName, { color: theme.text }]}>{user?.displayName}</Text>
              {user?.aura ? (
                <AuraBadge aura={user.aura} />
              ) : (
                <StreakBadge streak={user?.photoStreak ?? 0} label="photo streak" size="sm" />
              )}
            </View>

            {family && isWide ? (
              <View style={styles.wideSettingsCol}>
                <GlassCard style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Family</Text>
                  <Text style={[styles.settingValue, { color: theme.text }]}>{family.name}</Text>
                </GlassCard>
                <GlassCard style={styles.settingRow}>
                  <View>
                    <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Invite code</Text>
                    <Text style={[styles.inviteCode, { color: theme.primary }]}>{family.inviteCode}</Text>
                  </View>
                  <Ionicons name="copy-outline" size={18} color={theme.textTertiary} />
                </GlassCard>
                <GlassCard style={styles.settingRow}>
                  <View style={styles.settingMeta}>
                    <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Share my location</Text>
                    <Text style={[styles.settingHint, { color: theme.textTertiary }]}>
                      Family members can see where you are when this is on.
                    </Text>
                  </View>
                  {updatingSharing ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <Switch
                      value={myLocation?.sharingEnabled ?? false}
                      onValueChange={handleToggleSharing}
                      trackColor={{ false: theme.border, true: theme.primary + '66' }}
                      thumbColor={myLocation?.sharingEnabled ? theme.primary : theme.surfaceSecondary}
                    />
                  )}
                </GlassCard>
              </View>
            ) : null}
          </View>

        {family && !isWide ? (
          <>
            <GlassCard style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Family</Text>
              <Text style={[styles.settingValue, { color: theme.text }]}>{family.name}</Text>
            </GlassCard>
            <GlassCard style={styles.settingRow}>
              <View>
                <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Invite code</Text>
                <Text style={[styles.inviteCode, { color: theme.primary }]}>{family.inviteCode}</Text>
              </View>
              <Ionicons name="copy-outline" size={18} color={theme.textTertiary} />
            </GlassCard>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Share this code so members can join your family.
            </Text>

            <GlassCard style={styles.settingRow}>
              <View style={styles.settingMeta}>
                <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Share my location</Text>
                <Text style={[styles.settingHint, { color: theme.textTertiary }]}>
                  Family members can see where you are when this is on.
                </Text>
              </View>
              {updatingSharing ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Switch
                  value={myLocation?.sharingEnabled ?? false}
                  onValueChange={handleToggleSharing}
                  trackColor={{ false: theme.border, true: theme.primary + '66' }}
                  thumbColor={myLocation?.sharingEnabled ? theme.primary : theme.surfaceSecondary}
                />
              )}
            </GlassCard>
            {myLocation?.sharingEnabled && myLocation.latitude != null && (
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Last shared: {myLocation.locationName ?? 'Current location'} Â·{' '}
                {myLocation.updatedAt ? new Date(myLocation.updatedAt).toLocaleTimeString() : 'Updating...'}
              </Text>
            )}
          </>
        ) : !family ? (
          <EmptyState iconName="home-outline" title="No family" message="Create or join a family to continue." />
        ) : null}

        {family ? (
          <View style={[styles.auraSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.auraHeader}>
              <Text style={styles.auraHeaderEmoji}>ðŸŒˆ</Text>
              <View style={styles.auraHeaderText}>
                <Text style={[styles.sectionTitleInline, { color: theme.text }]}>Family Aura</Text>
                <Text style={[styles.auraHint, { color: theme.textSecondary }]}>
                  Share your vibe â€” only if you feel like it.
                </Text>
              </View>
            </View>
            <FamilyAuraPicker value={user?.aura} onChange={handleAuraChange} loading={updatingAura} />
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Members</Text>
        {(home?.members ?? []).length === 0 ? (
          <EmptyState iconName="people-outline" title="No members yet" message="Invite family using your invite code." />
        ) : (
          (home?.members ?? []).map((member) => (
            <View
              key={String(member.id)}
              style={[
                styles.memberRow,
                isMedium && styles.memberRowGrid,
                { borderBottomColor: theme.borderLight, backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <AvatarRing uri={member.avatarUrl} name={member.displayName} size={44} aura={member.aura} />
              <View style={styles.memberMeta}>
                <Text style={[styles.memberName, { color: theme.text }]}>{member.displayName}</Text>
                {member.aura ? (
                  <AuraBadge aura={member.aura} size="sm" />
                ) : (
                  <Text style={[styles.memberStreak, { color: theme.textTertiary }]}>
                    {member.location?.locationName ?? `${member.photoStreak ?? 0} day streak`}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Achievements</Text>
        {achievements.length === 0 ? (
          <EmptyState iconName="ribbon-outline" title="No achievements" message="Activity badges will appear here." />
        ) : (
          achievements.slice(0, 5).map((a) => (
            <GlassCard key={String(a.id)} style={styles.achievementRow}>
              <Ionicons name="ribbon-outline" size={20} color={theme.primary} />
              <View>
                <Text style={[styles.achievementTitle, { color: theme.text }]}>{String(a.title)}</Text>
                <Text style={[styles.achievementDate, { color: theme.textTertiary }]}>
                  {a.earnedAt ? new Date(String(a.earnedAt)).toLocaleDateString() : ''}
                </Text>
              </View>
            </GlassCard>
          ))
        )}

        <Pressable style={[styles.logoutButton, { borderColor: theme.error }]} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: theme.error }]}>Sign out</Text>
        </Pressable>
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 100 },
  wideTopRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'stretch',
    marginBottom: spacing.md,
  },
  profileCard: {
    alignItems: 'center',
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  profileCardWide: {
    flex: 1,
    marginBottom: 0,
    justifyContent: 'center',
  },
  wideSettingsCol: { flex: 1.4, gap: spacing.sm },
  profileName: { ...typography.headline, fontSize: 20 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  settingMeta: { flex: 1, paddingRight: spacing.md },
  settingLabel: { ...typography.caption },
  settingHint: { ...typography.micro, textTransform: 'none', letterSpacing: 0, marginTop: 4 },
  settingValue: { ...typography.body, fontWeight: '600' },
  inviteCode: { ...typography.title, fontSize: 18, marginTop: 4, letterSpacing: 2 },
  hint: { ...typography.caption, marginBottom: spacing.md },
  auraSection: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  auraHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  auraHeaderEmoji: { fontSize: 28 },
  auraHeaderText: { flex: 1 },
  sectionTitleInline: { ...typography.title, fontSize: 16 },
  auraHint: { ...typography.caption, marginTop: 2, textTransform: 'none', letterSpacing: 0 },
  sectionTitle: { ...typography.title, fontSize: 16, marginTop: spacing.md, marginBottom: spacing.sm },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  memberRowGrid: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  memberMeta: { flex: 1, gap: 4 },
  memberName: { ...typography.body, fontWeight: '600' },
  memberStreak: { ...typography.caption, marginTop: 2 },
  achievementRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  achievementTitle: { ...typography.body, fontWeight: '600' },
  achievementDate: { ...typography.caption, marginTop: 2 },
  logoutButton: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  logoutText: { fontWeight: '600', fontSize: 15 },
});

