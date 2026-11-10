import { decode } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { PHOTO_JPEG_QUALITY, PHOTO_MAX_WIDTH, PHOTO_URL_TTL, STORAGE_BUCKET } from '@/config';
import { supabase } from './supabase';

/** A photo that has already been resized and compressed, ready for AI tagging and upload. */
export type PreparedPhoto = { uri: string; base64: string };

/** Opens the camera or photo library, then resizes and compresses the photo. Null if cancelled. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PreparedPhoto | null> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', `Allow ${source} access in Settings to add photos.`);
    return null;
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  const { uri, width } = result.assets[0];

  const ctx = ImageManipulator.manipulate(uri);
  if (width > PHOTO_MAX_WIDTH) ctx.resize({ width: PHOTO_MAX_WIDTH });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: PHOTO_JPEG_QUALITY,
    base64: true,
  });
  if (!saved.base64) throw new Error('Could not process photo');
  return { uri: saved.uri, base64: saved.base64 };
}

/** Uploads a prepared photo into the user's own folder. Returns the storage key. */
export async function uploadPhoto(userId: string, photo: PreparedPhoto): Promise<string> {
  const key = `${userId}/${Crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(key, decode(photo.base64), { contentType: 'image/jpeg' });
  if (error) throw error;
  return key;
}

export async function deletePhoto(key: string) {
  await supabase.storage.from(STORAGE_BUCKET).remove([key]);
}

/** Returns a map of storage key → temporary URL, in one request. */
export async function photoUrls(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(keys, PHOTO_URL_TTL);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data) if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  return map;
}
