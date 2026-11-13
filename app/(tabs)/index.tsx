import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorNotice, LocalNotice, NeonButton, Page } from '@/components/CrashPadUI';
import { useCrashPad, type ChatMessage, type PendingChatReply } from '@/data/CrashPadContext';
import { buildSystemPrompt, requestChatCompletion } from '@/services/chatCompletion';
import { useColors } from '@/hooks/useColors';

function MessageBubble({
  message,
  onDelete,
}: {
  message: ChatMessage;
  onDelete: (message: ChatMessage) => void;
}) {
  const colors = useColors();
  const mine = message.role === 'user';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Delete ${mine ? 'your' : 'Leo’s'} message`}
      onLongPress={() => onDelete(message)}
      style={[styles.messageWrap, { alignSelf: mine ? 'flex-end' : 'flex-start' }]}
      testID={`message-${message.id}`}
    >
      <Text style={[styles.speaker, { color: mine ? colors.cyan : colors.pink }]}>
        {mine ? 'YOU' : 'LEO'} · {new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </Text>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: mine ? colors.surfaceRaised : '#28212F',
            borderColor: mine ? colors.cyan : colors.purple,
          },
        ]}
      >
        <Text selectable style={[styles.messageText, { color: colors.foreground }]}>{message.text}</Text>
      </View>
    </Pressable>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    data,
    isLoading,
    error,
    credentialError,
    apiKey,
    hasApiKey,
    secureStorageAvailable,
    addMessage,
    pendingReply,
    savePendingReply,
    clearPendingReply,
    deleteMessage,
    memoryMachineUrl,
    hasMemoryMachineToken,
    memoryMachineError,
    loadRecentMemoryContext,
    searchMemoryMachine,
  } = useCrashPad();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [recentMemoryContext, setRecentMemoryContext] = useState('');
  const [loadingRemoteMemory, setLoadingRemoteMemory] = useState(false);
  const [volatilePendingReply, setVolatilePendingReply] = useState<PendingChatReply | null>(null);
  const [retryingReply, setRetryingReply] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const listData = useMemo(() => [...data.messages].reverse(), [data.messages]);
  const linked = secureStorageAvailable && hasApiKey && Boolean(data.provider.model.trim());
  const replyWaitingToSave = pendingReply ?? volatilePendingReply;

  useEffect(() => {
    if (isLoading || !memoryMachineUrl || !hasMemoryMachineToken) {
      setRecentMemoryContext('');
      setLoadingRemoteMemory(false);
      return;
    }
    let active = true;
    setLoadingRemoteMemory(true);
    loadRecentMemoryContext()
      .then((context) => {
        if (active) setRecentMemoryContext(context);
      })
      .catch(() => {
        if (active) setRecentMemoryContext('');
      })
      .finally(() => {
        if (active) setLoadingRemoteMemory(false);
      });
    return () => { active = false; };
  }, [isLoading, memoryMachineUrl, hasMemoryMachineToken, loadRecentMemoryContext]);

  const confirmDelete = (message: ChatMessage) =>
    Alert.alert('Remove this message?', 'This removes it from the saved thread on this device.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove', onPress: () => void deleteMessage(message.id) },
    ]);

  const send = async () => {
    const content = draft.trim();
    if (!content || busy || isLoading) return;
    if (replyWaitingToSave) return;
    if (!linked) return;

    Keyboard.dismiss();
    setBusy(true);
    setRequestError('');
    const localSave = await addMessage('user', content);
    if (!localSave) {
      setBusy(false);
      return;
    }
    setDraft('');

    const outgoing: ChatMessage = {
      id: 'outgoing-current-turn',
      role: 'user',
      text: content,
      createdAt: new Date().toISOString(),
    };
    try {
      let memorySearchContext = '';
      const asksForMemory = /\b(remember|memory|memories|recall|when did we|what did we)\b/i.test(content);
      if (asksForMemory && memoryMachineUrl && hasMemoryMachineToken) {
        try {
          memorySearchContext = await searchMemoryMachine(content);
        } catch {
          // The connection error is surfaced in the Memory Machine status notice.
        }
      }
      const modelContext = [recentMemoryContext, memorySearchContext]
        .filter(Boolean)
        .join('\n\n--- Memory search results ---\n\n');
      const reply = await requestChatCompletion({
        apiBase: data.provider.apiBase,
        model: data.provider.model,
        apiKey,
        systemPrompt: buildSystemPrompt(data, modelContext),
        messages: [...data.messages, outgoing],
      });
      const replyId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const replyCreatedAt = new Date().toISOString();
      const savedReply = await addMessage('leo', reply, replyId, replyCreatedAt);
      if (savedReply) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const pending = { id: replyId, text: reply, createdAt: replyCreatedAt };
        if (!await savePendingReply(pending)) setVolatilePendingReply(pending);
      }
    } catch (cause) {
      setRequestError(cause instanceof Error ? cause.message : 'The model request failed.');
    } finally {
      setBusy(false);
    }
  };

  const retrySavingReply = async () => {
    if (!replyWaitingToSave || retryingReply) return;
    setRetryingReply(true);
    const saved = await addMessage(
      'leo',
      replyWaitingToSave.text,
      replyWaitingToSave.id,
      replyWaitingToSave.createdAt,
    );
    if (saved) {
      if (pendingReply) await clearPendingReply();
      else setVolatilePendingReply(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setRetryingReply(false);
  };

  return (
    <Page>
      <View style={styles.topbar}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.gold }]}>SAFEHOUSE // PERSONAL BUILD</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Leo's CrAIsh Pad</Text>
        </View>
        <View style={[styles.status, { borderColor: linked ? colors.cyan : colors.gold }]}>
          <View style={[styles.dot, { backgroundColor: linked ? colors.cyan : colors.gold }]} />
          <Text style={[styles.statusText, { color: linked ? colors.cyan : colors.gold }]}>
            {linked ? 'LINK READY' : 'SETUP'}
          </Text>
        </View>
      </View>

      <View style={styles.noticeWrap}>
        <LocalNotice>
          One saved thread, available when you reopen the app. Replies come from the model you connect; this app cannot keep a model running in the background.
        </LocalNotice>
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}
        {credentialError ? <ErrorNotice>{credentialError}</ErrorNotice> : null}
        {requestError ? <ErrorNotice>{requestError}</ErrorNotice> : null}
        {memoryMachineError ? <ErrorNotice>Memory Machine: {memoryMachineError}</ErrorNotice> : null}
        {loadingRemoteMemory ? (
          <LocalNotice>Loading recent conversation context from Memory Machine…</LocalNotice>
        ) : null}
        {replyWaitingToSave ? (
          <View style={[styles.pendingReply, { borderColor: colors.gold, backgroundColor: colors.surfaceRaised }]}>
            <Text style={[styles.pendingLabel, { color: colors.gold }]}>REPLY WAITING TO SAVE</Text>
            <Text selectable style={[styles.pendingText, { color: colors.foreground }]}>{replyWaitingToSave.text}</Text>
            <NeonButton
              label={retryingReply ? 'Saving reply…' : 'Retry saving reply'}
              icon="save-outline"
              color="gold"
              onPress={() => void retrySavingReply()}
              disabled={retryingReply}
            />
          </View>
        ) : null}
      </View>

      <KeyboardAvoidingView style={styles.chatArea} behavior="padding" keyboardVerticalOffset={0}>
        {isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.gold} />
            <Text style={[styles.emptyDetail, { color: colors.mutedForeground }]}>Loading the saved thread…</Text>
          </View>
        ) : data.messages.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyMark, { borderColor: colors.purple }]}>
              <Ionicons name="radio-outline" size={28} color={colors.purple} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>The thread is ready.</Text>
            <Text style={[styles.emptyDetail, { color: colors.mutedForeground }]}>
              Connect a model in Link, then the conversation and persona will be sent together on each turn.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={listData}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} onDelete={confirmDelete} />}
            contentContainerStyle={styles.messageList}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={listData.length > 0}
            testID="list-thread"
          />
        )}

        {busy ? (
          <View style={[styles.thinking, { borderColor: colors.border }]}>
            <ActivityIndicator color={colors.purple} size="small" />
            <Text style={[styles.thinkingText, { color: colors.purple }]}>Leo is replying…</Text>
          </View>
        ) : null}

        {!linked ? (
          <View style={[styles.linkPrompt, { borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.gold} />
            <Text style={[styles.linkPromptText, { color: colors.mutedForeground }]}>
              Add an API key securely and choose a model in the Link tab to send messages.
            </Text>
          </View>
        ) : null}

        <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.surfaceDeep, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Text style={[styles.composerLabel, { color: colors.mutedForeground }]}>SINGLE CONTINUOUS THREAD</Text>
          <View style={[styles.inputShell, { borderColor: colors.input, backgroundColor: colors.card }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={linked ? `Message ${data.persona.name || 'Leo'}…` : 'Set up the model link first…'}
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={4000}
              editable={!busy && !isLoading && linked && !replyWaitingToSave}
              style={[styles.input, { color: colors.foreground }]}
              returnKeyType="default"
              testID="input-chat-message"
              accessibilityLabel="Message Leo"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: !draft.trim() || !linked || busy }}
              disabled={!draft.trim() || !linked || busy || isLoading || Boolean(replyWaitingToSave)}
              onPress={() => void send()}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: colors.purple,
                  opacity: !draft.trim() || !linked || replyWaitingToSave ? 0.4 : pressed ? 0.75 : 1,
                },
              ]}
              testID="button-send-message"
            >
              <Ionicons name="arrow-up" size={20} color={colors.primaryForeground} />
            </Pressable>
          </View>
          <Text style={[styles.inputHint, { color: colors.mutedForeground }]}>
            Sends persona, memories, saved notes and the latest 30 messages to your chosen endpoint.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Page>
  );
}

const styles = StyleSheet.create({
  topbar: {
    paddingHorizontal: 21,
    paddingTop: 9,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1.7, marginBottom: 6 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 23, letterSpacing: -0.5 },
  status: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2 },
  noticeWrap: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  pendingReply: { marginHorizontal: 14, marginBottom: 8, padding: 11, borderWidth: 1, borderRadius: 13, gap: 8 },
  pendingLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2 },
  pendingText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, maxHeight: 140 },
  chatArea: { flex: 1 },
  messageList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, gap: 12 },
  messageWrap: { maxWidth: '88%', marginVertical: 6 },
  speaker: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1, marginBottom: 5, paddingHorizontal: 3 },
  bubble: { borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 11 },
  messageText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 38, gap: 10 },
  emptyMark: { width: 58, height: 58, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, textAlign: 'center' },
  emptyDetail: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  thinking: { marginHorizontal: 18, marginBottom: 7, borderTopWidth: 1, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  linkPrompt: { marginHorizontal: 15, marginBottom: 7, borderWidth: 1, borderRadius: 11, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkPromptText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  composer: { paddingHorizontal: 15, paddingTop: 12, borderTopWidth: 1, gap: 9 },
  composerLabel: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1 },
  inputShell: { minHeight: 48, borderWidth: 1, borderRadius: 17, flexDirection: 'row', alignItems: 'flex-end', padding: 5, gap: 5 },
  input: { flex: 1, minHeight: 38, maxHeight: 110, paddingHorizontal: 11, paddingTop: 9, paddingBottom: 8, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 19 },
  sendButton: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  inputHint: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 8, lineHeight: 12, paddingLeft: 3 },
});
