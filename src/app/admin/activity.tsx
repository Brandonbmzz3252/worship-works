import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { deleteDoc, doc } from 'firebase/firestore';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingView } from '@/components/ui/loading-view';
import { useBrand } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { subscribeViews, type ViewRecord } from '@/lib/store';
import { db } from '@/lib/firebase';
import { tsToDate, formatDateTime } from '@/lib/format';
import type { ViewedPage } from '@/lib/types';

const TAB_ORDER: ViewedPage[] = ['setlist', 'songs', 'chat', 'schedule', 'roster'];

const PAGE_LABELS: Record<ViewedPage, string> = {
  setlist: 'Setlist',
  songs: 'Songs',
  chat: 'Chat',
  schedule: 'Schedule',
  roster: 'Roster',
};

export default function ActivityAdmin() {
  const brand = useBrand();
  const { profile } = useAuth();
  const [views, setViews] = useState<ViewRecord[] | null>(null);
  const churchId = profile?.churchId ?? null;

  useEffect(() => subscribeViews(churchId ?? '', setViews), [churchId]);

  useEffect(() => {
    if (!views || views.length < 2) return;
    const latest = new Map<string, ViewRecord>();
    views.forEach((v) => {
      const k = `${v.page}:${v.uid || v.displayName}`;
      const cur = latest.get(k);
      if (!cur || tsToDate(v.viewedAt).getTime() > tsToDate(cur.viewedAt).getTime()) {
        latest.set(k, v);
      }
    });
    views.forEach((v) => {
      const k = `${v.page}:${v.uid || v.displayName}`;
      const keep = latest.get(k);
      if (keep && keep.id !== v.id) {
        deleteDoc(doc(db, 'views', v.id)).catch(() => {});
      }
    });
  }, [views]);

  const sections = useMemo(() => {
    if (!views) return [];
    return TAB_ORDER.map((page) => {
      const pageViews = views
        .filter((v) => v.page === page)
        .sort((a, b) => tsToDate(b.viewedAt).getTime() - tsToDate(a.viewedAt).getTime());
      const seen = new Set<string>();
      const viewers: ViewRecord[] = [];
      pageViews.forEach((v) => {
        const key = v.uid || v.displayName;
        if (seen.has(key)) return;
        seen.add(key);
        viewers.push(v);
      });
      return { page, viewers };
    });
  }, [views]);

  if (views === null) {
    return <LoadingView />;
  }

  const hasActivity = views.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {!hasActivity ? (
        <EmptyState
          icon="eye-outline"
          title="No activity yet"
          message="When members open Setlist, Songs, Chat, Schedule or Roster, you will see them here."
        />
      ) : (
        sections.map(({ page, viewers }) => (
          <View key={page} style={styles.section}>
            <Text style={[styles.pageTitle, { color: brand.primary }]}>
              {PAGE_LABELS[page]} ({viewers.length})
            </Text>
            <View style={[styles.card, { backgroundColor: brand.card, borderColor: brand.cardBorder }]}>
              {viewers.length === 0 ? (
                <Text style={[styles.empty, { color: brand.muted }]}>No views yet</Text>
              ) : (
                viewers.map((item, index) => (
                  <View
                    key={`${page}-${item.uid || item.displayName}`}
                    style={[styles.row, index > 0 && styles.rowBorder, index > 0 && { borderTopColor: brand.cardBorder }]}>
                    <View style={[styles.avatar, { backgroundColor: brand.surface }]}>
                      <Text style={[styles.avatarText, { color: brand.onCard }]}>
                        {(item.displayName || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.details}>
                      <Text style={[styles.name, { color: brand.onCard }]}>
                        {item.displayName || 'Unknown member'}
                      </Text>
                      <Text style={[styles.time, { color: brand.muted }]}>
                        Viewed {PAGE_LABELS[page] ?? page} · {formatDateTime(tsToDate(item.viewedAt))}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  section: {
    gap: 6,
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  empty: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  rowBorder: {
    borderTopWidth: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  details: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
});