import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '@/lib/auth';

function RootStack() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="item/new"
          options={{ headerShown: true, title: 'New item', presentation: 'modal' }}
        />
        <Stack.Screen name="item/[id]" options={{ headerShown: true, title: 'Item' }} />
        <Stack.Screen name="outfit/new" options={{ headerShown: true, title: 'New outfit' }} />
        <Stack.Screen name="outfit/[id]" options={{ headerShown: true, title: 'Outfit' }} />
        <Stack.Screen name="outfit/ideas" options={{ headerShown: true, title: 'Outfit ideas' }} />
        <Stack.Screen name="trip/edit" options={{ headerShown: true, title: 'Trip', presentation: 'modal' }} />
        <Stack.Screen name="trip/[id]" options={{ headerShown: true, title: 'Trip' }} />
        <Stack.Screen name="trip/day/[id]" options={{ headerShown: true, title: 'Day' }} />
        <Stack.Screen name="trip/packing/[id]" options={{ headerShown: true, title: 'Packing list' }} />
        <Stack.Screen name="event/edit" options={{ headerShown: true, title: 'Event', presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootStack />
    </AuthProvider>
  );
}
