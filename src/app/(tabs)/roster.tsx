import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandBackdrop } from '@/components/brand-backdrop';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingView } from '@/components/ui/loading-view';
import { useBrand, type BrandPalette } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { tsToDate, formatDate } from '@/lib/format';
import { subscribeRosterForMonth, recordView } from '@/lib/store';
import { BAND_ROLES } from '@/lib/types';
import type { RosterEntry } from '@/lib/types';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function RosterTab() {
  const router = useRouter();
  const brand = useBrand();
  const { isAdmin, profile } = useAuth();
  const styles = useMemo(() => makeStyles(brand), [brand]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [entries, setEntries] = useState<RosterEntry[] | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const churchId = profile?.churchId ?? null;

  useEffect(() => {
    const unsubscribe = subscribeRosterForMonth(churchId ?? '', year, monthIndex, setEntries);
    return unsubscribe;
  }, [year, monthIndex, churchId]);

  useEffect(() => {
    if (!profile?.churchId) return;
    recordView('roster');
  }, [profile?.churchId]);

  const monthLabel = `${MONTHS[monthIndex]} ${year}`;
  const me = profile?.displayName?.trim().toLowerCase() ?? '';

  function shift(by: number) {
    setEntries(null);
    const d = new Date(year, monthIndex + by, 1);
    setYear(d.getFullYear());
    setMonthIndex(d.getMonth());
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function matches(name?: string): boolean {
    if (!name || !me) return false;
    return name.trim().toLowerCase() === me;
  }

  if (entries === null) {
    return <LoadingView />;
  }

  return (
    <View style={styles.root}>
      <BrandBackdrop />
      <View style={styles.monthBar}>
        <Pressable hitSlop={10} onPress={() => shift(-1)} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={22} color={brand.primary} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: brand.primary }]}>{monthLabel}</Text>
        <Pressable hitSlop={10} onPress={() => shift(1)} style={styles.monthBtn}>
          <Ionicons name="chevron-forward" size={22} color={brand.primary} />
        </Pressable>
      </View>
      <FlatList
        data={entries}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState
          icon="calendar-outline"
          title="No services scheduled"
          message={
            isAdmin
              ? 'Tap the + button in the top right to plot the first duty roster for this month.'
              : 'Duties for this month will appear here.'
          }
        />}
        renderItem={({ item }) => {
          const date = tsToDate(item.serviceDate);
          const singerNames = (item.singers ?? []).map((s) => s.trim()).filter(Boolean);
          const singerCount = (item.leader?.trim() ? 1 : 0) + singerNames.length;
          const isOpen = expanded.includes(item.id);
          return (
            <View style={[styles.card, isOpen && styles.cardOpen]}>
              <View style={styles.cardHeader}>
                <Pressable
                  onPress={() => toggleExpanded(item.id)}
                  style={styles.cardTitleWrap}
                  hitSlop={8}>
                  <Text style={styles.cardDate}>{formatDate(date)}</Text>
                  <Text style={styles.cardSummary}>
                    {isOpen ? 'tap to hide' : `${singerCount} singer${singerCount === 1 ? '' : 's'} · tap to view`}
                  </Text>
                </Pressable>
                <View style={styles.cardHeaderActions}>
                  {isAdmin ? (
                    <Pressable
                      hitSlop={8}
                      onPress={() =>
                        router.navigate({ pathname: '/admin/roster-edit', params: { id: item.id } })
                      }
                      style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
                      <Ionicons name="pencil" size={17} color={brand.primary} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    hitSlop={8}
                    onPress={() => toggleExpanded(item.id)}
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={19}
                      color={brand.muted}
                    />
                  </Pressable>
                </View>
              </View>

              {isOpen ? (
                <View style={styles.cardBody}>
                  <View style={[styles.bubble, { backgroundColor: brand.background }]}>
                    <Text style={[styles.bubbleTitle, { color: brand.primary }]}>
                      Singers ({singerCount})
                    </Text>
                    <View style={styles.singersWrap}>
                      {item.leader?.trim() ? (
                        <View
                          key="leader"
                          style={[
                            styles.singerTag,
                            { backgroundColor: brand.accentSoft, borderColor: brand.accentSoft },
                          ]}>
                          <Text style={[styles.singerTagText, { color: brand.accent }]}>
                            {item.leader.trim()}
                            {matches(item.leader) ? '  (you)' : ''}
                            <Text style={styles.leaderSuffix}>  · Lead Singer</Text>
                          </Text>
                        </View>
                      ) : null}
                      {singerNames.map((singer, index) => {
                        const you = matches(singer);
                        return (
                          <View key={index} style={[styles.singerTag, you && { borderColor: brand.primary }]}>
                            <Text style={[styles.singerTagText, you && { color: brand.primary, fontWeight: '700' }]}>
                              {singer}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View style={[styles.bubble, { backgroundColor: brand.background }]}>
                    <Text style={[styles.bubbleTitle, { color: brand.primary }]}>Band</Text>
                    <View style={styles.bandWrap}>
                      {BAND_ROLES.map((role) => {
                        const name = item.band?.[role];
                        if (!name) return null;
                        const you = matches(name);
                        return (
                          <View key={role} style={styles.bandRow}>
                            <Text style={styles.bandRole}>{role}</Text>
                            <Text style={[styles.bandName, you && { color: brand.primary }]}>
                              {name}
                              {you ? '  (you)' : ''}
                            </Text>
                          </View>
                        );
                      })}
                      {(item.other ?? []).map((o, index) => {
                        const you = matches(o.name);
                        return (
                          <View key={`other-${index}`} style={styles.bandRow}>
                            <Text style={styles.bandRole}>{o.instrument || 'Other'}</Text>
                            <Text style={[styles.bandName, you && { color: brand.primary }]}>
                              {o.name}
                              {you ? '  (you)' : ''}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
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
    monthBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
    },
    monthBtn: {
      width: 40,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: brand.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: brand.cardBorder,
    },
    monthLabel: {
      fontSize: 16,
      fontWeight: '800',
    },
    list: {
      padding: 16,
      paddingTop: 8,
      gap: 12,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: brand.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: brand.cardBorder,
      padding: 14,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    cardOpen: {
      shadowOpacity: 0.09,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    cardTitleWrap: {
      flex: 1,
      gap: 2,
    },
    cardDate: {
      fontSize: 14,
      fontWeight: '800',
      color: brand.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    cardSummary: {
      fontSize: 12,
      color: brand.muted,
    },
    cardHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    iconBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
      borderWidth: 1,
      borderColor: brand.cardBorder,
    },
    iconBtnPressed: {
      opacity: 0.6,
    },
    cardBody: {
      marginTop: 10,
    },
    bubble: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: brand.cardBorder,
      padding: 12,
      gap: 10,
    },
    bubbleTitle: {
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    singersWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    singerTag: {
      backgroundColor: brand.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: brand.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    singerTagText: {
      fontSize: 13,
      fontWeight: '600',
      color: brand.onCard,
    },
    leaderSuffix: {
      fontWeight: '600',
      opacity: 0.75,
    },
    bandWrap: {
      gap: 6,
    },
    bandRow: {
      flexDirection: 'row',
      gap: 10,
    },
    bandRole: {
      width: 92,
      fontSize: 13,
      fontWeight: '600',
      color: brand.muted,
    },
    bandName: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: brand.onCard,
    },
  });
}