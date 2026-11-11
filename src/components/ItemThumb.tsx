import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePhotoUrls } from '@/lib/closet';
import type { Item } from '@/lib/items';
import { C, F, R } from '@/theme';

/** Square item photo. The cache key is the storage key, so it stays cached across link refreshes. */
export function ItemThumb({
  item,
  size,
  style,
  selected,
}: {
  item: Pick<Item, 'id' | 'photo_key' | 'name' | 'type'>;
  size: number;
  style?: StyleProp<ViewStyle>;
  selected?: boolean;
}) {
  const urls = usePhotoUrls();
  const url = item.photo_key ? urls[item.photo_key] : undefined;
  return (
    <View style={[{ width: size, height: size }, styles.box, style]}>
      {url ? (
        <Image
          source={{ uri: url, cacheKey: item.photo_key ?? undefined }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          recyclingKey={item.id}
          transition={120}
        />
      ) : (
        <Text style={styles.fallback} numberOfLines={2}>
          {item.name || item.type || ''}
        </Text>
      )}
      {selected && (
        <View style={styles.tick}>
          <Text style={styles.tickText}>✓</Text>
        </View>
      )}
    </View>
  );
}

/** Up to 4 item photos in a 2×2 grid. */
export function OutfitCollage({ items, size }: { items: Item[]; size: number }) {
  const shown = items.slice(0, 4);
  const cell = shown.length <= 1 ? size : size / 2 - 1;
  return (
    <View style={[styles.collage, { width: size, height: size }]}>
      {shown.length === 0 ? (
        <Text style={styles.fallback}>No items</Text>
      ) : (
        shown.map((it) => <ItemThumb key={it.id} item={it} size={cell} style={styles.cell} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: R.sm, overflow: 'hidden', backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  fallback: { color: C.muted, fontSize: 12, textAlign: 'center', padding: 4 },
  tick: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.white,
  },
  tickText: { color: C.white, fontSize: 13, fontFamily: F.semibold },
  collage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: { borderRadius: 0 },
});
