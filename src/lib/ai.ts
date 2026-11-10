import { CLOTHING_TYPES, FORMALITY_LEVELS, SEASONS, TAG_FUNCTION } from '@/config';
import type { PreparedPhoto } from './photos';
import { supabase } from './supabase';

export type TagSuggestion = {
  name?: string;
  type?: string;
  colours?: string[];
  formality?: string;
  seasons?: string[];
  occasions?: string[];
  tags?: string[];
};

/** Asks the AI to describe the item in the photo. Throws if the AI is unavailable. */
export async function suggestTags(photo: PreparedPhoto): Promise<TagSuggestion> {
  const { data, error } = await supabase.functions.invoke(TAG_FUNCTION, {
    body: {
      image: photo.base64,
      mimeType: 'image/jpeg',
      types: CLOTHING_TYPES,
      formalities: FORMALITY_LEVELS,
      seasons: SEASONS,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.suggestion ?? {}) as TagSuggestion;
}
