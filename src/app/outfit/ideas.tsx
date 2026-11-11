import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ItemThumb } from '@/components/ItemThumb';
import { Banner, Button } from '@/components/ui';
import { suggestOutfits, type OutfitIdea } from '@/lib/ai';
import { loadCloset, useCloset } from '@/lib/closet';
import type { Item } from '@/lib/items';
import { usePeople } from '@/lib/people';
import { PersonSwitcher } from '@/components/PersonSwitcher';
import { page } from '@/lib/layout';

const EXAMPLES = ['Office day', 'Friend’s wedding (evening)', 'Weekend brunch', 'Diwali party', 'Date night'];

export default function OutfitIdeas() {
  const { people, activeId, nameOf, me } = usePeople();
  // Whose clothes to use: one person, or 'together' for coordinated looks from two closets.
  const [forWho, setForWho] = useState<string | null>(activeId);
  const together = forWho === 'together';
  const closet = useCloset(together ? me : forWho);
  const partner = people.find((p) => !p.isMe);
  const [occasion, setOccasion] = useState('');
  const [ideas, setIdeas] = useState<OutfitIdea[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(text = occasion) {
    if (!text.trim()) return;
    setOccasion(text);
    setBusy(true);
    setError(null);
    setIdeas(null);
    try {
      let items: Item[] = closet.items;
      if (together && partner && me) {
        const [mine, theirs] = await Promise.all([loadCloset(me), loadCloset(partner.id)]);
        items = [...mine, ...theirs];
      }
      setIdeas(
        await suggestOutfits(text.trim(), items, {
          together,
          whoOf: together ? (id) => (id === me ? 'You' : nameOf(id)) : undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function use(idea: OutfitIdea) {
    router.replace({
      pathname: '/outfit/new',
      params: { items: idea.item_ids.join(','), name: idea.name, occasion: occasion.trim(), ...(together ? { shared: '1' } : {}) },
    });
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, page]} keyboardShouldPersistTaps="handled">
      {people.length > 1 && (
        <>
          <Text style={styles.label}>For</Text>
          <PersonSwitcher
            people={people}
            activeId={forWho}
            onChange={setForWho}
            extra={partner ? { id: 'together', label: `Together (matching looks)` } : undefined}
          />
        </>
      )}
      <Text style={styles.label}>What's the occasion?</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Outdoor wedding in June, evening"
        value={occasion}
        onChangeText={setOccasion}
        onSubmitEditing={() => ask()}
        returnKeyType="search"
      />
      <View style={styles.examples}>
        {EXAMPLES.map((e) => (
          <Pressable key={e} style={styles.example} onPress={() => ask(e)}>
            <Text style={styles.exampleText}>{e}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <Button title="Suggest outfits" onPress={() => ask()} busy={busy} disabled={!occasion.trim() || !closet.items.length} />
      </View>

      {!closet.items.length && !closet.loading && (
        <Banner tone="warn">
          <Text>Add some clothes to your closet first.</Text>
        </Banner>
      )}
      {busy && (
        <Banner>
          <ActivityIndicator size="small" />
          <Text>Looking through {closet.items.length} items…</Text>
        </Banner>
      )}
      {error && (
        <Banner tone="warn">
          <Text style={{ flexShrink: 1 }}>{error}</Text>
        </Banner>
      )}
      {ideas && ideas.length === 0 && (
        <Banner tone="warn">
          <Text>No good matches. Try describing the occasion differently or add more clothes.</Text>
        </Banner>
      )}

      {ideas?.map((idea, n) => {
        const items = idea.item_ids.map(closet.byId).filter((i) => !!i);
        return (
          <View key={n} style={styles.card}>
            <Text style={styles.cardTitle}>{idea.name}</Text>
            <Text style={styles.reason}>{idea.reason}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {items.map((it) => (
                <ItemThumb key={it!.id} item={it!} size={88} />
              ))}
            </ScrollView>
            <View style={styles.row}>
              <Button title="Use this outfit" variant="secondary" onPress={() => use(idea)} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  label: { fontWeight: '600', fontSize: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16 },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  example: { backgroundColor: '#f4f4f4', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  exampleText: { color: '#333' },
  row: { flexDirection: 'row', gap: 12 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  reason: { color: '#555' },
});
