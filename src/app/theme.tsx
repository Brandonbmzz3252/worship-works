import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  useBrand,
  useThemeId,
  BRAND_PRESETS,
  type BrandPalette,
  type ThemeId,
} from '@/lib/theme-context';

const THEME_ORDER: ThemeId[] = ['vibe', 'dusk', 'sunrise', 'ember', 'ocean', 'abyss'];

const THEME_LABELS: Record<ThemeId, string> = {
  vibe: 'Violet Vibe',
  dusk: 'Purple Dusk',
  sunrise: 'Sunrise',
  ember: 'Ember Night',
  ocean: 'Ocean',
  abyss: 'Deep Ocean',
};

function ThemeRow({
  themeId,
  palette,
  selected,
  onPress,
}: {
  themeId: ThemeId;
  palette: BrandPalette;
  selected: boolean;
  onPress: () => void;
}) {
  const brand = useBrand();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: brand.card, borderColor: brand.cardBorder },
        pressed && styles.rowPressed,
      ]}>
      <View style={styles.swatch}>
        <View style={[styles.swatchChip, { backgroundColor: palette.gradientStart }]} />
        <View style={[styles.swatchChip, { backgroundColor: palette.gradientEnd }]} />
        <View style={[styles.swatchChip, { backgroundColor: palette.accent }]} />
      </View>
      <Text style={[styles.label, { color: brand.onCard }]}>{THEME_LABELS[themeId]}</Text>
      {palette.isDark ? <Text style={styles.darkTag}>Dark</Text> : null}
      {selected ? (
        <Ionicons name="checkmark-circle" size={24} color={palette.primary} />
      ) : null}
    </Pressable>
  );
}

export default function ThemeScreen() {
  const brand = useBrand();
  const [themeId, setThemeId] = useThemeId();

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: brand.card }]}
      contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: 'Appearance',
          headerShown: true,
          headerStyle: { backgroundColor: brand.primary },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Text style={[styles.heading, { color: brand.primary }]}>App theme</Text>
      <Text style={styles.subheading}>
        {"Pick a colour theme. It's saved on this device and applies everywhere in the app."}
      </Text>
      <View style={styles.list}>
        {THEME_ORDER.map((id) => (
          <ThemeRow
            key={id}
            themeId={id}
            palette={BRAND_PRESETS[id]}
            selected={id === themeId}
            onPress={() => setThemeId(id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
  },
  subheading: {
    fontSize: 13.5,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 20,
  },
  list: {
    gap: 12,
    marginTop: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rowPressed: {
    opacity: 0.7,
  },
  swatch: {
    flexDirection: 'row',
    gap: 6,
  },
  swatchChip: {
    width: 30,
    height: 30,
    borderRadius: 10,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  darkTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    backgroundColor: '#F0F0F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
});