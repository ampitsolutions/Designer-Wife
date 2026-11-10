import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { emptyItemForm, ItemForm, type ItemFormValues } from '@/components/ItemForm';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { createItem, parseColours } from '@/lib/items';
import { deletePhoto, pickPhoto, uploadPhoto, type PickedPhoto } from '@/lib/photos';

export default function NewItem() {
  const { session } = useAuth();
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [values, setValues] = useState<ItemFormValues>(emptyItemForm);
  const [saving, setSaving] = useState(false);

  async function choose(source: 'camera' | 'library') {
    const picked = await pickPhoto(source);
    if (picked) setPhoto(picked);
  }

  async function save() {
    if (!photo || !session) return;
    setSaving(true);
    let key: string | null = null;
    try {
      key = await uploadPhoto(session.user.id, photo);
      await createItem({
        photo_key: key,
        name: values.name.trim() || null,
        type: values.type,
        colours: parseColours(values.colours),
        notes: values.notes.trim() || null,
      });
      router.back();
    } catch (e) {
      if (key) await deletePhoto(key); // don't leave an orphaned photo
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
});
