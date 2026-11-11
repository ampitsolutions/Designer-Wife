import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

/** Round "+" button in the bottom-right corner. */
export function Fab({ onPress, label = '+' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable style={fab.fab} onPress={onPress} accessibilityLabel="Add">
      <Text style={fab.text}>{label}</Text>
    </Pressable>
  );
}

/** Small grey box for status messages (loading, AI results, errors). */
export function Banner({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' }) {
  return <View style={[fab.banner, tone === 'warn' && fab.warn]}>{children}</View>;
}

export function Empty({ title, note }: { title: string; note?: string }) {
  return (
    <View style={fab.empty}>
      <Text style={fab.emptyTitle}>{title}</Text>
      {note ? <Text style={fab.emptyNote}>{note}</Text> : null}
    </View>
  );
}

const fab = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  text: { color: '#fff', fontSize: 30, lineHeight: 32 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f4f4f4', borderRadius: 10, padding: 12 },
  warn: { backgroundColor: '#fdf2e9' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptyNote: { color: '#666', textAlign: 'center' },
});

export function Button({
  title,
  onPress,
  busy,
  disabled,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={[styles.base, styles[variant], off && styles.disabled]}
    >
      {busy ? (
        <ActivityIndicator color={variant === 'secondary' ? '#111' : '#fff'} />
      ) : (
        <Text style={[styles.text, variant === 'secondary' && styles.textDark]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 10, padding: 14, alignItems: 'center', flex: 1 },
  primary: { backgroundColor: '#111' },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#111' },
  danger: { backgroundColor: '#c0392b' },
  disabled: { opacity: 0.5 },
  text: { color: '#fff', fontWeight: '600', fontSize: 16 },
  textDark: { color: '#111' },
});
