import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { CalendarPicker } from '@/components/calendar-picker';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { LoadingView } from '@/components/ui/loading-view';
import { TextField } from '@/components/ui/text-field';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { useBrand } from '@/lib/theme-context';
import { tsToDate, formatDate } from '@/lib/format';
import { getSetlist } from '@/lib/store';
import { MUSIC_KEYS, SETLIST_KINDS, SETLIST_SECTIONS } from '@/lib/types';
import type {
  SetlistCreateInput,
  SetlistEntry,
  SetlistKind,
} from '@/lib/types';

type Row = {
  title: string;
  key: string;
  tempo: string;
  keyChanges: string[];
  note: string;
};
type SectionGroup = { name: string; rows: Row[] };

type Props = {
  setlistId?: string;
  submitLabel: string;
  submitIcon?: 'checkmark-circle-outline' | 'pencil';
  onSubmit: (input: SetlistCreateInput) => Promise<void>;
};

function blankRow(): Row {
  return { title: '', key: '', tempo: '', keyChanges: [], note: '' };
}

function defaultGroups(): SectionGroup[] {
  return SETLIST_SECTIONS.map((name) => ({ name, rows: [] }));
}

export function SetlistForm({
  setlistId,
  submitLabel,
  submitIcon = 'checkmark-circle-outline',
  onSubmit,
}: Props) {
  const brand = useBrand();
  const theme = useTheme();
  const navigation = useNavigation();
  const [loaded, setLoaded] = useState(!setlistId);
  const initialDate = useMemo(() => new Date(), []);
  const [date, setDate] = useState(initialDate);
  const [kind, setKind] = useState<SetlistKind>('Sunday Service');
  const [eventName, setEventName] = useState('');
  const [groups, setGroups] = useState<SectionGroup[]>(defaultGroups);
  const [newSectionName, setNewSectionName] = useState('');
  const [keyPicker, setKeyPicker] = useState<{
    group: number;
    index: number;
    changeIndex: number | null;
  } | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({
      date: initialDate.getTime(),
      kind: 'Sunday Service',
      eventName: '',
      groups: defaultGroups(),
    })
  );
  const serialized = useMemo(
    () => JSON.stringify({ date: date.getTime(), kind, eventName, groups }),
    [date, kind, eventName, groups]
  );
  const dirty = loaded && serialized !== savedSnapshot;
  const { view: unsavedView, requestBack } = useUnsavedGuard(dirty, handleSubmit, true);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => <HeaderBackButton onPress={requestBack} />,
    });
  }, [navigation, requestBack]);

  useEffect(() => {
    if (!setlistId) return;
    let active = true;
    getSetlist(setlistId).then((s) => {
      if (!active) return;
      if (s) {
        setDate(tsToDate(s.date));
        setKind(s.kind ?? 'Other');
        setEventName(s.kind === 'Other' ? s.title : '');
        const loadedGroups: SectionGroup[] = [];
        s.entries.forEach((e) => {
          const name = (e.section || '').trim() || 'Songs';
          const row: Row = {
            title: e.title,
            key: e.key ?? '',
            tempo: (e as unknown as Row).tempo ?? '',
            keyChanges: (e.keyChanges ?? []).map((k) => k.trim()).filter(Boolean),
            note: e.note ?? '',
          };
          const existing = loadedGroups.find((g) => g.name === name);
          if (existing) {
            existing.rows.push(row);
          } else {
            loadedGroups.push({ name, rows: [row] });
          }
        });
        const merged: SectionGroup[] = defaultGroups();
        loadedGroups.forEach((g) => {
          const existing = merged.find((m) => m.name === g.name);
          if (existing) {
            existing.rows.push(...g.rows);
          } else {
            merged.push(g);
          }
        });
        setGroups(merged);
        setSavedSnapshot(
          JSON.stringify({
            date: tsToDate(s.date).getTime(),
            kind: s.kind ?? 'Other',
            eventName: s.kind === 'Other' ? s.title : '',
            groups: merged,
          })
        );
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [setlistId]);

  function updateKeyChange(groupIndex: number, rowIndex: number, changeIndex: number, value: string) {
    setGroups((gs) =>
      gs.map((g, i) =>
        i === groupIndex
          ? {
              ...g,
              rows: g.rows.map((r, ri) =>
                ri === rowIndex
                  ? { ...r, keyChanges: r.keyChanges.map((kc, ci) => (ci === changeIndex ? value : kc)) }
                  : r
              ),
            }
          : g
      )
    );
  }

  function removeKeyChange(groupIndex: number, rowIndex: number, changeIndex: number) {
    setGroups((gs) =>
      gs.map((g, i) =>
        i === groupIndex
          ? {
              ...g,
              rows: g.rows.map((r, ri) =>
                ri === rowIndex
                  ? { ...r, keyChanges: r.keyChanges.filter((_, ci) => ci !== changeIndex) }
                  : r
              ),
            }
          : g
      )
    );
  }

  function addKeyChange(groupIndex: number, rowIndex: number) {
    setGroups((gs) =>
      gs.map((g, i) =>
        i === groupIndex
          ? {
              ...g,
              rows: g.rows.map((r, ri) =>
                ri === rowIndex ? { ...r, keyChanges: [...r.keyChanges, ''] } : r
              ),
            }
          : g
      )
    );
    setKeyPicker({ group: groupIndex, index: rowIndex, changeIndex: -1 });
  }

  function addRow(groupIndex: number) {
    setGroups((gs) =>
      gs.map((g, i) => (i === groupIndex ? { ...g, rows: [...g.rows, blankRow()] } : g))
    );
  }

  function updateRow(groupIndex: number, rowIndex: number, patch: Partial<Row>) {
    setGroups((gs) =>
      gs.map((g, i) =>
        i === groupIndex
          ? {
              ...g,
              rows: g.rows.map((r, ri) => (ri === rowIndex ? { ...r, ...patch } : r)),
            }
          : g
      )
    );
  }

  function removeRow(groupIndex: number, rowIndex: number) {
    setGroups((gs) =>
      gs.map((g, i) =>
        i === groupIndex
          ? { ...g, rows: g.rows.filter((_, ri) => ri !== rowIndex) }
          : g
      )
    );
  }

  function removeGroup(groupIndex: number) {
    if (groups.length <= 1) return;
    setGroups((gs) => gs.filter((_, i) => i !== groupIndex));
    if (keyPicker?.group === groupIndex) setKeyPicker(null);
  }

  function addGroup() {
    const name = newSectionName.trim();
    if (!name) {
      Alert.alert('Missing section name', 'Type a name like Offering or Altar Call.');
      return;
    }
    if (groups.some((g) => g.name.trim().toLowerCase() === name.toLowerCase())) {
      Alert.alert('Already exists', `There is already a "${name}" section.`);
      return;
    }
    setGroups((gs) => [...gs, { name, rows: [] }]);
    setNewSectionName('');
  }

  function entryNumber(groupIndex: number, rowIndex: number): number {
    let count = 0;
    for (let i = 0; i < groupIndex; i++) count += groups[i].rows.length;
    return count + rowIndex + 1;
  }

  const displayName = kind === 'Sunday Service' ? 'Sunday Service' : eventName.trim();

  function handleSubmit() {
    if (kind === 'Other' && !eventName.trim()) {
      Alert.alert('Missing event name', 'Type a name for this occasion.');
      return;
    }
    const entries: SetlistEntry[] = [];
    groups.forEach((g) => {
      const name = g.name.trim();
      if (!name) return;
      g.rows
        .filter((r) => r.title.trim())
        .forEach((r) => {
          const entry: SetlistEntry = {
            section: name,
            title: r.title.trim(),
            key: r.key.trim(),
            tempo: r.tempo.trim(),
          };
          if (r.keyChanges.some((k) => k.trim())) {
            entry.keyChanges = r.keyChanges.map((k) => k.trim()).filter(Boolean);
          }
          if (r.note.trim()) {
            entry.note = r.note.trim();
          }
          entries.push(entry);
        });
    });
    setSaving(true);
    onSubmit({ title: kind === 'Other' ? eventName.trim() : 'Sunday Service', kind, date, entries })
      .then(() => setSavedSnapshot(serialized))
      .catch(() => {
        Alert.alert('Error', 'Could not save the setlist. Please try again.');
      })
      .finally(() => setSaving(false));
  }

  if (!loaded) {
    return <LoadingView />;
  }

  const pickerGroup = keyPicker ? groups[keyPicker.group] : undefined;
  const pickerRow = keyPicker && pickerGroup ? pickerGroup.rows[keyPicker.index] : undefined;
  const pickerValue =
    keyPicker && pickerRow && keyPicker.changeIndex !== null
      ? pickerRow.keyChanges?.[
          keyPicker.changeIndex === -1
            ? (pickerRow.keyChanges.length ?? 1) - 1
            : keyPicker.changeIndex
        ]
      : pickerRow?.key;
  const pickerOptions =
    pickerValue && !MUSIC_KEYS.includes(pickerValue)
      ? [pickerValue, ...MUSIC_KEYS]
      : MUSIC_KEYS;

  function renderSection(groupIndex: number) {
    const group = groups[groupIndex];
    const isOther = group.name.trim().toLowerCase() === 'other';
    return (
      <View key={groupIndex}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionName, { color: brand.primary }]}>{group.name}</Text>
          {groups.length > 1 ? (
            <Pressable hitSlop={8} onPress={() => removeGroup(groupIndex)}>
              <Ionicons name="close" size={18} color={brand.danger} />
            </Pressable>
          ) : null}
        </View>
        {group.rows.length === 0 ? (
          <Text style={styles.emptyHint}>No songs in {group.name.toLowerCase()} yet.</Text>
        ) : (
          group.rows.map((row, index) => {
            return (
            <View key={index} style={[styles.entry, { backgroundColor: brand.card, borderColor: brand.cardBorder }]}>
              <View style={styles.entryTop}>
                <View style={[styles.numberBadge, { backgroundColor: brand.surface }]}>
                  <Text style={[styles.numberBadgeText, { color: brand.onCard }]}>{entryNumber(groupIndex, index)}</Text>
                </View>
                <TextInput
                  value={row.title}
                  onChangeText={(title) => updateRow(groupIndex, index, { title })}
                  placeholder="Song name"
                  placeholderTextColor={brand.muted}
                  selectionColor={brand.primary}
                  style={[styles.titleInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                />
                <Pressable hitSlop={8} onPress={() => removeRow(groupIndex, index)}>
                  <Ionicons name="trash-outline" size={19} color={brand.danger} />
                </Pressable>
              </View>
              <View style={styles.entryBottom}>
                <Pressable
                  onPress={() => setKeyPicker({ group: groupIndex, index, changeIndex: null })}
                  style={({ pressed }) => [styles.keyPill, pressed && !row.key && styles.keyPillPressed]}>
                  <Text style={row.key ? [styles.keyPillText, { color: brand.onCard }] : [styles.keyPillText, styles.keyPillPlaceholder]}>
                    {row.key || 'Key'}
                  </Text>
                  <Ionicons name="chevron-down" size={15} color={brand.muted} />
                </Pressable>
                {row.key ? (
                  <Pressable
                    hitSlop={6}
                    onPress={() => {
                      if (row.keyChanges.length) {
                        updateRow(groupIndex, index, { keyChanges: [] });
                      } else {
                        addKeyChange(groupIndex, index);
                      }
                    }}
                    style={styles.keyChangeToggle}>
                    <Ionicons
                      name={row.keyChanges.length ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={row.keyChanges.length ? brand.primary : brand.muted}
                    />
                    <Text style={[styles.keyChangeLabel, { color: row.keyChanges.length ? brand.onCard : brand.muted }]}>
                      Key change
                    </Text>
                  </Pressable>
                ) : null}
                <View style={styles.tempoWrap}>
                  <TextInput
                    value={row.tempo}
                    onChangeText={(tempo) => updateRow(groupIndex, index, { tempo })}
                    placeholder="BPM"
                    placeholderTextColor={brand.muted}
                    selectionColor={brand.primary}
                    keyboardType="numbers-and-punctuation"
                    maxLength={3}
                    style={[styles.tempoInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                  />
                  <Text style={[styles.tempoSuffix, { color: brand.muted }]}>BPM</Text>
                </View>
              </View>

              {row.keyChanges.length > 0 ? (
                <View style={styles.keyChangeWrap}>
                  <Text style={[styles.keyChangeHint, { color: brand.muted }]}>
                    Song changes key{row.keyChanges.length === 1 ? '' : ` (${row.keyChanges.length} changes)`}
                  </Text>
                  <View style={styles.keyChangeChips}>
                    {row.keyChanges.map((kc, ci) => (
                      <View key={ci} style={styles.keyChangeChipBox}>
                        <Pressable
                          onPress={() =>
                            setKeyPicker({ group: groupIndex, index, changeIndex: ci })
                          }
                          style={({ pressed }) => [
                            styles.keyChangeChip,
                            { backgroundColor: brand.card, borderColor: brand.cardBorder },
                            pressed && { opacity: 0.7 },
                          ]}>
                          <Text
                            style={[
                              styles.keyChangeChipText,
                              kc ? { color: brand.onCard } : styles.keyPillPlaceholder,
                            ]}>
                            {kc || 'To key'}
                          </Text>
                          <Ionicons name="chevron-down" size={14} color={brand.muted} />
                        </Pressable>
                        <Pressable hitSlop={6} onPress={() => removeKeyChange(groupIndex, index, ci)}>
                          <Ionicons name="close-circle" size={17} color={brand.danger} />
                        </Pressable>
                      </View>
                    ))}
                    <Pressable
                      onPress={() => addKeyChange(groupIndex, index)}
                      style={({ pressed }) => [
                        styles.keyChangeAdd,
                        { borderColor: brand.cardBorder },
                        pressed && { opacity: 0.7 },
                      ]}>
                      <Ionicons name="add" size={17} color={brand.primary} />
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {isOther ? (
                <TextInput
                  value={row.note}
                  onChangeText={(note) => updateRow(groupIndex, index, { note })}
                  placeholder="What is this for? e.g. Communion, Offering intro"
                  placeholderTextColor={brand.muted}
                  selectionColor={brand.primary}
                  style={[styles.noteInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                />
              ) : null}
            </View>
          );
          })
        )}
        <Pressable
          onPress={() => addRow(groupIndex)}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}>
          <Ionicons name="add-circle-outline" size={19} color={brand.primary} />
          <Text style={[styles.addBtnText, { color: brand.onCard }]}>Add to {group.name}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { flex: 1 }]}>
      {unsavedView}
      <ScrollView
        contentContainerStyle={styles.formContent}
        automaticallyAdjustKeyboardInsets={true}
        keyboardShouldPersistTaps="handled">
      <Text style={[styles.section, { color: brand.primary }]}>Details</Text>
      <Pressable onPress={() => setCalendarOpen((o) => !o)} style={styles.dateRow}>
        <Text style={[styles.section, { color: brand.primary }]}>Date</Text>
        <Text style={[styles.dateValue, { color: brand.onCard }]}>{formatDate(date)}</Text>
        <Ionicons
          name={calendarOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={brand.primary}
        />
      </Pressable>
      {calendarOpen ? <CalendarPicker value={date} onChange={setDate} /> : null}
      <Text style={styles.label}>Occasion</Text>
      <View style={styles.kindRow}>
        {SETLIST_KINDS.map((option) => {
          const selected = kind === option;
          return (
            <Pressable
              key={option}
              onPress={() => setKind(option)}
              style={[
                styles.kindChip,
                !selected && { backgroundColor: brand.card, borderColor: brand.cardBorder },
                selected && { backgroundColor: brand.primary, borderColor: brand.primary },
              ]}>
              <Text
                style={[
                  styles.kindText,
                  !selected && { color: brand.onCard },
                  selected && { color: '#ffffff' },
                ]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      {kind === 'Other' ? (
        <TextField
          label="Event name"
          value={eventName}
          onChangeText={setEventName}
          placeholder="e.g. Youth Sunday"
        />
      ) : null}
      <Text style={styles.namePreview}>
        Setlist name: <Text style={{ fontWeight: '700' }}>{displayName || '—'}</Text>
      </Text>

      <Text style={[styles.section, { color: brand.primary }]}>Songs</Text>
      {groups.map((_, groupIndex) => renderSection(groupIndex))}

      <View style={styles.addSectionRow}>
        <TextInput
          value={newSectionName}
          onChangeText={setNewSectionName}
          placeholder="New section, e.g. Offering"
          placeholderTextColor={brand.muted}
          selectionColor={brand.primary}
          style={[styles.addSectionInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          onSubmitEditing={addGroup}
          returnKeyType="done"
        />
        <Pressable
          onPress={addGroup}
          style={({ pressed }) => [styles.addSectionBtn, pressed && { opacity: 0.7 }]}>
          <Ionicons name="add" size={20} color="#ffffff" />
        </Pressable>
      </View>
      <Text style={styles.addSectionHint}>
        Extra sections (e.g. Communion) can be added or removed with the × next to a section.
      </Text>

      </ScrollView>

      <View style={[styles.saveBar, { borderTopColor: brand.cardBorder }]}>
        <Button title={submitLabel} icon={submitIcon} onPress={handleSubmit} loading={saving} />
      </View>

      <Modal
        visible={keyPicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setKeyPicker(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setKeyPicker(null)} />
          <View style={[styles.sheet, { backgroundColor: brand.card, borderColor: brand.cardBorder }]}>
            <View style={[styles.handle, { backgroundColor: brand.accentSoft }]} />
            <Text style={[styles.sheetTitle, { color: brand.primary }]}>Key</Text>
            <ScrollView contentContainerStyle={styles.chipWrap} keyboardShouldPersistTaps="handled">
              {pickerOptions.map((key) => {
                const selected = pickerValue === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      if (!keyPicker) return;
                      const { group, index } = keyPicker;
                      const ci = keyPicker.changeIndex;
                      if (ci === null) {
                        updateRow(group, index, {
                          key: selected ? '' : key,
                        });
                      } else {
                        const target =
                          ci === -1
                            ? (pickerRow?.keyChanges.length ?? 1) - 1
                            : ci;
                        updateKeyChange(group, index, target, selected ? '' : key);
                      }
                      setKeyPicker(null);
                    }}
                    style={[
                      styles.keyChip,
                      !selected && { backgroundColor: brand.card, borderColor: brand.cardBorder },
                      selected && { backgroundColor: brand.primary, borderColor: brand.primary },
                    ]}>
                    <Text
                      style={[
                        styles.keyChipText,
                        !selected && { color: brand.onCard },
                        selected && { color: '#ffffff' },
                      ]}>{key}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setKeyPicker(null)} hitSlop={10} style={styles.closeBtn}>
              <Text style={[styles.closeLabel, { color: brand.primary }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: 12,
  },
  formContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
  },
  sectionName: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateValue: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    textAlign: 'right',
  },
  kindRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kindChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#ffffff',
    paddingVertical: 11,
  },
  kindText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  namePreview: {
    fontSize: 13,
    color: '#888888',
  },
  emptyHint: {
    fontSize: 13,
    color: '#9AA2AF',
    marginBottom: 4,
  },
  entry: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 10,
    gap: 8,
    marginBottom: 8,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  numberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  titleInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14.5,
    fontWeight: '600',
  },
  entryBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  keyPillPressed: {
    opacity: 0.7,
  },
  keyPillText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  keyPillPlaceholder: {
    color: '#8A8A8A',
  },
  keyChangeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 2,
  },
  keyChangeLabel: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  keyChangeWrap: {
    gap: 6,
  },
  keyChangeHint: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  keyChangeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  keyChangeChipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  keyChangeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  keyChangeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  keyChangeAdd: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.2)',
  },
  noteInput: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  tempoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  tempoInput: {
    width: 56,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13.5,
  },
  tempoSuffix: {
    fontSize: 12,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  addBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  addSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  addSectionInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  addSectionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7E22CE',
  },
  addSectionHint: {
    fontSize: 11.5,
    color: '#9AA2AF',
    marginTop: 4,
  },
  saveBar: {
    borderTopWidth: 1,
    padding: 14,
    paddingBottom: 16,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keyChip: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#ffffff',
  },
  keyChipText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeBtn: {
    alignItems: 'center',
    paddingTop: 14,
  },
  closeLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});