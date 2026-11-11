import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fieldsFromForm, formFromItem, ItemForm, type ItemFormValues } from '@/components/ItemForm';
import { Banner, Button } from '@/components/ui';
import { refreshCloset } from '@/lib/closet';
import { today } from '@/lib/dates';
import { deleteItem, getItem, setItemPhoto, setItemStatus, updateItem, type Item } from '@/lib/items';
import { deletePhoto, photoUrls, pickPhoto, uploadPhoto } from '@/lib/photos';
import { listWear, logWear, unlogWear, wornText, type Wear } from '@/lib/wear';
import { page } from '@/lib/layout';
import { C, F, R } from '@/theme';

export default function EditItem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [values, setValues] = useState<ItemFormValues | null>(null);
  const [wear, setWear] = useState<Wear | undefined>();
  const [busy, setBusy] = useState<'save' | 'delete' | 'photo' | 'wear' | null>(null);

  const refreshStore = () => item && refreshCloset(item.owner_id);
  const done = () => {
    refreshStore();
    router.back();
  };

  useEffect(() => {
    (async () => {
      try {
        const it = await getItem(id);
        setItem(it);
        setValues(formFromItem(it));
        if (it.photo_key) setUrl((await photoUrls([it.photo_key]))[it.photo_key] ?? null);
        setWear((await listWear())[id]);
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
      done();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  async function changePhoto(source: 'camera' | 'library') {
    if (!item) return;
    let key: string | null = null;
    try {
      const photo = await pickPhoto(source);
      if (!photo) return;
      setBusy('photo');
      key = await uploadPhoto(item.owner_id, photo);
      await setItemPhoto(item.id, key);
      if (item.photo_key) await deletePhoto(item.photo_key);
      setItem({ ...item, photo_key: key });
      setUrl(photo.uri);
      refreshStore();
    } catch (e) {
      if (key) await deletePhoto(key).catch(() => {});
      Alert.alert('Could not change photo', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function toggleWornToday() {
    setBusy('wear');
    try {
      if (wear?.last_worn === today()) await unlogWear(id);
      else if (item) await logWear([item]);
      setWear((await listWear())[id]);
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(status: Item['status']) {
    if (!item) return;
    try {
      await setItemStatus(item.id, status);
      setItem({ ...item, status });
      refreshStore();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : String(e));
    }
  }
  const backToCloset = () => setStatus('active');

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
            done();
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

  const wornToday = wear?.last_worn === today();
  const details = [item.brand, item.size && `Size ${item.size}`, item.retailer, item.purchased_on && `Bought ${item.purchased_on}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView contentContainerStyle={[styles.container, page]} keyboardShouldPersistTaps="handled">
      {item.status !== 'active' && (
        <Banner tone="warn">
          <Text style={{ flex: 1 }}>Set aside to {item.status}. Hidden from your closet and outfit ideas.</Text>
          <Pressable onPress={backToCloset} hitSlop={8}>
            <Text style={styles.link}>Back to closet</Text>
          </Pressable>
        </Banner>
      )}

      {url ? (
        <Image source={{ uri: url, cacheKey: item.photo_key ?? undefined }} style={styles.photo} contentFit="contain" />
      ) : (
        <View style={[styles.photo, styles.noPhoto]}>
          <Text style={styles.noPhotoText}>No photo yet</Text>
        </View>
      )}
      <View style={styles.row}>
        <Button
          title={url ? 'New photo' : 'Take photo'}
          variant="secondary"
          onPress={() => changePhoto('camera')}
          busy={busy === 'photo'}
          disabled={!!busy}
        />
        <Button title="From library" variant="secondary" onPress={() => changePhoto('library')} disabled={!!busy} />
      </View>

      <View style={styles.wearRow}>
        <Text style={styles.wearText}>{wornText(wear)}</Text>
        <Pressable
          style={[styles.wearBtn, wornToday && styles.wearBtnOn]}
          onPress={toggleWornToday}
          disabled={!!busy}
        >
          <Text style={[styles.wearBtnText, wornToday && styles.wearBtnTextOn]}>
            {wornToday ? '✓ Worn today' : 'Wore it today'}
          </Text>
        </Pressable>
      </View>
      {details ? <Text style={styles.details}>{details}</Text> : null}

      <ItemForm values={values} onChange={setValues} />
      {item.status === 'active' && (
        <View style={styles.asideRow}>
          <Text style={styles.details}>Not wearing it any more?</Text>
          <Pressable onPress={() => setStatus('donate')} hitSlop={6}>
            <Text style={styles.link}>Donate</Text>
          </Pressable>
          <Pressable onPress={() => setStatus('sell')} hitSlop={6}>
            <Text style={styles.link}>Sell</Text>
          </Pressable>
        </View>
      )}
      <View style={[styles.row, { marginTop: 16 }]}>
        <Button title="Delete" variant="danger" onPress={confirmDelete} busy={busy === 'delete'} disabled={!!busy} />
        <Button title="Save" onPress={save} busy={busy === 'save'} disabled={!!busy} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: R.md, backgroundColor: C.surface },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  noPhotoText: { color: C.muted },
  row: { flexDirection: 'row', gap: 12 },
  link: { color: C.accentText, fontFamily: F.semibold },
  wearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  wearText: { color: C.muted, flex: 1 },
  wearBtn: { borderWidth: 1, borderColor: C.ink, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  wearBtnOn: { backgroundColor: C.accentText, borderColor: C.accentText },
  wearBtnText: { fontFamily: F.semibold, color: C.ink },
  wearBtnTextOn: { color: C.white },
  details: { color: C.muted },
  asideRow: { flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: 8 },
});
