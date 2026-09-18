import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingView } from '@/components/ui/loading-view';
import { BrandBackdrop } from '@/components/brand-backdrop';
import { useBrand, type BrandPalette } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { tsToDate, formatMonthDay, formatTime, startOfDay, isToday, monthName, isInMonth, monthDayToDate } from '@/lib/format';
import { subscribeEvents, deleteEvent, subscribeAllUsers, recordView } from '@/lib/store';
import type { BandEvent, EventKind, UserProfile } from '@/lib/types';

type Row =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'item'; key: string; event: BandEvent; past: boolean };

export default function ScheduleTab() {
  const router = useRouter();
  const { isAdmin, profile } = useAuth();
  const brand = useBrand();
  const [events, setEvents] = useState<BandEvent[] | null>(null);
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [celebrateOpen, setCelebrateOpen] = useState(true);
  const styles = useMemo(() => makeStyles(brand), [brand]);
  const churchId = profile?.churchId ?? null;
  const kindColors = useMemo<Record<EventKind, string>>(
    () => ({
      Rehearsal: '#2F7D4F',
      Service: brand.accent,
      Other: brand.muted,
    }),
    [brand.accent, brand.muted]
  );

  useEffect(() => {
    const unsubscribe = subscribeEvents(churchId ?? '', setEvents);
    return unsubscribe;
  }, [churchId]);

  useEffect(() => {
    const unsubscribe = subscribeAllUsers(churchId ?? '', setUsers);
    return unsubscribe;
  }, [churchId]);

  useEffect(() => {
    if (!profile?.churchId) return;
    recordView('schedule');
  }, [profile?.churchId]);

  if (!events) {
    return <LoadingView />;
  }

  const thisMonthIndex = new Date().getMonth();
  const thisMonthName = monthName(thisMonthIndex);
  type Occasion = { name: string; order: number; mdText: string };
  const occasionOrder = (md: string) => {
    const [m, d] = md.split('-').map(Number);
    return (m || 0) * 100 + (d || 0);
  };
  const birthdayRows: Occasion[] = (users ?? [])
    .filter((u) => isInMonth(u.birthday, thisMonthIndex))
    .map((u) => ({
      name: u.displayName || u.email || 'Member',
      order: occasionOrder(u.birthday as string),
      mdText: formatMonthDay(monthDayToDate(u.birthday as string)),
    }))
    .sort((a, b) => a.order - b.order);
  const anniversaryRows: Occasion[] = (users ?? [])
    .filter((u) => isInMonth(u.anniversary, thisMonthIndex))
    .map((u) => ({
      name: u.displayName || u.email || 'Member',
      order: occasionOrder(u.anniversary as string),
      mdText: formatMonthDay(monthDayToDate(u.anniversary as string)),
    }))
    .sort((a, b) => a.order - b.order);
  const hasCelebrations = birthdayRows.length > 0 || anniversaryRows.length > 0;

  const todayStart = startOfDay(new Date()).getTime();
  const upcoming = events
    .filter((e) => tsToDate(e.start).getTime() >= todayStart)
    .sort((a, b) => tsToDate(a.start).getTime() - tsToDate(b.start).getTime());
  const past = events
    .filter((e) => tsToDate(e.start).getTime() < todayStart)
    .sort((a, b) => tsToDate(b.start).getTime() - tsToDate(a.start).getTime());

  const rows: Row[] = [];
  if (upcoming.length > 0) {
    rows.push({ kind: 'header', key: 'h-upcoming', title: 'Upcoming' });
    upcoming.forEach((e) => rows.push({ kind: 'item', key: e.id, event: e, past: false }));
  }
  if (past.length > 0) {
    rows.push({ kind: 'header', key: 'h-past', title: 'Earlier' });
    past.slice(0, 10).forEach((e) => rows.push({ kind: 'item', key: e.id, event: e, past: true }));
  }

  function confirmDelete(eventId: string, title: string) {
    Alert.alert('Delete event', `Remove "${title}" from the schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteEvent(eventId).catch(() =>
            Alert.alert('Error', 'Could not delete the event. Please try again.')
          );
        },
      },
    ]);
  }

  function timeRange(e: BandEvent): string {
    const start = formatTime(tsToDate(e.start));
    if (!e.end) return start;
    return `${start} – ${formatTime(tsToDate(e.end))}`;
  }

  return (
    <View style={styles.root}>
      <BrandBackdrop />
      {celebrateOpen && hasCelebrations ? (
        <View style={[styles.celebrateCard, { backgroundColor: brand.primary }]}>
          <View style={styles.celebrateHeader}>
            <Ionicons name="gift-outline" size={18} color="#ffffff" />
            <Text style={styles.celebrateTitle}>{thisMonthName}</Text>
            <Pressable hitSlop={8} onPress={() => setCelebrateOpen(false)} style={styles.celebrateClose}>
              <Ionicons name="close" size={18} color="#ffffff" />
            </Pressable>
          </View>
          {birthdayRows.length > 0 ? (
            <View style={styles.celebrateSection}>
              <Text style={styles.celebrateLabel}>Birthdays</Text>
              {birthdayRows.map((row) => (
                <View key={`b-${row.name}-${row.mdText}`} style={styles.celebrateRow}>
                  <Text style={styles.celebrateDay}>{row.mdText}</Text>
                  <Text style={styles.celebrateName}>{row.name}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {anniversaryRows.length > 0 ? (
            <View style={styles.celebrateSection}>
              <Text style={styles.celebrateLabel}>Anniversaries</Text>
              {anniversaryRows.map((row) => (
                <View key={`a-${row.name}-${row.mdText}`} style={styles.celebrateRow}>
                  <Text style={styles.celebrateDay}>{row.mdText}</Text>
                  <Text style={styles.celebrateName}>{row.name}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      <FlatList
        data={rows}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.key}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Nothing scheduled"
            message={
              isAdmin
                ? 'Tap the + button in the top right to add a rehearsal or service.'
                : 'Rehearsals and services will appear here.'
            }
          />
        }
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return <Text style={styles.sectionHeader}>{item.title}</Text>;
          }
          const e = item.event;
          const color = kindColors[e.kind];
          const date = tsToDate(e.start);
          return (
            <View style={[styles.card, item.past && styles.cardPast]}>
              <View style={styles.dateBlock}>
                <Text style={styles.dayNum}>{formatMonthDay(date).split(' ')[1]}</Text>
                <Text style={styles.monthShort}>{formatMonthDay(date).split(' ')[0]}</Text>
                {isToday(date) ? <Text style={styles.today}>Today</Text> : null}
              </View>
              <View style={styles.info}>
                <Text style={styles.title}>{e.title}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.kindChip, { backgroundColor: `${color}22` }]}>
                    <Text style={[styles.kindText, { color }]}>{e.kind}</Text>
                  </View>
                  <Text style={styles.time}>{timeRange(e)}</Text>
                </View>
                {e.location ? (
                  <Text style={styles.location}>
                    <Ionicons name="location-outline" size={12} /> {e.location}
                  </Text>
                ) : null}
                {e.notes ? <Text style={styles.notes}>{e.notes}</Text> : null}
              </View>
              {isAdmin ? (
                <View style={styles.actions}>
                  <Pressable
                    hitSlop={8}
                    style={styles.iconBtn}
                    onPress={() => router.push(`/admin/event-edit?id=${e.id}`)}>
                    <Ionicons name="create-outline" size={18} color={brand.primary} />
                  </Pressable>
                  <Pressable
                    hitSlop={8}
                    style={styles.iconBtn}
                    onPress={() => confirmDelete(e.id, e.title)}>
                    <Ionicons name="trash-outline" size={18} color={brand.danger} />
                  </Pressable>
                </View>
              ) : null}
            </View>
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
  list: {
    padding: 16,
    gap: 10,
  },
  celebrateCard: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  celebrateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  celebrateTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  celebrateClose: {
    padding: 2,
  },
  celebrateSection: {
    gap: 4,
    marginTop: 4,
  },
  celebrateLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  celebrateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  celebrateDay: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  celebrateName: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
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
    gap: 12,
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
  cardPast: {
    opacity: 0.55,
  },
  dateBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: brand.cardBorder,
  },
  dayNum: {
    fontSize: 24,
    fontWeight: '800',
    color: brand.primary,
    lineHeight: 26,
  },
  monthShort: {
    fontSize: 13,
    color: brand.muted,
    textTransform: 'uppercase',
  },
  today: {
    fontSize: 10,
    fontWeight: '700',
    color: brand.danger,
    marginTop: 4,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: brand.onCard,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  kindChip: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  kindText: {
    fontSize: 11,
    fontWeight: '700',
  },
  time: {
    fontSize: 13,
    color: brand.muted,
    fontWeight: '600',
  },
  location: {
    fontSize: 12.5,
    color: brand.muted,
    marginTop: 5,
  },
  notes: {
    fontSize: 12.5,
    color: brand.onCard,
    marginTop: 3,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.surface,
  },
  actions: {
    gap: 8,
    alignItems: 'center',
    alignSelf: 'center',
  },
});
}