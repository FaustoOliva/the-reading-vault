/**
 * Responsive Layout Hook
 * Single source of truth for width-driven layout decisions.
 *
 * Rules:
 * - Derived from useWindowDimensions (never Dimensions.get)
 * - Layout flags describe the usable canvas, so the sidebar width is
 *   subtracted before a page decides to split into columns
 * - Navigation decisions stay in the tabs layout: this hook never changes
 *   routing, only geometry
 */

import { useWindowDimensions } from "react-native";
import {
  Breakpoint,
  CONTENT_BREAKPOINT,
  CONTENT_MAX_WIDTH,
  SIDEBAR_WIDTH,
  getPagePadding,
} from "@/constants/layout";

const isWeb = process.env.EXPO_OS === "web";

export interface ResponsiveLayout {
  width: number;
  height: number;
  /** True below the medium breakpoint: single column, compact spacing. */
  isCompact: boolean;
  /** True between medium and wide: roomier single column. */
  isMedium: boolean;
  /** True when the sidebar replaces the tab bar. */
  isWide: boolean;
  /** True on large desktop canvases. */
  isUltraWide: boolean;
  /** Horizontal page padding for the current viewport. */
  pagePadding: number;
  /** Width available to page content, excluding the sidebar and padding. */
  contentWidth: number;
  /** Enough canvas for a real two-column page layout. */
  isSplitLayout: boolean;
  /** Enough canvas for dense grids and inline row columns. */
  isDenseLayout: boolean;
}

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();

  const isWide = width >= Breakpoint.wide;
  const isUltraWide = width >= Breakpoint.ultraWide;
  const pagePadding = getPagePadding(width);

  const sidebarWidth = isWeb
    ? isUltraWide
      ? SIDEBAR_WIDTH.ultraWide
      : isWide
        ? SIDEBAR_WIDTH.wide
        : 0
    : 0;

  const canvasWidth = Math.min(width - sidebarWidth, CONTENT_MAX_WIDTH);
  const contentWidth = Math.max(0, canvasWidth - pagePadding * 2);

  return {
    width,
    height,
    isCompact: width < Breakpoint.medium,
    isMedium: width >= Breakpoint.medium && width < Breakpoint.wide,
    isWide,
    isUltraWide,
    pagePadding,
    contentWidth,
    isSplitLayout: contentWidth >= CONTENT_BREAKPOINT.split,
    isDenseLayout: contentWidth >= CONTENT_BREAKPOINT.dense,
  };
}
