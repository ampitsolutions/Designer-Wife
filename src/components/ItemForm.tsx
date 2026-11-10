import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CLOTHING_TYPES } from '@/config';

export type ItemFormValues = { name: string; type: string | null; colours: string; notes: string };

export const emptyItemForm: ItemFormValues = { name: '', type: null, colours: '', notes: '' };

export function ItemForm({
  values,
  onChange,
}: {
  values: ItemFormValues;
  onChange: (v: ItemFormValues) => void;
}) {
  const set = (patch: Partial<ItemFormValues>) => onChange({ ...values, ...patch });

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Navy linen shirt"
        value={values.name}
        onChangeText={(name) => set({ name })}
      />

      <Text style={styles.label}>Type</Text>
      <View style={styles.chips}>
        {CLOTHING_TYPES.map((t) => {
          const on = values.type === t;
          return (
            <Pressable
              key={t}
              onPress={() => set({ type: on ? null : t })}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Colours</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. navy, white"
        autoCapitalize="none"
        value={values.colours}
        onChangeText={(colours) => set({ colours })}
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        placeholder="Brand, size, where it's from…"
        multiline
        value={values.notes}
        onChangeText={(notes) => set({ notes })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8 },
  label: { fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16 },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { color: '#333' },
  chipTextOn: { color: '#fff' },
});
