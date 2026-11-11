import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_600SemiBold_Italic,
} from '@expo-google-fonts/playfair-display';
import { useFonts } from 'expo-font';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Dimensions, View } from 'react-native';
import { AuthProvider, useAuth } from '@/lib/auth';
import { isTabletSize } from '@/lib/layout';
import { C, F } from '@/theme';

function RootStack() {
  const { session, loading } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_600SemiBold_Italic,
  });

  if (loading || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.accentText} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        headerTintColor: C.accentText,
        headerTitleStyle: { fontFamily: F.display, fontSize: 20, color: C.ink },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="item/new"
          options={{ headerShown: true, title: 'New item', presentation: 'modal' }}
        />
        <Stack.Screen name="item/[id]" options={{ headerShown: true, title: 'Item' }} />
        <Stack.Screen name="item/bulk" options={{ headerShown: true, title: 'Add many' }} />
        <Stack.Screen name="import" options={{ headerShown: true, title: 'Import order' }} />
        <Stack.Screen name="declutter" options={{ headerShown: true, title: 'Declutter' }} />
        <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings', presentation: 'modal' }} />
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
  // Phones stay in portrait; iPads (and big Android tablets) can rotate.
  useEffect(() => {
    const { width, height } = Dimensions.get('screen');
    if (!isTabletSize(width, height)) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootStack />
    </AuthProvider>
  );
}
