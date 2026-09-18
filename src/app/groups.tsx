import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useBrand } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { db, ADMIN_EMAILS } from '@/lib/firebase';
import { deleteGroup } from '@/lib/store';
import { friendlyError } from '@/lib/errors';
import { slugifyChurch, setSessionChurchId } from '@/lib/session';
import type { Role } from '@/lib/types';

type Mode = 'choose' | 'join' | 'create' | 'delete';

export default function GroupsScreen() {
  const router = useRouter();
  const brand = useBrand();
  const { user, profile } = useAuth();

  const [mode, setMode] = useState<Mode>('choose');
  const [groupName, setGroupName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteName, setDeleteName] = useState('');
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const isAdmin = profile?.role === 'admin' || ADMIN_EMAILS.includes(profile?.email ?? '');

  function reset() {
    setGroupName('');
    setAccessCode('');
    setDeleteName('');
    setDeleteCode('');
    setDeleteError('');
    setMode('choose');
  }

  async function joinGroup() {
    if (!user) return;
    const id = slugifyChurch(groupName);
    if (!id) {
      Alert.alert('Group name', 'Enter the name of the group you want to join.');
      return;
    }
    const cleanCode = accessCode.trim();
    if (!cleanCode) {
      Alert.alert('Access code required', 'Enter the group password / access code.');
      return;
    }

    setBusy(true);
    try {
      const ref = doc(db, 'churches', id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        Alert.alert(
          'Group not found',
          `No group named "${groupName.trim()}" exists yet. Use "Create New Group" to create it.`
        );
        setBusy(false);
        return;
      }

      const data = snap.data() as { accessCode?: string };
      if (data?.accessCode && data.accessCode !== cleanCode) {
        Alert.alert(
          'Incorrect password',
          'The access code you entered is incorrect. Ask your church group admin.'
        );
        setBusy(false);
        return;
      }

      const role: Role =
        profile?.role === 'admin' || ADMIN_EMAILS.includes(profile?.email ?? '')
          ? 'admin'
          : 'member';

      const groups = profile?.groups ?? [];
      const joined = groups.some((g) => g.id === id)
        ? groups
        : [...groups, { id, name: groupName.trim() }];

      await updateDoc(doc(db, 'users', user.uid), { churchId: id, role, groups: joined });
      setSessionChurchId(id);
      Alert.alert(
        'Joined the group',
        `You are now part of "${groupName.trim()}".`,
        [{ text: 'OK', onPress: () => router.navigate('/') }]
      );
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function createGroup() {
    if (!user) return;
    const id = slugifyChurch(groupName);
    if (!id) {
      Alert.alert('Group name', 'Enter a name for your new group.');
      return;
    }
    const cleanCode = accessCode.trim();
    if (!cleanCode) {
      Alert.alert('Access code required', 'Set a password / access code for your group.');
      return;
    }

    setBusy(true);
    try {
      const ref = doc(db, 'churches', id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        Alert.alert(
          'Group already exists',
          `A group named "${groupName.trim()}" already exists. Use "Join Group" to join it.`
        );
        setBusy(false);
        return;
      }

      await setDoc(ref, {
        name: groupName.trim(),
        accessCode: cleanCode,
        createdBy: user.uid,
        createdAt: new Date(),
      });

      await updateDoc(doc(db, 'users', user.uid), {
        churchId: id,
        role: 'admin',
        groups: [...(profile?.groups ?? []), { id, name: groupName.trim() }],
      });
      setSessionChurchId(id);
      Alert.alert(
        'Group created!',
        `"${groupName.trim()}" has been created and you are its admin.\n\nShare the access code with your team so they can join.`,
        [{ text: 'OK', onPress: () => router.navigate('/') }]
      );
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  /* --- Delete group ------------------------------------------------ */
  async function performDelete() {
    if (busy) return;
    if (!deleteName.trim() || !deleteCode.trim()) {
      setDeleteError('Type the group name and its access code to confirm deletion.');
      return;
    }
    setBusy(true);
    setDeleteError('');
    try {
      await deleteGroup(deleteName.trim(), deleteCode.trim());
      setMode('choose');
      setDeleteName('');
      setDeleteCode('');
      if (Platform.OS === 'web') {
        window.alert('Group deleted. The group and all of its data have been permanently removed.');
      }
      router.navigate('/');
    } catch (e) {
      setDeleteError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  /* --- Choose mode ------------------------------------------------ */
  if (mode === 'choose') {
    return (
      <ScrollView
        contentContainerStyle={[styles.wrap, { backgroundColor: brand.background }]}
        automaticallyAdjustKeyboardInsets={true}
        keyboardShouldPersistTaps="handled"
      >
        <Ionicons name="albums-outline" size={48} color={brand.primary} />
        <Text style={[styles.heading, { color: brand.primary }]}>Groups</Text>
        <Text style={[styles.body, { color: brand.muted }]}>
          {profile?.churchId
            ? `You are currently part of "${profile.churchId}".`
            : 'You are not in a group yet.'}
        </Text>

        <View style={styles.cards}>
          {/* JOIN */}
          <Pressable
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: brand.card, borderColor: brand.cardBorder },
              pressed && styles.cardPressed,
            ]}
            onPress={() => setMode('join')}
          >
            <View style={[styles.cardIcon, { backgroundColor: brand.accentSoft }]}>
              <Ionicons name="log-in-outline" size={28} color={brand.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: brand.onCard }]}>Join a Group</Text>
            <Text style={[styles.cardDesc, { color: brand.muted }]}>
              Enter a group name and its access code to join an existing church group.
            </Text>
            <View style={[styles.cardArrow, { backgroundColor: brand.primary }]}>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </View>
          </Pressable>

          {/* CREATE */}
          <Pressable
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: brand.card, borderColor: brand.cardBorder },
              pressed && styles.cardPressed,
            ]}
            onPress={() => setMode('create')}
          >
            <View style={[styles.cardIcon, { backgroundColor: brand.accentSoft }]}>
              <Ionicons name="add-circle-outline" size={28} color={brand.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: brand.onCard }]}>Create New Group</Text>
            <Text style={[styles.cardDesc, { color: brand.muted }]}>
              Start a new church group with a unique name and access code. You will become its admin.
            </Text>
            <View style={[styles.cardArrow, { backgroundColor: brand.primary }]}>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </View>
          </Pressable>

          {/* DELETE (admin only, only when inside a group) */}
          {isAdmin && profile?.churchId ? (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: brand.card, borderColor: brand.danger },
                pressed && styles.cardPressed,
              ]}
              onPress={() => setMode('delete')}
            >
              <View style={[styles.cardIcon, { backgroundColor: brand.danger }]}>
                <Ionicons name="trash-outline" size={28} color="#fff" />
              </View>
              <Text style={[styles.cardTitle, { color: brand.danger }]}>Delete this group</Text>
              <Text style={[styles.cardDesc, { color: brand.muted }]}>
                Permanently remove this group and all of its data. You must type the group name
                and its access code to confirm.
              </Text>
              <View style={[styles.cardArrow, { backgroundColor: brand.danger }]}>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  /* --- Delete form ----------------------------------------------- */
  if (mode === 'delete') {
    return (
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: brand.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.formWrap}
          automaticallyAdjustKeyboardInsets={true}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.back} onPress={reset}>
            <Ionicons name="arrow-back" size={20} color={brand.primary} />
            <Text style={[styles.backText, { color: brand.primary }]}>Back</Text>
          </Pressable>

          <View style={[styles.deleteIcon, { backgroundColor: brand.danger }]}>
            <Ionicons name="trash-outline" size={30} color="#fff" />
          </View>
          <Text style={[styles.heading, { color: brand.danger }]}>Delete this group</Text>
          <Text style={[styles.body2, { color: brand.muted }]}>
            This permanently removes &quot;{profile?.churchId}&quot; and everything in it — songs,
            setlists, schedules, rosters, members and chat — for everyone. This cannot be
            undone. Type the group name and access code to confirm.
          </Text>

          <View style={styles.form}>
            <TextField
              label="Group name"
              value={deleteName}
              onChangeText={(t) => {
                setDeleteName(t);
                setDeleteError('');
              }}
              placeholder={profile?.churchId}
              autoCapitalize="words"
            />
            <TextField
              label="Group access code / password"
              value={deleteCode}
              onChangeText={(t) => {
                setDeleteCode(t);
                setDeleteError('');
              }}
              placeholder="e.g. 4589 or passkey"
              secureTextEntry
            />
            {deleteError ? (
              <Text style={[styles.error, { color: brand.danger }]}>{deleteError}</Text>
            ) : null}
            <Button
              title="Cancel"
              variant="ghost"
              onPress={reset}
              disabled={busy}
            />
            <Button
              title="Delete Group Permanently"
              icon="trash-outline"
              variant="danger"
              onPress={performDelete}
              loading={busy}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* --- Join / Create form ----------------------------------------- */
  const isCreate = mode === 'create';

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: brand.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.formWrap}
        automaticallyAdjustKeyboardInsets={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <Pressable style={styles.back} onPress={reset}>
          <Ionicons name="arrow-back" size={20} color={brand.primary} />
          <Text style={[styles.backText, { color: brand.primary }]}>Back</Text>
        </Pressable>

        <Ionicons
          name={isCreate ? 'add-circle-outline' : 'log-in-outline'}
          size={40}
          color={brand.primary}
        />
        <Text style={[styles.heading, { color: brand.primary }]}>
          {isCreate ? 'Create New Group' : 'Join a Group'}
        </Text>
        <Text style={[styles.body2, { color: brand.muted }]}>
          {isCreate
            ? 'Choose a unique name and set an access code. Share the code with your team so they can join.'
            : 'Enter the group name and access code provided by your admin.'}
        </Text>

        <View style={styles.form}>
          <TextField
            label="Group name"
            value={groupName}
            onChangeText={setGroupName}
            placeholder="e.g. Gen2Gen Worship"
            autoCapitalize="words"
          />
          <TextField
            label={isCreate ? 'Set access code / password' : 'Group access code / password'}
            value={accessCode}
            onChangeText={setAccessCode}
            placeholder="e.g. 4589 or passkey"
            secureTextEntry
          />
          <Button
            title={isCreate ? 'Create Group' : 'Join Group'}
            icon={isCreate ? 'add-circle-outline' : 'log-in-outline'}
            onPress={isCreate ? createGroup : joinGroup}
            loading={busy}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  wrap: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  formWrap: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 60,
    alignItems: 'center',
    gap: 14,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  body2: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  cards: {
    width: '100%',
    gap: 14,
    marginTop: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
    paddingRight: 36,
  },
  cardArrow: {
    position: 'absolute',
    right: 16,
    top: 18,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '700',
  },
  form: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
});
