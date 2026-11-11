import { supabase } from './supabase';

export type Profile = { id: string; display_name: string | null };

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('id, display_name').order('display_name');
  if (error) throw error;
  return data as Profile[];
}

export const profileName = (p: Profile | undefined) => p?.display_name || 'Partner';
