import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CLOTHING_TYPES, FORMALITY_LEVELS, SEASONS } from '@/config';
import type { TagSuggestion } from '@/lib/ai';
import type { Item, ItemFields } from '@/lib/items';
import { ChipInput } from './ChipInput';
import { C, F, input as inputBase, R } from '@/theme';

export type ItemFormValues = {
  name: string;
  type: string | null;
  colours: string[];
  tags: string[];
  occasions: string[];
  seasons: string[];
  formality: string | null;
  notes: string;
};

export const emptyItemForm: ItemFormValues = {
  name: '',
  type: null,
  colours: [],
  tags: [],
  occasions: [],
  seasons: [],
  formality: null,
  notes: '',
};

export const formFromItem = (it: Item): ItemFormValues => ({
  name: it.name ?? '',
  type: it.type,
  colours: it.colours,
  tags: it.tags,
  occasions: it.occasions,
  seasons: it.seasons,
  formality: it.formality,
  notes: it.notes ?? '',
});

export const fieldsFromForm = (v: ItemFormValues): ItemFields => ({
  name: v.name.trim() || null,
  type: v.type,
  colours: v.colours,
  tags: v.tags,
  occasions: v.occasions,
  seasons: v.seasons,
  formality: v.formality,
  notes: v.notes.trim() || null,
});

const lower = (xs: string[] = []) => xs.map((x) => x.trim().toLowerCase()).filter(Boolean);
const merge = (mine: string[], ai: string[] = []) => [...new Set([...mine, ...lower(ai)])];
const pick = <T extends string>(allowed: readonly T[], v?: string) =>
  allowed.find((a) => a.toLowerCase() === v?.toLowerCase()) ?? null;

/** Fills the form from an AI suggestion without overwriting anything the user already set. */
export function applySuggestion(v: ItemFormValues, s: TagSuggestion): ItemFormValues {
  return {
    ...v,
    name: v.name || s.name || '',
    type: v.type ?? pick(CLOTHING_TYPES, s.type),
    formality: v.formality ?? pick(FORMALITY_LEVELS, s.formality),
    seasons: v.seasons.length
      ? v.seasons
      : (s.seasons ?? []).flatMap((x) => pick(SEASONS, x) ?? []),
    colours: merge(v.colours, s.colours),
    occasions: merge(v.occasions, s.occasions),
    tags: merge(v.tags, s.tags),
  };
}

function Choice<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: readonly T[];
  selected: string[];
  onToggle: (o: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <Pressable key={o} onPress={() => onToggle(o)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
      <Choice
        options={CLOTHING_TYPES}
        selected={values.type ? [values.type] : []}
        onToggle={(t) => set({ type: values.type === t ? null : t })}
      />

      <Text style={styles.label}>Colours</Text>
      <ChipInput values={values.colours} onChange={(colours) => set({ colours })} placeholder="e.g. navy, white" />

      <Text style={styles.label}>Tags</Text>
      <ChipInput values={values.tags} onChange={(tags) => set({ tags })} placeholder="e.g. linen, striped, slim fit" />

      <Text style={styles.label}>Occasions</Text>
      <ChipInput
        values={values.occasions}
        onChange={(occasions) => set({ occasions })}
        placeholder="e.g. work, wedding, travel"
      />

      <Text style={styles.label}>Formality</Text>
      <Choice
        options={FORMALITY_LEVELS}
        selected={values.formality ? [values.formality] : []}
        onToggle={(f) => set({ formality: values.formality === f ? null : f })}
      />

      <Text style={styles.label}>Seasons</Text>
      <Choice
        options={SEASONS}
        selected={values.seasons}
        onToggle={(s) =>
          set({
            seasons: values.seasons.includes(s)
              ? values.seasons.filter((x) => x !== s)
              : [...values.seasons, s],
          })
        }
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
  label: { fontFamily: F.semibold, marginTop: 8 },
  input: { ...inputBase },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: C.borderStrong, backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { color: C.ink },
  chipTextOn: { color: C.white },
});
