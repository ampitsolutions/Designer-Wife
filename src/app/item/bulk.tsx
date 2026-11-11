import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { applySuggestion, emptyItemForm, fieldsFromForm } from '@/components/ItemForm';
import { Banner, Button } from '@/components/ui';
import { AI_CALL_SPACING_MS, BULK_MAX_PHOTOS } from '@/config';
import { suggestTags, withRetry } from '@/lib/ai';
import { usePeople } from '@/lib/people';
import { refreshCloset } from '@/lib/closet';
import { createItem } from '@/lib/items';
import { deletePhoto, pickMany, prepare, uploadPhoto, type RawPhoto } from '@/lib/photos';
import { page } from '@/lib/layout';

type Status = 'waiting' | 'working' | 'done' | 'no-tags' | 'failed';
type Row = { key: string; raw: RawPhoto; status: Status; itemId?: string; name?: string; error?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Pick many photos; each is compressed, tagged by AI and saved automatically.
 * Items whose AI tagging failed are still saved and can be filled in later.
 */
export default function BulkAdd() {
  const { active } = usePeople();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [running, setRunning] = useState(false);
  const stop = useRef(false);

  const patch = (key: string, p: Partial<Row>) =>
    setRows((rs) => rs?.map((r) => (r.key === key ? { ...r, ...p } : r)) ?? rs);

  async function choose() {
    const picked = await pickMany(BULK_MAX_PHOTOS);
    if (!picked.length) {
      if (!rows) router.back();
      return;
    }
    const list = picked.map((raw, n) => ({ key: `${Date.now()}-${n}`, raw, status: 'waiting' as Status }));
    setRows(list);
    run(list);
  }

  async function run(list: Row[]) {
    if (!active) return;
    const owner = active.id;
    stop.current = false;
    setRunning(true);
    let lastAi = 0;
    for (const row of list) {
      if (stop.current) break;
      patch(row.key, { status: 'working' });
      let key: string | null = null;
      try {
        const photo = await prepare(row.raw);
        // Space out AI calls to stay inside the free tier's per-minute limit.
        const wait = lastAi + AI_CALL_SPACING_MS - Date.now();
        if (wait > 0) await sleep(wait);
        lastAi = Date.now();
        let values = emptyItemForm;
        let tagged = true;
        try {
          values = applySuggestion(emptyItemForm, await withRetry(() => suggestTags(photo)));
        } catch {
          tagged = false;
        }
        key = await uploadPhoto(owner, photo);
        const itemId = await createItem({ ...fieldsFromForm(values), photo_key: key, source: 'bulk', owner_id: owner });
        patch(row.key, { status: tagged ? 'done' : 'no-tags', itemId, name: values.name || undefined });
      } catch (e) {
        if (key) await deletePhoto(key).catch(() => {});
        patch(row.key, { status: 'failed', error: e instanceof Error ? e.message : String(e) });
      }
    }
    setRunning(false);
    refreshCloset(owner);
  }

  useEffect(() => {
    choose();
    return () => {
      stop.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = (rows ?? []).reduce<Record<Status, number>>(
    (c, r) => ({ ...c, [r.status]: c[r.status] + 1 }),
    { waiting: 0, working: 0, done: 0, 'no-tags': 0, failed: 0 },
  );
  const finished = counts.done + counts['no-tags'] + counts.failed;
  const failed = (rows ?? []).filter((r) => r.status === 'failed');

  return (
    <>
      <Stack.Screen options={{ title: active && !active.isMe ? `Add many for ${active.name}` : 'Add many', gestureEnabled: !running }} />
      {!rows ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={[styles.list, page]}
          ListHeaderComponent={
            <View style={{ gap: 10, marginBottom: 8 }}>
              {running ? (
                <Banner>
                  <ActivityIndicator size="small" />
                  <Text style={{ flexShrink: 1 }}>
                    Adding {finished + 1} of {rows.length}… Keep this screen open. About 7 seconds per photo.
                  </Text>
                </Banner>
              ) : (
                <Banner tone={counts.failed ? 'warn' : 'info'}>
                  <Text style={{ flexShrink: 1 }}>
                    Added {counts.done + counts['no-tags']} of {rows.length}.
                    {counts['no-tags'] ? ` ${counts['no-tags']} need details (AI couldn't read them).` : ''}
                    {counts.failed ? ` ${counts.failed} failed.` : ''}
                    {counts.waiting ? ` ${counts.waiting} not started.` : ''}
                  </Text>
                </Banner>
              )}
              <View style={styles.row}>
                {running ? (
                  <Button title="Stop after this one" variant="secondary" onPress={() => (stop.current = true)} />
                ) : (
                  <>
                    {(failed.length > 0 || counts.waiting > 0) && (
                      <Button
                        title="Retry the rest"
                        variant="secondary"
                        onPress={() => run((rows ?? []).filter((r) => r.status === 'failed' || r.status === 'waiting'))}
                      />
                    )}
                    <Button title="Add more" variant="secondary" onPress={choose} />
                    <Button title="Done" onPress={() => router.back()} />
                  </>
                )}
              </View>
            </View>
          }
          renderItem={({ item: r }) => (
            <Pressable
              style={styles.item}
              disabled={!r.itemId || running}
              onPress={() => r.itemId && router.push(`/item/${r.itemId}`)}
            >
              <Image source={{ uri: r.raw.uri }} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {r.name || (r.status === 'waiting' ? 'Waiting' : r.status === 'working' ? 'Reading…' : 'Untitled item')}
                </Text>
                <Text style={[styles.status, r.status === 'failed' && styles.bad]} numberOfLines={2}>
                  {r.status === 'done'
                    ? 'Saved · tap to check'
                    : r.status === 'no-tags'
                      ? 'Saved without details · tap to fill in'
                      : r.status === 'failed'
                        ? `Not saved: ${r.error}`
                        : r.status === 'working'
                          ? 'Compressing, tagging, uploading'
                          : ''}
                </Text>
              </View>
              {r.status === 'working' && <ActivityIndicator size="small" />}
              {(r.status === 'done' || r.status === 'no-tags') && <Text style={styles.tick}>✓</Text>}
            </Pressable>
          )}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, gap: 8, paddingBottom: 48 },
  row: { flexDirection: 'row', gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#f4f4f4' },
  name: { fontSize: 16, fontWeight: '600' },
  status: { color: '#666', fontSize: 13 },
  bad: { color: '#b91c1c' },
  tick: { color: '#2e7d32', fontSize: 18, fontWeight: '700' },
});
