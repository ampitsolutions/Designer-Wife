import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { CLOTHING_TYPES, SEASONS } from '@/config';
import { gridColumns } from '@/lib/layout';
import { activeFilterCount, distinctValues, emptyFilter, filterItems, type ClosetFilter } from '@/lib/filters';
import type { Item } from '@/lib/items';
import { Button } from './ui';
import { ItemThumb } from './ItemThumb';
import { page } from '@/lib/layout';
import { C, F, input as inputBase, R } from '@/theme';

const GAP = 4;

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <Pressable key={o} onPress={() => onToggle(o)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/**
 * Searchable, filterable grid of closet items.
 * Browse mode: tap opens the item. Select mode: tap toggles selection.
 */
export function ClosetBrowser({
  items,
  loading,
  onRefresh,
  onPressItem,
  selectedIds,
  header,
  emptyText = 'Your closet is empty. Tap + to add your first item.',
}: {
  items: Item[];
  loading?: boolean;
  onRefresh?: () => void;
  onPressItem: (item: Item) => void;
  selectedIds?: string[];
  header?: React.ReactElement;
  emptyText?: string;
}) {
  const window = useWindowDimensions();
  // Measure our own width (a sheet on iPad is narrower than the screen).
  const [width, setWidth] = useState(window.width);
  const [filter, setFilter] = useState<ClosetFilter>(emptyFilter);
  const [showFilters, setShowFilters] = useState(false);

  const shown = useMemo(() => filterItems(items, filter), [items, filter]);
  const colours = useMemo(() => distinctValues(items, (i) => i.colours).slice(0, 24), [items]);
  const occasions = useMemo(() => distinctValues(items, (i) => i.occasions).slice(0, 24), [items]);
  const usedTypes = useMemo(() => CLOTHING_TYPES.filter((t) => items.some((i) => i.type === t)), [items]);
  const nFilters = activeFilterCount(filter);
  const columns = gridColumns(width);
  const size = Math.floor((width - GAP * (columns + 1)) / columns);

  return (
    <View style={styles.container} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search name, colour, tag…"
          value={filter.query}
          onChangeText={(query) => setFilter({ ...filter, query })}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        <Pressable style={[styles.filterBtn, nFilters > 0 && styles.filterBtnOn]} onPress={() => setShowFilters(true)}>
          <Text style={[styles.filterText, nFilters > 0 && styles.chipTextOn]}>
            Filters{nFilters ? ` (${nFilters})` : ''}
          </Text>
        </Pressable>
      </View>

      {usedTypes.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeBar}>
          {usedTypes.map((t) => {
            const on = filter.types.includes(t);
            return (
              <Pressable
                key={t}
                onPress={() => setFilter({ ...filter, types: toggle(filter.types, t) })}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={shown}
        keyExtractor={(i) => i.id}
        key={`cols-${columns}`}
        numColumns={columns}
        contentContainerStyle={{ padding: GAP, gap: GAP, flexGrow: 1, paddingBottom: 96 }}
        columnWrapperStyle={{ gap: GAP }}
        keyboardDismissMode="on-drag"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!loading} onRefresh={onRefresh} /> : undefined}
        ListHeaderComponent={header}
        initialNumToRender={18}
        windowSize={7}
        renderItem={({ item }) => (
          <Pressable onPress={() => onPressItem(item)}>
            <ItemThumb item={item} size={size} selected={selectedIds?.includes(item.id)} />
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? undefined : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {items.length ? 'Nothing matches. Try clearing the search or filters.' : emptyText}
              </Text>
            </View>
          )
        }
      />

      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilters(false)}>
        <ScrollView contentContainerStyle={[styles.sheet, page]}>
          <Text style={styles.sheetTitle}>Filters</Text>
          <Text style={styles.label}>Type</Text>
          <Chips options={CLOTHING_TYPES} selected={filter.types} onToggle={(v) => setFilter({ ...filter, types: toggle(filter.types, v) })} />
          <Text style={styles.label}>Colour</Text>
          {colours.length ? (
            <Chips options={colours} selected={filter.colours} onToggle={(v) => setFilter({ ...filter, colours: toggle(filter.colours, v) })} />
          ) : (
            <Text style={styles.hint}>No colours yet</Text>
          )}
          <Text style={styles.label}>Occasion</Text>
          {occasions.length ? (
            <Chips options={occasions} selected={filter.occasions} onToggle={(v) => setFilter({ ...filter, occasions: toggle(filter.occasions, v) })} />
          ) : (
            <Text style={styles.hint}>No occasions yet</Text>
          )}
          <Text style={styles.label}>Season</Text>
          <Chips options={SEASONS} selected={filter.seasons} onToggle={(v) => setFilter({ ...filter, seasons: toggle(filter.seasons, v) })} />
          <View style={styles.sheetButtons}>
            <Button title="Clear" variant="secondary" onPress={() => setFilter({ ...emptyFilter, query: filter.query })} />
            <Button title={`Show ${filterItems(items, filter).length}`} onPress={() => setShowFilters(false)} />
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingTop: 8 },
  search: { ...inputBase, flex: 1 },
  filterBtn: { borderWidth: 1, borderColor: C.borderStrong, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  filterBtnOn: { backgroundColor: C.ink, borderColor: C.ink },
  filterText: { color: C.ink, fontFamily: F.semibold },
  typeBar: { gap: 6, paddingHorizontal: 8, paddingTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: C.borderStrong, backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { color: C.ink },
  chipTextOn: { color: C.white },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: C.muted, textAlign: 'center' },
  sheet: { padding: 20, gap: 10, paddingBottom: 48 },
  sheetTitle: { fontSize: 22, fontFamily: F.display },
  label: { fontFamily: F.semibold, marginTop: 12 },
  hint: { color: C.muted },
  sheetButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
});
