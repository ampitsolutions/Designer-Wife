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

export const FORMALITY_LEVELS = ['Casual', 'Smart casual', 'Formal', 'Festive'] as const;

export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;

// Name of the Supabase Edge Function that does all AI work (tagging, outfit ideas, trip plans).
export const AI_FUNCTION = 'stylist';

// Calendar warns when the same outfit was used for another event within this many days.
export const REPEAT_WINDOW_DAYS = 60;

// Trips longer than this are refused (keeps AI requests and weather lookups small).
export const MAX_TRIP_DAYS = 30;

// Declutter: suggest items not worn for this many months...
export const DECLUTTER_UNWORN_MONTHS = 12;
// ...or never worn and added at least this many months ago.
export const DECLUTTER_NEVER_WORN_MONTHS = 3;
// "Keep" hides an item from declutter suggestions for this many months.
export const KEEP_SNOOZE_MONTHS = 6;

// Bulk add: max photos per batch, and pause between AI calls (free Gemini tier allows ~10 per minute).
export const BULK_MAX_PHOTOS = 30;
export const AI_CALL_SPACING_MS = 6500;
