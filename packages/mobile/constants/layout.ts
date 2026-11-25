/**
 * Layout Tokens
 * Shared geometry for the web-first page shell.
 *
 * Rules:
 * - Breakpoints describe genuinely different layouts, not only navigation swaps
 * - The reading canvas grows with the viewport but stays readable on 1920px
 * - Every screen reads its padding from here so pages align with each other
 */

/**
 * Viewport breakpoints.
 * - medium: stacked pages get more breathing room
 * - wide: navigation becomes a sidebar and the canvas widens
 * - ultraWide: dense grids (multi-column forms, result grids) unlock
 */
export const Breakpoint = {
  medium: 768,
  wide: 1024,
  ultraWide: 1440,
} as const;

/**
 * Widest the content canvas grows.
 * Keeps tables and text columns readable on 1920px screens while still
 * using the area left over after the sidebar.
 */
export const CONTENT_MAX_WIDTH = 1560;

/** Navigation rail width per wide breakpoint. */
export const SIDEBAR_WIDTH = {
  wide: 236,
  ultraWide: 264,
} as const;

/** Horizontal page padding per breakpoint. */
export const PAGE_PADDING = {
  compact: 16,
  medium: 24,
  wide: 32,
  ultraWide: 40,
} as const;

/**
 * Usable content widths needed by page-level layouts.
 * Measured inside the canvas padding, so a page never splits into
 * columns that are too narrow to read.
 */
export const CONTENT_BREAKPOINT = {
  /** Two-column page layouts (form + context, filters + list). */
  split: 840,
  /** Dense grids: result cards in two columns, inline table progress. */
  dense: 1180,
} as const;

/**
 * Resolve horizontal page padding for a viewport width.
 * @param width - viewport width in logical pixels
 * @returns padding in logical pixels
 */
export function getPagePadding(width: number): number {
  if (width >= Breakpoint.ultraWide) {
    return PAGE_PADDING.ultraWide;
  }

  if (width >= Breakpoint.wide) {
    return PAGE_PADDING.wide;
  }

  if (width >= Breakpoint.medium) {
    return PAGE_PADDING.medium;
  }

  return PAGE_PADDING.compact;
}
