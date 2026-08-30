import React, { useMemo, createElement } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, borderRadius, typography } from '../theme';
import { authColors } from '../theme/auth';
import { AvatarRing } from './AvatarRing';
import { AuraBadge } from './AuraBadge';
import { MemberLocationEntry } from '../types';
import { getAuraMeta } from '../constants/aura';
import { useResponsive } from '../hooks/useResponsive';
import {
  getGoogleMapsEmbedUrl,
  getGoogleMapsExternalUrl,
  openGoogleMapsDirections,
  openGoogleMapsView,
  promptMapsAction,
} from '../utils/maps';

interface FamilyLocationMapProps {
  members: MemberLocationEntry[];
  height?: number;
}

function projectPoints(
  members: MemberLocationEntry[],
  width: number,
  height: number
): Array<{ member: MemberLocationEntry; x: number; y: number }> {
  const withCoords = members.filter((m) => m.latitude != null && m.longitude != null);
  if (withCoords.length === 0) return [];

  const lats = withCoords.map((m) => m.latitude!);
  const lngs = withCoords.map((m) => m.longitude!);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latSpan = Math.max(maxLat - minLat, 0.01);
  const lngSpan = Math.max(maxLng - minLng, 0.01);
  const padding = 28;

  return withCoords.map((member) => {
    const x = padding + ((member.longitude! - minLng) / lngSpan) * (width - padding * 2);
    const y = padding + (1 - (member.latitude! - minLat) / latSpan) * (height - padding * 2);
    return { member, x, y };
  });
}

function formatUpdatedAt(updatedAt?: string | null): string {
  if (!updatedAt) return 'Unknown';
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(updatedAt).toLocaleDateString();
}

function WebMapEmbed({ members, height }: { members: MemberLocationEntry[]; height: number }) {
  const coords = members
    .filter((m) => m.latitude != null && m.longitude != null)
    .map((m) => ({
      latitude: m.latitude!,
      longitude: m.longitude!,
      label: m.displayName,
    }));

  const embedUrl = getGoogleMapsEmbedUrl(coords);
  if (!embedUrl || Platform.OS !== 'web') return null;

  return createElement('iframe', {
    title: 'Family locations on Google Maps',
    src: embedUrl,
    width: '100%',
    height,
    style: { border: 0, borderRadius: borderRadius.lg, display: 'block' },
    loading: 'lazy',
    referrerPolicy: 'no-referrer-when-downgrade',
    allowFullScreen: true,
  });
}

interface FamilyLocationMapProps {
  members: MemberLocationEntry[];
  height?: number;
  onToggleSharing?: (enabled: boolean) => void;
}

export function FamilyLocationMap({ members, height = 240, onToggleSharing }: FamilyLocationMapProps) {
  const theme = useTheme();
  const { contentMaxWidth, horizontalPadding } = useResponsive();
  const mapWidth = Math.min(contentMaxWidth - horizontalPadding * 2, 640);
  const points = useMemo(() => projectPoints(members, mapWidth, height), [members, height, mapWidth]);
  const visibleMembers = members.filter((m) => m.latitude != null && m.longitude != null);
  const visibleCount = visibleMembers.length;
  const mapCoords = visibleMembers.map((m) => ({
    latitude: m.latitude!,
    longitude: m.longitude!,
    label: m.displayName,
  }));
  const externalMapUrl = getGoogleMapsExternalUrl(mapCoords);

  if (visibleCount === 0) {
    return (
      <View style={[styles.emptyMap, { height, borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}>
        <Ionicons name="map-outline" size={36} color={theme.primary} />
        <Text style={[styles.emptyText, { color: theme.text }]}>
          No shared locations visible yet
        </Text>
        <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
          Turn on location sharing to see where your family is on the map.
        </Text>
        {onToggleSharing && (
          <Pressable
            style={[styles.enableShareBtn, { backgroundColor: authColors.primary }]}
            onPress={() => onToggleSharing(true)}
          >
            <Ionicons name="location" size={16} color="#FFF" />
            <Text style={styles.enableShareBtnText}>Share My Location Now</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const openAllInMaps = () => {
    if (visibleCount === 1) {
      const m = visibleMembers[0];
      promptMapsAction(m.latitude!, m.longitude!, m.displayName);
      return;
    }
    if (externalMapUrl) {
      void Linking.openURL(externalMapUrl);
    }
  };

  return (
    <View style={[styles.mapCard, { borderColor: '#BFDBFE', backgroundColor: theme.surface }]}>
      <View style={styles.mapHeader}>
        <View style={styles.mapHeaderLeft}>
          <Ionicons name="map" size={18} color={authColors.primary} />
          <Text style={[styles.mapHeaderTitle, { color: theme.text }]}>Google Maps</Text>
        </View>
        <Text style={[styles.mapHeaderSub, { color: theme.textSecondary }]}>
          {visibleCount} sharing
        </Text>
      </View>

      {Platform.OS === 'web' ? (
        <WebMapEmbed members={members} height={height} />
      ) : (
        <Pressable
          style={[styles.mapCanvas, { height, backgroundColor: '#E8F0FE' }]}
          onPress={openAllInMaps}
        >
          {points.map(({ member, x, y }) => {
            const auraMeta = getAuraMeta(member.aura);
            return (
              <Pressable
                key={member.userId}
                style={[
                  styles.pinWrap,
                  { left: x - 18, top: y - 36 },
                ]}
                onPress={() =>
                  promptMapsAction(member.latitude!, member.longitude!, member.displayName)
                }
                hitSlop={8}
              >
                <View
                  style={[
                    styles.pinBubble,
                    { backgroundColor: auraMeta?.accent ?? authColors.primary },
                  ]}
                >
                  <Ionicons name="person" size={12} color="#FFF" />
                </View>
                <View style={styles.pinTail} />
              </Pressable>
            );
          })}
          <View style={styles.mapOverlay}>
            <Ionicons name="map" size={16} color={authColors.primary} />
            <Text style={[styles.mapOverlayText, { color: authColors.primaryDark }]}>
              Tap a pin for directions
            </Text>
          </View>
        </Pressable>
      )}

      <View style={styles.mapActions}>
        {visibleCount === 1 ? (
          <>
            <Pressable
              style={[styles.mapActionBtn, styles.mapActionOutline, { borderColor: authColors.primary }]}
              onPress={() => {
                const m = visibleMembers[0];
                void openGoogleMapsView(m.latitude!, m.longitude!, m.displayName);
              }}
            >
              <Ionicons name="location-outline" size={16} color={authColors.primary} />
              <Text style={[styles.mapActionText, { color: authColors.primary }]}>View on map</Text>
            </Pressable>
            <Pressable
              style={[styles.mapActionBtn, { backgroundColor: authColors.primary }]}
              onPress={() => {
                const m = visibleMembers[0];
                void openGoogleMapsDirections(m.latitude!, m.longitude!, m.displayName);
              }}
            >
              <Ionicons name="navigate" size={16} color="#FFF" />
              <Text style={[styles.mapActionText, { color: '#FFF' }]}>Get directions</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[styles.mapActionBtn, { backgroundColor: authColors.primary, flex: 1 }]}
            onPress={openAllInMaps}
          >
            <Ionicons name="navigate" size={16} color="#FFF" />
            <Text style={[styles.mapActionText, { color: '#FFF' }]}>Open in Google Maps</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

interface FamilyLocationListProps {
  members: MemberLocationEntry[];
  currentUserId?: string;
  onToggleSharing?: (enabled: boolean) => void;
  onRefreshLocation?: () => void;
  updatingSharing?: boolean;
  refreshingLocation?: boolean;
}

export function FamilyLocationList({
  members,
  currentUserId,
  onToggleSharing,
  onRefreshLocation,
  updatingSharing,
  refreshingLocation,
}: FamilyLocationListProps) {
  const theme = useTheme();

  return (
    <View style={styles.list}>
      {members.map((member) => {
        const isMe = member.userId === currentUserId;
        const hasLocation = member.latitude != null && member.longitude != null;
        const subtitle = !member.sharingEnabled
          ? 'Location sharing off'
          : hasLocation
            ? member.locationName ?? `${member.latitude!.toFixed(4)}, ${member.longitude!.toFixed(4)}`
            : 'Waiting for GPS fix...';

        return (
          <View
            key={member.userId}
            style={[
              styles.row,
              {
                borderBottomColor: theme.borderLight,
                backgroundColor: isMe ? authColors.primary + '0D' : 'transparent',
                paddingHorizontal: isMe ? spacing.sm : 0,
                borderRadius: isMe ? borderRadius.lg : 0,
              },
            ]}
          >
            <AvatarRing uri={member.avatarUrl} name={member.displayName} size={40} aura={member.aura} />
            <View style={styles.meta}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.name, { color: theme.text }]}>
                  {member.displayName}
                  {isMe ? ' (you)' : ''}
                </Text>
                {member.sharingEnabled ? (
                  <View style={[styles.statusBadge, { backgroundColor: theme.success + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: theme.success }]}>Live</Text>
                  </View>
                ) : null}
              </View>
              {member.aura ? (
                <View style={styles.auraWrap}>
                  <AuraBadge aura={member.aura} size="sm" />
                </View>
              ) : null}
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={2}>
                {subtitle}
              </Text>
              {hasLocation && member.updatedAt && (
                <Text style={[styles.updated, { color: theme.textTertiary }]}>
                  Updated {formatUpdatedAt(member.updatedAt)}
                </Text>
              )}
            </View>

            {/* If other member with location */}
            {hasLocation && !isMe && (
              <View style={styles.actionCol}>
                <Pressable
                  style={[styles.directionsBtn, { backgroundColor: authColors.primary }]}
                  onPress={() =>
                    void openGoogleMapsDirections(
                      member.latitude!,
                      member.longitude!,
                      member.displayName
                    )
                  }
                >
                  <Ionicons name="navigate" size={14} color="#FFF" />
                  <Text style={styles.directionsText}>Go</Text>
                </Pressable>
                <Pressable
                  style={[styles.viewMapBtn, { borderColor: '#BFDBFE' }]}
                  onPress={() =>
                    void openGoogleMapsView(member.latitude!, member.longitude!, member.displayName)
                  }
                  hitSlop={4}
                >
                  <Ionicons name="map-outline" size={14} color={authColors.primary} />
                </Pressable>
              </View>
            )}

            {/* If Current User */}
            {isMe && (
              <View style={styles.myActionRow}>
                {member.sharingEnabled && onRefreshLocation && (
                  <Pressable
                    style={[styles.gpsRefreshBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                    onPress={onRefreshLocation}
                    disabled={refreshingLocation}
                  >
                    {refreshingLocation ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons name="refresh" size={16} color={theme.primary} />
                    )}
                  </Pressable>
                )}
                {onToggleSharing && (
                  <Pressable
                    onPress={() => onToggleSharing(!member.sharingEnabled)}
                    style={[
                      styles.toggleSharingBtn,
                      {
                        backgroundColor: member.sharingEnabled ? theme.success : theme.primary,
                      },
                    ]}
                    disabled={updatingSharing}
                  >
                    {updatingSharing ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.toggleSharingBtnText}>
                        {member.sharingEnabled ? 'Sharing ON' : 'Turn On'}
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mapHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  mapHeaderTitle: { ...typography.caption, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  mapHeaderSub: { ...typography.micro, textTransform: 'none', letterSpacing: 0 },
  mapCanvas: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  pinWrap: { position: 'absolute', alignItems: 'center' },
  pinBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: authColors.primary,
    marginTop: -1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  mapOverlayText: { ...typography.caption, fontWeight: '600', textTransform: 'none', letterSpacing: 0 },
  mapActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  mapActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  mapActionOutline: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
  },
  mapActionText: { ...typography.caption, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  emptyMap: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  emptyText: { ...typography.caption, textAlign: 'center', textTransform: 'none', letterSpacing: 0 },
  list: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  meta: { flex: 1 },
  name: { ...typography.body, fontWeight: '600', fontSize: 14 },
  auraWrap: { marginTop: 4, marginBottom: 2 },
  subtitle: { ...typography.caption, marginTop: 2, textTransform: 'none', letterSpacing: 0 },
  updated: { ...typography.micro, textTransform: 'none', letterSpacing: 0, marginTop: 2 },
  actionCol: { alignItems: 'center', gap: spacing.xs },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    minWidth: 56,
    justifyContent: 'center',
  },
  directionsText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  viewMapBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  emptySubText: { ...typography.micro, textAlign: 'center', color: '#64748B', maxWidth: 280 },
  enableShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  enableShareBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: { ...typography.micro, fontWeight: '700', fontSize: 10, textTransform: 'uppercase' },
  myActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gpsRefreshBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleSharingBtn: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleSharingBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
