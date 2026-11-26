/**
 * ReadingActivityChart Component
 * Pages read per month for the selected year, drawn as a line chart.
 *
 * Data scope (approved separately from the finished-cycle metrics):
 * every reading session dated in the year, including books still in progress
 * or later abandoned. It is not filtered by PENDING_SCORE.
 *
 * Rules:
 * - One point per calendar month; the Y value is the pages read that month,
 *   so the line may rise or fall. This is not a cumulative series
 * - First quadrant only: months advance left to right, pages are never negative
 * - Dependency-free line: points are positioned views and each segment is a
 *   rotated view between adjacent points
 * - Month labels sit under their own point, so values and dates stay aligned
 * - A toggleable table exposes the same monthly values as text
 * - Compact screens hide every other month label to avoid collisions
 * - On web, hovering a month's point or segment shows a compact tooltip with
 *   that month and its page count; keyboard focus exposes the same value
 * - Touch and native keep the chart read-only, with the table as fallback
 */

import { useState } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import {
  Background,
  Border,
  Interactive,
  Text as TextColors,
} from "@/constants/colors";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import type { MonthlyReadingActivity } from "@/hooks/useAnnualReadingSummary";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const integerFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const POINT_SIZE = 8;
const SEGMENT_THICKNESS = 2;
const TOP_INSET = 10;
const MONTH_LABEL_WIDTH = 32;
const TOOLTIP_WIDTH = 112;
const TOOLTIP_HEIGHT = 52;

const isWeb = process.env.EXPO_OS === "web";

interface ReadingActivityChartProps {
  year: number;
  months: MonthlyReadingActivity[];
}

function getMonthLabel(month: number): string {
  return MONTH_LABELS[month - 1] ?? "";
}

/**
 * Round the Y axis up to a readable step (1, 2 or 5 times a power of ten).
 * Keeps the top point clear of the plot border without inventing decimals.
 */
function getAxisMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return step * magnitude;
}

export function ReadingActivityChart({
  year,
  months,
}: ReadingActivityChartProps) {
  const { isCompact } = useResponsiveLayout();
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [plotWidth, setPlotWidth] = useState(0);
  const [activeMonthIndex, setActiveMonthIndex] = useState<number | null>(null);

  const yearTotalPages = months.reduce(
    (total, month) => total + Math.max(0, month.pages_read),
    0,
  );
  const monthsWithSessions = months.filter(
    (month) => month.pages_read > 0,
  ).length;
  const maxMonthlyPages = months.reduce(
    (highest, month) => Math.max(highest, month.pages_read),
    0,
  );
  const axisMax = getAxisMax(maxMonthlyPages);
  const plotHeight = isCompact ? 132 : 168;

  const handlePlotLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;

    setPlotWidth((previous) =>
      Math.abs(previous - width) < 1 ? previous : width,
    );
  };

  if (yearTotalPages === 0) {
    return (
      <View
        style={{
          backgroundColor: Background.surface,
          borderWidth: 1,
          borderColor: Border.default,
          borderRadius: 14,
          borderCurve: "continuous",
          padding: 20,
          gap: 6,
        }}
      >
        <Text
          selectable
          style={{ fontSize: 14, color: TextColors.primary, fontWeight: "600" }}
        >
          No reading sessions dated in {year}.
        </Text>
        <Text style={{ fontSize: 13, color: TextColors.secondary }}>
          Log a session with a reading date in {year} to see monthly activity.
        </Text>
      </View>
    );
  }

  const halfInset = POINT_SIZE / 2;
  const stepX =
    months.length > 1
      ? Math.max(0, plotWidth - POINT_SIZE) / (months.length - 1)
      : 0;
  const innerHeight = Math.max(0, plotHeight - TOP_INSET - halfInset);

  const points = months.map((month, index) => {
    const pages = Math.max(0, month.pages_read);
    const ratio = axisMax > 0 ? Math.min(1, pages / axisMax) : 0;

    return {
      month: month.month,
      pages,
      x: halfInset + stepX * index,
      y: plotHeight - halfInset - ratio * innerHeight,
    };
  });

  const peakPoint = points.reduce(
    (highest, point) => (point.pages > highest.pages ? point : highest),
    points[0],
  );
  const axisLabels = [axisMax, Math.round(axisMax / 2), 0];

  // Hover/focus hit columns tile the plot so the closest month always wins,
  // including when the pointer sits on a segment rather than on a point.
  const columnBounds = points.map((point, index) => {
    const left = index === 0 ? 0 : (points[index - 1].x + point.x) / 2;
    const right =
      index === points.length - 1
        ? plotWidth
        : (point.x + points[index + 1].x) / 2;

    return { left, width: Math.max(0, right - left) };
  });

  const activePoint =
    activeMonthIndex === null ? null : (points[activeMonthIndex] ?? null);
  const tooltipLeft = activePoint
    ? Math.min(
        Math.max(0, activePoint.x - TOOLTIP_WIDTH / 2),
        Math.max(0, plotWidth - TOOLTIP_WIDTH),
      )
    : 0;
  const tooltipTop = activePoint
    ? activePoint.y - TOOLTIP_HEIGHT - 10 >= 0
      ? activePoint.y - TOOLTIP_HEIGHT - 10
      : activePoint.y + 12
    : 0;

  return (
    <View
      style={{
        backgroundColor: Background.surface,
        borderWidth: 1,
        borderColor: Border.default,
        borderRadius: 14,
        borderCurve: "continuous",
        padding: 20,
        gap: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Text
          selectable
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: TextColors.primary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {integerFormatter.format(yearTotalPages)} pages
        </Text>
        <Text
          selectable
          style={{
            fontSize: 13,
            color: TextColors.secondary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {monthsWithSessions} {monthsWithSessions === 1 ? "month" : "months"}{" "}
          with sessions
        </Text>
      </View>

      <View
        accessibilityRole="image"
        accessibilityLabel={`Line chart of pages read per month in ${year}. Highest month: ${getMonthLabel(
          peakPoint.month,
        )}, ${integerFormatter.format(peakPoint.pages)} pages.`}
      >
        <View style={{ flexDirection: "row", gap: 12 }}>
          {/* Y axis */}
          <View
            style={{
              width: 40,
              height: plotHeight,
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            {axisLabels.map((value, index) => (
              <Text
                key={`${value}-${index}`}
                style={{
                  fontSize: 11,
                  color: TextColors.tertiary,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {integerFormatter.format(value)}
              </Text>
            ))}
          </View>

          {/* Plot */}
          <View style={{ flex: 1 }}>
            <View
              onLayout={handlePlotLayout}
              style={{
                height: plotHeight,
                borderBottomWidth: 1,
                borderBottomColor: Border.default,
              }}
            >
              {plotWidth > 0
                ? points.slice(0, -1).map((point, index) => {
                    const next = points[index + 1];
                    const dx = next.x - point.x;
                    const dy = next.y - point.y;
                    const length = Math.hypot(dx, dy);
                    const angle = Math.atan2(dy, dx);

                    return (
                      <View
                        key={`segment-${point.month}`}
                        style={{
                          position: "absolute",
                          left: (point.x + next.x) / 2 - length / 2,
                          top: (point.y + next.y) / 2 - SEGMENT_THICKNESS / 2,
                          width: length,
                          height: SEGMENT_THICKNESS,
                          borderRadius: SEGMENT_THICKNESS / 2,
                          backgroundColor: Interactive.primary.default,
                          transform: [{ rotate: `${angle}rad` }],
                        }}
                      />
                    );
                  })
                : null}

              {activePoint ? (
                <View
                  style={{
                    position: "absolute",
                    left: activePoint.x - 0.5,
                    top: 0,
                    width: 1,
                    height: plotHeight,
                    backgroundColor: Border.strong,
                  }}
                />
              ) : null}

              {plotWidth > 0
                ? points.map((point, index) => {
                    const isActive = index === activeMonthIndex;
                    const size = isActive ? POINT_SIZE + 4 : POINT_SIZE;
                    const inset = size / 2;

                    return (
                      <View
                        key={`point-${point.month}`}
                        accessibilityRole="image"
                        accessibilityLabel={`${getMonthLabel(
                          point.month,
                        )}: ${integerFormatter.format(point.pages)} pages read`}
                        style={{
                          position: "absolute",
                          left: point.x - inset,
                          top: point.y - inset,
                          width: size,
                          height: size,
                          borderRadius: inset,
                          backgroundColor: Interactive.primary.default,
                          borderWidth: 2,
                          borderColor: Background.surface,
                        }}
                      />
                    );
                  })
                : null}

              {/* Pointer/keyboard hit columns: hovering a point or its segment
                  focuses that month. Web only, so touch stays read-only. */}
              {plotWidth > 0 && isWeb
                ? points.map((point, index) => (
                    <View
                      key={`hit-${point.month}`}
                      onPointerEnter={(event) => {
                        // Touch taps can emit pointer events on the web build;
                        // only a mouse or pen should pin the tooltip open.
                        if (event.nativeEvent.pointerType !== "touch") {
                          setActiveMonthIndex(index);
                        }
                      }}
                      onPointerLeave={() =>
                        setActiveMonthIndex((current) =>
                          current === index ? null : current,
                        )
                      }
                      onFocus={() => setActiveMonthIndex(index)}
                      onBlur={() =>
                        setActiveMonthIndex((current) =>
                          current === index ? null : current,
                        )
                      }
                      tabIndex={0}
                      accessible
                      accessibilityLabel={`${getMonthLabel(
                        point.month,
                      )}: ${integerFormatter.format(point.pages)} pages read`}
                      style={{
                        position: "absolute",
                        left: columnBounds[index].left,
                        top: 0,
                        width: columnBounds[index].width,
                        height: plotHeight,
                      }}
                    />
                  ))
                : null}

              {activePoint ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: tooltipLeft,
                    top: tooltipTop,
                    width: TOOLTIP_WIDTH,
                    backgroundColor: Background.surface,
                    borderWidth: 1,
                    borderColor: Border.strong,
                    borderRadius: 10,
                    borderCurve: "continuous",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    gap: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                      color: TextColors.tertiary,
                    }}
                  >
                    {getMonthLabel(activePoint.month)} {year}
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: TextColors.primary,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {integerFormatter.format(activePoint.pages)} pages
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ height: 16, marginTop: 6 }}>
              {plotWidth > 0
                ? points.map((point, index) => {
                    if (isCompact && index % 2 !== 0) {
                      return null;
                    }

                    return (
                      <Text
                        key={`month-label-${point.month}`}
                        style={{
                          position: "absolute",
                          left: point.x - MONTH_LABEL_WIDTH / 2,
                          width: MONTH_LABEL_WIDTH,
                          textAlign: "center",
                          fontSize: 10,
                          color: TextColors.tertiary,
                        }}
                      >
                        {getMonthLabel(point.month)}
                      </Text>
                    );
                  })
                : null}
            </View>
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 18,
              height: SEGMENT_THICKNESS,
              borderRadius: SEGMENT_THICKNESS / 2,
              backgroundColor: Interactive.primary.default,
            }}
          />
          <Text style={{ fontSize: 12, color: TextColors.tertiary }}>
            Pages read per month
          </Text>
        </View>

        <Pressable
          onPress={() => setIsTableVisible((previous) => !previous)}
          accessibilityRole="button"
          accessibilityState={{ expanded: isTableVisible }}
          accessibilityLabel={
            isTableVisible ? "Hide monthly data" : "Show monthly data"
          }
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: "center",
            paddingVertical: 8,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: Interactive.primary.default,
            }}
          >
            {isTableVisible ? "▴ Hide monthly data" : "▾ Show monthly data"}
          </Text>
        </Pressable>
      </View>

      {isTableVisible ? (
        <View role="table" style={{ width: "100%" }}>
          <View
            role="row"
            style={{
              flexDirection: "row",
              gap: 12,
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: Border.strong,
            }}
          >
            <View role="columnheader" style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: TextColors.tertiary,
                }}
              >
                Month
              </Text>
            </View>
            <View role="columnheader" style={{ width: isCompact ? 72 : 96 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: TextColors.tertiary,
                  textAlign: "right",
                }}
              >
                Pages
              </Text>
            </View>
          </View>

          {months.map((month) => (
            <View
              key={month.month}
              role="row"
              style={{
                flexDirection: "row",
                gap: 12,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: Border.default,
              }}
            >
              <View role="cell" style={{ flex: 1 }}>
                <Text
                  selectable
                  style={{ fontSize: 14, color: TextColors.primary }}
                >
                  {MONTH_LABELS[month.month - 1]} {year}
                </Text>
              </View>
              <View role="cell" style={{ width: isCompact ? 72 : 96 }}>
                <Text
                  selectable
                  style={{
                    fontSize: 14,
                    color: TextColors.primary,
                    textAlign: "right",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {integerFormatter.format(month.pages_read)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
