import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { ComponentProps } from 'react';

import { useBrand } from '@/lib/theme-context';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, icon, style }: Props) {
  const theme = useTheme();
  const brand = useBrand();

  const containerStyle = [
    styles.base,
    variant === 'primary' && { backgroundColor: brand.primary },
    variant === 'danger' && { backgroundColor: brand.danger },
    variant === 'outline' && {
      backgroundColor: 'transparent',
      borderWidth: 1.4,
      borderColor: brand.primary,
    },
    variant === 'ghost' && { backgroundColor: theme.backgroundElement },
    (disabled || loading) && styles.disabled,
    style,
  ];

  const labelColor =
    variant === 'outline' ? brand.primary : variant === 'ghost' ? theme.text : '#ffffff';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [containerStyle, pressed && styles.pressed]}>
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={labelColor} style={styles.icon} /> : null}
          <Text style={[styles.label, { color: labelColor }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  icon: {
    marginRight: 8,
  },
});