import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

export function HeaderBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.btn} accessibilityLabel="Back">
      <Ionicons name="arrow-back" size={24} color="#ffffff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingRight: 12,
    paddingVertical: 6,
  },
});