import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LogoMark } from '@/components/Icon';
import { APP_NAME } from '@/config';
import { isConfigured, supabase } from '@/lib/supabase';
import { page } from '@/lib/layout';
import { C, F, input as inputBase, R } from '@/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[page, styles.inner]}>
      <View style={styles.brand}>
        <LogoMark size={72} />
        <Text style={styles.title} accessibilityLabel={APP_NAME}>
          Designer <Text style={styles.titleItalic}>Wife</Text>
        </Text>
        <Text style={styles.tagline}>Your closet, styled.</Text>
      </View>
      {!isConfigured && (
        <Text style={styles.error}>Supabase is not configured. Add your keys to .env.</Text>
      )}
      <TextInput
        style={styles.input}
        placeholderTextColor={C.muted}
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholderTextColor={C.muted}
        placeholder="Password"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable
        style={[styles.button, (busy || !email || !password) && styles.disabled]}
        onPress={signIn}
        disabled={busy || !email || !password}
      >
        {busy ? <ActivityIndicator color={C.onPrimary} /> : <Text style={styles.buttonText}>Sign in</Text>}
      </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: C.bg },
  inner: { maxWidth: 420, gap: 12 },
  brand: { alignItems: 'center', gap: 8, marginBottom: 24 },
  title: { fontSize: 44, fontFamily: F.display, color: C.ink, textAlign: 'center' },
  titleItalic: { fontFamily: F.displayItalic, color: C.accentText },
  tagline: { fontFamily: F.body, fontSize: 16, color: C.muted },
  input: { ...inputBase },
  button: { backgroundColor: C.primary, borderRadius: R.pill, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  disabled: { opacity: 0.5 },
  buttonText: { color: C.onPrimary, fontSize: 15, fontFamily: F.semibold },
  error: { color: C.danger, textAlign: 'center', fontFamily: F.body },
});
