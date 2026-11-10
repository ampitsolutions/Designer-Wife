# Wardrobe

Private iOS/Android app for two people to catalogue clothes, build outfits and plan trip packing.

**Stack:** Expo (React Native, TypeScript) · Supabase (auth + Postgres) · Cloudflare R2 (photos) · Gemini API (free tier)

## Status

- [x] Step 1 — Expo app, sign-in, database schema with row level security
- [ ] Step 2 — Closet: photo, background removal, compress, upload to R2
- [ ] Step 3 — AI tagging (Gemini)
- [ ] Step 4 — Closet browsing and filters
- [ ] Step 5 — Outfits
- [ ] Step 6 — Trips, weather, packing checklist
- [ ] Step 7 — Outfit calendar

## Setup (one time)

1. **Supabase** — create a free project at supabase.com.
   - SQL Editor → paste and run `supabase/migrations/0001_init.sql`.
   - Authentication → Users → **Add user** for each of you (email + password, tick *Auto confirm*).
   - Authentication → Sign In / Providers → turn **off** "Allow new users to sign up" (keeps the app private).
   - Project Settings → API → copy the **Project URL** and **anon public** key.
2. **Env file** — copy `.env.example` to `.env` and fill in the two `EXPO_PUBLIC_` values.
   R2 and Gemini keys are set later as Edge Function secrets, never in the app.
3. **Run** — on your computer:
   ```bash
   npm install
   npx expo start
   ```
   Scan the QR code with **Expo Go** (iPhone camera or the Expo Go app on Android).

## Rules

- Free tiers only.
- Never commit `.env` or keys.
- R2 uploads go through a Supabase Edge Function, so R2 keys never ship in the app.
