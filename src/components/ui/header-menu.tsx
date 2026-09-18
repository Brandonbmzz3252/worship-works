import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, BackHandler, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useBrand } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { friendlyError } from '@/lib/errors';
import type { UserGroupMembership } from '@/lib/types';

type Item = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
};

type MenuButtonProps = {
  onPress: () => void;
};

export function HeaderAdd({ onPress }: MenuButtonProps) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.pad}>
      <Ionicons name="add" size={27} color="#ffffff" />
    </Pressable>
  );
}

export function HeaderTheme({ onPress }: MenuButtonProps) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.pad}>
      <Ionicons name="color-palette-outline" size={22} color="#ffffff" />
    </Pressable>
  );
}

const NAV_ITEMS: Item[] = [
  { label: 'My name', icon: 'person-outline', href: '/profile' },
  { label: 'Birthdays/Anniversaries', icon: 'gift-outline', href: '/birthdays' },
  { label: 'Groups', icon: 'albums-outline', href: '/groups' },
  { label: 'Appearance', icon: 'color-palette-outline', href: '/theme' },
];

const ADMIN_ITEMS: Item[] = [
  { label: 'Members', icon: 'people-circle-outline', href: '/admin/members' },
  { label: 'People', icon: 'shield-checkmark-outline', href: '/admin/access' },
  { label: 'Activity', icon: 'eye-outline', href: '/admin/activity' as Href },
];

export function HeaderMenu() {
  const router = useRouter();
  const brand = useBrand();
  const { profile, user, isAdmin, switchChurch, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [pane, setPane] = useState<'menu' | 'switch'>('menu');
  const [groups, setGroups] = useState<UserGroupMembership[] | null>(null);

  useEffect(() => {
    let active = true;
    async function resolveGroups() {
      const map = new Map<string, string>();
      (profile?.groups ?? []).forEach((g) => {
        if (g.id) map.set(g.id, g.name);
      });
      if (user) {
        try {
          const snap = await getDocs(
            query(collection(db, 'churches'), where('createdBy', '==', user.uid))
          );
          snap.docs.forEach((d) => {
            const name = (d.data() as { name?: string } | undefined)?.name;
            if (name) map.set(d.id, name);
          });
        } catch {
          // discovery is best-effort
        }
      }
      if (profile?.churchId && !map.has(profile.churchId)) {
        map.set(profile.churchId, '');
      }
      const base: UserGroupMembership[] = [...map].map(([id, name]) => ({ id, name }));
      if (base.length === 0 || base.every((g) => g.name.trim())) {
        if (active) setGroups(base);
        return;
      }
      const resolved = await Promise.all(
        base.map(async (g) => {
          if (g.name.trim()) return g;
          try {
            const snap = await getDoc(doc(db, 'churches', g.id));
            const name = (snap.data() as { name?: string } | undefined)?.name;
            return name ? { ...g, name } : g;
          } catch {
            return g;
          }
        })
      );
      if (active) setGroups(resolved);
    }
    resolveGroups();
    return () => {
      active = false;
    };
  }, [profile, user]);

  const items: Item[] = isAdmin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  function go(href: Href) {
    setOpen(false);
    router.navigate(href);
  }

  function openMenu() {
    setPane('menu');
    setOpen(true);
  }

  async function doSwitch(group: UserGroupMembership) {
    setOpen(false);
    if (group.id === profile?.churchId) return;
    try {
      await switchChurch(group);
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    }
  }

  const fixedPosition = Platform.OS === 'web'
    ? (('fixed' as unknown) as 'absolute')
    : 'absolute';

  const card = (
    <View style={[styles.card, { backgroundColor: brand.card }]}>
      {pane === 'switch' ? (
        <>
          <Pressable
            onPress={() => setPane('menu')}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
            <Ionicons name="arrow-back" size={20} color={brand.primary} />
            <Text style={[styles.itemLabel, { color: brand.onCard }]}>Back</Text>
          </Pressable>
          <Text style={[styles.paneTitle, { color: brand.primary }]}>Switch group</Text>
          <Text style={[styles.paneHint, { color: brand.muted }]}>
            Tap a group to switch seamlessly.
          </Text>
          {(groups ?? []).length === 0 ? (
            <Text style={[styles.emptyText, { color: brand.muted }]}>
              No groups yet. Join one from the Groups screen.
            </Text>
          ) : (
            (groups ?? []).map((group) => {
              const active = group.id === profile?.churchId;
              return (
                <Pressable
                  key={group.id}
                  onPress={() => doSwitch(group)}
                  style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? brand.primary : brand.muted}
                  />
                  <Text style={[styles.itemLabel, styles.itemFlex, { color: brand.onCard }]} numberOfLines={1}>
                    {group.name || group.id}
                  </Text>
                  {active ? (
                    <Text style={[styles.activeLabel, { color: brand.primary }]}>Current</Text>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </>
      ) : (
        <>
          {items.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => go(item.href)}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
              <Ionicons name={item.icon} size={20} color={brand.primary} />
              <Text style={[styles.itemLabel, { color: brand.onCard }]}>{item.label}</Text>
            </Pressable>
          ))}
          <View style={styles.divider} />
          <Pressable
            onPress={() => setPane('switch')}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
            <Ionicons name="swap-horizontal" size={20} color={brand.primary} />
            <Text style={[styles.itemLabel, { color: brand.onCard }]}>Switch group</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            onPress={() => {
              setOpen(false);
              signOut();
            }}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
            <Ionicons name="log-out-outline" size={20} color={brand.danger} />
            <Text style={[styles.itemLabel, { color: brand.danger }]}>Sign out</Text>
          </Pressable>
          {Platform.OS !== 'web' ? (
            <Pressable
              onPress={() => {
                setOpen(false);
                BackHandler.exitApp();
              }}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
              <Ionicons name="power-outline" size={20} color={brand.muted} />
              <Text style={[styles.itemLabel, { color: brand.onCard }]}>Exit app</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <>
      <Pressable onPress={openMenu} hitSlop={10} style={styles.pad}>
        <Ionicons name="menu" size={26} color="#ffffff" />
      </Pressable>
      {Platform.OS === 'web' ? (
        open ? (
          <View style={[styles.overlay, styles.overlayWeb, { position: fixedPosition }]}>
            <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
            {card}
          </View>
        ) : null
      ) : (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={styles.overlay}>
            <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
            {card}
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pad: {
    marginHorizontal: 14,
  },
  overlay: {
    flex: 1,
  },
  overlayWeb: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(247,243,233,0.55)',
  },
  card: {
    position: 'absolute',
    top: 66,
    left: 12,
    width: 260,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  itemPressed: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  itemFlex: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  paneTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  paneHint: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 4,
  },
});