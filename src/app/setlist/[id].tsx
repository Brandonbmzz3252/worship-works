import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingView } from '@/components/ui/loading-view';
import { BrandBackdrop } from '@/components/brand-backdrop';
import { useBrand, type BrandPalette } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { tsToDate, formatDate } from '@/lib/format';
import { getSetlist, subscribeSetlist, deleteSetlist } from '@/lib/store';
import { SETLIST_SECTIONS } from '@/lib/types';
import type { Setlist, SetlistEntry } from '@/lib/types';

export default function SetlistDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const brand = useBrand();
  const styles = useMemo(() => makeStyles(brand), [brand]);
  const [setlist, setSetlist] = useState<Setlist | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (id) {
      getSetlist(id).then((s) => {
        if (active) setSetlist(s);
      });
      const unsubscribe = subscribeSetlist(id, (s) => {
        if (active) setSetlist(s);
      });
      return () => {
        active = false;
        unsubscribe();
      };
    }
    return () => {
      active = false;
    };
  }, [id]);

  if (setlist === undefined) {
    return <LoadingView />;
  }

  if (setlist === null) {
    return <EmptyState icon="alert-circle-outline" title="Setlist not found" />;
  }

  function confirmDelete() {
    Alert.alert('Delete setlist', 'Remove this setlist for everyone?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteSetlist(id).then(() => router.back());
        },
      },
    ]);
  }

  const groups: { title: string; entries: SetlistEntry[] }[] = [...SETLIST_SECTIONS].map(
    (title) => ({ title, entries: [] })
  );
  setlist.entries.forEach((e) => {
    const title = (e.section || '').trim() || 'Songs';
    const existing = groups.find((g) => g.title === title);
    if (existing) {
      existing.entries.push(e);
    } else {
      groups.push({ title, entries: [e] });
    }
  });
  const kindLabel =
    setlist.kind ?? ((setlist as unknown as { serviceName?: string }).serviceName ?? 'Service');

  function entrySub(e: SetlistEntry): string {
    const artist = (e as unknown as { artist?: string }).artist ?? '';
    const parts: string[] = [];
    if (artist) parts.push(artist);
    const keyParts = [e.key, ...(e.keyChanges ?? []).filter((k) => k.trim())].filter(Boolean);
    if (keyParts.length) parts.push(`Key: ${keyParts.join(' → ')}`);
    if (e.tempo) parts.push(`BPM: ${e.tempo}`);
    return parts.join('  ·  ');
  }

  const isEmpty = setlist.entries.length === 0;

  return (
    <View style={styles.root}>
      <BrandBackdrop />
      <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: 'Setlist',
          headerShown: true,
          headerStyle: { backgroundColor: brand.primary },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      <Text style={styles.title}>{setlist.title}</Text>
      <View style={styles.chips}>
        <View style={styles.chip}>
          <Ionicons name="calendar-outline" size={13} color={brand.primary} />
          <Text style={styles.chipText}>{formatDate(tsToDate(setlist.date))}</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{kindLabel}</Text>
        </View>
      </View>

      {isEmpty ? (
        <View style={styles.emptyCard}>
          <EmptyState
            icon="list-outline"
            title="No songs yet"
            message="Edit this setlist to add songs."
          />
        </View>
      ) : (
        <>
          {groups.map((group, gi) => {
            const base = groups
              .slice(0, gi)
              .reduce((sum, g) => sum + g.entries.length, 0);
            if (group.entries.length === 0) {
              return (
                <View key={group.title}>
                  <Text style={styles.section}>{group.title}</Text>
                  <Text style={styles.emptySection}>No songs yet</Text>
                </View>
              );
            }
            return (
              <View key={group.title}>
                <Text style={styles.section}>{group.title}</Text>
                {group.entries.map((entry, index) => (
                  <View key={`${group.title}-${index}`} style={styles.entry}>
                    <View style={styles.entryNumber}>
                      <Text style={styles.entryNumberText}>{base + index + 1}</Text>
                    </View>
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryTitle}>{entry.title}</Text>
                      {entrySub(entry) ? (
                        <Text style={styles.entrySub}>{entrySub(entry)}</Text>
                      ) : null}
                      {entry.note ? (
                        <Text style={styles.entryNote}>{entry.note}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </>
      )}

      <View style={styles.adminActions}>
          <Button
            title="Edit setlist"
            variant="primary"
            icon="pencil"
            onPress={() =>
              router.navigate({ pathname: '/setlist-edit', params: { id } })
            }
            style={styles.actionBtn}
          />
          {isAdmin ? (
            <Button title="Delete" variant="danger" icon="trash-outline" onPress={confirmDelete} />
          ) : null}
        </View>
      </ScrollView>
    </View>
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
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: brand.onCard,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: brand.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: brand.primary,
  },
  section: {
    fontSize: 14,
    fontWeight: '700',
    color: brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 26,
    marginBottom: 10,
  },
  emptySection: {
    fontSize: 13,
    fontStyle: 'italic',
    color: brand.muted,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: brand.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.cardBorder,
    padding: 12,
    marginBottom: 8,
  },
  entryNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.primary,
  },
  entryNumberText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: brand.onCard,
  },
  entrySub: {
    fontSize: 13,
    color: brand.muted,
    marginTop: 1,
  },
  entryNote: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: brand.accent,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: brand.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.cardBorder,
    marginTop: 12,
  },
  adminActions: {
    gap: 10,
    marginTop: 28,
  },
  actionBtn: {
    marginBottom: 0,
  },
});
}