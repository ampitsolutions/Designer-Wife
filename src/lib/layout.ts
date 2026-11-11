import { Platform, StyleSheet, useWindowDimensions } from 'react-native';

/** Widest a form or list gets on a big screen; on phones this is wider than the screen so it has no effect. */
export const PAGE_MAX_WIDTH = 720;

/** Target size of a closet photo tile; the grid fits as many columns as it can (3 to 8). */
export const TILE_TARGET = 140;
export const MIN_COLUMNS = 3;
export const MAX_COLUMNS = 8;

export function gridColumns(width: number) {
  return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, Math.floor(width / TILE_TARGET)));
}

/** Tablet = iPad, or any screen whose short side is at least 600 points. */
export function isTabletSize(width: number, height: number) {
  return (Platform.OS === 'ios' && Platform.isPad) || Math.min(width, height) >= 600;
}

export function useIsTablet() {
  const { width, height } = useWindowDimensions();
  return isTabletSize(width, height);
}

/** Spread into a scroll/list contentContainerStyle to centre content at a readable width. */
export const page = StyleSheet.create({
  page: { width: '100%', maxWidth: PAGE_MAX_WIDTH, alignSelf: 'center' },
}).page;
