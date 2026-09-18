import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { useBrand, type BrandPalette } from '@/lib/theme-context';

type SaveFn = () => void | Promise<unknown>;

/**
 * Shows a themed modal when the user tries to leave a screen with unsaved
 * changes. Returns `{ view, requestBack, requestLeave }`:
 *  - `view`    : the modal, render at the bottom of the screen's return.
 *  - `requestBack`  : for a header back button / hardware back. Leaves
 *                     immediately if nothing changed, otherwise opens the modal.
 *  - `requestLeave` : same, but for a caller-supplied leave action.
 *
 * Deliberately does NOT use react-navigation's usePreventRemove: it is not
 * fully supported on native-stack and can hard-crash the app when the screen
 * is popped right after being armed. Android hardware back is intercepted via
 * BackHandler instead.
 */
export function useUnsavedGuard(
  isDirty: boolean,
  saveAndLeave?: SaveFn,
  saveNavigates = true
) {
  const navigation = useNavigation();
  const dirtyRef = useRef(isDirty);
  const saveRef = useRef<SaveFn | undefined>(saveAndLeave);
  const navigatesRef = useRef(saveNavigates);
  const leaveRef = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dirtyRef.current = isDirty;
  });
  useEffect(() => {
    saveRef.current = saveAndLeave;
    navigatesRef.current = saveNavigates;
  });

  useEffect(() => {
    if (!isDirty) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leaveRef.current = () => navigation.goBack();
      setOpen(true);
      return true;
    });
    return () => sub.remove();
  }, [isDirty, navigation]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const requestBack = useCallback(() => {
    if (!dirtyRef.current) {
      navigation.goBack();
      return;
    }
    leaveRef.current = () => navigation.goBack();
    setOpen(true);
  }, [navigation]);

  const requestLeave = useCallback((leave: () => void) => {
    if (!dirtyRef.current) {
      leave();
      return;
    }
    leaveRef.current = leave;
    setOpen(true);
  }, []);

  function close() {
    leaveRef.current = null;
    setOpen(false);
    setBusy(false);
  }

  function discard() {
    const leave = leaveRef.current;
    leaveRef.current = null;
    setOpen(false);
    if (leave) leave();
  }

  async function saveAndClose() {
    const leave = leaveRef.current;
    leaveRef.current = null;
    setOpen(false);
    if (!saveRef.current) {
      if (leave) leave();
      return;
    }
    setBusy(true);
    try {
      await saveRef.current();
      setBusy(false);
      if (leave && !navigatesRef.current) {
        leave();
      }
    } catch {
      setBusy(false);
    }
  }

  const view = (
    <UnsavedModal
      open={open}
      busy={busy}
      onClose={close}
      onDiscard={discard}
      onSave={saveAndClose}
    />
  );

  return { view, requestBack, requestLeave };
}

function UnsavedModal({
  open,
  busy,
  onClose,
  onDiscard,
  onSave,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const brand = useBrand();
  const s = makeStyles(brand);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.card, { backgroundColor: brand.card, borderColor: brand.cardBorder }]}>
          <Text style={[s.title, { color: brand.onCard }]}>Unsaved changes</Text>
          <Text style={[s.body, { color: brand.muted }]}>
            Leave without saving your changes?
          </Text>
          <View style={s.row}>
            <Button
              title="Keep editing"
              variant="ghost"
              onPress={onClose}
              style={s.btn}
              disabled={busy}
            />
          </View>
          <View style={s.row}>
            <Button
              title="Discard"
              variant="danger"
              onPress={onDiscard}
              style={s.btn}
              disabled={busy}
            />
            <Button
              title="Save"
              variant="primary"
              onPress={onSave}
              loading={busy}
              style={s.btn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(brand: BrandPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      borderRadius: 18,
      borderWidth: 1,
      padding: 22,
      gap: 10,
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 6,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    btn: {
      flex: 1,
      marginTop: 0,
    },
  });
}