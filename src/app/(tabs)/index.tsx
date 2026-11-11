import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ClosetBrowser } from '@/components/ClosetBrowser';
import { PersonSwitcher } from '@/components/PersonSwitcher';
import { Empty, Fab } from '@/components/ui';
import { useCloset } from '@/lib/closet';
import { today } from '@/lib/dates';
import { declutterSuggestions } from '@/lib/declutter';
import { usePeople } from '@/lib/people';
import { useWear } from '@/lib/wear';
import { C, F, R } from '@/theme';

function Tool({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.tool} onPress={onPress}>
      <Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
}

export default function ClosetScreen() {
  const { people, activeId, setActive } = usePeople();
  const closet = useCloset(activeId);
  const { wear, reload } = useWear();

  useFocusEffect(
    useCallback(() => {
      reload().catch(() => {});
    }, [reload]),
  );

  const declutterCount = useMemo(
    () => declutterSuggestions(closet.all, wear, today()).length + closet.all.filter((i) => i.status !== 'active').length,
    [closet.all, wear],
  );

  const toolbar = (
    <View>
    <PersonSwitcher people={people} activeId={activeId} onChange={setActive} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tools}>
      <Tool label="📷  Add many" onPress={() => router.push('/item/bulk')} />
      <Tool label="🧾  Import order" onPress={() => router.push('/import')} />
      <Tool label={`🧺  Declutter${declutterCount ? ` (${declutterCount})` : ''}`} onPress={() => router.push('/declutter')} />
    </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {closet.error && !closet.all.length ? (
        <View style={styles.container}>
          <Empty title="Couldn't load your closet" note={closet.error} />
          <Pressable onPress={closet.refresh} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ClosetBrowser
          items={closet.items}
          loading={closet.loading}
          onRefresh={() => {
            closet.refresh();
            reload().catch(() => {});
          }}
          onPressItem={(item) => router.push(`/item/${item.id}`)}
          header={toolbar}
        />
      )}
      <Fab onPress={() => router.push('/item/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  retry: { alignSelf: 'center', marginBottom: 48 },
  retryText: { fontFamily: F.semibold },
  tools: { gap: 8, paddingBottom: 6 },
  tool: { backgroundColor: C.surface, borderRadius: R.pill, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  toolText: { fontFamily: F.semibold, color: C.accentText },
});
