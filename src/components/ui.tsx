import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F, R, T } from '@/theme';
import { Icon } from './Icon';

/** Neon round "+" icon button in the bottom-right corner (48×48 per the design system, with glow). */
export function Fab({ onPress, label = 'Add' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable style={({ pressed }) => [ui.fab, pressed && { opacity: 0.85 }]} onPress={onPress} accessibilityLabel={label} accessibilityRole="button">
      <Icon name="plus" size={26} color={C.onPrimary} />
    </Pressable>
  );
}

/** Tinted box for status messages (loading, AI results, errors). */
export function Banner({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' }) {
  return <View style={[ui.banner, tone === 'warn' && ui.warn]}>{children}</View>;
}

export function Empty({ title, note }: { title: string; note?: string }) {
  return (
    <View style={ui.empty}>
      <Text style={ui.emptyTitle}>{title}</Text>
      {note ? <Text style={ui.emptyNote}>{note}</Text> : null}
    </View>
  );
}

/**
 * Pill button, 48 high.
 * primary = neon, secondary = outline, soft = tinted, danger = red outline.
 */
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
  variant?: 'primary' | 'secondary' | 'soft' | 'danger';
}) {
  const off = disabled || busy;
  const textStyle = { primary: ui.textPrimary, secondary: ui.textOutline, soft: ui.textSoft, danger: ui.textDanger }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [ui.base, ui[variant], off && ui.disabled, pressed && !off && { opacity: 0.85 }]}
    >
      {busy ? (
        <ActivityIndicator color={variant === 'primary' ? C.onPrimary : C.ink} />
      ) : (
        <Text style={[ui.text, textStyle]} numberOfLines={1}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const ui = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: R.pill,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: C.primary,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: R.md, padding: 12 },
  warn: { backgroundColor: C.warnBg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { ...T.cardTitle, textAlign: 'center' },
  emptyNote: { ...T.meta, fontSize: 15, textAlign: 'center', lineHeight: 22 },

  base: { minHeight: 48, borderRadius: R.pill, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', flex: 1 },
  primary: { backgroundColor: C.primary },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.ink },
  soft: { backgroundColor: C.surface },
  danger: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.danger },
  disabled: { opacity: 0.45 },
  text: { fontFamily: F.semibold, fontSize: 15 },
  textPrimary: { color: C.onPrimary },
  textOutline: { color: C.ink },
  textSoft: { color: C.accentText },
  textDanger: { color: C.danger },
});
