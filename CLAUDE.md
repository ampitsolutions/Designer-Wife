# Designer Wife — project context for Claude Code

@AGENTS.md

## What this is

A private iOS/Android wardrobe app for two people (Neel and his wife Bhargavi): catalogue clothes from photos,
build outfits, plan trips with weather + packing lists, plan outfits for events, and declutter.
Owner directs work from chat and does little hands-on coding — do the work end to end, keep explanations short,
and say only what he must do himself (e.g. run a migration, redeploy a function).

## Stack

- **Expo SDK 58**, React Native, TypeScript (strict), **Expo Router** (routes in `src/app/`). Tested in **Expo Go**
  on iPhone/iPad — avoid native modules Expo Go doesn't bundle (that needs a dev build, see `docs/PHONE_TESTING.md`).
- **Supabase**: email/password auth (sign-ups disabled; two users), Postgres with row level security, Storage bucket
  `wardrobe-photos` (private, folder per owner id), one Edge Function `stylist` for all AI.
- **Gemini API** (free tier) called only from the Edge Function. Default model `gemini-3.8-flash`, thinking level `low`.
- **Open-Meteo** (no key) for weather, called from the app.
- Cost goal: **$0/month**. Ask before adding anything that could cost money.

## Commands

```bash
npm install
npx expo start -c          # dev server (scan QR with Expo Go)
npx expo start --tunnel    # when phone isn't on the same Wi-Fi
npx tsc --noEmit           # typecheck — run before every commit
npx expo export --platform ios --output-dir /tmp/exp   # bundle check
deno check supabase/functions/stylist/index.ts          # check the Edge Function
```

Install Expo packages with `npx expo install <pkg>` so versions match SDK 58.

## Layout

```
src/app/                 screens (Expo Router)
  (tabs)/                Closet (index), Outfits, Trips, Calendar
  item/                  new, [id] (edit/wear/photo/donate), bulk (add many)
  outfit/                new, [id], ideas (AI)
  trip/                  edit (new/edit), [id] (detail + AI plan), day/[id], packing/[id]
  event/edit.tsx         calendar event
  import.tsx             import from order (screenshots / PDF / pasted email)
  declutter.tsx, settings.tsx, sign-in.tsx, _layout.tsx (auth gate, fonts, stack)
src/components/          ui.tsx (Button, Fab, Banner, Empty), Icon.tsx (line icons, LogoMark),
                         ClosetBrowser (search/filter grid), ItemForm, ChipInput, OutfitEditor,
                         PersonSwitcher, ItemThumb/OutfitCollage, DateField
src/lib/                 data + logic (no UI):
  supabase.ts auth.tsx   client + session
  closet.ts              shared store of closets per person (useCloset, refreshCloset, findItem, photo URLs)
  people.ts              whose closet is active, who you can manage (usePeople)
  items.ts outfits.ts trips.ts events.ts wear.ts profiles.ts   table access
  ai.ts                  calls the `stylist` function (tag, outfits, trip, order) with retry + timeouts
  photos.ts geometry.ts  pick/compress/crop/upload photos, signed URLs
  weather.ts dates.ts filters.ts declutter.ts repeats.ts layout.ts   pure helpers
src/theme.ts             design tokens (C colours, F fonts, S spacing, R radius, T text styles, input)
src/config.ts            app settings (types, seasons, limits, AI function name, declutter months…)
supabase/migrations/     0001…0007 SQL, run in order in the Supabase SQL Editor
supabase/functions/stylist/index.ts   the only Edge Function
assets/DESIGN.md         design system (neon green) — source of truth for UI
docs/PHONE_TESTING.md    Expo Go vs installed build
```

## Rules and conventions

- **Design**: follow `assets/DESIGN.md`. Use tokens from `src/theme.ts` — never hard-code hex colours or font weights.
  Headings Playfair (`F.display`), UI DM Sans (`F.body/medium/semibold`). Buttons via `<Button>` (primary neon,
  secondary outline, soft, danger). Center long pages with `page` from `src/lib/layout.ts` (iPad).
- **Config over hard-coding**: put tunable values in `src/config.ts` or env/secrets.
- **Secrets**: never commit `.env` or keys. App only has `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY`.
  Gemini key lives only as Supabase secret `GEMINI_API_KEY` (optional `GEMINI_MODEL`, `GEMINI_THINKING`, `GEMINI_TIMEOUT_MS`).
- **Data access**: screens call `src/lib/*` functions, not Supabase directly. After changing items, call
  `refreshCloset(ownerId)`.
- **Ownership**: items, outfits, wear logs, packing lines and trip-day items have an owner. When acting in a closet
  you manage, pass the owner explicitly (`owner_id`, `uploadPhoto(ownerId, …)`, `logWear([{id, owner_id}])`).
  The active person comes from `usePeople()`.
- **Database changes**: add a NEW migration file (`0008_…sql`), never edit old ones. Make it re-runnable
  (`create or replace`, `drop policy if exists`, `add column if not exists`). Access rules use
  `can_manage(owner)`; avoid policies that query each other's tables (infinite recursion) — use
  `security definer` helpers like `in_shared_outfit`, `owns_item`, `is_trip_member`.
  Remind the owner to run each new migration.
- **Edge Function changes** need a redeploy (owner pastes `supabase/functions/stylist/index.ts` into
  Supabase → Edge Functions → stylist → Code → Deploy, or `npx supabase functions deploy stylist`). Say so.
  Validate AI output server-side (unknown item ids, bad boxes, quantities).
- **Free AI tier**: ~10 requests/minute — space bulk calls (`AI_CALL_SPACING_MS`), retry on 429 (`withRetry`).
- **Copy/voice**: like a stylish best friend — warm, short sentences, suggest, never scold.
- **Workflow**: small commits, one feature per branch, typecheck + bundle check before pushing, update README status.
  Run pure-logic tests with `npx tsx` for helpers in `src/lib` that don't import React Native.

## Current state (Nov 2026)

Built: sign-in; closet (photo, compress, upload, AI tagging, search/filters, add many, import order, edit/delete);
wear tracking + declutter; outfits (builder, favourites, share, AI ideas incl. "Together" matching looks);
trips (dates, itinerary, share, weather, AI day plan + packing for everyone you manage); calendar with repeat
warnings; managing someone else's closet; iPad layout; neon-green design system, icons, splash.

Not done: on-device background removal (needs dev build); forwarding order emails (needs inbound email);
installed build / TestFlight (no paid Apple account — Developer Mode only).

Feature board + test plan (Claude Sheet): https://claude.ai/artifact/KfncCzuzc3bgfUQRh4vnAk
