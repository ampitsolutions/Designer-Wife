import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { Person } from '@/lib/people';
import { C, F, R } from '@/theme';

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
  chip: { borderWidth: 1.5, borderColor: C.borderStrong, backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  on: { backgroundColor: C.ink, borderColor: C.ink },
  text: { color: C.accentText, fontFamily: F.semibold },
  textOn: { color: C.white },
});
