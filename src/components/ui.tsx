import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

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
