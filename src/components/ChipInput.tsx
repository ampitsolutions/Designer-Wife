import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

/** Editable list of short values: tap × to remove, type and press return (or a comma) to add. */
export function ChipInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [text, setText] = useState('');

  function add(raw: string) {
    const parts = raw
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter((p) => p && !values.includes(p));
    if (parts.length) onChange([...values, ...new Set(parts)]);
    setText('');
  }

  return (
    <View style={styles.box}>
      {values.map((v) => (
        <Pressable key={v} style={styles.chip} onPress={() => onChange(values.filter((x) => x !== v))}>
          <Text style={styles.chipText}>{v}</Text>
          <Text style={styles.remove}>×</Text>
        </Pressable>
      ))}
      <TextInput
        style={styles.input}
        placeholder={values.length ? 'Add more…' : placeholder}
        autoCapitalize="none"
        value={text}
        onChangeText={(t) => (t.endsWith(',') ? add(t) : setText(t))}
        onSubmitEditing={() => add(text)}
        onBlur={() => text.trim() && add(text)}
        submitBehavior="submit"
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { color: '#222' },
  remove: { color: '#888', fontSize: 16, lineHeight: 18 },
  input: { flexGrow: 1, minWidth: 100, fontSize: 16, paddingVertical: 4 },
});
