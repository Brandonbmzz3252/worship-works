import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingView } from '@/components/ui/loading-view';
import { useBrand } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { setUserRole, subscribeAllUsers } from '@/lib/store';
import type { UserProfile } from '@/lib/types';

export default function AccessAdmin() {
  const brand = useBrand();
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const churchId = profile?.churchId ?? null;

  useEffect(() => subscribeAllUsers(churchId ?? '', setUsers), [churchId]);

  async function toggleRole(user: UserProfile) {
    const nextRole = user.role === 'admin' ? 'member' : 'admin';
    if (user.uid === profile?.uid) return;
    setBusyId(user.uid);
    try {
      await setUserRole(user.uid, nextRole);
    } catch {
      Alert.alert('Error', 'Could not update the user role. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  if (users === null) {
    return <LoadingView />;
  }

  const sorted = [...users].sort((a, b) => {
    const aname = (a.displayName || a.email).toLowerCase();
    const bname = (b.displayName || b.email).toLowerCase();
    return aname.localeCompare(bname);
  });

  return (
    <View style={styles.wrap}>
      <View style={[styles.info, { backgroundColor: brand.card, borderColor: brand.cardBorder }]}>
        <Ionicons name="shield-checkmark-outline" size={18} color={brand.primary} />
        <Text style={[styles.infoText, { color: brand.muted }]}>
          Every account that joined your group appears here. Tap a row to promote or demote a
          user between Admin and Member.
        </Text>
      </View>

      {sorted.length === 0 ? (
        <EmptyState icon="people-outline" title="No users yet" />
      ) : (
        sorted.map((user) => {
          const isSelf = user.uid === profile?.uid;
          const isAdmin = user.role === 'admin';
          return (
            <Pressable
              key={user.uid}
              disabled={isSelf}
              onPress={() => toggleRole(user)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: brand.card,
                  borderColor: brand.cardBorder,
                },
                pressed && styles.rowPressed,
              ]}>
              <View style={[styles.avatar, { backgroundColor: brand.surface }]}>
                <Text style={[styles.avatarText, { color: brand.onCard }]}>
                  {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.details}>
                <Text style={[styles.name, { color: brand.onCard }]}>
                  {user.displayName || '—'}
                  {isSelf ? <Text style={[styles.youTag, { color: brand.primary }]}>  (you)</Text> : null}
                </Text>
                <Text style={[styles.email, { color: brand.muted }]}>{user.email}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  isAdmin
                    ? { backgroundColor: brand.primary }
                    : { backgroundColor: brand.surface },
                ]}>
                <Text style={[styles.badgeText, isAdmin ? { color: '#ffffff' } : { color: brand.onCard }]}>
                  {isAdmin ? 'Admin' : 'Member'}
                </Text>
              </View>
              {isSelf ? null : (
                <View style={styles.chevron}>
                  {busyId === user.uid ? (
                    <Text style={styles.busy}>…</Text>
                  ) : (
                    <Ionicons
                      name={isAdmin ? 'remove-circle-outline' : 'add-circle-outline'}
                      size={20}
                      color={isAdmin ? brand.danger : brand.primary}
                    />
                  )}
                </View>
              )}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#555555',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  rowPressed: {
    opacity: 0.85,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#555555',
  },
  details: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  youTag: {
    fontWeight: '700',
  },
  email: {
    fontSize: 13,
    color: '#777777',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chevron: {
    width: 22,
    alignItems: 'center',
  },
  busy: {
    fontSize: 16,
    color: '#888888',
  },
});