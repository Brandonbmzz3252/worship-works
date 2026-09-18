import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingView } from '@/components/ui/loading-view';
import { RoleSelect } from '@/components/ui/role-select';
import { TextField } from '@/components/ui/text-field';
import { useBrand } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import {
  createMember,
  deleteMember,
  subscribeMembers,
  updateMember,
} from '@/lib/store';
import { BAND_SECTIONS, MEMBER_ROLES, OTHER_ROLE, SINGER_ROLE, TECH_TEAM_ROLE } from '@/lib/types';
import type { MemberDir, MemberRole } from '@/lib/types';

export default function MembersAdmin() {
  const brand = useBrand();
  const { profile } = useAuth();
  const [members, setMembers] = useState<MemberDir[] | null>(null);
  const churchId = profile?.churchId ?? null;

  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>(SINGER_ROLE);
  const [instrument, setInstrument] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<MemberRole>(SINGER_ROLE);
  const [editInstrument, setEditInstrument] = useState('');

  useEffect(() => subscribeMembers(churchId ?? '', setMembers), [churchId]);

  function addMember() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter the member name.');
      return;
    }
    if (role === OTHER_ROLE && !instrument.trim()) {
      Alert.alert('Missing instrument', 'Type the instrument this member plays.');
      return;
    }
    setSaving(true);
    createMember({ name: name.trim(), role, instrument })
      .then(() => {
        setName('');
        setRole(SINGER_ROLE);
        setInstrument('');
      })
      .catch(() => Alert.alert('Error', 'Could not add the member. Please try again.'))
      .finally(() => setSaving(false));
  }

  function startEdit(member: MemberDir) {
    setEditingId(member.id);
    setEditName(member.name);
    setEditRole(member.role);
    setEditInstrument(member.instrument ?? '');
  }

  function saveEdit() {
    if (!editingId) return;
    if (!editName.trim()) {
      Alert.alert('Missing name', 'Enter the member name.');
      return;
    }
    if (editRole === OTHER_ROLE && !editInstrument.trim()) {
      Alert.alert('Missing instrument', 'Type the instrument this member plays.');
      return;
    }
    setSaving(true);
    updateMember(editingId, { name: editName.trim(), role: editRole, instrument: editInstrument })
      .then(() => setEditingId(null))
      .catch(() => Alert.alert('Error', 'Could not save the member.'))
      .finally(() => setSaving(false));
  }

  function confirmDelete(member: MemberDir) {
    Alert.alert('Remove member', `Remove ${member.name} from the directory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteMember(member.id).catch(() => Alert.alert('Error', 'Could not remove the member.')),
      },
    ]);
  }

  if (members === null) {
    return <LoadingView />;
  }

  const singerNames = members.filter((m) => m.role === SINGER_ROLE);
  const sections: { title: string; list: MemberDir[] }[] = [
    { title: 'Singers', list: singerNames },
    ...BAND_SECTIONS.map((section) => ({ title: section, list: members.filter((m) => m.role === section) })),
    { title: TECH_TEAM_ROLE, list: members.filter((m) => m.role === TECH_TEAM_ROLE) },
    { title: 'Other', list: members.filter((m) => m.role === OTHER_ROLE) },
  ].filter((s) => s.list.length > 0);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.card, { backgroundColor: brand.card, borderColor: brand.accentSoft }]}>
        <Text style={[styles.cardTitle, { color: brand.primary }]}>Add member</Text>
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Thabo Nkosi"
        />
        <RoleSelect
          label="Section"
          value={role}
          options={MEMBER_ROLES}
          onSelect={(value) => setRole((value as MemberRole) ?? SINGER_ROLE)}
          placeholder="Select section"
        />
        {role === OTHER_ROLE ? (
          <TextField
            label="Instrument *"
            value={instrument}
            onChangeText={setInstrument}
            placeholder="e.g. Percussion"
          />
        ) : null}
        <Button title="Add member" icon="person-add-outline" onPress={addMember} loading={saving} />
      </View>

      <Text style={[styles.membersLabel, { color: brand.primary }]}>Directory</Text>

      {sections.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No members yet"
          message="Add singers and musicians above so they can be picked for duties from dropdowns."
        />
      ) : (
        sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: brand.primary }]}>
              {section.title} ({section.list.length})
            </Text>
            <View style={[styles.card, { backgroundColor: brand.card, borderColor: brand.cardBorder }]}>
              {section.list.map((member, index) =>
                editingId === member.id ? (
                  <View
                    key={member.id}
                    style={[
                      styles.row,
                      index > 0 && styles.rowBorder,
                      index > 0 && { borderTopColor: brand.cardBorder },
                      { backgroundColor: brand.accentSoft },
                    ]}>
                    <TextField
                      label="Name"
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Member name"
                    />
                    <RoleSelect
                      label="Section"
                      value={editRole}
                      options={MEMBER_ROLES}
                      onSelect={(value) => setEditRole((value as MemberRole) ?? SINGER_ROLE)}
                      placeholder="Section"
                    />
                    {editRole === OTHER_ROLE ? (
                      <TextField
                        label="Instrument *"
                        value={editInstrument}
                        onChangeText={setEditInstrument}
                        placeholder="e.g. Percussion"
                      />
                    ) : null}
                    <View style={styles.editActions}>
                      <Button title="Save" icon="checkmark" onPress={saveEdit} loading={saving} />
                      <Button
                        title="Cancel"
                        variant="ghost"
                        onPress={() => setEditingId(null)}
                      />
                    </View>
                  </View>
                ) : (
                  <View
                    key={member.id}
                    style={[styles.row, index > 0 && styles.rowBorder, index > 0 && { borderTopColor: brand.cardBorder }]}>
                    <Pressable style={styles.rowMain} onPress={() => startEdit(member)}>
                      <Text style={[styles.memberName, { color: brand.onCard }]}>{member.name}</Text>
                      <Text style={[styles.memberRole, { color: brand.muted }]}>
                        {member.role === OTHER_ROLE && member.instrument
                          ? `Other · ${member.instrument}`
                          : member.role}
                      </Text>
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => confirmDelete(member)}>
                      <Ionicons name="trash-outline" size={19} color={brand.danger} />
                    </Pressable>
                  </View>
                )
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 14,
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  membersLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    paddingVertical: 4,
    gap: 10,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 12,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  memberRole: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8A8A8A',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
});