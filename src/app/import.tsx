import { encode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { applySuggestion, emptyItemForm, fieldsFromForm } from '@/components/ItemForm';
import { Banner, Button } from '@/components/ui';
import { readOrder, type OrderLine } from '@/lib/ai';
import { usePeople } from '@/lib/people';
import { Stack } from 'expo-router';
import { refreshCloset } from '@/lib/closet';
import { createItem } from '@/lib/items';
import { boxToCrop, deletePhoto, pickMany, prepare, uploadPhoto, type PreparedPhoto, type RawPhoto } from '@/lib/photos';
import { page } from '@/lib/layout';
import { C, F, input as inputBase } from '@/theme';

const MAX_SHOTS = 6;
const MAX_PDF_BYTES = 8 * 1024 * 1024;

type Line = OrderLine & { key: string; include: boolean; photo: PreparedPhoto | null };

/**
 * Import clothes from an online order: screenshots of the order, a PDF receipt, or pasted email text.
 * The AI lists the items (and finds product photos in screenshots); you review and add them.
 */
export default function ImportOrder() {
  const { active } = usePeople();
  const [shots, setShots] = useState<RawPhoto[]>([]);
  const [pdf, setPdf] = useState<{ name: string; data: string } | null>(null);
  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);

  async function addShots() {
    const picked = await pickMany(MAX_SHOTS - shots.length);
    if (picked.length) setShots([...shots, ...picked].slice(0, MAX_SHOTS));
  }

  async function addPdf() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (res.canceled || !res.assets[0]) return;
      const a = res.assets[0];
      if (a.size && a.size > MAX_PDF_BYTES) return Alert.alert('PDF too large', 'Use a PDF under 8 MB, or take screenshots instead.');
      const buf = await new File(a.uri).arrayBuffer();
      setPdf({ name: a.name, data: encode(buf) });
    } catch (e) {
      Alert.alert('Could not open PDF', e instanceof Error ? e.message : String(e));
    }
  }

  async function read() {
    setReading(true);
    setError(null);
    try {
      // Smaller copies for the AI; product photos are cropped from the full-size originals.
      const images = await Promise.all(
        shots.map(async (s) => ({ data: (await prepare(s, { maxWidth: 1600 })).base64, mimeType: 'image/jpeg' })),
      );
      const found = await readOrder({ text: text.trim() || undefined, images, pdf: pdf ? { data: pdf.data } : undefined });
      const withPhotos: Line[] = [];
      for (const [n, l] of found.entries()) {
        let photo: PreparedPhoto | null = null;
        const shot = l.photo_image >= 0 ? shots[l.photo_image] : undefined;
        if (shot && l.photo_box) {
          photo = await prepare(shot, { crop: boxToCrop(l.photo_box, shot.width, shot.height) }).catch(() => null);
        }
        withPhotos.push({ ...l, key: String(n), include: true, photo });
      }
      setLines(withPhotos);
      if (!withPhotos.length) setError("No clothing found. Try a clearer screenshot or paste the order email's text.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReading(false);
    }
  }

  const patch = (key: string, p: Partial<Line>) => setLines((ls) => ls?.map((l) => (l.key === key ? { ...l, ...p } : l)) ?? ls);

  async function addAll() {
    if (!active || !lines) return;
    const owner = active.id;
    const chosen = lines.filter((l) => l.include && l.name.trim());
    setSaving({ done: 0, total: chosen.length });
    const failed: string[] = [];
    for (const [n, l] of chosen.entries()) {
      let key: string | null = null;
      try {
        if (l.photo) key = await uploadPhoto(owner, l.photo);
        const values = applySuggestion(emptyItemForm, { ...l, name: l.name.trim() });
        const fields = fieldsFromForm(values);
        await createItem({
          ...fields,
          notes: l.quantity > 1 ? `Pack of ${l.quantity}` : fields.notes,
          photo_key: key,
          brand: l.brand || null,
          size: l.size || null,
          retailer: l.retailer || null,
          purchased_on: l.order_date,
          source: 'order',
          owner_id: owner,
        });
      } catch {
        if (key) await deletePhoto(key).catch(() => {});
        failed.push(l.name);
      }
      setSaving({ done: n + 1, total: chosen.length });
    }
    refreshCloset(owner);
    setSaving(null);
    if (failed.length) Alert.alert('Some items were not added', failed.join('\n'));
    else router.back();
  }

  // ---------- review ----------
  if (lines && lines.length) {
    const count = lines.filter((l) => l.include).length;
    return (
      <ScrollView contentContainerStyle={[styles.container, page]} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Found {lines.length} item{lines.length === 1 ? '' : 's'}. Untick anything you don't want, fix names, then add. You can add
          photos to items without one later.
        </Text>
        {lines.map((l) => (
          <View key={l.key} style={[styles.line, !l.include && styles.lineOff]}>
            <Pressable onPress={() => patch(l.key, { include: !l.include })} hitSlop={8}>
              <View style={[styles.box, l.include && styles.boxOn]}>{l.include && <Text style={styles.check}>✓</Text>}</View>
            </Pressable>
            {l.photo ? (
              <Image source={{ uri: l.photo.uri }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.noThumb]}>
                <Text style={styles.noThumbText}>No photo</Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <TextInput style={styles.nameInput} value={l.name} onChangeText={(name) => patch(l.key, { name })} />
              <Text style={styles.meta} numberOfLines={2}>
                {[l.type, l.colours.join('/'), l.brand, l.size && `Size ${l.size}`, l.quantity > 1 && `×${l.quantity}`]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </View>
        ))}
        {saving && (
          <Banner>
            <ActivityIndicator size="small" />
            <Text>
              Adding {saving.done} of {saving.total}…
            </Text>
          </Banner>
        )}
        <View style={styles.row}>
          <Button title="Start over" variant="secondary" onPress={() => setLines(null)} disabled={!!saving} />
          <Button title={`Add ${count} item${count === 1 ? '' : 's'}`} onPress={addAll} busy={!!saving} disabled={!count} />
        </View>
      </ScrollView>
    );
  }

  // ---------- inputs ----------
  const hasInput = shots.length > 0 || !!pdf || text.trim().length > 0;
  return (
    <ScrollView contentContainerStyle={[styles.container, page]} keyboardShouldPersistTaps="handled">
      {active && !active.isMe && <Stack.Screen options={{ title: `Import for ${active.name}` }} />}
      <Text style={styles.hint}>
        Add screenshots of your order (best: product photos get cropped automatically), a PDF receipt, or paste the order email's
        text. Mix and match.
      </Text>

      <Text style={styles.label}>Screenshots ({shots.length}/{MAX_SHOTS})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {shots.map((s, n) => (
          <Pressable key={s.uri} onPress={() => setShots(shots.filter((_, i) => i !== n))}>
            <Image source={{ uri: s.uri }} style={styles.shot} contentFit="cover" />
            <Text style={styles.remove}>×</Text>
          </Pressable>
        ))}
        {shots.length < MAX_SHOTS && (
          <Pressable style={[styles.shot, styles.addShot]} onPress={addShots}>
            <Text style={styles.addPlus}>+</Text>
          </Pressable>
        )}
      </ScrollView>

      <Text style={styles.label}>PDF receipt</Text>
      {pdf ? (
        <View style={styles.pdfRow}>
          <Text style={{ flex: 1 }} numberOfLines={1}>
            📄 {pdf.name}
          </Text>
          <Pressable onPress={() => setPdf(null)} hitSlop={8}>
            <Text style={styles.link}>Remove</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.row}>
          <Button title="Choose PDF" variant="secondary" onPress={addPdf} />
        </View>
      )}

      <Text style={styles.label}>Or paste the order email</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        multiline
        placeholder="In Mail: open the order email, select all, copy, paste here"
        value={text}
        onChangeText={setText}
      />

      {error && (
        <Banner tone="warn">
          <Text style={{ flexShrink: 1 }}>{error}</Text>
        </Banner>
      )}
      {reading && (
        <Banner>
          <ActivityIndicator size="small" />
          <Text style={{ flexShrink: 1 }}>Reading your order…</Text>
        </Banner>
      )}
      <View style={styles.row}>
        <Button title="Read order" onPress={read} busy={reading} disabled={!hasInput} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, paddingBottom: 48 },
  hint: { color: C.muted },
  label: { fontFamily: F.semibold, marginTop: 8 },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  input: { ...inputBase },
  multiline: { minHeight: 140, textAlignVertical: 'top' },
  shot: { width: 72, height: 128, borderRadius: 8, backgroundColor: C.surface },
  addShot: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.borderStrong, alignItems: 'center', justifyContent: 'center' },
  addPlus: { fontSize: 28, color: C.muted },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: C.overlay,
    color: C.white,
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 21,
    overflow: 'hidden',
  },
  pdfRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 10, padding: 12 },
  link: { color: C.accentText },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineOff: { opacity: 0.4 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.ink, borderColor: C.ink },
  check: { color: C.white, fontFamily: F.semibold },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: C.surface },
  noThumb: { alignItems: 'center', justifyContent: 'center' },
  noThumbText: { color: C.muted, fontSize: 11 },
  nameInput: { fontSize: 16, fontFamily: F.semibold, paddingVertical: 2, borderBottomWidth: 1, borderBottomColor: C.border },
  meta: { color: C.muted, fontSize: 13 },
});
