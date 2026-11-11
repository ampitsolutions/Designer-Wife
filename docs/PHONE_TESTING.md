# Testing on your phone

There are two ways to run Designer Wife on an iPhone.

| | A. Expo Go (works today) | B. Installed app (phone only) |
|---|---|---|
| Needs your Mac running | Yes | No, only for the one-time setup |
| Gets new code | When you restart `npx expo start` | Automatically on every push to `main` |
| Background removal later | Not possible | Possible |
| Cost | Free | Free (EAS free plan), **but needs a paid Apple Developer Program membership ($99 USD/yr)** |

---

## A. Expo Go (use this tonight)

```bash
cd ~/Documents/Designer-Wife
git pull
npm install
npx expo start -c
```

Scan the QR code with the iPhone Camera. Phone and Mac must be on the same Wi-Fi
(or run `npx expo start --tunnel`).

---

## B. Installed app, updates straight to the phone

Only do this if you have a **paid Apple Developer Program** membership.
("Developer Mode" on the iPhone alone is not enough for this route.)

### One-time setup on your Mac (about 20 minutes)

```bash
cd ~/Documents/Designer-Wife
npx eas-cli@latest login            # your Expo account
npx eas-cli@latest init             # links the project, writes its ID into app.json
npx eas-cli@latest update:configure # installs expo-updates, sets the update URL
npx eas-cli@latest device:create    # register your iPhone (opens a link on the phone)
npx eas-cli@latest build --profile preview --platform ios
```

The build runs in Expo's cloud (free plan, can queue for a while). It will ask you to
sign in to your Apple account so it can create the signing certificate. When it finishes,
open the link/QR it prints **on the iPhone** and install the app.

Then push the changed `app.json` (or tell Claude in chat to do it):

```bash
git add -A && git commit -m "Link EAS project" && git push
```

### Make GitHub send updates automatically

1. expo.dev → Account settings → **Access tokens** → create a token.
2. GitHub → repo **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `EXPO_TOKEN` = the token
   - `EXPO_PUBLIC_SUPABASE_URL` = same value as in your `.env`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = same value as in your `.env`

From then on, every push to `main` runs **Send update to phone** (GitHub → Actions).
Close and reopen the app on the phone to get the new version.

Bhargavi's iPhone: run `npx eas-cli@latest device:create` for her phone, then build again.

Changes to native settings (new native libraries, icon, permissions) need a new
`build`; everything else arrives as an update.
