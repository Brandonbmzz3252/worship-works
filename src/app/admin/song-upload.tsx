import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { TextField } from '@/components/ui/text-field';
import { useBrand, type BrandPalette } from '@/lib/theme-context';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatFileSize } from '@/lib/format';
import { uploadSongFile, createSong } from '@/lib/store';

type PickedFile = {
  uri: string;
  name: string;
  size: number;
  mimeType: string | null;
};

export default function SongUpload() {
  const router = useRouter();
  const navigation = useNavigation();
  const brand = useBrand();
  const styles = useMemo(() => makeStyles(brand), [brand]);
  const [exitAfterSave, setExitAfterSave] = useState(false);

  useEffect(() => {
    if (exitAfterSave) router.back();
  }, [exitAfterSave, router]);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('');
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
const [saving, setSaving] = useState(false);

  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({ title: '', artist: '', key: '', notes: '', link: '', file: null })
  );
  const serialized = useMemo(
    () =>
      JSON.stringify({
        title,
        artist,
        key,
        notes,
        link,
        file: file?.name ?? null,
      }),
    [title, artist, key, notes, link, file]
  );
  const dirty = serialized !== savedSnapshot;
  const { view: unsavedView, requestBack } = useUnsavedGuard(dirty, handleSave, true);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => <HeaderBackButton onPress={requestBack} />,
    });
  }, [navigation, requestBack]);

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['application/pdf', 'audio/*', 'text/plain', 'application/octet-stream'],
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setFile({
        uri: asset.uri,
        name: asset.name,
        size: asset.size ?? 0,
        mimeType: asset.mimeType ?? null,
      });
    } catch {
      Alert.alert('Error', 'Could not open the file picker.');
    }
  }

  function removeFile() {
    setFile(null);
    setProgress(null);
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give the song a title before saving.');
      return;
    }

    setSaving(true);
    setProgress(0);
    try {
      let fileInfo: Awaited<ReturnType<typeof uploadSongFile>> | undefined;
      if (file) {
        fileInfo = await uploadSongFile(file.uri, file.name, file.mimeType, setProgress);
      }
await createSong({
        title: title.trim(),
        artist: artist.trim(),
        key: key.trim(),
        notes: notes.trim(),
        link: link.trim() || undefined,
        filePath: fileInfo?.filePath,
        fileUrl: fileInfo?.fileUrl,
        fileName: fileInfo?.fileName,
        fileSize: fileInfo?.fileSize,
        mimeType: fileInfo?.mimeType,
      });
      setSavedSnapshot(serialized);
      setExitAfterSave(true);
    } catch {
      Alert.alert('Error', 'Song could not be uploaded. Check your connection and try again.');
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  const showProgress = progress !== null && progress < 1;

return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {unsavedView}
      <ScrollView
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets={true}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Song info</Text>
        <TextField label="Title *" value={title} onChangeText={setTitle} placeholder="e.g. How Great Thou Art" />
        <TextField label="Artist" value={artist} onChangeText={setArtist} placeholder="e.g. Hymn / Worship Team" />
        <TextField label="Key" value={key} onChangeText={setKey} placeholder="e.g. G major" />
        <TextField
          label="Notes / lyrics / chords"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Paste lyrics or chords here (optional)."
        />
        <TextField
          label="Link (optional)"
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="e.g. YouTube video or Google Drive"
        />

        <Text style={styles.section}>File (optional)</Text>
        {file ? (
          <View style={styles.fileCard}>
            <View style={styles.fileIcon}>
              <Ionicons name="document-attach-outline" size={22} color={brand.primary} />
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{file.name}</Text>
              <Text style={styles.fileMeta}>
                {file.mimeType || 'file'}
                {file.size > 0 ? ` • ${formatFileSize(file.size)}` : ''}
              </Text>
            </View>
            <Pressable hitSlop={8} onPress={removeFile} style={styles.removeBtn}>
              <Ionicons name="close" size={20} color={brand.danger} />
            </Pressable>
          </View>
        ) : (
          <Button title="Choose file (PDF or audio)" variant="ghost" icon="folder-open-outline" onPress={pickFile} />
        )}

        {showProgress ? (
          <View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress * 100)}% uploaded</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Button
            title="Save song"
            icon="checkmark-circle-outline"
            onPress={handleSave}
            loading={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(brand: BrandPalette) {
  return StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 160,
    gap: 16,
  },
  section: {
    fontSize: 14,
    fontWeight: '700',
    color: brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    padding: 12,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.accentSoft,
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
    marginTop: 1,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(192,57,43,0.08)',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: brand.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: brand.primary,
  },
  progressText: {
    fontSize: 12,
    color: brand.muted,
    marginTop: 6,
    textAlign: 'center',
  },
  footer: {
    marginTop: 12,
  },
});
}
