import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useBrand } from '@/lib/theme-context';

export function LoadingView() {
  const brand = useBrand();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={brand.primary} />
      <Text style={[styles.label, { color: brand.muted }]}>Loading…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  label: {
    marginTop: 12,
    fontSize: 14,
  },
});