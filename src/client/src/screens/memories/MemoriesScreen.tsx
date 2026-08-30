import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { useAuthStore, useFamilyStore } from '../../store';
import { spacing, borderRadius, typography } from '../../theme';
import { AvatarRing, PostCard, EmptyState, ScreenHeader, ResponsiveContainer } from '../../components';
import {
  fetchPosts,
  fetchStories,
  createPost,
  uploadImage,
  reactToPost,
  addPostComment,
  resolveMediaUrl,
} from '../../services/family.service';
import { Post } from '../../types';

export function MemoriesScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { contentMaxWidth, isWide, isMedium } = useResponsive();
  const family = useFamilyStore((s) => s.currentFamily);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const [composerOpen, setComposerOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Comments State
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const familyId = family?.id;

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts', familyId],
    queryFn: () => fetchPosts(familyId!),
    enabled: !!familyId,
  });

  const { data: stories = [] } = useQuery({
    queryKey: ['stories', familyId],
    queryFn: () => fetchStories(familyId!),
    enabled: !!familyId,
  });

  const posts = (postsData?.data ?? []).map((p) => ({
    ...p,
    authorAvatar: resolveMediaUrl(p.authorAvatar),
    mediaUrls: p.mediaUrls.map((u) => resolveMediaUrl(u) ?? u),
  }));

  const openComposer = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo library access to create posts.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setPreviewUri(result.assets[0].uri);
      setComposerOpen(true);
    }
  };

  const publishPost = async () => {
    if (!familyId) {
      Alert.alert('No family', 'Join or create a family before sharing a post.');
      return;
    }
    if (!token) {
      Alert.alert('Session expired', 'Please log in again.');
      return;
    }
    if (!previewUri) {
      Alert.alert('No photo selected', 'Please pick a photo first.');
      return;
    }
    if (uploading) return;

    setUploading(true);
    try {
      const url = await uploadImage(previewUri, token);
      await createPost(familyId, {
        caption: caption.trim() || undefined,
        mediaUrls: [url],
        mediaType: 'photo',
      });
      setCaption('');
      setPreviewUri(null);
      setComposerOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['posts', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['home', familyId] });
    } catch (error) {
      Alert.alert('Could not publish', error instanceof Error ? error.message : 'Try again');
    } finally {
      setUploading(false);
    }
  };

  const handleReact = async (postId: string) => {
    if (!familyId) return;
    try {
      await reactToPost(familyId, postId, 'loved');
      await queryClient.invalidateQueries({ queryKey: ['posts', familyId] });
    } catch {
      // silent fail for likes
    }
  };

  const handleOpenComments = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setSelectedPostForComments(post);
    }
  };

  const handleSendComment = async () => {
    if (!familyId || !selectedPostForComments || !newCommentText.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const addedComment = await addPostComment(
        familyId,
        selectedPostForComments.id,
        newCommentText.trim()
      );

      // Update local comments in view
      setSelectedPostForComments((prev) =>
        prev
          ? {
              ...prev,
              comments: [...(prev.comments || []), addedComment],
              commentCount: (prev.commentCount || 0) + 1,
            }
          : null
      );

      setNewCommentText('');
      await queryClient.invalidateQueries({ queryKey: ['posts', familyId] });
    } catch (error) {
      Alert.alert('Error', 'Could not post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const numColumns = isWide ? 4 : isMedium ? 3 : 2;
  const activePost = selectedPostForComments
    ? posts.find((p) => p.id === selectedPostForComments.id) || selectedPostForComments
    : null;
  const currentComments = activePost?.comments ?? [];

  if (!familyId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <EmptyState
          iconName="people-outline"
          title="Join a family"
          message="Create or join a family to view and share posts."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ResponsiveContainer style={{ paddingHorizontal: 0 }}>
        <ScreenHeader
          title="Feed"
          subtitle={family.name}
          rightAction={{ label: 'New', onPress: openComposer, icon: 'add' }}
        />
      </ResponsiveContainer>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <View style={styles.feedWrapper}>
          <View style={[styles.feedContainer, { maxWidth: contentMaxWidth }]}>
            <FlatList
              data={posts}
              key={numColumns}
              keyExtractor={(item) => item.id}
              numColumns={numColumns}
              columnWrapperStyle={styles.pinRow}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.pinGrid, posts.length === 0 && styles.emptyList]}
              ListHeaderComponent={
                stories.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={[styles.storiesBar, { borderBottomColor: theme.border }]}
                    contentContainerStyle={styles.storiesContent}
                  >
                    <Pressable style={styles.storyItem} onPress={openComposer}>
                      <View style={[styles.addStoryRing, { borderColor: theme.pin }]}>
                        <Ionicons name="add" size={22} color={theme.pin} />
                      </View>
                      <Text style={[styles.storyLabel, { color: theme.textSecondary }]}>New post</Text>
                    </Pressable>
                    {stories.map((story) => (
                      <View key={story.id} style={styles.storyItem}>
                        <AvatarRing
                          uri={resolveMediaUrl(story.authorAvatar)}
                          name={story.authorName}
                          size={58}
                          isActive
                        />
                        <Text style={[styles.storyLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                          {story.authorName.split(' ')[0]}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : null
              }
              ListEmptyComponent={
                <EmptyState
                  iconName="image-outline"
                  title="No posts yet"
                  message="Share your first photo with your family."
                  actionLabel="Create Post"
                  onAction={openComposer}
                />
              }
              renderItem={({ item }) => {
                const gap = spacing.sm;
                const containerWidth = Math.min(
                  contentMaxWidth,
                  Platform.OS === 'web' ? window.innerWidth || 800 : 400
                );
                const colWidth = Math.min(
                  (containerWidth - spacing.md * 2 - gap * (numColumns - 1)) / numColumns,
                  280
                );
                return (
                  <PostCard
                    post={item}
                    width={colWidth}
                    onReact={handleReact}
                    onComment={handleOpenComments}
                  />
                );
              }}
            />
          </View>
        </View>
      )}

      {/* Upload Composer Modal */}
      <Modal visible={composerOpen} animationType="slide" onRequestClose={() => setComposerOpen(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.background }]}>
          <ResponsiveContainer style={{ maxWidth: 640 }}>
            <ScreenHeader
              title="New Post"
              onBack={() => {
                setComposerOpen(false);
                setPreviewUri(null);
                setCaption('');
              }}
              rightAction={{
                label: 'Share',
                onPress: publishPost,
                disabled: uploading,
                loading: uploading,
              }}
            />
            <ScrollView contentContainerStyle={styles.composerBody}>
              {previewUri && (
                <View style={[styles.previewFrame, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                  <Image source={{ uri: previewUri }} style={styles.preview} contentFit="contain" />
                </View>
              )}
              <View style={styles.composerMeta}>
                <AvatarRing uri={user?.avatarUrl} name={user?.displayName ?? 'You'} size={40} />
                <TextInput
                  style={[styles.captionInput, { color: theme.text }]}
                  placeholder="Write a caption..."
                  placeholderTextColor={theme.textTertiary}
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                />
              </View>
            </ScrollView>
          </ResponsiveContainer>
        </SafeAreaView>
      </Modal>

      {/* Comments Bottom Sheet / Modal */}
      <Modal
        visible={!!selectedPostForComments}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedPostForComments(null)}
      >
        <View style={styles.commentsOverlay}>
          <Pressable style={styles.commentsBackdrop} onPress={() => setSelectedPostForComments(null)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[
              styles.commentsSheet,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={[styles.commentsHeader, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.commentsTitle, { color: theme.text }]}>Comments</Text>
              <Pressable onPress={() => setSelectedPostForComments(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            {activePost && (
              <View style={[styles.postSnippet, { backgroundColor: theme.surfaceSecondary }]}>
                <AvatarRing uri={activePost.authorAvatar} name={activePost.authorName} size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.snippetAuthor, { color: theme.text }]}>
                    {activePost.authorName}
                  </Text>
                  {activePost.caption ? (
                    <Text style={[styles.snippetCaption, { color: theme.textSecondary }]} numberOfLines={2}>
                      {activePost.caption}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}

            <ScrollView style={styles.commentsList} contentContainerStyle={styles.commentsListContent}>
              {currentComments.length === 0 ? (
                <View style={styles.emptyComments}>
                  <Ionicons name="chatbubbles-outline" size={36} color={theme.textTertiary} />
                  <Text style={[styles.emptyCommentsText, { color: theme.textSecondary }]}>
                    No comments yet. Say something nice!
                  </Text>
                </View>
              ) : (
                currentComments.map((c) => (
                  <View key={c.id || Math.random().toString()} style={styles.commentItem}>
                    <AvatarRing uri={resolveMediaUrl(c.userAvatar)} name={c.userName} size={32} />
                    <View style={styles.commentContent}>
                      <View style={styles.commentMetaRow}>
                        <Text style={[styles.commentAuthor, { color: theme.text }]}>{c.userName}</Text>
                        <Text style={[styles.commentTime, { color: theme.textTertiary }]}>
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Text style={[styles.commentText, { color: theme.text }]}>{c.text}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Sticky Input Bar */}
            <View style={[styles.commentInputBar, { borderTopColor: theme.borderLight, backgroundColor: theme.surface }]}>
              <AvatarRing uri={user?.avatarUrl} name={user?.displayName ?? 'You'} size={32} />
              <TextInput
                style={[
                  styles.commentInput,
                  { color: theme.text, backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
                ]}
                placeholder="Add a comment..."
                placeholderTextColor={theme.textTertiary}
                value={newCommentText}
                onChangeText={setNewCommentText}
                onSubmitEditing={handleSendComment}
                returnKeyType="send"
              />
              <Pressable
                onPress={handleSendComment}
                style={[
                  styles.sendBtn,
                  { backgroundColor: newCommentText.trim() ? theme.primary : theme.border },
                ]}
                disabled={!newCommentText.trim() || submittingComment}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="arrow-up" size={18} color="#FFF" />
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyList: { flexGrow: 1 },
  feedWrapper: { flex: 1, alignItems: 'center', width: '100%' },
  feedContainer: { flex: 1, width: '100%' },
  pinGrid: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  pinRow: { gap: spacing.sm, justifyContent: 'flex-start' },
  storiesBar: {
    marginBottom: spacing.sm,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  storiesContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  storyItem: { alignItems: 'center', width: 72 },
  addStoryRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyLabel: { ...typography.micro, textTransform: 'none', letterSpacing: 0, marginTop: spacing.xs, textAlign: 'center' },
  modal: { flex: 1 },
  composerBody: { padding: spacing.md },
  previewFrame: {
    width: '100%',
    height: 260,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  composerMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  captionInput: {
    flex: 1,
    ...typography.body,
    minHeight: 80,
    paddingTop: spacing.xs,
  },
  commentsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  commentsBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  commentsSheet: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    minHeight: 380,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
  },
  commentsTitle: {
    ...typography.title,
    fontSize: 16,
  },
  postSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  snippetAuthor: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 13,
  },
  snippetCaption: {
    ...typography.micro,
    fontSize: 12,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyCommentsText: {
    ...typography.caption,
    textAlign: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  commentContent: {
    flex: 1,
    gap: 2,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentAuthor: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 13,
  },
  commentTime: {
    ...typography.micro,
    fontSize: 10,
  },
  commentText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 18,
  },
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    height: 38,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    ...typography.body,
    fontSize: 14,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
