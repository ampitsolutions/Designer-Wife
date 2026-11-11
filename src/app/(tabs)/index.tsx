import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ClosetBrowser } from '@/components/ClosetBrowser';
import { Empty, Fab } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCloset } from '@/lib/closet';

export default function ClosetScreen() {
  const { session } = useAuth();
  const closet = useCloset(session?.user.id);

  return (
    <View style={styles.container}>
      {closet.error && !closet.items.length ? (
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
          onRefresh={closet.refresh}
          onPressItem={(item) => router.push(`/item/${item.id}`)}
        />
      )}
      <Fab onPress={() => router.push('/item/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  retry: { alignSelf: 'center', marginBottom: 48 },
  retryText: { fontWeight: '600' },
});
