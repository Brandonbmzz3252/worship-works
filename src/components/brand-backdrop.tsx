import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type DimensionValue } from 'react-native';

import { useBrand } from '@/lib/theme-context';

type Icon = keyof typeof Ionicons.glyphMap;

interface Doodle {
  icon: Icon;
  size: number;
  top: DimensionValue;
  left: DimensionValue;
  rotate: number;
  opacity: number;
}

const DOODLES: Doodle[] = [
  { icon: 'musical-note', size: 30, top: '4%', left: '6%', rotate: -10, opacity: 0.09 },
  { icon: 'sparkles', size: 20, top: '7%', left: '30%', rotate: 9, opacity: 0.11 },
  { icon: 'book-outline', size: 26, top: '5%', left: '52%', rotate: -4, opacity: 0.07 },
  { icon: 'star-outline', size: 22, top: '9%', left: '74%', rotate: 12, opacity: 0.1 },
  { icon: 'musical-notes', size: 34, top: '4%', left: '88%', rotate: 8, opacity: 0.09 },
  { icon: 'heart-outline', size: 24, top: '12%', left: '14%', rotate: -8, opacity: 0.08 },
  { icon: 'mic-outline', size: 28, top: '14%', left: '40%', rotate: 6, opacity: 0.07 },
  { icon: 'sparkles', size: 18, top: '11%', left: '62%', rotate: -12, opacity: 0.1 },
  { icon: 'radio-outline', size: 26, top: '16%', left: '82%', rotate: -6, opacity: 0.07 },
  { icon: 'musical-note', size: 24, top: '19%', left: '24%', rotate: 14, opacity: 0.09 },
  { icon: 'heart-outline', size: 20, top: '22%', left: '56%', rotate: 10, opacity: 0.07 },
  { icon: 'star-outline', size: 26, top: '20%', left: '72%', rotate: -9, opacity: 0.09 },
  { icon: 'book-outline', size: 30, top: '25%', left: '8%', rotate: 7, opacity: 0.06 },
  { icon: 'musical-notes', size: 24, top: '27%', left: '34%', rotate: -5, opacity: 0.08 },
  { icon: 'mic', size: 22, top: '24%', left: '66%', rotate: 11, opacity: 0.06 },
  { icon: 'sparkles', size: 16, top: '31%', left: '14%', rotate: 5, opacity: 0.1 },
  { icon: 'radio-outline', size: 30, top: '33%', left: '48%', rotate: -8, opacity: 0.06 },
  { icon: 'musical-note', size: 26, top: '36%', left: '84%', rotate: 6, opacity: 0.08 },
  { icon: 'heart-outline', size: 28, top: '39%', left: '26%', rotate: -11, opacity: 0.07 },
  { icon: 'star-outline', size: 20, top: '42%', left: '58%', rotate: 13, opacity: 0.09 },
  { icon: 'book-outline', size: 24, top: '44%', left: '90%', rotate: -7, opacity: 0.06 },
  { icon: 'musical-notes', size: 32, top: '46%', left: '6%', rotate: 9, opacity: 0.08 },
  { icon: 'mic-outline', size: 26, top: '48%', left: '38%', rotate: -6, opacity: 0.06 },
  { icon: 'sparkles', size: 18, top: '50%', left: '70%', rotate: 8, opacity: 0.1 },
  { icon: 'musical-note', size: 24, top: '53%', left: '18%', rotate: -10, opacity: 0.08 },
  { icon: 'heart-outline', size: 22, top: '52%', left: '52%', rotate: 7, opacity: 0.07 },
  { icon: 'star-outline', size: 28, top: '57%', left: '86%', rotate: -5, opacity: 0.09 },
  { icon: 'radio-outline', size: 24, top: '60%', left: '10%', rotate: 12, opacity: 0.06 },
  { icon: 'musical-notes', size: 26, top: '62%', left: '42%', rotate: -9, opacity: 0.08 },
  { icon: 'mic', size: 30, top: '64%', left: '72%', rotate: 5, opacity: 0.06 },
  { icon: 'sparkles', size: 16, top: '67%', left: '28%', rotate: -13, opacity: 0.1 },
  { icon: 'book-outline', size: 26, top: '69%', left: '56%', rotate: 8, opacity: 0.07 },
  { icon: 'musical-note', size: 28, top: '72%', left: '90%', rotate: -4, opacity: 0.08 },
  { icon: 'heart-outline', size: 24, top: '75%', left: '6%', rotate: 11, opacity: 0.07 },
  { icon: 'star-outline', size: 20, top: '73%', left: '36%', rotate: -8, opacity: 0.09 },
  { icon: 'mic-outline', size: 26, top: '78%', left: '62%', rotate: 6, opacity: 0.06 },
  { icon: 'musical-notes', size: 22, top: '81%', left: '18%', rotate: -11, opacity: 0.08 },
  { icon: 'radio-outline', size: 26, top: '83%', left: '80%', rotate: 9, opacity: 0.06 },
  { icon: 'sparkles', size: 20, top: '86%', left: '44%', rotate: -6, opacity: 0.1 },
  { icon: 'book-outline', size: 28, top: '88%', left: '68%', rotate: 13, opacity: 0.07 },
  { icon: 'musical-note', size: 24, top: '91%', left: '10%', rotate: 5, opacity: 0.08 },
  { icon: 'star-outline', size: 22, top: '93%', left: '30%', rotate: -9, opacity: 0.09 },
  { icon: 'heart-outline', size: 20, top: '90%', left: '58%', rotate: 8, opacity: 0.07 },
  { icon: 'mic', size: 24, top: '94%', left: '86%', rotate: -5, opacity: 0.06 },
];

export function BrandBackdrop() {
  const brand = useBrand();

  return (
    <View pointerEvents="none" style={styles.fill}>
      <LinearGradient
        colors={[brand.gradientStart, brand.gradientEnd]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.fill}
      />
      {DOODLES.map((d, i) => (
        <View
          key={`${d.icon}-${i}`}
          style={[styles.doodle, { top: d.top, left: d.left, transform: [{ rotate: `${d.rotate}deg` }] }]}>
          <Ionicons name={d.icon} size={d.size} color="#ffffff" style={{ opacity: d.opacity }} />
        </View>
      ))}
      <View style={styles.vignette} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  doodle: {
    position: 'absolute',
  },
  vignette: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
});