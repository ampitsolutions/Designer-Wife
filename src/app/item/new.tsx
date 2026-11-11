import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  applySuggestion,
  emptyItemForm,
  fieldsFromForm,
  ItemForm,
  type ItemFormValues,
} from '@/components/ItemForm';
import { Button } from '@/components/ui';
import { suggestTags } from '@/lib/ai';
import { refreshCloset } from '@/lib/closet';
import { createItem } from '@/lib/items';
import { usePeople } from '@/lib/people';
import { Stack } from 'expo-router';
import { deletePhoto, pickPhoto, uploadPhoto, type PreparedPhoto } from '@/lib/photos';
import { page } from '@/lib/layout';

type AiState = 'idle' | 'working' | 'done' | 'failed';

export default function NewItem() {
  const { active } = usePeople();
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [values, setValues] = useState<ItemFormValues>(emptyItemForm);
  const [ai, setAi] = useState<AiState>('idle');
  const [saving, setSaving] = useState(false);
  const run = useRef(0); // ignore results for a photo that was since replaced

  async function autoTag(p: PreparedPhoto) {
    const id = ++run.current;
    setAi('working');
    try {
      const s = await suggestTags(p);
      if (id !== run.current) return;
      setValues((v) => applySuggestion(v, s));
      setAi('done');
    } catch (e) {
      if (id !== run.current) return;
      console.warn('Auto-tag failed', e);
      setAi('failed');
    }
  }

  async function choose(source: 'camera' | 'library') {
    try {
      const picked = await pickPhoto(source);
      if (!picked) return;
      setPhoto(picked);
      setValues(emptyItemForm); // new photo, fresh suggestions
      autoTag(picked);
    } catch (e) {
      Alert.alert('Could not use photo', e instanceof Error ? e.message : String(e));
    }
  }

  async function save() {
    if (!photo || !active) return;
    setSaving(true);
    let key: string | null = null;
    try {
      key = await uploadPhoto(active.id, photo);
      await createItem({ ...fieldsFromForm(values), photo_key: key, owner_id: active.id });
      refreshCloset(active.id);
      router.back();
    } catch (e) {
      if (key) await deletePhoto(key); // don't leave an orphaned photo
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, page]} keyboardShouldPersistTaps="handled">
      {active && !active.isMe && <Stack.Screen options={{ title: `New item for ${active.name}` }} />}
      {photo ? (
        <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="contain" />
      ) : (
        <View style={[styles.photo, styles.empty]}>
          <Text style={styles.emptyText}>Add a photo of the item</Text>
        </View>
      )}
      <View style={styles.row}>
        <Button title="Camera" variant="secondary" onPress={() => choose('camera')} />
        <Button title="Library" variant="secondary" onPress={() => choose('library')} />
      </View>

      {ai === 'working' && (
        <View style={styles.banner}>
          <ActivityIndicator size="small" />
          <Text style={styles.bannerText}>Reading the photo… you can start typing.</Text>
        </View>
      )}
      {ai === 'done' && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Filled in from the photo. Edit or add anything.</Text>
        </View>
      )}
      {ai === 'failed' && photo && (
        <Pressable style={[styles.banner, styles.bannerWarn]} onPress={() => autoTag(photo)}>
          <Text style={styles.bannerText}>Couldn't read the photo. Tap to try again, or fill in below.</Text>
        </Pressable>
      )}

      <ItemForm values={values} onChange={setValues} />

      <View style={[styles.row, styles.saveRow]}>
        <Button title="Save item" onPress={save} busy={saving} disabled={!photo} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#f4f4f4' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#888' },
  row: { flexDirection: 'row', gap: 12 },
  saveRow: { marginTop: 16 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f4f4f4',
    borderRadius: 10,
    padding: 12,
  },
  bannerWarn: { backgroundColor: '#fdf2e9' },
  bannerText: { color: '#333', flexShrink: 1 },
});
