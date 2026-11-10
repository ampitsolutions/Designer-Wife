import { Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#111',
        headerRight: () => (
          <Pressable onPress={() => supabase.auth.signOut()} style={{ marginRight: 16 }}>
            <Text>Sign out</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Closet' }} />
      <Tabs.Screen name="outfits" options={{ title: 'Outfits' }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
    </Tabs>
  );
}
