import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingView } from '@/components/ui/loading-view';
import { MonthDayField } from '@/components/ui/month-day-field';
import { useBrand } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { subscribeAllUsers, updateUserDates } from '@/lib/store';
import { formatMonthDay, monthName, monthDayToDate } from '@/lib/format';
import type { UserProfile } from '@/lib/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DayEvents = {
  birthdays: UserProfile[];
  anniversaries: UserProfile[];
};

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function parseDay(md: string): number {
  const day = parseInt(md.split('-')[1], 10);
  return Number.isFinite(day) ? day : 0;
}

type DateEditorProps = {
  birthday: string | null;
  setBirthday: (md: string | null) => void;
  anniversary: string | null;
  setAnniversary: (md: string | null) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
};

function DateEditor({
  birthday,
  setBirthday,
  anniversary,
  setAnniversary,
  saving,
  onSave,
  onCancel,
}: DateEditorProps) {
  const brand = useBrand();
  return (
    <View style={[styles.editor, { borderTopColor: brand.cardBorder }]}>
      <MonthDayField label="Birthday" value={birthday} onChange={setBirthday} />
      {birthday ? (
        <Pressable hitSlop={6} onPress={() => setBirthday(null)} style={styles.removeBtn}>
          <Text style={[styles.removeText, { color: brand.danger }]}>Remove birthday</Text>
        </Pressable>
      ) : null}
      <MonthDayField label="Anniversary" value={anniversary} onChange={setAnniversary} />
      {anniversary ? (
        <Pressable hitSlop={6} onPress={() => setAnniversary(null)} style={styles.removeBtn}>
          <Text style={[styles.removeText, { color: brand.danger }]}>Remove anniversary</Text>
        </Pressable>
      ) : null}
      <View style={styles.editActions}>
        <Button title="Save" icon="checkmark" onPress={onSave} loading={saving} />
        <Button title="Cancel" variant="ghost" onPress={onCancel} />
      </View>
    </View>
  );
}

export default function BirthdaysScreen() {
  const router = useRouter();
  const brand = useBrand();
  const { profile, isAdmin } = useAuth();
  const churchId = profile?.churchId ?? null;
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [viewDate, setViewDate] = useState(() => monthStart(new Date()));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editBday, setEditBday] = useState<string | null>(null);
  const [editAnniv, setEditAnniv] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeAllUsers(churchId ?? '', setUsers), [churchId]);

  function moveMonth(delta: number) {
    setViewDate(addMonths(viewDate, delta));
    setSelectedDay(null);
    setEditingUid(null);
  }

  function goToday() {
    setViewDate(monthStart(new Date()));
    setSelectedDay(null);
    setEditingUid(null);
  }

  const eventsByDay = useMemo(() => {
    const map = new Map<number, DayEvents>();
    for (const user of users ?? []) {
      if (user.birthday) {
        const md = monthDayToDate(user.birthday);
        if (md.getMonth() === viewDate.getMonth()) {
          const day = parseDay(user.birthday);
          if (day) {
            const entry = map.get(day) ?? { birthdays: [], anniversaries: [] };
            entry.birthdays.push(user);
            map.set(day, entry);
          }
        }
      }
      if (user.anniversary) {
        const md = monthDayToDate(user.anniversary);
        if (md.getMonth() === viewDate.getMonth()) {
          const day = parseDay(user.anniversary);
          if (day) {
            const entry = map.get(day) ?? { birthdays: [], anniversaries: [] };
            entry.anniversaries.push(user);
            map.set(day, entry);
          }
        }
      }
    }
    return map;
  }, [users, viewDate]);

  const year = viewDate.getFullYear();
  const monthIndex = viewDate.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isCurrentMonth = sameMonth(viewDate, today);

  function startEdit(user: UserProfile) {
    if (!isAdmin) return;
    setEditingUid(user.uid);
    setEditBday(user.birthday ?? null);
    setEditAnniv(user.anniversary ?? null);
  }

  async function saveEdit(uid: string) {
    setSaving(true);
    try {
      await updateUserDates(uid, {
        birthday: editBday ?? undefined,
        anniversary: editAnniv ?? undefined,
      });
      setEditingUid(null);
      const target = editBday
        ? monthDayToDate(editBday)
        : editAnniv
          ? monthDayToDate(editAnniv)
          : null;
      if (target) {
        setViewDate(new Date(new Date().getFullYear(), target.getMonth(), 1));
        setSelectedDay(target.getDate());
      }
    } catch {
      Alert.alert('Error', 'Could not save the dates. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (users === null) {
    return <LoadingView />;
  }

  const dayEvents = selectedDay ? eventsByDay.get(selectedDay) : undefined;
  const dayPeople: { user: UserProfile; kind: 'birthday' | 'anniversary' }[] = selectedDay
    ? [
        ...(dayEvents?.birthdays ?? []).map((user) => ({ user, kind: 'birthday' as const })),
        ...(dayEvents?.anniversaries ?? []).map((user) => ({ user, kind: 'anniversary' as const })),
      ]
    : [];

  const sortedUsers = [...(users ?? [])].sort((a, b) =>
    (a.displayName || a.email).localeCompare(b.displayName || b.email)
  );

  function memberDates(user: UserProfile): string {
    const bday = user.birthday ? formatMonthDay(monthDayToDate(user.birthday)) : '—';
    const anniv = user.anniversary ? formatMonthDay(monthDayToDate(user.anniversary)) : '—';
    return `Birthday: ${bday}    Anniversary: ${anniv}`;
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { backgroundColor: brand.primary }]}>
        <Pressable hitSlop={10} onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>Birthdays & Anniversaries</Text>
        <View style={styles.backBtn} />
      </View>

      {users.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No members yet"
          message="Members will appear here once they sign up."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.controls}>
            <Pressable
              hitSlop={8}
              onPress={() => moveMonth(-1)}
              style={[styles.navBtn, { backgroundColor: brand.surface }]}>
              <Ionicons name="chevron-back" size={22} color={brand.primary} />
            </Pressable>
            <Pressable onPress={goToday} style={styles.monthWrap}>
              <Text style={[styles.monthText, { color: brand.onCard }]}>{`${monthName(monthIndex)} ${year}`}</Text>
              {isCurrentMonth ? <Text style={[styles.todayChip, { color: brand.primary }]}>This month</Text> : null}
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() => moveMonth(1)}
              style={[styles.navBtn, { backgroundColor: brand.surface }]}>
              <Ionicons name="chevron-forward" size={22} color={brand.primary} />
            </Pressable>
          </View>

          <View style={[styles.calendar, { backgroundColor: brand.card, borderColor: brand.cardBorder }]}>
            <View style={styles.weekRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={styles.weekDay}>{w}</Text>
              ))}
            </View>
            {Array.from({ length: cells.length / 7 }, (_, week) => (
              <View key={week} style={styles.weekRow}>
                {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
                  if (day === null) {
                    return <View key={`e-${week}-${i}`} style={styles.cell} />;
                  }
                  const ev = eventsByDay.get(day);
                  const isToday =
                    isCurrentMonth && day === today.getDate();
                  const selected = selectedDay === day;
                  return (
                    <Pressable
                      key={day}
                      onPress={() => {
                        setSelectedDay(selected ? null : day);
                        setEditingUid(null);
                      }}
                      style={[
                        styles.cell,
                        selected && { backgroundColor: brand.primary },
                        isToday && !selected && { borderColor: brand.primary, borderWidth: 2 },
                      ]}>
                      <Text style={[styles.cellDay, { color: brand.onCard }, selected && { color: '#ffffff' }]}>{day}</Text>
                      <View style={styles.dotsRow}>
                        {ev?.birthdays.length ? <View style={[styles.dot, { backgroundColor: brand.primary }]} /> : null}
                        {ev?.anniversaries.length ? <View style={[styles.dot, { backgroundColor: brand.danger }]} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.legendDot, { backgroundColor: brand.primary }]} />
              <Text style={[styles.legendText, { color: brand.muted }]}>Birthday</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.legendDot, { backgroundColor: brand.danger }]} />
              <Text style={[styles.legendText, { color: brand.muted }]}>Anniversary</Text>
            </View>
          </View>

          <Text style={[styles.detailTitle, { color: brand.primary }]}>
            {selectedDay ? `${formatMonthDay(new Date(year, monthIndex, selectedDay))}` : 'Tap a date'}
          </Text>

          {dayPeople.length === 0 ? (
            <Text style={[styles.detailHint, { color: brand.muted }]}>
              {selectedDay
                ? 'No birthdays or anniversaries on this day.'
                : isAdmin
                  ? 'Tap a highlighted date to see — and edit — who celebrates it.'
                  : 'Tap a highlighted date to see who celebrates it.'}
            </Text>
          ) : (
            dayPeople.map(({ user, kind }) => {
              const isEditing = editingUid === user.uid;
              const kindLabel = kind === 'birthday' ? 'Birthday' : 'Anniversary';
              return (
                <View key={`${user.uid}-${kind}`} style={[styles.personCard, { backgroundColor: brand.card, borderColor: brand.cardBorder }]}>
                  <View style={styles.personMain}>
                    <View style={[styles.avatar, { backgroundColor: brand.surface }]}>
                      <Text style={[styles.avatarText, { color: brand.onCard }]}>
                        {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.personDetails}>
                      <Text style={[styles.personName, { color: brand.onCard }]}>{user.displayName || '—'}</Text>
                      <Text style={[styles.kindChip, { color: kind === 'birthday' ? brand.primary : brand.danger }]}>
                        {kindLabel}
                      </Text>
                    </View>
                    {isAdmin ? (
                      <Pressable hitSlop={8} onPress={() => (isEditing ? setEditingUid(null) : startEdit(user))}>
                        <Ionicons
                          name={isEditing ? 'close-circle-outline' : 'create-outline'}
                          size={22}
                          color={isEditing ? brand.muted : brand.primary}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                  {isEditing ? (
                    <DateEditor
                      birthday={editBday}
                      setBirthday={setEditBday}
                      anniversary={editAnniv}
                      setAnniversary={setEditAnniv}
                      saving={saving}
                      onSave={() => saveEdit(user.uid)}
                      onCancel={() => setEditingUid(null)}
                    />
                  ) : null}
                </View>
              );
            })
          )}

          {isAdmin ? (
            <>
              <Text style={[styles.detailTitle, { color: brand.primary }]}>All members</Text>
              {sortedUsers.length === 0 ? (
                <Text style={[styles.detailHint, { color: brand.muted }]}>No members have signed up yet.</Text>
              ) : (
                sortedUsers.map((user) => {
                  const isEditing = editingUid === user.uid;
                  return (
                    <View key={user.uid} style={[styles.personCard, { backgroundColor: brand.card, borderColor: brand.cardBorder }]}>
                      <View style={styles.personMain}>
                        <View style={[styles.avatar, { backgroundColor: brand.surface }]}>
                          <Text style={[styles.avatarText, { color: brand.onCard }]}>
                            {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.personDetails}>
                          <Text style={[styles.personName, { color: brand.onCard }]}>{user.displayName || '—'}</Text>
                          <Text style={[styles.memberDates, { color: brand.muted }]}>{memberDates(user)}</Text>
                        </View>
                        <Pressable
                          hitSlop={8}
                          onPress={() => (isEditing ? setEditingUid(null) : startEdit(user))}>
                          <Ionicons
                            name={isEditing ? 'close-circle-outline' : 'create-outline'}
                            size={22}
                            color={isEditing ? brand.muted : brand.primary}
                          />
                        </Pressable>
                      </View>
                      {isEditing ? (
                        <DateEditor
                          birthday={editBday}
                          setBirthday={setEditBday}
                          anniversary={editAnniv}
                          setAnniversary={setEditAnniv}
                          saving={saving}
                          onSave={() => saveEdit(user.uid)}
                          onCancel={() => setEditingUid(null)}
                        />
                      ) : null}
                    </View>
                  );
                })
              )}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  monthWrap: {
    alignItems: 'center',
    gap: 2,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  todayChip: {
    fontSize: 11,
    fontWeight: '700',
  },
  calendar: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#9AA2AF',
    paddingVertical: 6,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 10,
    margin: 2,
  },
  cellDay: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 6,
  },
  detailHint: {
    fontSize: 13,
    lineHeight: 18,
    color: '#888888',
  },
  personCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 12,
  },
  personMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#555555',
  },
  personDetails: {
    flex: 1,
    gap: 2,
  },
  personName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  kindChip: {
    fontSize: 12,
    fontWeight: '700',
  },
  memberDates: {
    fontSize: 12.5,
    color: '#777777',
    marginTop: 2,
  },
  editor: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.07)',
    paddingTop: 12,
    gap: 10,
  },
  removeBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  removeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
});