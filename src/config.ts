// App-wide settings. Change values here rather than in screens.

export const APP_NAME = 'Designer Wife';

export const STORAGE_BUCKET = process.env.EXPO_PUBLIC_STORAGE_BUCKET || 'wardrobe-photos';

// Photos are resized to this width (px) and saved as JPEG before upload.
export const PHOTO_MAX_WIDTH = 1200;
export const PHOTO_JPEG_QUALITY = 0.7;

// How long a photo link stays valid (seconds). Photos are cached on the phone.
export const PHOTO_URL_TTL = 60 * 60 * 24;

export const CLOTHING_TYPES = [
  'Top',
  'Bottom',
  'Dress',
  'Outerwear',
  'Shoes',
  'Bag',
  'Accessory',
  'Ethnic wear',
  'Activewear',
  'Other',
] as const;
