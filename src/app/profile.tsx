import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useBrand } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { friendlyError } from '@/lib/errors';

export default function ProfileScreen() {
  const router = useRouter();
  const brand = useBrand();
  const { user, profile, isAdmin, updateProfileName, sendResetPasswordEmail, getChurchAccessCode, setChurchAccessCode } = useAuth();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const churchId = profile?.churchId ?? null;

  useEffect(() => {
    if (!isAdmin || !churchId) return;
    let active = true;
    getChurchAccessCode(churchId)
      .then((value) => {
        if (active) setCode(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAdmin, churchId, getChurchAccessCode]);

  async function save() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter the name you want to use.');
      return;
    }
    setBusy(true);
    try {
      await updateProfileName(name);
      Alert.alert('Name saved', 'Your new name will be used next to your chat messages.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  function changePassword() {
    if (!user?.email) return;
    Alert.alert(
      'Change password',
      `We will email a reset link to ${user.email}. Tap the link to create a new password.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send link',
          onPress: () => {
            setResetBusy(true);
            sendResetPasswordEmail(user.email as string)
              .then(() => Alert.alert('Check your email', 'A password reset link has been sent.'))
              .catch((e) => Alert.alert('Error', friendlyError(e)))
              .finally(() => setResetBusy(false));
          },
        },
      ]
    );
  }

  async function saveCode() {
    if (!code.trim()) {
      Alert.alert('Missing code', 'Enter the church access code for new members.');
      return;
    }
    setCodeBusy(true);
    try {
      await setChurchAccessCode(churchId ?? '', code);
      Alert.alert('Code saved', 'New members must use this code to join.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', friendlyError(error));
    } finally {
      setCodeBusy(false);
    }
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { backgroundColor: brand.primary }]}>
        <Pressable hitSlop={10} onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>My name</Text>
        <View style={styles.backBtn} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: brand.card, borderColor: brand.cardBorder }]}>
          <Text style={[styles.label, { color: brand.primary }]}>Name</Text>
          <TextField
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Thabo Nkosi"
            autoCapitalize="words"
          />
          <Text style={[styles.hint, { color: brand.muted }]}>
            This is the name shown next to your chat messages. Roster names are decided by the
            admin in the member directory, so changing your name here does not affect them.
          </Text>
          <Text style={[styles.email, { color: brand.muted }]}>
            Signed in as {user?.email}
          </Text>
        </View>
        <Button
          title="Change password"
          variant="outline"
          icon="key-outline"
          onPress={changePassword}
          loading={resetBusy}
        />
        {isAdmin ? (
          <View style={[styles.card, { backgroundColor: brand.card, borderColor: brand.cardBorder }]}>
            <Text style={[styles.label, { color: brand.primary }]}>Church access code</Text>
            <TextField
              label="Code new members enter to join"
              value={code}
              onChangeText={setCode}
              placeholder="e.g. 4589 or passkey"
            />
            <Button title="Save code" icon="checkmark-circle-outline" onPress={saveCode} loading={codeBusy} />
          </View>
        ) : null}
        <Button title="Save name" icon="checkmark-circle-outline" onPress={save} loading={busy} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 16,
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 12.5,
    lineHeight: 17,
    color: '#6B7280',
  },
  email: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});