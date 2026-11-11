import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { OutfitEditor } from '@/components/OutfitEditor';
import { ensureUrls } from '@/lib/closet';
import { getOutfit, type Outfit } from '@/lib/outfits';

export default function EditOutfit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [outfit, setOutfit] = useState<Outfit | null>(null);

  useEffect(() => {
    getOutfit(id)
      .then(async (o) => {
        await ensureUrls(o.items.map((i) => i.photo_key));
        setOutfit(o);
      })
      .catch((e) => {
        Alert.alert('Could not load outfit', e instanceof Error ? e.message : String(e));
        router.back();
      });
  }, [id]);

  if (!outfit) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return <OutfitEditor outfit={outfit} />;
}
