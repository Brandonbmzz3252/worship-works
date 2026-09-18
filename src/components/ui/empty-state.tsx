import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';

import { useBrand } from '@/lib/theme-context';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
};

export function EmptyState({ icon, title, message }: Props) {
  const brand = useBrand();

  return (
    <View style={[styles.container, { backgroundColor: brand.card }]}>
      <View style={[styles.iconCircle, { backgroundColor: brand.primary + '15' }]}>
        <Ionicons name={icon} size={30} color={brand.primary} />
      </View>
      <Text style={[styles.title, { color: brand.onCard }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: brand.muted }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: 28,
    gap: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});