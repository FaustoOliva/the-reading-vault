/**
 * Page Layout Primitives
 * Shared web-first page shell: a fluid, centered reading canvas with
 * responsive padding, page headers and section headings.
 *
 * Rules:
 * - Pages own their padding so every screen aligns on the same grid
 * - Headers stack on compact screens and put actions on the same row when wide
 * - Section headings carry the page hierarchy: no extra card is added for it
 * - Headings keep an accessibility header role on every screen
 */

import type { ReactElement, ReactNode } from "react";
import {
  ScrollView,
  Text,
  View,
  type RefreshControlProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Background, Border, Text as TextColors } from "@/constants/colors";
import { CONTENT_MAX_WIDTH } from "@/constants/layout";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

interface PageContainerProps {
  children: ReactNode;
  /** Horizontal padding; defaults to the responsive page padding. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Non-scrolling page shell. Use for screens built on a virtualized list,
 * which provides its own scrolling.
 */
export function PageContainer({
  children,
  padding,
  style,
}: PageContainerProps) {
  const { pagePadding } = useResponsiveLayout();
  const horizontalPadding = padding ?? pagePadding;

  return (
    <View
      style={[
        { flex: 1, width: "100%", backgroundColor: Background.primary },
        style,
      ]}
    >
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: "center",
          paddingHorizontal: horizontalPadding,
        }}
      >
        {children}
      </View>
    </View>
  );
}

interface PageScrollProps {
  children: ReactNode;
  padding?: number;
  gap?: number;
  refreshControl?: ReactElement<RefreshControlProps>;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
}

/**
 * Scrolling page shell. Content stays on the shared canvas and the bottom
 * padding keeps the last block clear of native home indicators.
 */
export function PageScroll({
  children,
  padding,
  gap = 24,
  refreshControl,
  keyboardShouldPersistTaps,
}: PageScrollProps) {
  const { pagePadding } = useResponsiveLayout();
  const horizontalPadding = padding ?? pagePadding;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: Background.primary }}
      contentContainerStyle={{ alignItems: "center" }}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
      <View
        style={{
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          paddingHorizontal: horizontalPadding,
          paddingTop: horizontalPadding,
          paddingBottom: horizontalPadding * 2,
          gap,
        }}
      >
        {children}
      </View>
    </ScrollView>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

/**
 * Page title block: eyebrow, heading, one-line explanation and optional
 * actions. On wide screens the actions sit beside the title; below the split
 * breakpoint they stack under it.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: PageHeaderProps) {
  const { isSplitLayout } = useResponsiveLayout();

  return (
    <View
      style={{
        flexDirection: isSplitLayout && actions ? "row" : "column",
        alignItems: isSplitLayout && actions ? "flex-start" : "stretch",
        justifyContent: "space-between",
        gap: 16,
        paddingBottom: 4,
      }}
    >
      <View style={{ flex: 1, gap: 6, maxWidth: 760 }}>
        {eyebrow ? (
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: TextColors.tertiary,
            }}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text
          accessibilityRole="header"
          style={{
            fontSize: isSplitLayout ? 32 : 28,
            lineHeight: isSplitLayout ? 38 : 34,
            fontWeight: "800",
            letterSpacing: -0.4,
            color: TextColors.primary,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            selectable
            style={{
              fontSize: 15,
              lineHeight: 22,
              color: TextColors.secondary,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {actions ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          {actions}
        </View>
      ) : null}
    </View>
  );
}

interface SectionHeadingProps {
  title: string;
  caption?: string;
  accessory?: ReactNode;
}

/** Section title used to group content inside a page. */
export function SectionHeading({
  title,
  caption,
  accessory,
}: SectionHeadingProps) {
  return (
    <View style={{ gap: 4 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontSize: 18, fontWeight: "700", color: TextColors.primary }}
        >
          {title}
        </Text>
        {accessory}
      </View>
      {caption ? (
        <Text
          style={{ fontSize: 13, lineHeight: 19, color: TextColors.secondary }}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

interface FormSectionProps {
  title: string;
  caption?: string;
  children: ReactNode;
  /** Render the section as a panel. Used when the page has several columns. */
  bordered?: boolean;
}

/** Grouped form block: heading plus related fields. */
export function FormSection({
  title,
  caption,
  children,
  bordered = false,
}: FormSectionProps) {
  return (
    <View
      style={{
        gap: 16,
        ...(bordered
          ? {
              backgroundColor: Background.surface,
              borderWidth: 1,
              borderColor: Border.default,
              borderRadius: 14,
              borderCurve: "continuous" as const,
              padding: 20,
            }
          : {}),
      }}
    >
      <View style={{ gap: 4 }}>
        <Text
          accessibilityRole="header"
          style={{ fontSize: 16, fontWeight: "700", color: TextColors.primary }}
        >
          {title}
        </Text>
        {caption ? (
          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: TextColors.secondary,
            }}
          >
            {caption}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
