/**
 * The app always uses the light (warm) palette — this is a church app and
 * should not flip to system dark mode.
 */

import { Colors } from '@/constants/theme';

export function useTheme() {
  return Colors.light;
}