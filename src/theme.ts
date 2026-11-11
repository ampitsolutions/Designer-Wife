// Design tokens from assets/DESIGN.md (neon green). Use these instead of hex values in screens.

export const C = {
  primary: '#39FF14', // buttons, highlights, icon accents - never as text on light backgrounds
  onPrimary: '#0D140F',
  accentText: '#0E7A2E', // coloured text, links, overlines
  accentTextHover: '#08561F',
  surface: '#E6FFDD', // soft buttons, tinted cards, image placeholders
  surfaceStrong: '#CFF2C2',
  bg: '#F7FBF5', // app background, inputs
  card: '#FFFFFF',
  border: '#D6EBCF',
  borderStrong: '#BFD9B5', // inputs, unselected chips
  ink: '#0D140F', // body text, selected chips
  muted: '#4F5E53', // secondary text, labels
  white: '#FFFFFF',
  // Status colours (not in the brand palette; kept readable)
  warnBg: '#FFF4E0',
  warnText: '#8A4B00',
  danger: '#B42318',
  star: '#C9A227',
  overlay: 'rgba(13,20,15,0.6)',
} as const;

/** Font family names as loaded in app/_layout.tsx */
export const F = {
  display: 'PlayfairDisplay_600SemiBold',
  displayItalic: 'PlayfairDisplay_600SemiBold_Italic',
  displayMedium: 'PlayfairDisplay_500Medium',
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
} as const;

export const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const R = { sm: 10, input: 14, md: 16, lg: 24, pill: 999 } as const;

/** Text styles */
export const T = {
  displayL: { fontFamily: F.display, fontSize: 44, color: C.ink },
  displayM: { fontFamily: F.display, fontSize: 28, color: C.ink },
  cardTitle: { fontFamily: F.display, fontSize: 22, color: C.ink },
  title: { fontFamily: F.semibold, fontSize: 20, color: C.ink },
  body: { fontFamily: F.body, fontSize: 16, lineHeight: 24, color: C.ink },
  label: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  meta: { fontFamily: F.body, fontSize: 14, color: C.muted },
  overline: { fontFamily: F.semibold, fontSize: 12, letterSpacing: 1.7, textTransform: 'uppercase' as const, color: C.accentText },
} as const;

/** Shared input look: height 48, radius 14, 1.5px border, tinted background. */
export const input = {
  minHeight: 48,
  borderWidth: 1.5,
  borderColor: C.borderStrong,
  borderRadius: R.input,
  backgroundColor: C.bg,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontFamily: F.body,
  fontSize: 16,
  color: C.ink,
} as const;
