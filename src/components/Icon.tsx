import Svg, { Path, Rect } from 'react-native-svg';
import { C } from '@/theme';

/** Line icons: 2px stroke, round caps (design system). Hanger + sparkle come from assets/logo-mark.svg. */
export type IconName = 'closet' | 'outfits' | 'trips' | 'calendar' | 'plus' | 'settings';

export function Icon({ name, size = 24, color = C.ink }: { name: IconName; size?: number; color?: string }) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'closet' && (
        // hanger
        <>
          <Path d="M12 8.5V7.3c0-1.2 1.4-1.6 1.4-3 0-1.2-1-2-2.1-2-1.1 0-1.9.8-1.9 1.8" {...p} />
          <Path d="M12 8.5 2.6 15.8c-.9.7-.4 2 .7 2h17.4c1.1 0 1.6-1.3.7-2L12 8.5Z" {...p} />
        </>
      )}
      {name === 'outfits' && (
        // sparkle (from the logo) + small sparkle
        <>
          <Path d="M10 4c0 3.3 1.7 5 5 5-3.3 0-5 1.7-5 5 0-3.3-1.7-5-5-5 3.3 0 5-1.7 5-5Z" {...p} />
          <Path d="M18 14c0 1.7.8 2.5 2.5 2.5-1.7 0-2.5.8-2.5 2.5 0-1.7-.8-2.5-2.5-2.5 1.7 0 2.5-.8 2.5-2.5Z" {...p} />
        </>
      )}
      {name === 'trips' && (
        // suitcase
        <>
          <Rect x={3.5} y={7} width={17} height={12.5} rx={2.5} {...p} />
          <Path d="M9 7V5.2c0-.7.5-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2V7M9 11v4.5M15 11v4.5" {...p} />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x={3.5} y={5} width={17} height={15} rx={2.5} {...p} />
          <Path d="M8 3v4M16 3v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01" {...p} />
        </>
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...p} strokeWidth={2.5} />}
      {name === 'settings' && (
        <>
          <Path d="M4 7h10M18 7h2M4 17h4M12 17h8" {...p} />
          <Path d="M16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM10 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" {...p} />
        </>
      )}
    </Svg>
  );
}

/** Brand mark: hanger in accent green with a neon sparkle (assets/logo-mark.svg). */
export function LogoMark({ size = 64, stroke = C.accentText, sparkle = C.primary }: { size?: number; stroke?: string; sparkle?: string }) {
  return (
    <Svg width={size * 1.2} height={size} viewBox="0 0 120 100" fill="none">
      <Path d="M60 36 V30 C60 24 67 22 67 15 C67 9 62 5 56.5 5 C51 5 47 9 47 14" stroke={stroke} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M60 36 L11 74 C6 78 8.5 84 14 84 H106 C111.5 84 114 78 109 74 Z" stroke={stroke} strokeWidth={5} strokeLinejoin="round" />
      <Path d="M60 50 C60 57 64 61 70 61 C64 61 60 65 60 72 C60 65 56 61 50 61 C56 61 60 57 60 50 Z" fill={sparkle} />
    </Svg>
  );
}
