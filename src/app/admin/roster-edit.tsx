import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingView } from '@/components/ui/loading-view';
import { RosterForm } from '@/components/roster-form';
import { tsToDate } from '@/lib/format';
import { getRosterEntry, updateRosterEntry, deleteRosterEntry } from '@/lib/store';
import type { RosterEntry } from '@/lib/types';

export default function RosterEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<RosterEntry | null | undefined>(undefined);
  const [exitAfterSave, setExitAfterSave] = useState(false);

  useEffect(() => {
    if (exitAfterSave) router.back();
  }, [exitAfterSave, router]);

  useEffect(() => {
    let active = true;
    if (id) {
      getRosterEntry(id).then((e) => {
        if (active) setEntry(e);
      });
    }
    return () => {
      active = false;
    };
  }, [id]);

  if (entry === undefined) {
    return <LoadingView />;
  }

  if (entry === null) {
    return <EmptyState icon="calendar-outline" title="Duty not found" />;
  }

  function confirmDelete() {
    Alert.alert(
      'Delete duty',
      'Remove this service roster for everyone?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteRosterEntry(id).then(() => router.back());
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets={true}
        keyboardShouldPersistTaps="handled">
        <RosterForm
          initial={{
            serviceDate: tsToDate(entry.serviceDate),
            leader: entry.leader,
            band: entry.band,
            singers: entry.singers,
            other: entry.other ?? [],
          }}
          submitLabel="Save changes"
          submitIcon="pencil"
onSubmit={async (input) => {
            await updateRosterEntry(id, input);
            setExitAfterSave(true);
          }}
        />
        <View style={styles.deleteWrap}>
          <Button title="Delete duty" variant="danger" icon="trash-outline" onPress={confirmDelete} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 160,
  },
  deleteWrap: {
    marginTop: 24,
  },
});
