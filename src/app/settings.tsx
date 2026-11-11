import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { APP_NAME } from '@/config';
import { clearCloset } from '@/lib/closet';
import { page } from '@/lib/layout';
import { clearPeople, setManager, stepDown, usePeople } from '@/lib/people';
import { supabase } from '@/lib/supabase';

export default function Settings() {
  const { me, people, profiles, grantedTo, nameOf } = usePeople();
  const [busy, setBusy] = useState<string | null>(null);
  const others = profiles.filter((p) => p.id !== me);
  const managed = people.filter((p) => !p.isMe);

  async function toggle(id: string, allowed: boolean) {
    if (!me) return;
    setBusy(id);
    try {
      await setManager(me, id, allowed);
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function leave(ownerId: string) {
    if (!me) return;
    Alert.alert(`Stop managing ${nameOf(ownerId)}'s closet?`, 'They can give you access again later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: () => stepDown(me, ownerId).catch((e) => Alert.alert('Could not update', String(e?.message ?? e))),
      },
    ]);
  }

  async function signOut() {
    clearCloset();
    clearPeople();
    await supabase.auth.signOut();
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, page]}>
      <Text style={styles.h}>Who can manage my closet</Text>
      <Text style={styles.note}>
        They can add, edit and delete your clothes and outfits, plan your trip outfits and declutter for you.
      </Text>
      {others.length ? (
        others.map((p) => (
          <View key={p.id} style={styles.row}>
            <Text style={styles.name}>{p.display_name || 'Partner'}</Text>
            <Switch value={grantedTo.includes(p.id)} disabled={busy === p.id} onValueChange={(v) => toggle(p.id, v)} />
          </View>
        ))
      ) : (
        <Text style={styles.note}>No one else has an account yet.</Text>
      )}

      <Text style={[styles.h, { marginTop: 24 }]}>Closets I manage</Text>
      {managed.length ? (
        managed.map((p) => (
          <View key={p.id} style={styles.row}>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.link} onPress={() => leave(p.id)}>
              Stop managing
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.note}>None. Someone can give you access from their own Settings.</Text>
      )}

      <View style={{ marginTop: 40, flexDirection: 'row' }}>
        <Button title="Sign out" variant="secondary" onPress={signOut} />
      </View>
      <Text style={[styles.note, { textAlign: 'center', marginTop: 16 }]}>
        {APP_NAME} · signed in as {profiles.find((p) => p.id === me)?.display_name ?? 'you'}
      </Text>
      <Text style={[styles.link, { textAlign: 'center' }]} onPress={() => router.back()}>
        Done
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, paddingBottom: 48 },
  h: { fontSize: 18, fontWeight: '700' },
  note: { color: '#666' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 16 },
  link: { color: '#0a7aff', fontWeight: '600', padding: 4 },
});
