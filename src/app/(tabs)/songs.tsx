import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { SearchField } from '@/components/ui/search-field';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingView } from '@/components/ui/loading-view';
import { BrandBackdrop } from '@/components/brand-backdrop';
import { useBrand, type BrandPalette } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { formatFileSize } from '@/lib/format';
import { subscribeSongs, deleteSong, recordView } from '@/lib/store';
import type { Song } from '@/lib/types';

export default function SongsTab() {
  const router = useRouter();
  const { isAdmin, profile } = useAuth();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [search, setSearch] = useState('');
  const brand = useBrand();
  const styles = useMemo(() => makeStyles(brand), [brand]);
  const churchId = profile?.churchId ?? null;

  useEffect(() => {
    const unsubscribe = subscribeSongs(churchId ?? '', setSongs);
    return unsubscribe;
  }, [churchId]);

  useEffect(() => {
    if (!profile?.churchId) return;
    recordView('songs');
  }, [profile?.churchId]);

  const query = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      query
        ? (songs ?? []).filter(
            (s) =>
              s.title.toLowerCase().includes(query) ||
              s.artist.toLowerCase().includes(query)
          )
        : (songs ?? []),
    [songs, query]
  );

  if (!songs) {
    return <LoadingView />;
  }

  function confirmDelete(song: Song) {
    Alert.alert('Delete song', `Remove "${song.title}" for everyone?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteSong(song.id).catch(() =>
            Alert.alert('Error', 'Could not delete the song. Please try again.')
          );
        },
      },
    ]);
  }

  return (
    <View style={styles.root}>
      <BrandBackdrop />
      <View style={styles.searchWrap}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search songs, artists…"
        />
      </View>
      <FlatList
        data={filtered}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title={query ? 'No songs match' : 'No songs yet'}
            message={
              query
                ? 'Try a different title or artist.'
                : isAdmin
                  ? 'Tap the + button in the top right to upload the first song.'
                  : 'Songs uploaded by the admin will appear here.'
            }
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.navigate({ pathname: '/song/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={styles.iconBadge}>
              <Ionicons name="musical-note" size={20} color="#ffffff" />
            </View>
            <View style={styles.info}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>
                {item.artist || 'Unknown artist'}
                {item.key ? `  ·  ${item.key}` : ''}
              </Text>
              {item.fileName ? (
                <Text style={styles.file}>
                  <Ionicons name="document-attach-outline" size={11} /> {item.fileName}
                  {item.fileSize ? ` (${formatFileSize(item.fileSize)})` : ''}
                </Text>
              ) : null}
            </View>
            {isAdmin ? (
              <Pressable hitSlop={8} style={styles.iconBtn} onPress={() => confirmDelete(item)}>
                <Ionicons name="trash-outline" size={18} color={brand.danger} />
              </Pressable>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={brand.muted} />
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

function makeStyles(brand: BrandPalette) {
  return StyleSheet.create({
  root: {
    flex: 1,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: brand.cardBorder,
    backgroundColor: brand.card,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.8,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.primary,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: brand.onCard,
  },
  subtitle: {
    fontSize: 13,
    color: brand.muted,
    marginTop: 1,
  },
  file: {
    fontSize: 11.5,
    color: brand.primaryLight,
    marginTop: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.surface,
  },
});
}