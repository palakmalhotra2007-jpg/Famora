import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeStore, useAuthStore } from '../store';
import { colors, spacing, typography, borderRadius } from '../theme';
import { pinCardShell } from '../theme/pin';
import { Post } from '../types';

interface PostCardProps {
  post: Post;
  width: number;
  imageHeight?: number;
  onReact?: (postId: string, type: string) => void;
  onComment?: (postId: string) => void;
}

export function PostCard({ post, width, imageHeight, onReact, onComment }: PostCardProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = colors[mode];
  const userId = useAuthStore((s) => s.user?.id);
  const userReaction = post.reactions?.find((r) => r.userId === userId)?.type;
  const [liked, setLiked] = useState(userReaction === 'loved');
  const [saved, setSaved] = useState(false);
  const likeCount = post.reactions?.length ?? 0;
  const imgHeight = Math.min(imageHeight ?? width * 1.15, 260);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!liked) {
      setLiked(true);
      onReact?.(post.id, 'loved');
    }
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaved((s) => !s);
  };

  return (
    <Pressable
      onPress={() => onComment?.(post.id)}
      style={({ pressed }) => [
        styles.card,
        pinCardShell(mode, pressed),
        { width, borderColor: theme.border },
      ]}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: post.mediaUrls[0] }}
          style={[styles.image, { height: imgHeight }]}
          contentFit="cover"
          transition={200}
        />
        <Pressable style={styles.saveBtn} onPress={handleSave} hitSlop={8}>
          <View style={[styles.saveBubble, saved && { backgroundColor: theme.pin }]}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={saved ? '#FFF' : theme.text}
            />
          </View>
        </Pressable>
      </View>

      <View style={styles.body}>
        {post.caption ? (
          <Text style={[styles.pinTitle, { color: theme.text }]} numberOfLines={2}>
            {post.caption}
          </Text>
        ) : (
          <Text style={[styles.pinTitle, { color: theme.textSecondary }]} numberOfLines={1}>
            Photo by {post.authorName}
          </Text>
        )}

        <View style={styles.metaRow}>
          <Text style={[styles.author, { color: theme.textSecondary }]} numberOfLines={1}>
            {post.authorName}
          </Text>
          <View style={styles.actions}>
            <Pressable onPress={handleLike} hitSlop={6} style={styles.iconBtn}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={16}
                color={liked ? theme.pin : theme.textSecondary}
              />
            </Pressable>
            {(likeCount > 0 || liked) && (
              <Text style={[styles.likeCount, { color: theme.textSecondary }]}>
                {likeCount + (liked && !userReaction ? 1 : 0)}
              </Text>
            )}
            <Pressable onPress={() => onComment?.(post.id)} hitSlop={6} style={styles.iconBtn}>
              <Ionicons name="chatbubble-outline" size={15} color={theme.textSecondary} />
            </Pressable>
            {post.commentCount > 0 && (
              <Text style={[styles.likeCount, { color: theme.textSecondary }]}>
                {post.commentCount}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.pin,
    overflow: 'hidden',
  },
  imageWrap: { position: 'relative' },
  image: {
    width: '100%',
  },
  saveBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  saveBubble: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  pinTitle: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  author: { ...typography.micro, textTransform: 'none', letterSpacing: 0, flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { padding: 4 },
  likeCount: { ...typography.micro, textTransform: 'none', letterSpacing: 0, fontSize: 11 },
});
