import { router, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { C, F } from '@/theme';

const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: unknown; size: number }) => <Icon name={name} color={String(color)} size={size} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.accentText,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: F.medium, fontSize: 12 },
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border },
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: F.display, fontSize: 24, color: C.ink },
        headerTitleAlign: 'left',
        sceneStyle: { backgroundColor: C.bg },
        headerRight: () => (
          <Pressable
            onPress={() => router.push('/settings')}
            style={{ marginRight: 16, padding: 6 }}
            hitSlop={10}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Icon name="settings" color={C.ink} size={24} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Closet', tabBarIcon: tabIcon('closet') }} />
      <Tabs.Screen name="outfits" options={{ title: 'Outfits', tabBarIcon: tabIcon('outfits') }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips', tabBarIcon: tabIcon('trips') }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: tabIcon('calendar') }} />
    </Tabs>
  );
}
