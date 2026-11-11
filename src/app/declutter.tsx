import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ItemThumb } from '@/components/ItemThumb';
import { Empty } from '@/components/ui';
import { KEEP_SNOOZE_MONTHS } from '@/config';
import { usePeople } from '@/lib/people';
import { refreshCloset, useCloset } from '@/lib/closet';
import { addDays, today } from '@/lib/dates';
import { declutterSuggestions } from '@/lib/declutter';
import { deleteItem, setItemStatus, type Item, type ItemStatus } from '@/lib/items';
import { deletePhoto } from '@/lib/photos';
import { logWear, useWear } from '@/lib/wear';
import { page } from '@/lib/layout';

type Tab = 'suggest' | 'donate' | 'sell';

function Action({ label, onPress, tone }: { label: string; onPress: () => void; tone?: 'danger' }) {
  return (
    <Pressable style={[styles.action, tone === 'danger' && styles.actionDanger]} onPress={onPress} hitSlop={4}>
      <Text style={[styles.actionText, tone === 'danger' && styles.actionDangerText]}>{label}</Text>
    </Pressable>
  );
}

export default function Declutter() {
  const { activeId, active } = usePeople();
  const closet = useCloset(activeId);
  const { wear, reload } = useWear();
  const [tab, setTab] = useState<Tab>('suggest');

  useFocusEffect(
    useCallback(() => {
      reload().catch(() => {});
    }, [reload]),
  );

  const now = today();
  const suggestions = useMemo(() => declutterSuggestions(closet.all, wear, now), [closet.all, wear, now]);
  const donate = closet.all.filter((i) => i.status === 'donate');
  const sell = closet.all.filter((i) => i.status === 'sell');

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      if (activeId) await refreshCloset(activeId);
      await reload();
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : String(e));
    }
  }

  const keep = (i: Item) => act(() => setItemStatus(i.id, 'active', addDays(now, KEEP_SNOOZE_MONTHS * 30)));
  const mark = (i: Item, s: ItemStatus) => act(() => setItemStatus(i.id, s));
  const woreToday = (i: Item) => act(() => logWear([i]));
  const gone = (i: Item) =>
    Alert.alert(`Remove "${i.name || 'this item'}" for good?`, 'It is deleted from your closet, outfits and plans.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          act(async () => {
            await deleteItem(i.id);
            if (i.photo_key) await deletePhoto(i.photo_key);
          }),
      },
    ]);

  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: 'suggest', label: 'Suggestions', n: suggestions.length },
    { key: 'donate', label: 'Donate', n: donate.length },
    { key: 'sell', label: 'Sell', n: sell.length },
  ];

  const data =
    tab === 'suggest'
      ? suggestions.map((s) => ({ item: s.item, reason: s.reason }))
      : (tab === 'donate' ? donate : sell).map((item) => ({ item, reason: '' }));

  return (
    <View style={styles.container}>
      {active && !active.isMe && <Stack.Screen options={{ title: `Declutter ${active.name}'s closet` }} />}
      <View style={[page, { paddingHorizontal: 12 }]}>
      <View style={styles.tabs}>
        {tabs.map((t) => (
          <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabOn]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>
              {t.label}
              {t.n ? ` (${t.n})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>
      </View>
      <FlatList
        data={data}
        keyExtractor={(d) => d.item.id}
        contentContainerStyle={{ ...page, padding: 12, gap: 14, flexGrow: 1, paddingBottom: 48 }}
        renderItem={({ item: { item, reason } }) => (
          <View style={styles.row}>
            <Pressable onPress={() => router.push(`/item/${item.id}`)}>
              <ItemThumb item={item} size={76} />
            </Pressable>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name || item.type || 'Untitled item'}
              </Text>
              {reason ? <Text style={styles.reason}>{reason}</Text> : null}
              <View style={styles.actions}>
                {tab === 'suggest' ? (
                  <>
                    <Action label="Keep" onPress={() => keep(item)} />
                    <Action label="Wore today" onPress={() => woreToday(item)} />
                    <Action label="Donate" onPress={() => mark(item, 'donate')} />
                    <Action label="Sell" onPress={() => mark(item, 'sell')} />
                  </>
                ) : (
                  <>
                    <Action label="Back to closet" onPress={() => mark(item, 'active')} />
                    <Action label={tab === 'donate' ? 'Donated' : 'Sold'} tone="danger" onPress={() => gone(item)} />
                  </>
                )}
              </View>
            </View>
          </View>
        )}
        ListHeaderComponent={
          tab === 'suggest' && suggestions.length ? (
            <Text style={styles.hint}>
              Clothes you haven't worn in a while. "Keep" hides one for {KEEP_SNOOZE_MONTHS} months. Donate and Sell move it out of
              your closet and outfit ideas until you're done.
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          tab === 'suggest' ? (
            <Empty
              title="Nothing to declutter"
              note='Log what you wear with "Wore it today" on an item or outfit. Unworn clothes show up here after a few months.'
            />
          ) : (
            <Empty title={`Nothing set aside to ${tab}`} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabs: { flexDirection: 'row', marginTop: 12, backgroundColor: '#f2f2f2', borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabOn: { backgroundColor: '#fff' },
  tabText: { color: '#666', fontWeight: '600' },
  tabTextOn: { color: '#111' },
  hint: { color: '#666', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12 },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: '600' },
  reason: { color: '#b45309' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  action: { borderWidth: 1, borderColor: '#ccc', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  actionText: { color: '#222', fontSize: 13 },
  actionDanger: { borderColor: '#c0392b' },
  actionDangerText: { color: '#c0392b' },
});
