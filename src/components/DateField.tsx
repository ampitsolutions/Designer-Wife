import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDate, fromISODate, toISODate } from '@/lib/dates';
import { C } from '@/theme';

/** Tap to pick a date. Value is "YYYY-MM-DD" or null. */
export function DateField({
  value,
  onChange,
  placeholder = 'Pick a date',
  minimumDate,
}: {
  value: string | null;
  onChange: (v: string) => void;
  placeholder?: string;
  minimumDate?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? fromISODate(value) : minimumDate ? fromISODate(minimumDate) : new Date();

  return (
    <View>
      <Pressable style={styles.field} onPress={() => setOpen((o) => !o)}>
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatDate(value, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : placeholder}
        </Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate ? fromISODate(minimumDate) : undefined}
          onChange={(event, d) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (event.type === 'set' && d) {
              onChange(toISODate(d));
              if (Platform.OS === 'ios') setOpen(false);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { borderWidth: 1, borderColor: C.borderStrong, borderRadius: 10, padding: 12 },
  value: { fontSize: 16, color: C.ink },
  placeholder: { fontSize: 16, color: C.muted },
});
