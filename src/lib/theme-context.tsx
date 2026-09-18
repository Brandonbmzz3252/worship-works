import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

export interface BrandPalette {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentSoft: string;
  danger: string;
  muted: string;
  background: string;
  /** Wallpaper + header gradient — top color. */
  gradientStart: string;
  /** Wallpaper + header gradient — bottom color. */
  gradientEnd: string;
  /** Deep (dark) wallpaper style vs bright (light) style. */
  isDark: boolean;
  /** Card / bubble background — solid colour that stands out on the gradient. */
  card: string;
  /** Card border, subtle on its theme. */
  cardBorder: string;
  /** Primary text colour that sits on `card`. */
  onCard: string;
  /** Neutral subtle surface (icon buttons, pressed chips). */
  surface: string;
}

export type ThemeId = 'vibe' | 'dusk' | 'sunrise' | 'ember' | 'ocean' | 'abyss';

export const BRAND_PRESETS: Record<ThemeId, BrandPalette> = {
  vibe: {
    primary: '#6B21A8',
    primaryDark: '#4C1D95',
    primaryLight: '#8B5CF6',
    accent: '#F6C453',
    accentSoft: '#F3E8FF',
    danger: '#E11D48',
    muted: '#6B7280',
    background: '#F8F6FE',
    gradientStart: '#00C4CC',
    gradientEnd: '#6B21A8',
    isDark: false,
    card: '#FFFFFF',
    cardBorder: 'rgba(0,0,0,0.06)',
    onCard: '#24123F',
    surface: '#F1EDFA',
  },
  dusk: {
    primary: '#8B5CF6',
    primaryDark: '#5B21B6',
    primaryLight: '#A78BFA',
    accent: '#F6C453',
    accentSoft: '#3B2A6E',
    danger: '#F87171',
    muted: '#9CA3AF',
    background: '#171029',
    gradientStart: '#0E7490',
    gradientEnd: '#4C1D95',
    isDark: true,
    card: '#241A3B',
    cardBorder: 'rgba(255,255,255,0.14)',
    onCard: '#F6F1FE',
    surface: '#2E2450',
  },
  sunrise: {
    primary: '#DB2777',
    primaryDark: '#BE185D',
    primaryLight: '#F472B6',
    accent: '#F59E0B',
    accentSoft: '#FFE4E6',
    danger: '#DC2626',
    muted: '#6B7280',
    background: '#FEF6F7',
    gradientStart: '#F59E0B',
    gradientEnd: '#E11D48',
    isDark: false,
    card: '#FFFFFF',
    cardBorder: 'rgba(0,0,0,0.06)',
    onCard: '#3A1420',
    surface: '#FCEFF1',
  },
  ember: {
    primary: '#FB7185',
    primaryDark: '#BE185D',
    primaryLight: '#FDA4AF',
    accent: '#FBBF24',
    accentSoft: '#3D1420',
    danger: '#F87171',
    muted: '#9CA3AF',
    background: '#200B17',
    gradientStart: '#B45309',
    gradientEnd: '#9F1239',
    isDark: true,
    card: '#2B1520',
    cardBorder: 'rgba(255,255,255,0.14)',
    onCard: '#FEF2F2',
    surface: '#3A1D2A',
  },
  ocean: {
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    primaryLight: '#60A5FA',
    accent: '#67E8F9',
    accentSoft: '#DBEAFE',
    danger: '#E11D48',
    muted: '#6B7280',
    background: '#F2F7FE',
    gradientStart: '#06B6D4',
    gradientEnd: '#2563EB',
    isDark: false,
    card: '#FFFFFF',
    cardBorder: 'rgba(0,0,0,0.06)',
    onCard: '#0F2540',
    surface: '#ECF3FD',
  },
  abyss: {
    primary: '#60A5FA',
    primaryDark: '#1D4ED8',
    primaryLight: '#93C5FD',
    accent: '#67E8F9',
    accentSoft: '#152B56',
    danger: '#F87171',
    muted: '#9CA3AF',
    background: '#0E1A38',
    gradientStart: '#075985',
    gradientEnd: '#1E3A8A',
    isDark: true,
    card: '#16223F',
    cardBorder: 'rgba(255,255,255,0.14)',
    onCard: '#EDF5FF',
    surface: '#1E2D52',
  },
};

const STORAGE_KEY = 'worship-works-theme';

const ThemeIdContext = createContext<{ themeId: ThemeId; setThemeId: (id: ThemeId) => void }>({
  themeId: 'vibe',
  setThemeId: () => {},
});

export function BrandProvider({ children }: PropsWithChildren) {
  const [themeId, setThemeId] = useState<ThemeId>('vibe');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored && stored in BRAND_PRESETS) setThemeId(stored as ThemeId);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, themeId).catch(() => {});
  }, [themeId]);

  return (
    <ThemeIdContext.Provider value={{ themeId, setThemeId }}>
      {children}
    </ThemeIdContext.Provider>
  );
}

export function useBrand(): BrandPalette {
  const { themeId } = useContext(ThemeIdContext);
  return BRAND_PRESETS[themeId];
}

export function useThemeId(): [ThemeId, (id: ThemeId) => void] {
  const { themeId, setThemeId } = useContext(ThemeIdContext);
  return [themeId, setThemeId];
}