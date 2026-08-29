import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive, gridTileWidth } from '../../hooks/useResponsive';
import { useFamilyStore, useAuthStore } from '../../store';
import { spacing, borderRadius, typography } from '../../theme';
import { authColors } from '../../theme/auth';
import { pinCardShell } from '../../theme/pin';
import { useThemeStore } from '../../store';
import { GlassCard, EmptyState, ScreenHeader, FamilyLocationMap, FamilyLocationList, FamilyPlanner, FamilyMailbox, GoodNightWall, FamilyPodcast, ResponsiveContainer, AddMemberModal } from '../../components';
import {
  fetchGameTypes,
  startGameSession,
  fetchGameSessions,
  fetchBucketList,
  createBucketItem,
  completeBucketItem,
  fetchMemberLocations,
  setLocationSharing,
  updateMyLocation,
} from '../../services/family.service';
import { gameFromType, scoreLabel } from '../../data/gameCatalog';
import { GamePlayScreen } from './GamePlayScreen';
import { FamilyTabParam, MainTabParamList } from '../../navigation/types';

type FamilyTab = FamilyTabParam;

export function FamilyScreen() {
  const theme = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const route = useRoute<RouteProp<MainTabParamList, 'Family'>>();
  const { horizontalPadding, gameGridColumns, contentMaxWidth } = useResponsive();
  const gameTileWidth = gridTileWidth(contentMaxWidth - horizontalPadding * 2, gameGridColumns, spacing.sm);
  const queryClient = useQueryClient();
  const family = useFamilyStore((s) => s.currentFamily);
  const [activeTab, setActiveTab] = useState<FamilyTab>('games');
  const [newDream, setNewDream] = useState('');
  const [showAddDream, setShowAddDream] = useState(false);
  const [addingDream, setAddingDream] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [startingGame, setStartingGame] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const familyId = family?.id;
  const userId = useAuthStore((s) => s.user?.id);

  const { data: gameTypes = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['gameTypes'],
    queryFn: fetchGameTypes,
    enabled: activeTab === 'games',
  });

  const { data: gameSessions = [] } = useQuery({
    queryKey: ['gameSessions', familyId],
    queryFn: () => fetchGameSessions(familyId!),
    enabled: !!familyId && activeTab === 'games',
  });

  const { data: bucketList = [] } = useQuery({
    queryKey: ['bucketList', familyId],
    queryFn: () => fetchBucketList(familyId!),
    enabled: !!familyId && activeTab === 'bucket',
  });

  const { data: memberLocations, isLoading: locationsLoading } = useQuery({
    queryKey: ['memberLocations', familyId],
    queryFn: () => fetchMemberLocations(familyId!),
    enabled: !!familyId && activeTab === 'locations',
    refetchInterval: activeTab === 'locations' ? 30_000 : false,
  });

  const [updatingLocationSharing, setUpdatingLocationSharing] = useState(false);
  const [refreshingGPS, setRefreshingGPS] = useState(false);

  const myLocationEntry = memberLocations?.members.find((m) => m.userId === userId || m.isSelf);
  const isSharing = myLocationEntry?.sharingEnabled ?? false;

  const handleAddDream = async () => {
    if (!familyId || !newDream.trim() || addingDream) return;
    setAddingDream(true);
    try {
      await createBucketItem(familyId, newDream.trim());
      setNewDream('');
      setShowAddDream(false);
      await queryClient.invalidateQueries({ queryKey: ['bucketList', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['home', familyId] });
    } catch (e) {
      Alert.alert('Error', 'Could not save bucket list goal');
    } finally {
      setAddingDream(false);
    }
  };

  const handleToggleBucketItem = async (itemId: string) => {
    if (!familyId) return;
    try {
      await completeBucketItem(familyId, itemId);
      await queryClient.invalidateQueries({ queryKey: ['bucketList', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['home', familyId] });
    } catch (e) {
      // silent
    }
  };

  const handleToggleLocationSharing = async (enabled: boolean) => {
    if (!familyId) return;
    setUpdatingLocationSharing(true);
    try {
      await setLocationSharing(familyId, enabled);
      if (enabled) {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                await updateMyLocation(familyId, {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy ?? undefined,
                });
                await queryClient.invalidateQueries({ queryKey: ['memberLocations', familyId] });
              } catch (e) {}
            },
            () => {},
            { enableHighAccuracy: true, timeout: 15000 }
          );
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            await updateMyLocation(familyId, {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? undefined,
            });
          }
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['memberLocations', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['home', familyId] });
    } catch (e) {
      Alert.alert('Error', 'Could not update location sharing setting.');
    } finally {
      setUpdatingLocationSharing(false);
    }
  };

  const handleForceRefreshGPS = async () => {
    if (!familyId) return;
    setRefreshingGPS(true);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                await updateMyLocation(familyId, {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy ?? undefined,
                });
                await queryClient.invalidateQueries({ queryKey: ['memberLocations', familyId] });
              } catch (e) {}
              resolve();
            },
            () => {
              Alert.alert('Location Access', 'Please allow location permission in your browser.');
              resolve();
            },
            { enableHighAccuracy: true, timeout: 15000 }
          );
        });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          await updateMyLocation(familyId, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? undefined,
          });
          await queryClient.invalidateQueries({ queryKey: ['memberLocations', familyId] });
        } else {
          Alert.alert('Permission needed', 'Please allow location permission in settings.');
        }
      }
    } catch (e) {
      Alert.alert('GPS Error', 'Could not retrieve current location.');
    } finally {
      setRefreshingGPS(false);
    }
  };

  const tabs: { key: FamilyTab; label: string }[] = [
    { key: 'games', label: 'Games' },
    { key: 'locations', label: 'Locations' },
    { key: 'planner', label: 'Planner' },
    { key: 'mailbox', label: 'Mailbox' },
    { key: 'wall', label: 'Wall' },
    { key: 'podcast', label: 'Podcast' },
    { key: 'bucket', label: 'Bucket List' },
  ];

  useEffect(() => {
    const tab = route.params?.tab;
    if (tab) {
      setActiveTab(tab);
    }
  }, [route.params?.tab]);

  const games = gameTypes.map(gameFromType);

  const sessionByType = new Map(gameSessions.map((s) => [s.gameType, s]));

  const handleStartGame = async (gameType: string) => {
    if (!familyId || startingGame) return;
    setStartingGame(true);
    try {
      const session = await startGameSession(familyId, gameType);
      setActiveSessionId(session.id);
      await queryClient.invalidateQueries({ queryKey: ['gameSessions', familyId] });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not start game');
    } finally {
      setStartingGame(false);
    }
  };

  const handleResumeGame = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleCloseGame = () => {
    setActiveSessionId(null);
    if (familyId) {
      void queryClient.invalidateQueries({ queryKey: ['gameSessions', familyId] });
    }
  };

  if (!familyId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <EmptyState iconName="people-outline" title="No family" message="Join a family to access family features." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ResponsiveContainer style={{ paddingHorizontal: 0 }}>
        <View style={{ paddingHorizontal: horizontalPadding }}>
          <ScreenHeader
            title="Family"
            subtitle={family.name}
            rightAction={{
              label: 'Add Member',
              onPress: () => setAddMemberOpen(true),
              icon: 'person-add',
            }}
          />
        </View>
      </ResponsiveContainer>

      <ResponsiveContainer style={{ paddingHorizontal: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={[styles.tabScrollContent, { paddingHorizontal: horizontalPadding }]}
        >
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tab,
              pinCardShell(mode, active),
              {
                backgroundColor: active ? authColors.primary : theme.surfaceSecondary,
                borderColor: active ? authColors.primary : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: active ? '#FFF' : theme.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
          );
        })}
        </ScrollView>
      </ResponsiveContainer>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer style={styles.page}>
        {activeTab === 'games' &&
          (gamesLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <>
              <View style={[styles.gamesBanner, { backgroundColor: authColors.primary + '12', borderColor: authColors.primary + '30' }]}>
                <Text style={styles.gamesBannerEmoji}>🎮</Text>
                <View style={styles.gamesBannerText}>
                  <Text style={[styles.gamesBannerTitle, { color: theme.text }]}>Family game night</Text>
                  <Text style={[styles.gamesBannerSub, { color: theme.textSecondary }]}>
                    Quick, playful challenges everyone can enjoy — kids, parents & grandparents.
                  </Text>
                </View>
              </View>

              {gameSessions.filter((s) => s.status === 'active').length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Continue playing</Text>
                  {gameSessions
                    .filter((s) => s.status === 'active')
                    .slice(0, 3)
                    .map((session) => {
                      const mode = session.config?.mode ?? gameFromType(session.gameType).mode;
                      const meta = gameFromType(session.gameType);
                      return (
                      <Pressable
                        key={session.id}
                        onPress={() => handleResumeGame(session.id)}
                        style={[styles.resumeRow, { backgroundColor: theme.surface, borderColor: '#BFDBFE' }]}
                      >
                        <View style={[styles.gameEmojiCircle, { backgroundColor: meta.accentSoft }]}>
                          <Text style={styles.gameEmojiSmall}>{meta.emoji}</Text>
                        </View>
                        <View style={styles.resumeMeta}>
                          <Text style={[styles.resumeTitle, { color: theme.text }]}>{meta.name}</Text>
                          <Text style={[styles.resumeSub, { color: theme.textSecondary }]}>
                            {session.leaderName
                              ? `${session.leaderName} leads · ${session.leaderScore} ${scoreLabel(mode)}`
                              : 'Be the first to play!'}
                          </Text>
                        </View>
                        <View style={[styles.playPill, { backgroundColor: authColors.primary }]}>
                          <Text style={styles.playPillText}>Play</Text>
                        </View>
                      </Pressable>
                    );
                    })}
                </>
              )}

              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Pick a game</Text>
              {startingGame && <ActivityIndicator color={authColors.primary} style={{ marginBottom: spacing.sm }} />}
              <View style={styles.gamesGrid}>
                {games.map((game) => {
                  const active = sessionByType.get(game.id);
                  const mode = active?.config?.mode ?? game.mode;
                  return (
                  <Pressable
                    key={game.id}
                    onPress={() => handleStartGame(game.id)}
                    disabled={startingGame}
                    style={[
                      styles.gameTile,
                      gameTileWidth > 0 && { width: gameTileWidth },
                      { backgroundColor: theme.surface, borderColor: '#E2E8F0' },
                    ]}
                  >
                    <View style={[styles.gameEmojiCircle, { backgroundColor: game.accentSoft }]}>
                      <Text style={styles.gameEmojiLarge}>{game.emoji}</Text>
                    </View>
                    <Text style={[styles.gameName, { color: theme.text }]} numberOfLines={2}>
                      {game.name}
                    </Text>
                    <Text style={[styles.gameCategory, { color: theme.textTertiary }]}>{game.category} · {game.ages}</Text>
                    <Text style={[styles.gameDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                      {game.description}
                    </Text>
                    {active?.leaderName ? (
                      <Text style={[styles.leaderHint, { color: authColors.primaryDark }]} numberOfLines={2}>
                        🏆 Beat {active.leaderName}: {active.leaderScore} {scoreLabel(mode)}
                      </Text>
                    ) : (
                      <Text style={[styles.playHint, { color: authColors.primary }]}>Tap to play →</Text>
                    )}
                  </Pressable>
                );
                })}
              </View>
            </>
          ))}

        {activeTab === 'locations' &&
          (locationsLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <>
              {/* Location Sharing Card */}
              <GlassCard style={[styles.locationShareCard, { borderColor: theme.border }]}>
                <View style={styles.locationShareLeft}>
                  <View style={[styles.locationShareIcon, { backgroundColor: isSharing ? theme.success + '20' : theme.surfaceSecondary }]}>
                    <Ionicons name={isSharing ? "location" : "location-outline"} size={22} color={isSharing ? theme.success : theme.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.locationShareTitle, { color: theme.text }]}>
                      {isSharing ? 'Sharing your live location' : 'Share your location'}
                    </Text>
                    <Text style={[styles.locationShareSub, { color: theme.textSecondary }]}>
                      {isSharing
                        ? myLocationEntry?.locationName
                          ? `Visible near ${myLocationEntry.locationName}`
                          : 'Family can view you on the map.'
                        : 'Allow family to see your location.'}
                    </Text>
                  </View>
                </View>
                <View style={styles.locationShareRight}>
                  {isSharing && (
                    <Pressable
                      onPress={handleForceRefreshGPS}
                      style={[styles.refreshGpsBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                      disabled={refreshingGPS}
                    >
                      {refreshingGPS ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Ionicons name="refresh" size={16} color={theme.primary} />
                      )}
                    </Pressable>
                  )}
                  {updatingLocationSharing ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Switch
                      value={isSharing}
                      onValueChange={handleToggleLocationSharing}
                      trackColor={{ false: theme.border, true: theme.primary + '66' }}
                      thumbColor={isSharing ? theme.primary : theme.surfaceSecondary}
                    />
                  )}
                </View>
              </GlassCard>

              <View style={[styles.locationStats, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.locationStat}>
                  <Text style={[styles.locationStatValue, { color: theme.text }]}>
                    {memberLocations?.sharingCount ?? 0}
                  </Text>
                  <Text style={[styles.locationStatLabel, { color: theme.textSecondary }]}>Sharing</Text>
                </View>
                <View style={[styles.locationDivider, { backgroundColor: theme.border }]} />
                <View style={styles.locationStat}>
                  <Text style={[styles.locationStatValue, { color: theme.primary }]}>
                    {memberLocations?.auraCount ?? 0}
                  </Text>
                  <Text style={[styles.locationStatLabel, { color: theme.textSecondary }]}>With aura 🌈</Text>
                </View>
              </View>

              <FamilyLocationMap
                members={memberLocations?.members ?? []}
                onToggleSharing={handleToggleLocationSharing}
              />
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Everyone</Text>
              <FamilyLocationList
                members={memberLocations?.members ?? []}
                currentUserId={userId}
                onToggleSharing={handleToggleLocationSharing}
                onRefreshLocation={handleForceRefreshGPS}
                updatingSharing={updatingLocationSharing}
                refreshingLocation={refreshingGPS}
              />
              <Text style={[styles.locationHint, { color: theme.textTertiary }]}>
                Tap &quot;Go&quot; next to a member to get Google Maps directions.
              </Text>
            </>
          ))}

        {activeTab === 'planner' && <FamilyPlanner familyId={familyId} />}

        {activeTab === 'mailbox' && <FamilyMailbox familyId={familyId} />}

        {activeTab === 'wall' && <GoodNightWall familyId={familyId} />}

        {activeTab === 'podcast' && (
          <FamilyPodcast familyId={familyId} familyName={family?.name ?? 'Family'} />
        )}

        {activeTab === 'bucket' && (
          <>
            {bucketList.length === 0 ? (
              <EmptyState iconName="flag-outline" title="Empty list" message="Add goals your family wants to achieve together." />
            ) : (
              bucketList.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleToggleBucketItem(item.id)}
                >
                  <GlassCard style={styles.bucketItem}>
                    <Ionicons
                      name={item.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={item.isCompleted ? theme.success : theme.primary}
                    />
                    <Text
                      style={[
                        styles.bucketTitle,
                        { color: theme.text },
                        item.isCompleted && styles.completed,
                      ]}
                    >
                      {item.title}
                    </Text>
                  </GlassCard>
                </Pressable>
              ))
            )}
            {showAddDream ? (
              <GlassCard style={styles.addDreamForm}>
                <TextInput
                  style={[styles.dreamInput, { color: theme.text, borderColor: theme.border }]}
                  placeholder="Visit Japan, run a marathon..."
                  placeholderTextColor={theme.textTertiary}
                  value={newDream}
                  onChangeText={setNewDream}
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Pressable
                    style={[styles.primaryBtn, { backgroundColor: theme.primary, flex: 1 }]}
                    onPress={handleAddDream}
                    disabled={addingDream}
                  >
                    {addingDream ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Save Goal</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.outlineBtn, { borderColor: theme.border, marginTop: 0, paddingVertical: spacing.sm }]}
                    onPress={() => setShowAddDream(false)}
                  >
                    <Text style={[styles.outlineBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ) : (
              <Pressable
                style={[styles.outlineBtn, { borderColor: theme.border }]}
                onPress={() => setShowAddDream(true)}
              >
                <Text style={[styles.outlineBtnText, { color: theme.primary }]}>+ Add Bucket List Item</Text>
              </Pressable>
            )}
          </>
        )}

        </ResponsiveContainer>
      </ScrollView>

      <GamePlayScreen
        visible={!!activeSessionId}
        familyId={familyId}
        sessionId={activeSessionId}
        onClose={handleCloseGame}
      />

      <AddMemberModal
        visible={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        familyId={familyId}
        inviteCode={family.inviteCode}
        familyName={family.name}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabScroll: { maxHeight: 52, marginBottom: spacing.sm },
  tabScrollContent: { gap: spacing.sm, paddingVertical: spacing.xs },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabLabel: { ...typography.caption, fontWeight: '600' },
  content: { paddingBottom: 100 },
  page: { paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  sectionLabel: { ...typography.label, marginBottom: spacing.sm, marginTop: spacing.xs, color: '#64748B' },
  gamesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  gamesBannerEmoji: { fontSize: 32 },
  gamesBannerText: { flex: 1, gap: 4 },
  gamesBannerTitle: { ...typography.title, fontSize: 16 },
  gamesBannerSub: { ...typography.caption, textTransform: 'none', letterSpacing: 0, lineHeight: 18 },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  resumeMeta: { flex: 1 },
  resumeTitle: { ...typography.body, fontWeight: '700' },
  resumeSub: { ...typography.caption, marginTop: 2, textTransform: 'none', letterSpacing: 0 },
  playPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  playPillText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  gamesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gameTile: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 168,
    gap: 4,
  },
  gameEmojiCircle: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  gameEmojiLarge: { fontSize: 28 },
  gameEmojiSmall: { fontSize: 22 },
  gameName: { ...typography.title, fontSize: 15 },
  gameCategory: { ...typography.micro, textTransform: 'none', letterSpacing: 0 },
  gameDesc: { ...typography.caption, textTransform: 'none', letterSpacing: 0, lineHeight: 17, marginTop: 2 },
  playHint: { ...typography.micro, fontWeight: '700', marginTop: spacing.sm, textTransform: 'none', letterSpacing: 0 },
  leaderHint: { ...typography.micro, marginTop: spacing.sm, textTransform: 'none', letterSpacing: 0, lineHeight: 16, fontWeight: '600' },
  locationStats: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  locationStat: { flex: 1, alignItems: 'center' },
  locationStatValue: { ...typography.title, fontSize: 22 },
  locationStatLabel: { ...typography.caption, marginTop: 2 },
  locationDivider: { width: 1, height: 36 },
  locationHint: { ...typography.caption, marginTop: spacing.md, textAlign: 'center' },
  bucketItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  bucketTitle: { ...typography.body, fontWeight: '600', flex: 1 },
  completed: { textDecorationLine: 'line-through', opacity: 0.6 },
  addDreamForm: { marginTop: spacing.sm, gap: spacing.sm },
  dreamInput: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.sm, ...typography.body },
  primaryBtn: { padding: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '600' },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  outlineBtnText: { fontWeight: '600' },
  locationShareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  locationShareLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    paddingRight: spacing.sm,
  },
  locationShareIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationShareTitle: { ...typography.body, fontWeight: '700', fontSize: 14 },
  locationShareSub: { ...typography.micro, textTransform: 'none', letterSpacing: 0, marginTop: 2 },
  locationShareRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshGpsBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm, alignItems: 'flex-start' },
  achievementText: { flex: 1 },
  achievementTitle: { ...typography.body, fontWeight: '600' },
  achievementDesc: { ...typography.caption, marginTop: 2 },
});
