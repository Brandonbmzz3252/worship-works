import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useBrand } from '@/lib/theme-context';

type Props = TextInputProps & {
  label?: string;
  multiline?: boolean;
};

export function TextField({ label, style, multiline, secureTextEntry, ...inputProps }: Props) {
  const theme = useTheme();
  const brand = useBrand();
  const [hidden, setHidden] = useState(true);
  const isPassword = !!secureTextEntry;

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: brand.muted }]}>{label}</Text>
      ) : null}
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={brand.muted}
          selectionColor={brand.primary}
          multiline={multiline}
          numberOfLines={multiline ? 4 : undefined}
          textAlignVertical={multiline ? 'top' : undefined}
          secureTextEntry={isPassword ? hidden : undefined}
          style={[
            styles.input,
            isPassword && styles.inputWithToggle,
            {
              backgroundColor: theme.backgroundElement,
              color: theme.text,
              borderColor: theme.backgroundElement,
            },
            multiline && styles.multiline,
            style,
          ]}
          {...inputProps}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            style={styles.toggle}
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={brand.muted}
            />
          </Pressable>
        ) : null}
      </View>
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
  inputRow: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 44,
  },
  inputWithToggle: {
    paddingRight: 46,
  },
  toggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  multiline: {
    minHeight: 96,
    paddingTop: 12,
  },
});