import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useBrand } from '@/lib/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthDay, monthDayToDate, monthName, pad } from '@/lib/format';

type Props = {
  label: string;
  /** Month and day as "MM-DD". */
  value: string | null;
  onChange: (md: string) => void;
};

export function MonthDayField({ label, value, onChange }: Props) {
  const brand = useBrand();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [monthIndex, setMonthIndex] = useState(() => {
    if (!value) return 0;
    const m = parseInt(value.split('-')[0], 10);
    return Number.isFinite(m) && m >= 1 && m <= 12 ? m - 1 : 0;
  });

  const display = value ? formatMonthDay(monthDayToDate(value)) : 'Choose…';
  const daysInMonth = new Date(2000, monthIndex + 1, 0).getDate();

  function pickDay(day: number) {
    onChange(`${pad(monthIndex + 1)}-${pad(day)}`);
    setOpen(false);
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: brand.muted }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundElement,
          },
          pressed && styles.fieldPressed,
        ]}>
        <Text style={[value ? styles.value : styles.placeholder, { color: value ? brand.onCard : brand.muted }]}>{display}</Text>
        <Ionicons name="calendar-outline" size={18} color={brand.primary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: brand.card }]}>
            <View style={[styles.handle, { backgroundColor: brand.accentSoft }]} />
            <Text style={[styles.sheetTitle, { color: brand.primary }]}>{label}</Text>

            <View style={styles.monthRow}>
              {Array.from({ length: 12 }, (_, i) => {
                const active = i === monthIndex;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setMonthIndex(i)}
                    style={[
                      styles.monthChip,
                      { backgroundColor: brand.card, borderColor: brand.cardBorder },
                      active && { backgroundColor: brand.primary, borderColor: brand.primary },
                    ]}>
                    <Text style={[styles.monthChipText, { color: brand.onCard }, active && { color: '#ffffff' }]}>
                      {monthName(i)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.dayGrid}>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const selected = value === `${pad(monthIndex + 1)}-${pad(day)}`;
                return (
                  <Pressable
                    key={day}
                    onPress={() => pickDay(day)}
                    style={[
                      styles.dayCell,
                      { backgroundColor: brand.surface },
                      selected && { backgroundColor: brand.primary },
                    ]}>
                    <Text style={[styles.dayText, { color: brand.onCard }, selected && { color: '#ffffff' }]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => setOpen(false)} hitSlop={10} style={styles.closeBtn}>
              <Text style={[styles.closeLabel, { color: brand.primary }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  field: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldPressed: {
    opacity: 0.85,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  placeholder: {
    fontSize: 15,
    color: '#8A8A8A',
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
    maxHeight: '75%',
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
    marginBottom: 10,
  },
  monthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  monthChip: {
    borderRadius: 10,
    borderWidth: 1.4,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  monthChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCell: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
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