import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { Person } from '@/lib/people';

/** "Whose closet" chips. Renders nothing when there's only your own closet. */
export function PersonSwitcher({
  people,
  activeId,
  onChange,
  extra,
}: {
  people: Person[];
  activeId: string | null;
  onChange: (id: string) => void;
  /** Optional extra choice, e.g. { id: 'together', label: 'Together' } */
  extra?: { id: string; label: string };
}) {
  if (people.length < 2) return null;
  const options = [
    ...people.map((p) => ({ id: p.id, label: p.isMe ? `My closet` : `${p.name}'s closet` })),
    ...(extra ? [extra] : []),
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((o) => {
        const on = o.id === activeId;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={[styles.chip, on && styles.on]}>
            <Text style={[styles.text, on && styles.textOn]}>👤 {o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: { borderWidth: 1, borderColor: '#d8cbb8', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  on: { backgroundColor: '#6b4f2a', borderColor: '#6b4f2a' },
  text: { color: '#6b4f2a', fontWeight: '600' },
  textOn: { color: '#fff' },
});
