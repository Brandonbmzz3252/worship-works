import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useBrand } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { friendlyError } from '@/lib/errors';
import { slugifyChurch, setSessionChurchId } from '@/lib/session';

const MIGRATION_COLS = [
  'users',
  'songs',
  'setlists',
  'events',
  'roster',
  'members',
  'messages',
] as const;

export default function ChurchSetup() {
  const router = useRouter();
  const brand = useBrand();
  const { user, profile } = useAuth();
  const [churchName, setChurchName] = useState('Gen2Gen');
  const [accessCode, setAccessCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [loadingChurch, setLoadingChurch] = useState(false);

  useEffect(() => {
    async function loadExistingChurch() {
      if (!profile?.churchId) return;
      setLoadingChurch(true);
      try {
        const snap = await getDoc(doc(db, 'churches', profile.churchId));
        if (snap.exists()) {
          const data = snap.data();
          if (data.name) setChurchName(data.name);
          if (data.accessCode) setAccessCode(data.accessCode);
        }
      } catch (err) {
        console.warn('Failed to load church doc', err);
      } finally {
        setLoadingChurch(false);
      }
    }
    loadExistingChurch();
  }, [profile?.churchId]);

  async function updateExistingAccessCode() {
    if (!profile?.churchId || !accessCode.trim()) {
      Alert.alert('Access code', 'Please enter a valid access code.');
      return;
    }
    setBusy(true);
    try {
      await updateDoc(doc(db, 'churches', profile.churchId), {
        accessCode: accessCode.trim(),
      });
      Alert.alert('Saved', 'Church access code has been updated successfully!');
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    if (!user) return;
    const id = slugifyChurch(churchName);
    if (!id) {
      Alert.alert('Church name', 'Enter a name for your church.');
      return;
    }
    if (!accessCode.trim()) {
      Alert.alert('Access code', 'Enter a join password / access code for your church.');
      return;
    }
    setBusy(true);
    setProgress('Connecting…');
    try {
      const churchRef = doc(db, 'churches', id);
      const snap = await getDoc(churchRef);
      if (!snap.exists()) {
        await setDoc(churchRef, {
          name: churchName.trim(),
          accessCode: accessCode.trim(),
          createdBy: user.uid,
          createdAt: new Date(),
        });
      } else {
        await updateDoc(churchRef, {
          accessCode: accessCode.trim(),
        });
      }
      await updateDoc(doc(db, 'users', user.uid), { churchId: id, role: 'admin' });
      setSessionChurchId(id);

      for (let i = 0; i < MIGRATION_COLS.length; i++) {
        const colName = MIGRATION_COLS[i];
        setProgress(`Migrating ${colName}…`);
        const qSnap = await getDocs(query(collection(db, colName)));
        for (const d of qSnap.docs) {
          const data = d.data() as Record<string, unknown>;
          if (!('churchId' in data) || data.churchId !== id) {
            await updateDoc(d.ref, { churchId: id });
          }
        }
      }

      Alert.alert(
        'Church connected',
        `"${churchName.trim()}" is set up with access code "${accessCode.trim()}". All existing data was migrated. Tap OK to reload.`,
        [{ text: 'OK', onPress: () => router.replace('/') }]
      );
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (profile && profile.churchId) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.done}
          automaticallyAdjustKeyboardInsets={true}
          keyboardShouldPersistTaps="handled">
          <Ionicons name="checkmark-circle" size={56} color={brand.primary} />
          <Text style={[styles.doneTitle, { color: brand.primary }]}>Church Connected</Text>
          <Text style={styles.doneText}>
            This account is assigned to <Text style={{ fontWeight: '700' }}>{profile.churchId}</Text>.
          </Text>

          {loadingChurch ? (
            <ActivityIndicator color={brand.primary} style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Church Join Password / Access Code</Text>
              <Text style={styles.codeDesc}>
                Team members must enter this code when signing up to join your church group.
              </Text>
              <TextField
                label="Current Access Code"
                value={accessCode}
                onChangeText={setAccessCode}
                placeholder="e.g. 4589"
              />
              <Button
                title="Save Access Code"
                icon="key-outline"
                onPress={updateExistingAccessCode}
                loading={busy}
              />
            </View>
          )}

          <Button title="Done" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.wrap}
        automaticallyAdjustKeyboardInsets={true}
        keyboardShouldPersistTaps="handled">
        <Ionicons name="shield-checkmark-outline" size={40} color={brand.primary} />
        <Text style={[styles.heading, { color: brand.primary }]}>Connect your church</Text>
        <Text style={styles.body}>
          This is a one-time setup for your admin account. All existing data will be moved into
          the church you name here, and only people who join with the matching password will see it.
        </Text>

        <TextField
          label="Church name"
          value={churchName}
          onChangeText={setChurchName}
          placeholder="e.g. Gen2Gen"
          autoCapitalize="words"
        />
        <TextField
          label="Church join password / access code"
          value={accessCode}
          onChangeText={setAccessCode}
          placeholder="e.g. 4589 or passkey"
        />
        <Text style={styles.hint}>
          Choose a password or code. Anyone joining must type this code to access your church team.
        </Text>

        <Button title="Connect church" icon="link-outline" onPress={connect} loading={busy} />
        {progress ? (
          <View style={styles.progress}>
            <ActivityIndicator color={brand.primary} />
            <Text style={styles.progressText}>{progress}</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  wrap: {
    padding: 24,
    paddingBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555555',
    textAlign: 'center',
  },
  hint: {
    fontSize: 12.5,
    lineHeight: 17,
    color: '#888888',
    marginTop: -6,
  },
  progress: {
    alignItems: 'center',
    gap: 10,
  },
  progressText: {
    fontSize: 13,
    color: '#777777',
  },
  done: {
    padding: 24,
    paddingBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  doneTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  doneText: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
  },
  codeCard: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    gap: 10,
    marginTop: 8,
  },
  codeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  codeDesc: {
    fontSize: 12.5,
    color: '#666666',
    lineHeight: 17,
  },
});
