import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { fieldsFromForm, formFromItem, ItemForm, type ItemFormValues } from '@/components/ItemForm';
import { Button } from '@/components/ui';
import { deleteItem, getItem, updateItem, type Item } from '@/lib/items';
import { deletePhoto, photoUrls } from '@/lib/photos';

export default function EditItem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [values, setValues] = useState<ItemFormValues | null>(null);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const it = await getItem(id);
        setItem(it);
        setValues(formFromItem(it));
        if (it.photo_key) setUrl((await photoUrls([it.photo_key]))[it.photo_key] ?? null);
      } catch (e) {
        Alert.alert('Could not load item', e instanceof Error ? e.message : String(e));
        router.back();
      }
    })();
  }, [id]);

  async function save() {
    if (!values) return;
    setBusy('save');
    try {
      await updateItem(id, fieldsFromForm(values));
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this item?', 'This also removes its photo.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          try {
            await deleteItem(id);
            if (item?.photo_key) await deletePhoto(item.photo_key);
            router.back();
          } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : String(e));
            setBusy(null);
          }
        },
      },
    ]);
  }

  if (!item || !values) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Image
        source={url ? { uri: url, cacheKey: item.photo_key ?? undefined } : undefined}
        style={styles.photo}
        contentFit="contain"
      />
      <ItemForm values={values} onChange={setValues} />
      <View style={styles.row}>
        <Button title="Delete" variant="danger" onPress={confirmDelete} busy={busy === 'delete'} disabled={!!busy} />
        <Button title="Save" onPress={save} busy={busy === 'save'} disabled={!!busy} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#f4f4f4' },
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
