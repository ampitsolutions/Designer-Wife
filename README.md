# Designer Wife

Private iOS/Android app for two people to catalogue clothes, build outfits and plan trip packing.

**Stack:** Expo (React Native, TypeScript) · Supabase (auth, Postgres, photo storage) · Gemini API (free tier)

## Status

- [x] Sign-in, database with privacy rules
- [x] Closet: photo, compress, upload, browse, edit/delete
- [x] AI tagging: name, type, colours, tags, occasions, formality, seasons
- [x] Closet search and filters (type, colour, occasion, season)
- [x] Outfits: build, favourite, share with partner, AI outfit ideas
- [x] Trips: dates, itinerary, share, weather, AI day-by-day outfits, packing checklist
- [x] Calendar: plan outfits for events, repeat warnings
- [x] Add many photos at once (auto-tagged and saved)
- [x] Wear tracking ("Wore it today") and declutter list (donate / sell)
- [x] Import from an online order: screenshots, PDF receipt or pasted email text
- [x] Manage someone else's closet (Settings → give access); matching couple looks; trip plans for both
- [x] App icon and splash
- [ ] Background removal (needs an installed build, see docs/PHONE_TESTING.md)

## Setup (one time)

1. **Supabase** — create a free project at supabase.com.
   - SQL Editor → paste and run each file in `supabase/migrations/` in order (`0001` … `0007`).
     Already ran some? Just run the ones you haven't; each is safe to run once.
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
   To test without the Mac running, see [docs/PHONE_TESTING.md](docs/PHONE_TESTING.md).

## AI setup (one time)

1. Get a free Gemini API key at aistudio.google.com → **Get API key**.
2. Supabase → **Edge Functions → Secrets** → add `GEMINI_API_KEY` with that key.
3. Supabase → **Edge Functions → Deploy a new function → Via editor**. Name it `stylist`,
   paste the contents of `supabase/functions/stylist/index.ts`, and deploy.
   (Or with the Supabase CLI: `npx supabase functions deploy stylist`.)
   This one function does photo tagging, outfit ideas, trip plans and order import.
   Whenever this file changes, paste and deploy it again.

Optional secret `GEMINI_MODEL` switches the model (default `gemini-3.8-flash`).

Free Gemini tier limits: roughly 10 requests a minute and a few hundred a day. "Add many"
spaces requests ~7 s apart and retries when the AI says it's busy.

## Rules

- Free tiers only.
- Never commit `.env` or keys.
- Photos go in Supabase Storage (1 GB free). Cloudflare R2 only if we outgrow it.
