import DateTimePicker, { type DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import { useBrand } from '@/lib/theme-context';
import { formatDate, formatTime } from '@/lib/format';

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
};

export function DateTimeField({ label, value, onChange, mode = 'date', minimumDate, maximumDate }: Props) {
  const theme = useTheme();
  const brand = useBrand();
  const [open, setOpen] = useState(false);
  const isIOS = Platform.OS === 'ios';
  const displayText = mode === 'time' ? formatTime(value) : formatDate(value);

  function handleValueChange(_event: DateTimePickerChangeEvent, date: Date) {
    onChange(date);
    if (!isIOS) {
      setOpen(false);
    }
  }

  function handleDismiss() {
    setOpen(false);
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: brand.muted }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name={mode === 'time' ? 'time-outline' : 'calendar-outline'} size={18} color={brand.primary} />
        <Text style={[styles.value, { color: theme.text }]}>{displayText}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
      </Pressable>
      {open ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={value}
            mode={mode}
            display={isIOS && mode === 'date' ? 'inline' : 'spinner'}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onValueChange={handleValueChange}
            onDismiss={handleDismiss}
            onNeutralButtonPress={handleDismiss}
          />
          {isIOS ? (
            <Pressable onPress={() => setOpen(false)} style={styles.doneBtn}>
              <Text style={[styles.doneText, { color: brand.primary }]}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  value: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  pickerWrap: {
    marginTop: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  doneText: {
    fontSize: 15,
    fontWeight: '700',
  },
});