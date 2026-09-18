import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBrand } from '@/lib/theme-context';
import { formatDate, isSameDay } from '@/lib/format';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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

function nextSunday(): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysUntilSunday = (7 - d.getDay()) % 7;
  if (daysUntilSunday === 0) {
    d.setDate(d.getDate() + 7);
  } else {
    d.setDate(d.getDate() + daysUntilSunday);
  }
  return d;
}

export function CalendarPicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (date: Date) => void;
}) {
  const brand = useBrand();
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const list: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) list.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      list.push(new Date(month.getFullYear(), month.getMonth(), day));
    }
    return list;
  }, [month]);

  const today = new Date();
  const ns = nextSunday();

  function shift(by: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));
  }

  return (
    <View style={[styles.wrap, { backgroundColor: brand.card, borderColor: brand.cardBorder }]}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => shift(-1)} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={20} color={brand.primary} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: brand.primary }]}>
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </Text>
        <Pressable hitSlop={10} onPress={() => shift(1)} style={styles.headerBtn}>
          <Ionicons name="chevron-forward" size={20} color={brand.primary} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((day) => (
          <Text
            key={day}
            style={[styles.weekDay, day === 'Su' && { color: brand.accent }]}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (!day) {
            return <View key={index} style={styles.cell} />;
          }
          const selected = isSameDay(day, value);
          const isToday = isSameDay(day, today);
          const isSunday = day.getDay() === 0;
          return (
            <Pressable key={index} style={styles.cell} onPress={() => onChange(day)}>
              <View
                style={[
                  styles.dayCircle,
                  selected && { backgroundColor: brand.primary },
                  !selected && isSunday && { backgroundColor: brand.accentSoft },
                  !selected && isToday && { borderWidth: 1.6, borderColor: brand.primary },
                ]}>
                <Text
                  style={[
                    styles.dayText,
                    { color: brand.onCard },
                    selected && { color: '#ffffff', fontWeight: '800' },
                    !selected && isSunday && { color: brand.accent, fontWeight: '800' },
                    !selected && !isSunday && isToday && { color: brand.primary, fontWeight: '800' },
                  ]}>
                  {day.getDate()}
                </Text>
              </View>
              {isSunday && !selected ? (
                <View style={[styles.sunTick, { backgroundColor: brand.accent }]} />
              ) : (
                <View style={styles.sunTickSpacer} />
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => {
          setMonth(new Date(ns.getFullYear(), ns.getMonth(), 1));
          onChange(ns);
        }}
        style={[styles.nextSunday, { borderColor: brand.accentSoft, backgroundColor: brand.accentSoft }]}>
        <Ionicons name="sunny-outline" size={16} color={brand.accent} />
        <Text style={[styles.nextSundayText, { color: brand.accent }]}>
          Next Sunday: {formatDate(ns)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#8A8A8A',
    paddingBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sunTick: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  sunTickSpacer: {
    height: 6,
  },
  nextSunday: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
  },
  nextSundayText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});