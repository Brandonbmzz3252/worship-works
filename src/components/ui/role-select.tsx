import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useBrand } from '@/lib/theme-context';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  value: string | null;
  options: string[];
  onSelect: (name: string | null) => void;
  placeholder?: string;
};

export function RoleSelect({ label, value, options, onSelect, placeholder = 'Select…' }: Props) {
  const brand = useBrand();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');

  const allOptions = value && !options.includes(value) ? [value, ...options] : options;

  function pick(name: string) {
    setOpen(false);
    setCustom('');
    onSelect(name);
  }

  function pickCustom() {
    const name = custom.trim();
    if (!name) return;
    setOpen(false);
    setCustom('');
    onSelect(name);
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
        <Text style={[value ? styles.value : styles.placeholder, { color: value ? theme.text : theme.textSecondary }]}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={brand.muted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: brand.card }]}>
            <View style={[styles.handle, { backgroundColor: brand.accentSoft }]} />
            <Text style={[styles.sheetTitle, { color: brand.primary }]}>{label}</Text>

            <View style={[styles.customRow, { backgroundColor: theme.backgroundElement }]}>
              <TextInput
                value={custom}
                onChangeText={setCustom}
                placeholder="Type a name not listed…"
                placeholderTextColor={brand.muted}
                selectionColor={brand.primary}
                style={[styles.customInput, { color: theme.text }]}
                onSubmitEditing={pickCustom}
                returnKeyType="done"
              />
              <Pressable hitSlop={8} onPress={pickCustom} disabled={!custom.trim()}>
                <Ionicons
                  name="arrow-forward-circle"
                  size={26}
                  color={custom.trim() ? brand.primary : brand.muted}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() => pick('')}
              style={({ pressed }) => [styles.option, { borderBottomColor: brand.cardBorder }, pressed && styles.optionPressed]}>
              <Ionicons name="close-circle-outline" size={20} color={brand.danger} />
              <Text style={[styles.optionText, { color: brand.danger }]}>No one</Text>
            </Pressable>

            <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
              {allOptions.map((name) => {
                const selected = value === name;
                return (
                  <Pressable
                    key={name}
                    onPress={() => pick(name)}
                    style={({ pressed }) => [styles.option, { borderBottomColor: brand.cardBorder }, pressed && styles.optionPressed]}>
                    <Text style={[styles.optionText, { color: brand.onCard }]}>{name}</Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={20} color={brand.primary} />
                    ) : (
                      <View style={styles.optionSpacer} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable onPress={() => setOpen(false)} hitSlop={10} style={styles.closeBtn}>
              <Text style={[styles.closeLabel, { color: brand.primary }]}>Close</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
    color: '#1A1A1A',
    flex: 1,
    paddingRight: 8,
  },
  placeholder: {
    fontSize: 15,
    color: '#8A8A8A',
    flex: 1,
    paddingRight: 8,
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
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 6,
    gap: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  optionPressed: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    paddingRight: 10,
  },
  optionSpacer: {
    width: 20,
  },
  options: {
    maxHeight: 300,
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