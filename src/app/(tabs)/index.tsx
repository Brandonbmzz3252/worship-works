import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingView } from '@/components/ui/loading-view';
import { BrandBackdrop } from '@/components/brand-backdrop';
import { useBrand, type BrandPalette } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { tsToDate, formatDate, startOfDay } from '@/lib/format';
import { subscribeSetlists, deleteSetlist, recordView } from '@/lib/store';
import type { Setlist } from '@/lib/types';

type Row =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'item'; key: string; setlist: Setlist };

export default function SetlistTab() {
  const router = useRouter();
  const { isAdmin, profile } = useAuth();
  const [setlists, setSetlists] = useState<Setlist[] | null>(null);
  const brand = useBrand();
  const styles = useMemo(() => makeStyles(brand), [brand]);
  const churchId = profile?.churchId ?? null;

  useEffect(() => {
    const unsubscribe = subscribeSetlists(churchId ?? '', setSetlists);
    return unsubscribe;
  }, [churchId]);

  useEffect(() => {
    if (!profile?.churchId) return;
    recordView('setlist');
  }, [profile?.churchId]);

  if (!setlists) {
    return <LoadingView />;
  }

  const todayStart = startOfDay(new Date()).getTime();
  const upcoming = setlists
    .filter((s) => tsToDate(s.date).getTime() >= todayStart)
    .sort((a, b) => tsToDate(a.date).getTime() - tsToDate(b.date).getTime());
  const past = setlists.filter((s) => tsToDate(s.date).getTime() < todayStart);

  const rows: Row[] = [];
  if (upcoming.length > 0) {
    rows.push({ kind: 'header', key: 'h-upcoming', title: 'Upcoming' });
    upcoming.forEach((s) => rows.push({ kind: 'item', key: s.id, setlist: s }));
  }
  if (past.length > 0) {
    rows.push({ kind: 'header', key: 'h-past', title: 'Past' });
    past.forEach((s) => rows.push({ kind: 'item', key: s.id, setlist: s }));
  }

  function openSetlist(id: string) {
    router.navigate({ pathname: '/setlist/[id]', params: { id } });
  }

  function confirmDelete(setlistId: string) {
    Alert.alert('Delete setlist', 'This will remove the setlist for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteSetlist(setlistId).catch(() =>
            Alert.alert('Error', 'Could not delete the setlist. Please try again.')
          );
        },
      },
    ]);
  }

  return (
    <View style={styles.root}>
      <BrandBackdrop />
      <FlatList
        data={rows}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={
          profile && !profile.churchId ? (
            <Pressable
              onPress={() => router.navigate('/admin/church-setup')}
              style={({ pressed }) => [styles.banner, pressed && { opacity: 0.85 }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color={brand.primary} />
              <Text style={styles.bannerText}>
                Connect this account to a church to start sharing data.
              </Text>
              <Ionicons name="chevron-forward" size={18} color={brand.primary} />
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="musical-notes-outline"
            title="No setlists yet"
            message="Tap the + button in the top right to create a setlist."
          />
        }
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return <Text style={styles.sectionHeader}>{item.title}</Text>;
          }
          const s = item.setlist;
          return (
            <Pressable
              onPress={() => openSetlist(s.id)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{s.title}</Text>
                <Text style={styles.cardDate}>{formatDate(tsToDate(s.date))}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{s.kind ?? 'Service'}</Text>
                  </View>
                  <Text style={styles.songCount}>
                    {s.entries.length} {s.entries.length === 1 ? 'song' : 'songs'}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable
                  hitSlop={8}
                  style={styles.iconBtn}
                  onPress={() =>
                    router.navigate({
                      pathname: '/setlist-edit',
                      params: { id: s.id },
                    })
                  }>
                  <Ionicons name="pencil" size={18} color={brand.primary} />
                </Pressable>
                {isAdmin ? (
                  <Pressable
                    hitSlop={8}
                    style={styles.iconBtn}
                    onPress={() => confirmDelete(s.id)}>
                    <Ionicons name="trash-outline" size={18} color={brand.danger} />
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function makeStyles(brand: BrandPalette) {
  return StyleSheet.create({
  root: {
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: brand.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.cardBorder,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: brand.onCard,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brand.onCard,
  },
  cardDate: {
    fontSize: 13,
    color: brand.muted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  chip: {
    backgroundColor: brand.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: brand.primary,
  },
  songCount: {
    fontSize: 12,
    color: brand.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
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