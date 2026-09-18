import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { DateTimeField } from '@/components/ui/date-time-field';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { TextField } from '@/components/ui/text-field';
import { CalendarPicker } from '@/components/calendar-picker';
import { useBrand } from '@/lib/theme-context';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { createEvent } from '@/lib/store';
import { formatDate } from '@/lib/format';
import type { EventKind } from '@/lib/types';

const KINDS: EventKind[] = ['Rehearsal', 'Service', 'Other'];

export default function EventNew() {
  const router = useRouter();
  const navigation = useNavigation();
  const brand = useBrand();
  const [exitAfterSave, setExitAfterSave] = useState(false);

  useEffect(() => {
    if (exitAfterSave) router.back();
  }, [exitAfterSave, router]);
const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EventKind>('Rehearsal');
  const initialWhen = useMemo(() => {
    const start = new Date();
    start.setHours(18, 0, 0, 0);
    const end = new Date();
    end.setHours(19, 30, 0, 0);
    return { date: new Date(), start, end };
  }, []);
  const [date, setDate] = useState(initialWhen.date);
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [startTime, setStartTime] = useState(initialWhen.start);
  const [endTime, setEndTime] = useState(initialWhen.end);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({
      title: '',
      kind: 'Rehearsal' as EventKind,
      date: initialWhen.date.getTime(),
      startTime: initialWhen.start.getTime(),
      endTime: initialWhen.end.getTime(),
      location: '',
      notes: '',
    })
  );
  const serialized = useMemo(
    () =>
      JSON.stringify({
        title,
        kind,
        date: date.getTime(),
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
        location,
        notes,
      }),
    [title, kind, date, startTime, endTime, location, notes]
  );
  const dirty = serialized !== savedSnapshot;
  const { view: unsavedView, requestBack } = useUnsavedGuard(dirty, handleSave, true);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => <HeaderBackButton onPress={requestBack} />,
    });
  }, [navigation, requestBack]);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give the event a name.');
      return;
    }
    const start = new Date(date);
    start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    const end = new Date(date);
    end.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
    const hasEnd = end.getTime() > start.getTime();

    setSaving(true);
    try {
await createEvent({
        title: title.trim(),
        kind,
        start,
        end: hasEnd ? end : null,
        location: location.trim(),
        notes: notes.trim(),
      });
      setSavedSnapshot(serialized);
      setExitAfterSave(true);
    } catch {
      Alert.alert('Error', 'Could not create the event. Please try again.');
    } finally {
      setSaving(false);
    }
  }

return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {unsavedView}
      <ScrollView
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets={true}
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.section, { color: brand.primary }]}>Details</Text>
        <TextField label="Title *" value={title} onChangeText={setTitle} placeholder="e.g. Friday Practice" />

        <View style={styles.kindRow}>
          {KINDS.map((k) => {
            const active = kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={[
                  styles.kindWrap,
                  { backgroundColor: brand.card, borderColor: brand.cardBorder },
                  active && { backgroundColor: brand.primary, borderColor: brand.primary },
                ]}>
                <Text style={[styles.kindText, { color: brand.muted }, active && styles.kindTextActive]}>{k}</Text>
              </Pressable>
            );
          })}
        </View>

<Text style={[styles.section, { color: brand.primary }]}>When</Text>
        <Pressable
          onPress={() => setCalendarOpen((o) => !o)}
          style={styles.dateRow}>
          <Text style={[styles.dateLabel, { color: brand.primary }]}>Date</Text>
          <Text style={styles.dateValue}>{formatDate(date)}</Text>
          <Ionicons
            name={calendarOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={brand.primary}
          />
        </Pressable>
        {calendarOpen ? <CalendarPicker value={date} onChange={setDate} /> : null}
        <DateTimeField label="Start time" value={startTime} onChange={setStartTime} mode="time" />
        <DateTimeField label="End time" value={endTime} onChange={setEndTime} mode="time" />

        <Text style={[styles.section, { color: brand.primary }]}>Where & notes (optional)</Text>
        <TextField label="Location" value={location} onChangeText={setLocation} placeholder="e.g. Main hall" />
        <TextField label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Anything members need to know." />

        <View style={styles.footer}>
          <Button title="Create event" icon="checkmark-circle-outline" onPress={handleSave} loading={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
  },
  kindRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kindWrap: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.4,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
  },
  kindText: {
    fontSize: 13,
    fontWeight: '700',
  },
  kindTextActive: {
    color: '#ffffff',
  },
  footer: {
    marginTop: 12,
  },
});
