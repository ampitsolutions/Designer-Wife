import { useLocalSearchParams } from 'expo-router';
import { OutfitEditor } from '@/components/OutfitEditor';

/** New outfit. Optional params prefill it: ?items=id1,id2&name=…&occasion=… */
export default function NewOutfit() {
  const { items, name, occasion, shared } = useLocalSearchParams<{ items?: string; name?: string; occasion?: string; shared?: string }>();
  return (
    <OutfitEditor
      initial={{ itemIds: items ? items.split(',').filter(Boolean) : [], name, occasion, shared: shared === '1' }}
    />
  );
}
