# Designer Wife

Private iOS/Android app for two people to catalogue clothes, build outfits and plan trip packing.

**Stack:** Expo (React Native, TypeScript) · Supabase (auth, Postgres, photo storage) · Gemini API (free tier)

## Status

- [x] Step 1 — Expo app, sign-in, database schema with row level security
- [x] Step 2 — Closet: photo, compress, upload, browse, edit/delete (background removal later)
- [x] Step 3 — AI tagging (Gemini): name, type, colours, tags, occasions, formality, seasons
- [ ] Step 4 — Closet browsing and filters
- [ ] Step 5 — Outfits
- [ ] Step 6 — Trips, weather, packing checklist
- [ ] Step 7 — Outfit calendar

## Setup (one time)

1. **Supabase** — create a free project at supabase.com.
   - SQL Editor → paste and run each file in `supabase/migrations/` in order (`0001`, `0002`, …).
   - Authentication → Users → **Add user** for each of you (email + password, tick *Auto confirm*).
   - Authentication → Sign In / Providers → turn **off** "Allow new users to sign up" (keeps the app private).
   - Project Settings → API → copy the **Project URL** and **anon public** key.
2. **Env file** — copy `.env.example` to `.env` and fill in the two `EXPO_PUBLIC_` values.
   The Gemini key is added later as an Edge Function secret, never in the app.
3. **Run** — on your computer:
   ```bash
   npm install
   npx expo start
   ```
   Scan the QR code with **Expo Go** (iPhone camera or the Expo Go app on Android).

## AI tagging setup (one time)

1. Get a free Gemini API key at aistudio.google.com → **Get API key**.
2. Supabase → **Edge Functions → Secrets** → add `GEMINI_API_KEY` with that key.
3. Supabase → **Edge Functions → Deploy a new function → Via editor**. Name it `tag-item`,
   paste the contents of `supabase/functions/tag-item/index.ts`, and deploy.
   (Or with the Supabase CLI: `npx supabase functions deploy tag-item`.)

Optional secret `GEMINI_MODEL` switches the model (default `gemini-2.5-flash`).

## Rules

- Free tiers only.
- Never commit `.env` or keys.
- Photos go in Supabase Storage (1 GB free). Cloudflare R2 only if we outgrow it.
