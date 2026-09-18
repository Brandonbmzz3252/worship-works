import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchField } from '@/components/ui/search-field';
import { BrandBackdrop } from '@/components/brand-backdrop';
import { useBrand, type BrandPalette } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { formatChatTime, formatFileSize } from '@/lib/format';
import {
  deleteChatMessage,
  recordView,
  sendMessage,
  subscribeMessages,
  uploadChatFile,
} from '@/lib/store';
import type { ChatMessage } from '@/lib/types';
import { friendlyError } from '@/lib/errors';

const URL_PATTERN = /(https?:\/\/[^\s<>]+)/;

function fileKindIcon(name?: string): keyof typeof Ionicons.glyphMap {
  const lower = (name || '').toLowerCase();
  if (/(mp4|mov|m4v|webm|avi|mkv)$/.test(lower)) return 'videocam';
  if (/(mp3|wav|m4a|aac|ogg|flac)$/.test(lower)) return 'musical-note';
  if (/(png|jpe?g|gif|webp|heic?)$/.test(lower)) return 'image';
  if (lower.endsWith('pdf')) return 'document-text';
  return 'attach';
}

async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open link', url);
  }
}

function MessageText({ text, mine }: { text: string; mine: boolean }) {
  const brand = useBrand();
  const styles = useMemo(() => makeStyles(brand), [brand]);
  const parts = text.split(URL_PATTERN);
  return (
    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
      {parts.map((part, index) =>
        URL_PATTERN.test(part) ? (
          <Text
            key={index}
            suppressHighlighting
            style={[styles.link, mine ? styles.linkMine : styles.linkOther]}
            onPress={() => openUrl(part)}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

export default function ChatTab() {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const brand = useBrand();
  const styles = useMemo(() => makeStyles(brand), [brand]);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [kbHeight, setKbHeight] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const churchId = profile?.churchId ?? null;

  useEffect(() => {
    const unsubscribe = subscribeMessages(churchId ?? '', setMessages);
    return unsubscribe;
  }, [churchId]);

  useEffect(() => {
    if (!profile?.churchId) return;
    recordView('chat');
  }, [profile?.churchId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKbHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const query = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      query
        ? (messages ?? []).filter(
            (m) =>
              (m.text || '').toLowerCase().includes(query) ||
              (m.userName || '').toLowerCase().includes(query) ||
              (m.fileName || '').toLowerCase().includes(query)
          )
        : (messages ?? []),
    [messages, query]
  );

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || uploading) return;
    setSending(true);
    setText('');
    try {
      await sendMessage(trimmed);
    } catch (error) {
      Alert.alert('Error', friendlyError(error));
    } finally {
      setSending(false);
    }
  }

  async function handleAttach() {
    if (!isAdmin || sending || uploading) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*', 'image/*', 'audio/*', 'application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const caption = text.trim();
      setText('');
      setUploading(true);
      setUploadProgress(0);
      try {
        const uploaded = await uploadChatFile(asset.uri, asset.name, (fraction) =>
          setUploadProgress(fraction)
        );
        await sendMessage(caption, uploaded);
      } catch (error) {
        Alert.alert('Error', friendlyError(error));
      } finally {
        setUploading(false);
      }
    } catch {
      // picker was dismissed
    }
  }

  function confirmDelete(item: ChatMessage) {
    setPendingDelete(item);
  }

  async function performDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    const target = pendingDelete;
    try {
      await deleteChatMessage(target.id, target.filePath);
      setPendingDelete(null);
      if (Platform.OS === 'web') {
        window.alert('Message deleted.');
      }
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Message could not be deleted.');
      } else {
        Alert.alert('Error', 'Message could not be deleted.');
      }
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const canSend = text.trim().length > 0 && !sending && !uploading;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <BrandBackdrop />
      {messages === null ? (
        <View style={styles.flex}>
          <ActivityIndicator size="large" color={brand.primary} style={styles.spinner} />
        </View>
      ) : messages.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="Start the conversation"
          message="Share reminders, prayer points and updates with the whole band here."
        />
      ) : (
        <>
          <View style={styles.searchWrap}>
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder="Search messages…"
            />
          </View>
          {filtered.length === 0 ? (
            <EmptyState
              icon="search-outline"
              title="No messages match"
              message="Try different words or a sender's name."
            />
          ) : (
            <FlatList
              style={styles.flex}
              data={filtered}
              inverted
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const mine = item.userId === user?.uid;
                const bubble = (
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                    {item.fileUrl && item.fileName ? (
                      <Pressable
                        onPress={() => openUrl(item.fileUrl!)}
                        style={({ pressed }) => [styles.fileCard, pressed && styles.fileCardPressed]}
                        hitSlop={6}>
                        <Ionicons
                          name={fileKindIcon(item.fileName)}
                          size={28}
                          color={mine ? '#ffffff' : brand.primary}
                        />
                        <View style={styles.fileInfo}>
                          <Text
                            numberOfLines={1}
                            style={[styles.fileName, mine && styles.fileTextMine]}>
                            {item.fileName}
                          </Text>
                          <Text style={[styles.fileMeta, mine && styles.fileTextMine]}>
                            {formatFileSize(item.fileSize)} · Tap to open
                          </Text>
                        </View>
                        <Ionicons
                          name="open-outline"
                          size={18}
                          color={mine ? 'rgba(255,255,255,0.8)' : brand.primary}
                        />
                      </Pressable>
                    ) : null}
                    {item.text ? <MessageText text={item.text} mine={mine} /> : null}
                    <Text style={[styles.time, mine ? styles.timeMine : styles.timeOther]}>
                      {formatChatTime(item.createdAt)}
                    </Text>
                  </View>
                );
                return (
                  <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
                    <View style={styles.bubbleWrap}>
                      {!mine ? <Text style={styles.senderName}>{item.userName}</Text> : null}
                      <Pressable
                        onLongPress={() => confirmDelete(item)}
                        delayLongPress={400}
                        style={styles.bubblePressable}>
                        {bubble}
                      </Pressable>
                      {Platform.OS === 'web' || item.fileName ? (
                        <Pressable
                          onPress={() => confirmDelete(item)}
                          hitSlop={8}
                          style={styles.deleteBtn}>
                          <Ionicons
                            name="trash-outline"
                            size={15}
                            color={mine ? 'rgba(255,255,255,0.9)' : brand.muted}
                          />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              }}
            />
          )}
        </>
      )}

      <View
        style={[
          styles.inputBar,
          { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 10 },
        ]}>
        {isAdmin ? (
          <Pressable
            onPress={handleAttach}
            disabled={sending || uploading}
            style={styles.attachBtn}>
            <Ionicons
              name="add"
              size={24}
              color={sending || uploading ? brand.muted : brand.primary}
            />
          </Pressable>
        ) : null}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={brand.muted}
          multiline
          maxLength={2000}
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}>
          <Ionicons name="arrow-up" size={22} color="#ffffff" />
        </Pressable>
      </View>
      {uploading ? (
        <View style={[styles.uploadRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <ActivityIndicator size="small" color={brand.primary} />
          <Text style={styles.uploadText}>
            Uploading… {Math.round(uploadProgress * 100)}%
          </Text>
        </View>
      ) : null}
      {Platform.OS !== 'web' && kbHeight > 0 ? <View style={{ height: kbHeight }} /> : null}

      <Modal
        visible={pendingDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDelete(null)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[styles.modalCard, { backgroundColor: brand.card, borderColor: brand.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: brand.onCard }]}>Delete this message?</Text>
            <Text style={[styles.modalBody, { color: brand.muted }]}>
              {pendingDelete?.fileName
                ? 'This also removes the attached file for everyone.'
                : 'This removes the message for everyone.'}
            </Text>
            <View style={styles.modalRow}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setPendingDelete(null)}
                disabled={deleting}
                style={styles.modalBtn}
              />
              <Button
                title="Delete"
                variant="danger"
                onPress={performDelete}
                loading={deleting}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function makeStyles(brand: BrandPalette) {
  return StyleSheet.create({
  flex: {
    flex: 1,
  },
  spinner: {
    marginTop: 60,
  },
  searchWrap: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  list: {
    padding: 16,
    gap: 8,
  },
  row: {
    maxWidth: '84%',
  },
  rowOther: {
    alignSelf: 'flex-start',
  },
  rowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: brand.primary,
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bubblePressable: {
    flexShrink: 1,
    maxWidth: '100%',
  },
  deleteBtn: {
    marginTop: 22,
    padding: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleMine: {
    backgroundColor: brand.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: brand.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: brand.cardBorder,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
    color: brand.onCard,
  },
  bubbleTextMine: {
    color: '#ffffff',
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  linkOther: {
    color: brand.primary,
  },
  linkMine: {
    color: '#FFE9A8',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 190,
    maxWidth: 230,
  },
  fileCardPressed: {
    opacity: 0.6,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: brand.onCard,
  },
  fileMeta: {
    fontSize: 12,
    color: brand.muted,
    marginTop: 2,
  },
  fileTextMine: {
    color: '#ffffff',
  },
  time: {
    fontSize: 10.5,
    marginTop: 3,
  },
  timeMine: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  timeOther: {
    color: brand.muted,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: brand.background,
    borderTopWidth: 1,
    borderTopColor: brand.cardBorder,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.card,
    borderWidth: 1,
    borderColor: brand.cardBorder,
  },
  input: {
    flex: 1,
    backgroundColor: brand.card,
    borderWidth: 1,
    borderColor: brand.cardBorder,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 120,
    color: brand.onCard,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.primary,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: brand.background,
  },
  uploadText: {
    fontSize: 13,
    color: brand.primary,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    marginTop: 0,
  },
});
}