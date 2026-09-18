import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HeaderAdd, HeaderMenu } from '@/components/ui/header-menu';
import { useAuth } from '@/lib/auth-context';
import { useBrand } from '@/lib/theme-context';

type WebTab = {
  label: string;
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  add?: string;
  publicAdd?: boolean;
};

const TABS: WebTab[] = [
  {
    label: 'Setlist',
    href: '/',
    icon: 'musical-notes',
    add: '/setlist-new',
    publicAdd: true,
  },
  { label: 'Songs', href: '/songs', icon: 'library', add: '/admin/song-upload' },
  { label: 'Chat', href: '/chat', icon: 'chatbubbles' },
  { label: 'Schedule', href: '/schedule', icon: 'calendar', add: '/admin/event-new' },
  { label: 'Roster', href: '/roster', icon: 'people', add: '/admin/roster-new' },
];

export function WebHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const brand = useBrand();
  const { isAdmin } = useAuth();

  const active = TABS.find((tab) => tab.href === pathname) ?? TABS[0];

  return (
    <View>
      <LinearGradient
        colors={[brand.gradientStart, brand.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.bar}>
        <HeaderMenu />
        <Text style={styles.barTitle}>{active.label}</Text>
        <View style={styles.barRight}>
          {(isAdmin || active.publicAdd) && active.add ? (
            <HeaderAdd onPress={() => router.navigate(active.add as Href)} />
          ) : null}
        </View>
      </LinearGradient>
      <View
        style={[
          styles.tabRow,
          {
            backgroundColor: brand.background,
            borderBottomColor: brand.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          },
        ]}>
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const color = isActive ? brand.primary : brand.muted;
          return (
            <Pressable
              key={String(tab.href)}
              onPress={() => router.navigate(tab.href)}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}>
              <Ionicons name={tab.icon} size={21} color={color} />
              <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  barTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  barRight: {
    width: 54,
    alignItems: 'flex-end',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  tabPressed: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});