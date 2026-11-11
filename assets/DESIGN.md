# Designer Wife — Design System (Neon green)

Use these tokens for all UI. Don't hardcode colours; reference the variables.

## Colour

| Token | Hex | Use |
|---|---|---|
| `--dw-primary` | `#39FF14` | Primary buttons, highlights, icon accents. Never as text on light backgrounds. |
| `--dw-on-primary` | `#0D140F` | Text/icons on primary |
| `--dw-accent-text` | `#0E7A2E` | Coloured text, links, overlines on light backgrounds |
| `--dw-accent-text-hover` | `#08561F` | Link hover |
| `--dw-surface` | `#E6FFDD` | Secondary buttons, tinted cards, image placeholders |
| `--dw-surface-strong` | `#CFF2C2` | Nested placeholders |
| `--dw-bg` | `#F7FBF5` | App background, inputs |
| `--dw-card` | `#FFFFFF` | Cards |
| `--dw-border` | `#D6EBCF` | Card borders |
| `--dw-border-strong` | `#BFD9B5` | Inputs, unselected chips |
| `--dw-ink` | `#0D140F` | Body text, dark backgrounds, selected chips |
| `--dw-muted` | `#4F5E53` | Secondary text, labels |

## Typography

- Display/headings: **Playfair Display** 500/600, italic for emphasis (e.g. "*Wife*").
- UI/body: **DM Sans** 400/500/600.
- Google Fonts: `https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&family=DM+Sans:wght@400;500;600&display=swap`

| Style | Font | Size / weight |
|---|---|---|
| Display L | Playfair | 44 / 600 |
| Display M | Playfair | 28 / 600 |
| Card title | Playfair | 22 / 600 |
| Title | DM Sans | 20 / 600 |
| Body | DM Sans | 16 / 400, line-height 1.5 |
| Label | DM Sans | 14 / 500 |
| Overline | DM Sans | 12 / 600, uppercase, letter-spacing 0.14em |

## Spacing, radius, elevation

- Spacing scale: 4, 8, 16, 24, 32, 48
- Radius: 10 (small tiles), 16 (inputs/images), 24 (cards), 999 (buttons, chips)
- App icon radius: 23% of icon size
- Icon shadow: `0 18px 40px rgba(57,255,20,0.35)`

## Components

- **Primary button:** height 48, pill, bg `--dw-primary`, text `--dw-on-primary`, DM Sans 15/600, padding 0 24.
- **Outline button:** same size, 1.5px border `--dw-ink`, transparent bg, text `--dw-ink`.
- **Soft button:** bg `--dw-surface`, text `--dw-accent-text`.
- **Icon button:** 48×48 circle, bg `--dw-primary`, icon `--dw-on-primary`, `aria-label` required.
- **Chip (occasion filter):** height 36, pill, DM Sans 14/500. Unselected: white bg, 1.5px `--dw-border-strong`, `--dw-ink` text. Selected: `--dw-ink` bg + border, white text.
- **Text input:** height 48, radius 14, 1.5px `--dw-border-strong`, bg `--dw-bg`, DM Sans 16. Label above, 14/500.
- **Outfit card:** white, 1px `--dw-border`, radius 24, padding 16. 2×2 item grid (radius 10) on `--dw-surface`, then overline (accent text), Playfair 22 title, muted 14 meta line.
- Touch targets ≥ 44px. Icons: 2px stroke, round caps.

## Logo

- `logo-mark.svg`: hanger mark (stroke `--dw-accent-text`, sparkle `--dw-primary`)
- `app-icon.svg`: neon hanger on ink background
- Wordmark: "Designer" in Playfair 600, ink colour, plus "*Wife*" in Playfair 600 italic, accent colour. On dark backgrounds, use white with a neon "Wife".

## Voice

Like a stylish best friend: warm, decisive, a little playful. Short sentences. Suggest, never scold.
