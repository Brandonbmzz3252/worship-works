import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { SetlistForm } from '@/components/setlist-form';
import { createSetlist } from '@/lib/store';

export default function SetlistNew() {
  const router = useRouter();
  const [exitAfterSave, setExitAfterSave] = useState(false);

  useEffect(() => {
    if (exitAfterSave) router.back();
  }, [exitAfterSave, router]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SetlistForm
          submitLabel="Create setlist"
          onSubmit={async (input) => {
            await createSetlist(input);
            setExitAfterSave(true);
          }}
        />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});