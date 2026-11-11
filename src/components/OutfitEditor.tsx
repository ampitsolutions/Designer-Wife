import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useCloset } from '@/lib/closet';
import type { Item } from '@/lib/items';
import { createOutfit, deleteOutfit, updateOutfit, type Outfit } from '@/lib/outfits';
import { logWear } from '@/lib/wear';
import { ClosetBrowser } from './ClosetBrowser';
import { ItemThumb } from './ItemThumb';
import { Button } from './ui';
import { page } from '@/lib/layout';

/**
 * Create or edit an outfit. Pass `outfit` to edit; `initial` to prefill a new one (e.g. from AI ideas).
 * Read-only when the outfit belongs to someone else.
 */
export function OutfitEditor({
  outfit,
  initial,
}: {
  outfit?: Outfit;
  initial?: { name?: string; occasion?: string; itemIds?: string[] };
}) {
  const { session } = useAuth();
  const closet = useCloset(session?.user.id);
  const readOnly = !!outfit && outfit.owner_id !== session?.user.id;

  const [name, setName] = useState(outfit?.name ?? initial?.name ?? '');
  const [occasion, setOccasion] = useState(outfit?.occasion ?? initial?.occasion ?? '');
  const [favourite, setFav] = useState(outfit?.is_favourite ?? false);
  const [shared, setShared] = useState(outfit?.shared ?? false);
  const [ids, setIds] = useState<string[]>(outfit?.items.map((i) => i.id) ?? initial?.itemIds ?? []);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [wornToday, setWornToday] = useState(false);

  async function woreIt() {
    // Only my own items can be logged (a shared outfit may contain my partner's things).
    const mine = selected.filter((i) => i.owner_id === session?.user.id).map((i) => i.id);
    try {
      await logWear(mine);
      setWornToday(true);
    } catch (e) {
      Alert.alert('Could not log', e instanceof Error ? e.message : String(e));
    }
  }

  // Items come from my closet; for someone else's shared outfit, from the outfit itself.
  const lookup = (id: string): Item | undefined => closet.byId(id) ?? outfit?.items.find((i) => i.id === id);
  const selected = ids.map(lookup).filter((i): i is Item => !!i);

  const toggle = (id: string) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  async function save() {
    if (!ids.length) return Alert.alert('Add at least one item');
    setBusy('save');
    const fields = { name: name.trim() || null, occasion: occasion.trim() || null, is_favourite: favourite, shared };
    try {
      if (outfit) await updateOutfit(outfit.id, fields, ids);
      else await createOutfit(fields, ids);
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  function remove() {
    if (!outfit) return;
    Alert.alert('Delete this outfit?', 'The clothes stay in your closet.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          try {
            await deleteOutfit(outfit.id);
            router.back();
          } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : String(e));
            setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <>
      <ScrollView contentContainerStyle={[styles.container, page]} keyboardShouldPersistTaps="handled">
        <View style={styles.grid}>
          {selected.map((it) => (
            <Pressable key={it.id} disabled={readOnly} onPress={() => toggle(it.id)}>
              <ItemThumb item={it} size={104} />
              {!readOnly && <Text style={styles.remove}>×</Text>}
            </Pressable>
          ))}
          {!readOnly && (
            <Pressable style={styles.add} onPress={() => setPicking(true)}>
              <Text style={styles.addPlus}>+</Text>
              <Text style={styles.addText}>Add items</Text>
            </Pressable>
          )}
        </View>

        {readOnly ? (
          <View style={styles.readOnly}>
            <Text style={styles.title}>{outfit?.name || 'Untitled outfit'}</Text>
            {outfit?.occasion ? <Text style={styles.meta}>{outfit.occasion}</Text> : null}
            <Text style={styles.meta}>Shared with you by your partner.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Sunday brunch" value={name} onChangeText={setName} />
            <Text style={styles.label}>Occasion</Text>
            <TextInput style={styles.input} placeholder="e.g. wedding, work, date night" value={occasion} onChangeText={setOccasion} />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Favourite</Text>
              <Switch value={favourite} onValueChange={setFav} />
            </View>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Share with partner</Text>
                <Text style={styles.meta}>They can see this outfit and its items.</Text>
              </View>
              <Switch value={shared} onValueChange={setShared} />
            </View>
            {outfit && (
              <View style={styles.buttons}>
                <Button
                  title={wornToday ? '✓ Logged as worn today' : 'Wore this today'}
                  variant="secondary"
                  onPress={woreIt}
                  disabled={wornToday || !ids.length}
                />
              </View>
            )}
            <View style={styles.buttons}>
              {outfit && <Button title="Delete" variant="danger" onPress={remove} busy={busy === 'delete'} disabled={!!busy} />}
              <Button title="Save outfit" onPress={save} busy={busy === 'save'} disabled={!!busy || !ids.length} />
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={picking} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicking(false)}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Pick items ({ids.length})</Text>
          <Pressable onPress={() => setPicking(false)} hitSlop={12}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <ClosetBrowser
          items={closet.items}
          loading={closet.loading}
          onRefresh={closet.refresh}
          selectedIds={ids}
          onPressItem={(it) => toggle(it.id)}
          emptyText="Add clothes to your closet first."
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8, paddingBottom: 48 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 21,
    overflow: 'hidden',
  },
  add: {
    width: 104,
    height: 104,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlus: { fontSize: 28, color: '#555' },
  addText: { color: '#555' },
  label: { fontWeight: '600', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, gap: 12 },
  switchLabel: { fontSize: 16 },
  meta: { color: '#666' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  readOnly: { gap: 6, marginTop: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 4 },
  pickerTitle: { fontSize: 18, fontWeight: '700' },
  done: { fontSize: 17, fontWeight: '600', color: '#0a7aff' },
});
