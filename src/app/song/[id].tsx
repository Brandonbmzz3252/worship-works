import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingView } from '@/components/ui/loading-view';
import { TextField } from '@/components/ui/text-field';
import { useBrand, type BrandPalette } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { friendlyError } from '@/lib/errors';
import { tsToDate, formatDate, formatFileSize } from '@/lib/format';
import { getSong, deleteSong, updateSong } from '@/lib/store';
import { downloadAndShareSong } from '@/lib/files';
import type { Song } from '@/lib/types';

export default function SongDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const brand = useBrand();
  const [song, setSong] = useState<Song | null | undefined>(undefined);
  const [sharing, setSharing] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const styles = useMemo(() => makeStyles(brand), [brand]);

  useEffect(() => {
    let active = true;
    if (id) {
      getSong(id).then((s) => {
        if (!active) return;
        setSong(s);
        setLinkDraft(s?.link || '');
      });
    }
    return () => {
      active = false;
    };
  }, [id]);

  if (song === undefined) {
    return <LoadingView />;
  }

  if (song === null) {
    return <EmptyState icon="alert-circle-outline" title="Song not found" />;
  }

  async function handleShare() {
    if (!song?.filePath) return;
    setSharing(true);
    try {
      await downloadAndShareSong({
        filePath: song.filePath,
        fileName: song.fileName,
        mimeType: song.mimeType,
      });
    } catch {
      Alert.alert('Error', 'Could not download the song file.');
    } finally {
      setSharing(false);
    }
  }

  function confirmDelete() {
    if (!song) return;
    Alert.alert('Delete song', `Remove "${song.title}" for everyone?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteSong(id).then(() => router.back());
        },
      },
    ]);
  }

  async function handleOpenLink() {
    if (!song?.link) return;
    try {
      await Linking.openURL(song.link);
    } catch {
      Alert.alert('Could not open link', song.link);
    }
  }

async function handleSaveLink() {
    const trimmed = linkDraft.trim();
    setSavingLink(true);
    try {
      await updateSong(id, trimmed ? { link: trimmed } : { link: '' });
      setLinkDraft(trimmed);
      setSong((prev) => (prev ? { ...prev, link: trimmed } : prev));
      Alert.alert('Saved', 'Link updated for everyone.');
    } catch (error) {
      Alert.alert('Error', friendlyError(error));
    } finally {
      setSavingLink(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: 'Song',
          headerShown: true,
          headerStyle: { backgroundColor: brand.primary },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      <View style={styles.badge}>
        <Ionicons name="musical-note" size={26} color="#ffffff" />
      </View>
      <Text style={styles.title}>{song.title}</Text>
      <Text style={styles.artist}>
        {song.artist || 'Unknown artist'}
        {song.key ? `  ·  ${song.key}` : ''}
      </Text>
      <Text style={styles.uploaded}>
        Uploaded {formatDate(tsToDate(song.uploadedAt))}
      </Text>

      {song.filePath ? (
        <View style={styles.fileCard}>
          <View style={styles.fileIcon}>
            <Ionicons name="document-attach-outline" size={22} color={brand.primary} />
          </View>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>{song.fileName || 'Song file'}</Text>
            <Text style={styles.fileMeta}>
              {song.mimeType || 'file'}
              {song.fileSize ? ` · ${formatFileSize(song.fileSize)}` : ''}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.noFile}>
          <Text style={styles.noFileText}>No audio or sheet file attached.</Text>
        </View>
      )}

      {song.filePath ? (
        <Button
          title="Download"
          icon="download-outline"
          onPress={handleShare}
          loading={sharing}
          style={styles.downloadBtn}
        />
      ) : null}

      {song.link ? (
        <Button
          title="Open Link"
          icon="open-outline"
          onPress={handleOpenLink}
          style={styles.downloadBtn}
        />
      ) : null}

      {isAdmin ? (
        <View style={styles.linkCard}>
          <Text style={styles.notesLabel}>Link for members (YouTube / Drive)</Text>
          <TextField
            value={linkDraft}
            onChangeText={setLinkDraft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="Paste a link to open here"
          />
          <Button
            title={song.link ? 'Update link' : 'Add link'}
            icon="link-outline"
            onPress={handleSaveLink}
            loading={savingLink}
            style={styles.linkSaveBtn}
          />
        </View>
      ) : null}

      {song.notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>Notes / Lyrics / Chords</Text>
          <Text style={styles.notesText}>{song.notes}</Text>
        </View>
      ) : null}

      {isAdmin ? (
        <Button
          title="Delete song"
          variant="danger"
          icon="trash-outline"
          onPress={confirmDelete}
          style={styles.deleteBtn}
        />
      ) : null}
    </ScrollView>
  );
}

function makeStyles(brand: BrandPalette) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brand.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.primary,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: brand.onCard,
  },
  artist: {
    fontSize: 16,
    color: brand.muted,
    marginTop: 2,
    fontWeight: '600',
  },
  uploaded: {
    fontSize: 12.5,
    color: brand.muted,
    marginTop: 6,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: brand.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.cardBorder,
    padding: 14,
    marginTop: 22,
  },
  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.accentSoft,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '700',
    color: brand.onCard,
  },
  fileMeta: {
    fontSize: 12.5,
    color: brand.muted,
    marginTop: 1,
  },
  noFile: {
    backgroundColor: brand.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.cardBorder,
    padding: 18,
    marginTop: 22,
  },
  noFileText: {
    fontSize: 14,
    color: brand.muted,
    textAlign: 'center',
  },
  downloadBtn: {
    marginTop: 16,
  },
  linkCard: {
    backgroundColor: brand.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.cardBorder,
    padding: 16,
    marginTop: 18,
    gap: 10,
  },
  linkSaveBtn: {
    marginTop: 2,
  },
  notesCard: {
    backgroundColor: brand.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.cardBorder,
    padding: 16,
    marginTop: 18,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: brand.onCard,
  },
  deleteBtn: {
    marginTop: 28,
  },
});
}