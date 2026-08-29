import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useFamilyStore, useAuthStore } from '../../store';
import { spacing, borderRadius, typography } from '../../theme';
import { ScreenHeader } from '../../components';
import { fetchAssistantHistory, sendAssistantMessage } from '../../services/family.service';

export function AssistantScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const family = useFamilyStore((s) => s.currentFamily);
  const user = useAuthStore((s) => s.user);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['assistant', family?.id],
    queryFn: () => fetchAssistantHistory(family!.id),
    enabled: !!family?.id,
  });

  const mutation = useMutation({
    mutationFn: (message: string) => sendAssistantMessage(family!.id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant', family?.id] });
    },
  });

  const handleSend = () => {
    if (!inputText.trim() || mutation.isPending) return;
    mutation.mutate(inputText.trim());
    setInputText('');
  };

  if (!family?.id) return null;

  const messages = [...history];
  if (mutation.isPending) {
    messages.push({ role: 'user', content: inputText });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScreenHeader title="Family Assistant" onBack={() => navigation.goBack()} />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isUser = item.role === 'user';
              return (
                <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble, { backgroundColor: isUser ? theme.primary : theme.surfaceSecondary }]}>
                  <Text style={[styles.messageText, { color: isUser ? '#FFF' : theme.text }]}>
                    {item.content}
                  </Text>
                </View>
              );
            }}
          />
        )}
        
        {mutation.isPending && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={{ color: theme.textSecondary, marginLeft: 8 }}>Thinking...</Text>
          </View>
        )}

        <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
            placeholder="Ask about memories, games, or schedule..."
            placeholderTextColor={theme.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <Pressable 
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? theme.primary : theme.surfaceSecondary }]}
            onPress={handleSend}
            disabled={!inputText.trim() || mutation.isPending}
          >
            <Ionicons name="arrow-up" size={20} color={inputText.trim() ? '#FFF' : theme.textTertiary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  messageBubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...typography.body,
    lineHeight: 22,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    ...typography.body,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
