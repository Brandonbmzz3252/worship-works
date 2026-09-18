import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { CalendarPicker } from '@/components/calendar-picker';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { RoleSelect } from '@/components/ui/role-select';
import { useBrand } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { subscribeMembers } from '@/lib/store';
import { BAND_ROLES, OTHER_ROLE, SINGER_ROLE, SINGER_SLOTS, sectionForPosition } from '@/lib/types';
import type { BandRole, MemberDir, OtherInstrument } from '@/lib/types';

type Props = {
  initial?: {
    serviceDate: Date;
    leader: string;
    band: Record<string, string>;
    singers: string[];
    other?: OtherInstrument[];
  };
  submitLabel: string;
  submitIcon?: 'checkmark-circle-outline' | 'pencil';
  onSubmit: (input: {
    serviceDate: Date;
    leader: string;
    band: Record<string, string>;
    singers: string[];
    other: OtherInstrument[];
  }) => Promise<void>;
};

function blankBand(): Record<string, string> {
  return Object.fromEntries(BAND_ROLES.map((role) => [role, '']));
}

export function RosterForm({ initial, submitLabel, submitIcon = 'checkmark-circle-outline', onSubmit }: Props) {
  const brand = useBrand();
  const { profile } = useAuth();
  const navigation = useNavigation();
  const [members, setMembers] = useState<MemberDir[] | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [date, setDate] = useState<Date>(initial ? new Date(initial.serviceDate) : new Date());
  const [leader, setLeader] = useState(initial?.leader ?? '');
  const [band, setBand] = useState<Record<string, string>>(
    initial ? { ...blankBand(), ...initial.band } : blankBand()
  );
  const [singers, setSingers] = useState<string[]>(initial?.singers ?? []);
  const [other, setOther] = useState<OtherInstrument[]>(initial?.other ?? []);
  const [saving, setSaving] = useState(false);
  const churchId = profile?.churchId ?? null;

  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({
      date: date.getTime(),
      leader: initial?.leader ?? '',
      band: initial?.band ?? blankBand(),
      singers: initial?.singers ?? [],
      other: initial?.other ?? [],
    })
  );
  const serialized = useMemo(
    () => JSON.stringify({ date: date.getTime(), leader, band, singers, other }),
    [date, leader, band, singers, other]
  );
  const dirty = serialized !== savedSnapshot;
  const { view: unsavedView, requestBack } = useUnsavedGuard(dirty, handleSubmit, true);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => <HeaderBackButton onPress={requestBack} />,
    });
  }, [navigation, requestBack]);

  useEffect(() => subscribeMembers(churchId ?? '', setMembers), [churchId]);

  const singerOptions = (members ?? [])
    .filter((m) => m.role === SINGER_ROLE)
    .map((m) => m.name);
  const optionsFor = (position: string) =>
    (members ?? [])
      .filter((m) => m.role === sectionForPosition(position as BandRole))
      .map((m) => m.name);
  const otherMembers = (members ?? []).filter((m) => m.role === OTHER_ROLE);

  const selectedCount = singers.filter((s) => s.trim()).length;
  const unlisted = singers.filter((s) => !singerOptions.includes(s));

  function toggleSinger(name: string) {
    if (singers.includes(name)) {
      setSingers((prev) => prev.filter((s) => s !== name));
    } else if (selectedCount < SINGER_SLOTS) {
      setSingers((prev) => [...prev, name]);
    } else {
      Alert.alert('Singers full', `You can add up to ${SINGER_SLOTS} singers.`);
    }
  }

  function toggleOther(member: MemberDir) {
    if (other.some((o) => o.name === member.name)) {
      setOther((prev) => prev.filter((o) => o.name !== member.name));
    } else {
      setOther((prev) => [
        ...prev,
        { instrument: member.instrument?.trim() || 'Other', name: member.name },
      ]);
    }
  }

  function handleSubmit() {
    if (!leader.trim()) {
      Alert.alert('Missing Lead Singer', 'Select the lead singer for this service.');
      return;
    }
    const cleanedBand = Object.fromEntries(
      Object.entries(band).map(([role, name]) => [role, name.trim()])
    );
    const cleanedSingers = singers.filter((s) => s.trim()).map((s) => s.trim());
    const finalSingers = cleanedSingers.filter((s) => s !== leader.trim());
    const cleanedOther = other
      .map((o) => ({ instrument: o.instrument.trim(), name: o.name.trim() }))
      .filter((o) => o.name);
    setSaving(true);
    onSubmit({
      serviceDate: new Date(date),
      leader: leader.trim(),
      band: cleanedBand,
      singers: finalSingers,
      other: cleanedOther,
    })
      .then(() => setSavedSnapshot(serialized))
      .catch(() => {
        Alert.alert('Error', 'Could not save the roster. Please try again.');
      })
      .finally(() => setSaving(false));
  }

  return (
    <View style={styles.wrap}>
      {unsavedView}
      <Pressable
        onPress={() => setCalendarOpen((o) => !o)}
        style={styles.sectionRow}>
        <Text style={[styles.section, { color: brand.primary }]}>Service date</Text>
        <Ionicons
          name={calendarOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={brand.primary}
        />
      </Pressable>
      {calendarOpen ? <CalendarPicker value={date} onChange={setDate} /> : null}

      <Text style={[styles.section, { color: brand.primary }]}>Singers</Text>
      <Text style={styles.hint}>
        The lead singer comes from the singers below ({selectedCount}/{SINGER_SLOTS} chosen).
      </Text>
      <RoleSelect
        label="Lead Singer"
        value={leader || null}
        options={singerOptions}
        onSelect={(name) => setLeader(name ?? '')}
        placeholder="Select a singer"
      />
      <View style={styles.chipWrap}>
        {members === null ? (
          <Text style={styles.loading}>Loading members…</Text>
        ) : (
          singerOptions.map((name) => {
            const selected = singers.includes(name);
            const full = !selected && selectedCount >= SINGER_SLOTS;
            return (
              <Pressable
                key={name}
                onPress={() => toggleSinger(name)}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: brand.card, borderColor: brand.cardBorder },
                  selected && { backgroundColor: brand.primary, borderColor: brand.primary },
                  full && styles.chipDisabled,
                  pressed && styles.chipPressed,
                ]}>
                <Text style={[styles.chipText, { color: brand.onCard }, selected && { color: '#ffffff' }]}>{name}</Text>
                {selected ? (
                  <Ionicons name="checkmark" size={15} color="#ffffff" />
                ) : null}
              </Pressable>
            );
          })
        )}
      </View>
      {unlisted.length > 0 ? (
        <View style={styles.chipWrap}>
          {unlisted.map((name) => (
            <Pressable
              key={name}
              onPress={() => setSingers((prev) => prev.filter((s) => s !== name))}
              style={({ pressed }) => [styles.chip, styles.chipUnlisted, { backgroundColor: brand.surface }, pressed && styles.chipPressed]}>
              <Text style={[styles.chipTextUnlisted, { color: brand.onCard }]}>{name}</Text>
              <Ionicons name="close" size={15} color={brand.danger} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={[styles.section, { color: brand.primary }]}>Band</Text>
      <Text style={styles.hint}>Any Keyboard member can fill Keyboard 1, Keyboard 2 or Synth; any Guitar member fills Guitar 1 or 2.</Text>
      {BAND_ROLES.map((role) => (
        <RoleSelect
          key={role}
          label={role}
          value={band[role] || null}
          options={optionsFor(role)}
          onSelect={(name) => setBand((prev) => ({ ...prev, [role]: name ?? '' }))}
          placeholder="Select member"
        />
      ))}

      {otherMembers.length > 0 ? (
        <>
          <Text style={[styles.section, { color: brand.primary }]}>Other musicians</Text>
          <Text style={styles.hint}>
            Tap a member below to include them and their instrument in this service.
          </Text>
          <View style={styles.chipWrap}>
            {otherMembers.map((member) => {
              const selected = other.some((o) => o.name === member.name);
              const instrument = member.instrument?.trim() || 'Other';
              return (
                <Pressable
                  key={member.id}
                  onPress={() => toggleOther(member)}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: brand.card, borderColor: brand.cardBorder },
                    selected && { backgroundColor: brand.primary, borderColor: brand.primary },
                    pressed && styles.chipPressed,
                  ]}>
                  <Text style={[styles.chipText, { color: brand.onCard }, selected && { color: '#ffffff' }]}>
                    {instrument} — {member.name}
                  </Text>
                  {selected ? <Ionicons name="checkmark" size={15} color="#ffffff" /> : null}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <View style={styles.footer}>
        <Button
          title={submitLabel}
          icon={submitIcon}
          onPress={handleSubmit}
          loading={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  section: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  hint: {
    fontSize: 12.5,
    color: '#6B7280',
    marginTop: -8,
  },
  loading: {
    fontSize: 13,
    color: '#8A8A8A',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  chipUnlisted: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderStyle: 'dashed',
  },
  chipTextUnlisted: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  footer: {
    marginTop: 14,
  },
});