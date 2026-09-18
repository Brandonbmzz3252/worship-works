import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { RosterForm } from '@/components/roster-form';
import { createRosterEntry } from '@/lib/store';

export default function RosterNew() {
  const router = useRouter();
  const [exitAfterSave, setExitAfterSave] = useState(false);

  useEffect(() => {
    if (exitAfterSave) router.back();
  }, [exitAfterSave, router]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets={true}
        keyboardShouldPersistTaps="handled">
        <RosterForm
          submitLabel="Create duty"
          onSubmit={async (input) => {
            await createRosterEntry(input);
            setExitAfterSave(true);
          }}
        />
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
});
