import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { SetlistForm } from '@/components/setlist-form';
import { updateSetlist } from '@/lib/store';

export default function SetlistEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exitAfterSave, setExitAfterSave] = useState(false);

  useEffect(() => {
    if (exitAfterSave) router.back();
  }, [exitAfterSave, router]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SetlistForm
          setlistId={id}
          submitLabel="Save changes"
          submitIcon="pencil"
          onSubmit={async (input) => {
            await updateSetlist(id, input);
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