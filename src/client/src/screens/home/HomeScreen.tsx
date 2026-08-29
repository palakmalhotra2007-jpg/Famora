import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive, gridTileWidth } from '../../hooks/useResponsive';
import { useAuthStore, useFamilyStore } from '../../store';
import { useThemeStore } from '../../store';
import { spacing, borderRadius, typography } from '../../theme';
import { pinCardShell } from '../../theme/pin';
import {
  GlassCard,
  AvatarRing,
  StreakBadge,
  CountdownWidget,
  EmptyState,
  AuraBadge,
  ResponsiveContainer,
} from '../../components';
import { getGreeting } from '../../utils/greeting';
import { getAuraMeta } from '../../constants/aura';
import { fetchHomeDashboard, resolveMediaUrl } from '../../services/family.service';
import { FamilyTabParam, HomeStackParamList, MainTabParamList } from '../../navigation/types';

type HomeNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>,
  BottomTabNavigationProp<MainTabParamList>
>;

interface QuickLink {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  tab?: FamilyTabParam;
  screen?: 'Memories' | 'Profile';
  stack?: 'Newspaper' | 'Assistant';
}

const QUICK_LINKS: QuickLink[] = [
  { label: 'Feed', icon: 'images-outline', tint: '#DBEAFE', screen: 'Memories' },
  { label: 'Games', icon: 'game-controller-outline', tint: '#EFF6FF', tab: 'games' },
  { label: 'Planner', icon: 'calendar-outline', tint: '#BFDBFE', tab: 'planner' },
  { label: 'Mailbox', icon: 'mail-outline', tint: '#E0F2FE', tab: 'mailbox' },
  { label: 'Wall', icon: 'moon-outline', tint: '#E0E7FF', tab: 'wall' },
  { label: 'Assistant', icon: 'chatbubbles-outline', tint: '#F3E8FF', stack: 'Assistant' },
];

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function HomeSectionHeader({
  title,
  subtitle,
  action,
  onAction,
  centered,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  centered?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, centered && styles.sectionHeaderCentered]}>
      <View style={[styles.sectionHeaderText, centered && styles.sectionHeaderTextCentered]}>
        <Text style={[styles.sectionTitle, { color: theme.text }, centered && styles.sectionTitleCentered]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.sectionSubtitle,
              { color: theme.textSecondary },
              centered && styles.sectionSubtitleCentered,
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.sectionAction, { color: theme.pin }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function HomeScreen() {
  const theme = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const navigation = useNavigation<HomeNavigation>();
  const {
    width,
    horizontalPadding,
    memberGridColumns,
    photoGridColumns,
    isWide,
    isMedium,
  } = useResponsive();
  const user = useAuthStore((s) => s.user);
  const family = useFamilyStore((s) => s.currentFamily);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['home', family?.id],
    queryFn: () => fetchHomeDashboard(family!.id),
    enabled: !!family?.id,
  });

  const contentWidth = width - horizontalPadding * 2;
  const photoGap = spacing.sm;
  const photoSize = gridTileWidth(contentWidth, photoGridColumns, photoGap);
  const memberGap = spacing.sm;
  const memberTileWidth =
    memberGridColumns > 0 ? gridTileWidth(contentWidth, memberGridColumns, memberGap) : 100;
  const useMemberGrid = memberGridColumns > 0;
  const quickItemWidth = isWide
    ? Math.min(96, (contentWidth - spacing.lg * 2 - spacing.sm * 5) / 6)
    : Math.min(80, (contentWidth - spacing.sm * 4) / 3.2);

  const goToFamily = (tab: FamilyTabParam) => {
    navigation.navigate('Family', { tab });
  };

  const handleQuickLink = (link: QuickLink) => {
    if (link.stack === 'Newspaper' || link.stack === 'Assistant') {
      navigation.navigate(link.stack);
      return;
    }
    if (link.screen) {
      navigation.navigate(link.screen);
      return;
    }
    if (link.tab) {
      goToFamily(link.tab);
    }
  };

  const quickLinks = QUICK_LINKS.map((link) => (
    <Pressable
      key={link.label}
      style={({ pressed }) => [
        styles.quickItem,
        { width: quickItemWidth },
        pressed && styles.quickItemPressed,
      ]}
      onPress={() => handleQuickLink(link)}
    >
      <View
        style={[
          styles.quickIconTile,
          {
            backgroundColor: link.tint,
            borderColor: theme.borderLight,
          },
        ]}
      >
        <Ionicons name={link.icon} size={26} color={theme.pin} />
      </View>
      <Text style={[styles.quickLabel, { color: theme.text }]} numberOfLines={1}>
        {link.label}
      </Text>
    </Pressable>
  ));

  if (!family?.id) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <EmptyState
          iconName="home-outline"
          title="Welcome to Famora"
          message="Create or join a family to see your home dashboard."
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading your family home…</Text>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <EmptyState iconName="cloud-offline-outline" title="Could not load home" message="Pull to refresh or try again." />
        <Pressable style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const members = data.members ?? [];
  const recentPosts = data.recentPosts ?? [];
  const todayEvents = data.todayEvents ?? [];
  const upcomingBirthdays = data.upcomingBirthdays ?? [];
  const newspaper = data.newspaper;
  const auraMembers = members.filter((m) => m.aura);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={theme.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <ResponsiveContainer style={styles.heroWrap}>
          <LinearGradient
            colors={[theme.gradientCool[0], theme.gradientCool[1], '#7CB8FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroGlow} />
            <View style={styles.heroGlowAccent} />
            <View style={styles.heroTop}>
              <View style={styles.heroBrand}>
                <View style={styles.heroBrandRow}>
                  <View style={[styles.heroPinDot, { backgroundColor: '#FFF7ED' }]} />
                  <Text style={[styles.heroBrandName, { color: '#FFFFFF' }]}>Famora</Text>
                </View>
                <Text style={[styles.heroDate, { color: 'rgba(255,255,255,0.82)' }]}>{today}</Text>
              </View>
              <StreakBadge streak={user?.photoStreak ?? 0} label="day streak" size="sm" />
            </View>

            <View style={[styles.heroMain, isWide ? styles.heroMainWide : styles.heroMainCompact]}>
              <AvatarRing
                uri={user?.avatarUrl}
                name={user?.displayName ?? 'Member'}
                size={isWide ? 72 : 60}
                aura={user?.aura}
              />
              <View style={styles.heroCopy}>
                <Text style={[styles.heroGreeting, { color: 'rgba(255,255,255,0.8)' }]}>{getGreeting()}</Text>
                <Text style={[styles.heroName, { color: '#FFFFFF' }]}>{user?.displayName ?? 'Member'}</Text>
                <View style={[styles.familyChip, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
                  <Ionicons name="people" size={14} color="#FFFFFF" />
                  <Text style={[styles.familyChipText, { color: '#FFFFFF' }]} numberOfLines={1}>{family.name}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.heroStats, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: '#FFFFFF' }]}>{data.familyStreak ?? 0}</Text>
                <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.82)' }]}>Family streak</Text>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: 'rgba(255,255,255,0.24)' }]} />
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: '#FFFFFF' }]}>{members.length}</Text>
                <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.82)' }]}>Members</Text>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: 'rgba(255,255,255,0.24)' }]} />
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: '#FFFFFF' }]}>{auraMembers.length}</Text>
                <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.82)' }]}>Sharing aura</Text>
              </View>
            </View>
          </LinearGradient>
        </ResponsiveContainer>

        <ResponsiveContainer style={styles.page}>
          <View style={[styles.quickHub, pinCardShell(mode), { borderColor: theme.border }]}>
            <View style={styles.quickHubHeader}>
              <Text style={[styles.quickHubTitle, { color: theme.text }]}>Quick links</Text>
              <Text style={[styles.quickHubSub, { color: theme.textSecondary }]}>
                Jump into family features
              </Text>
            </View>

            {isWide ? (
              <View style={styles.quickRowWide}>{quickLinks}</View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickScroll}
              >
                {quickLinks}
              </ScrollView>
            )}

            <Pressable
              onPress={() => navigation.navigate('Newspaper')}
              style={({ pressed }) => [styles.newspaperWrap, pressed && styles.quickItemPressed]}
            >
              <LinearGradient
                colors={[...theme.gradientCool]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.newspaperGradient}
              >
                <View style={styles.newspaperGlow} />
                <View style={styles.newspaperIconBadge}>
                  <Ionicons name="newspaper" size={24} color="#FFF" />
                </View>
                <View style={styles.newspaperCopy}>
                  <Text style={styles.newspaperTitle} numberOfLines={1}>
                    {newspaper?.title ?? `${family.name} Times`}
                  </Text>
                  <Text style={styles.newspaperSub} numberOfLines={2}>
                    {newspaper
                      ? "Today's family newspaper is ready — tap to read"
                      : 'Your daily family edition awaits'}
                  </Text>
                </View>
                <View style={styles.newspaperArrow}>
                  <Ionicons name="arrow-forward" size={18} color="#1D4ED8" />
                </View>
              </LinearGradient>
            </Pressable>
          </View>

          {data.nextEvent && (
            <CountdownWidget
              targetDate={String(data.nextEvent.startTime)}
              label={`Until ${data.nextEvent.title}`}
            />
          )}

          {data.challengeProgress && (
            <>
              <HomeSectionHeader title="Daily challenge" subtitle="Family photo challenge today" />
              <GlassCard style={{ ...styles.challengeCard, borderColor: theme.border }}>
                <View style={styles.challengeRow}>
                  <Ionicons name="camera-outline" size={24} color={theme.primary} />
                  <View style={styles.challengeMeta}>
                    <Text style={[styles.challengeTitle, { color: theme.text }]}>
                      {data.challengeProgress.membersCompleted} of {data.challengeProgress.totalMembers} posted
                    </Text>
                    <View style={[styles.challengeTrack, { backgroundColor: theme.surfaceSecondary }]}>
                      <View
                        style={[
                          styles.challengeFill,
                          {
                            backgroundColor: theme.primary,
                            width: `${Math.min(
                              100,
                              (data.challengeProgress.membersCompleted /
                                Math.max(data.challengeProgress.totalMembers, 1)) *
                                100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </GlassCard>
            </>
          )}

          <HomeSectionHeader
            title="Family vibes"
            subtitle={`${auraMembers.length} sharing their mood`}
            action="See all"
            onAction={() => goToFamily('locations')}
          />
          {members.length === 0 ? (
            <EmptyState iconName="people-outline" title="Invite family" message="Share your invite code from Profile." />
          ) : (
            <View style={[styles.membersRow, { gap: memberGap }]}>
              {(useMemberGrid ? members : members.slice(0, 8)).map((member) => {
                const auraMeta = getAuraMeta(member.aura);
                return (
                  <View
                    key={String(member.id)}
                    style={[
                      styles.memberCard,
                      pinCardShell(mode),
                      !useMemberGrid && { width: 100 },
                      useMemberGrid && memberTileWidth > 0 && { width: memberTileWidth },
                      {
                        borderColor: auraMeta ? auraMeta.accent + '40' : theme.border,
                        backgroundColor: auraMeta ? auraMeta.tint : theme.surface,
                      },
                    ]}
                  >
                    <AvatarRing
                      uri={member.avatarUrl}
                      name={member.displayName}
                      size={48}
                      aura={member.aura}
                    />
                    <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>
                      {member.displayName.split(' ')[0]}
                    </Text>
                    {member.aura ? (
                      <AuraBadge aura={member.aura} size="sm" />
                    ) : (
                      <Text style={[styles.memberMuted, { color: theme.textTertiary }]}>Private</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <HomeSectionHeader
            title="Today"
            subtitle={todayEvents.length === 0 ? 'Nothing scheduled yet' : `${todayEvents.length} event${todayEvents.length === 1 ? '' : 's'}`}
            action="Planner"
            onAction={() => goToFamily('planner')}
          />
          {todayEvents.length === 0 ? (
            <GlassCard style={{ ...styles.emptyToday, borderColor: theme.border }}>
              <Ionicons name="sunny-outline" size={28} color={theme.primary} />
              <Text style={[styles.emptyTodayTitle, { color: theme.text }]}>Free day together</Text>
              <Text style={[styles.emptyTodaySub, { color: theme.textSecondary }]}>
                Add something in Family → Planner
              </Text>
            </GlassCard>
          ) : (
            todayEvents.map((event, index) => (
              <View key={String(event.id)} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={[styles.timelineDot, { backgroundColor: theme.primary }]} />
                  {index < todayEvents.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                  )}
                </View>
                <GlassCard style={{ ...styles.eventCard, borderColor: theme.border, flex: 1 }}>
                  <Text style={[styles.eventTime, { color: theme.primary }]}>
                    {formatEventTime(String(event.startTime))}
                  </Text>
                  <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
                  {event.location ? (
                    <Text style={[styles.eventLocation, { color: theme.textSecondary }]} numberOfLines={1}>
                      📍 {event.location}
                    </Text>
                  ) : null}
                </GlassCard>
              </View>
            ))
          )}

          {upcomingBirthdays.length > 0 && (
            <>
              <HomeSectionHeader title="Birthdays this week" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.birthdayRow}>
                  {upcomingBirthdays.map((person, i) => (
                    <View
                      key={`${person.displayName}-${i}`}
                      style={[styles.birthdayCard, pinCardShell(mode), { borderColor: theme.border }]}
                    >
                      <AvatarRing uri={person.avatarUrl} name={person.displayName} size={44} />
                      <Text style={[styles.birthdayName, { color: theme.text }]} numberOfLines={1}>
                        {person.displayName}
                      </Text>
                      <Text style={[styles.birthdaySub, { color: theme.textSecondary }]}>🎂 Coming up</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          <HomeSectionHeader
            title="Recent moments"
            subtitle="Latest from the family feed"
            action="Open feed"
            onAction={() => navigation.navigate('Memories')}
          />
          {recentPosts.length === 0 ? (
            <GlassCard style={{ ...styles.emptyToday, borderColor: theme.border }}>
              <Ionicons name="images-outline" size={28} color={theme.primary} />
              <Text style={[styles.emptyTodayTitle, { color: theme.text }]}>No posts yet</Text>
              <Text style={[styles.emptyTodaySub, { color: theme.textSecondary }]}>
                Share photos from the Feed tab
              </Text>
            </GlassCard>
          ) : (
            <View style={[styles.photoGrid, { gap: photoGap }]}>
              {recentPosts.map((post, index) => {
                const heightMult = index % 3 === 0 ? 1.45 : index % 3 === 1 ? 1.15 : 1.32;
                const imgHeight = photoSize > 0 ? photoSize * heightMult : 140;
                return (
                <Pressable
                  key={String(post.id)}
                  style={[
                    styles.photoTile,
                    pinCardShell(mode),
                    photoSize > 0 && { width: photoSize },
                    { borderColor: theme.border },
                  ]}
                  onPress={() => navigation.navigate('Memories')}
                >
                  <Image
                    source={{ uri: resolveMediaUrl(post.mediaUrls?.[0]) }}
                    style={[styles.photoImage, { height: imgHeight }]}
                    contentFit="cover"
                  />
                  <View style={styles.photoPinBody}>
                    <Text style={[styles.photoPinTitle, { color: theme.text }]} numberOfLines={2}>
                      {post.caption || `Photo by ${post.authorName}`}
                    </Text>
                    <Text style={[styles.photoPinMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                      {post.authorName}
                    </Text>
                  </View>
                </Pressable>
                );
              })}
            </View>
          )}
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  loadingText: { ...typography.caption, textTransform: 'none', letterSpacing: 0 },
  retryBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  retryText: { color: '#FFF', fontWeight: '700' },
  scrollContent: { paddingBottom: 110, paddingTop: spacing.sm },
  heroWrap: { marginBottom: spacing.md },
  heroCard: {
    borderRadius: 28,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    right: -24,
    top: -28,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroGlowAccent: {
    position: 'absolute',
    left: -18,
    bottom: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 },
  heroBrand: { gap: 2 },
  heroBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroPinDot: { width: 10, height: 10, borderRadius: 5 },
  heroBrandName: { ...typography.title, fontSize: 18, fontWeight: '800' },
  heroDate: { ...typography.caption, textTransform: 'none', letterSpacing: 0 },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, zIndex: 1 },
  heroMainWide: { gap: spacing.lg },
  heroMainCompact: { alignItems: 'flex-start', gap: spacing.sm },
  heroCopy: { flex: 1, gap: 4 },
  heroGreeting: { ...typography.caption, textTransform: 'none', letterSpacing: 0 },
  heroName: { ...typography.headline, fontSize: 24 },
  familyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: 4,
    maxWidth: '100%',
  },
  familyChipText: { fontWeight: '600', fontSize: 12, maxWidth: '100%' },
  heroStats: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    zIndex: 1,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 22, fontWeight: '700' },
  heroStatLabel: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  heroStatDivider: { width: 1 },
  page: { gap: spacing.md, paddingBottom: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionHeaderText: { flex: 1 },
  sectionHeaderCentered: { justifyContent: 'center' },
  sectionHeaderTextCentered: { flex: 0, alignItems: 'center' },
  sectionTitleCentered: { textAlign: 'center' },
  sectionSubtitleCentered: { textAlign: 'center' },
  sectionTitle: { ...typography.title, fontSize: 20, fontWeight: '800' },
  sectionSubtitle: { ...typography.caption, marginTop: 2, textTransform: 'none', letterSpacing: 0 },
  sectionAction: { ...typography.caption, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  quickHub: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
  },
  quickHubHeader: { gap: 4 },
  quickHubTitle: { ...typography.headline, fontSize: 21, fontWeight: '800' },
  quickHubSub: { ...typography.caption, textTransform: 'none', letterSpacing: 0 },
  quickScroll: {
    gap: spacing.md,
    paddingRight: spacing.xs,
    paddingBottom: spacing.xs,
  },
  quickRowWide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  quickItem: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.xs,
  },
  quickItemPressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
  quickIconTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickLabel: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 12,
    textAlign: 'center',
  },
  newspaperWrap: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  newspaperGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  newspaperGlow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  newspaperIconBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newspaperCopy: { flex: 1, gap: 4 },
  newspaperTitle: { ...typography.title, fontSize: 17, fontWeight: '800', color: '#FFF' },
  newspaperSub: {
    ...typography.caption,
    textTransform: 'none',
    letterSpacing: 0,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 18,
  },
  newspaperArrow: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeCard: { borderWidth: 1, borderRadius: borderRadius.lg },
  challengeRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  challengeMeta: { flex: 1, gap: spacing.sm },
  challengeTitle: { ...typography.body, fontWeight: '600' },
  challengeTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  challengeFill: { height: '100%', borderRadius: 4 },
  membersRow: { flexDirection: 'row', flexWrap: 'wrap' },
  memberCard: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    borderRadius: borderRadius.lg,
  },
  memberName: { ...typography.caption, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  memberMuted: { ...typography.micro, textTransform: 'none', letterSpacing: 0, fontSize: 10 },
  emptyToday: { alignItems: 'center', padding: spacing.lg, borderWidth: 1, gap: spacing.sm, borderRadius: borderRadius.lg },
  emptyTodayTitle: { ...typography.title, fontSize: 16 },
  emptyTodaySub: { ...typography.caption, textAlign: 'center', textTransform: 'none', letterSpacing: 0 },
  timelineRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  timelineRail: { width: 16, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: spacing.md },
  timelineLine: { width: 2, flex: 1, marginTop: 4 },
  eventCard: { borderWidth: 1, borderRadius: borderRadius.lg },
  eventTime: { ...typography.caption, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  eventTitle: { ...typography.body, fontWeight: '600', marginTop: 4 },
  eventLocation: { ...typography.caption, marginTop: 4, textTransform: 'none', letterSpacing: 0 },
  birthdayRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  birthdayCard: {
    width: 120,
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  birthdayName: { ...typography.caption, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  birthdaySub: { ...typography.micro, textTransform: 'none', letterSpacing: 0 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  photoTile: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, marginBottom: spacing.sm, borderRadius: borderRadius.lg },
  photoImage: { width: '100%' },
  photoPinBody: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm, gap: 2 },
  photoPinTitle: { ...typography.body, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  photoPinMeta: { ...typography.micro, textTransform: 'none', letterSpacing: 0, fontSize: 11 },
});
