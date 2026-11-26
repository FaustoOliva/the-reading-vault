/**
 * AnnualComparisonTable Component
 * One row per finished reading cycle of the year, ordered by finish date
 * (most recent first) as returned by the API.
 *
 * Rules:
 * - Cycles show title, author, sessions, days and pages/day
 * - A shared scale encodes pages/day so relative pace is readable
 * - A cycle without sessions shows "No session data" instead of zero days
 * - Wide screens render a real table whose pace column grows with the canvas;
 *   narrow screens stack the same data as labeled rows
 */

import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Border, Interactive, Text as TextColors } from "@/constants/colors";
import type { AnnualCycleSummary } from "@/hooks/useAnnualReadingSummary";

const NO_SESSION_DATA = "No session data";
// Wide enough for the "SESSIONS" header at 12px bold without breaking mid-word.
const SESSIONS_COLUMN_WIDTH = 88;
const DAYS_COLUMN_WIDTH = 84;

interface AnnualComparisonTableProps {
  cycles: AnnualCycleSummary[];
  isWide: boolean;
}

function formatDays(days: number | null): string {
  if (days === null) {
    return NO_SESSION_DATA;
  }

  return days === 1 ? "1 day" : `${days} days`;
}

function formatPace(pagesPerDay: number | null): string {
  if (pagesPerDay === null) {
    return NO_SESSION_DATA;
  }

  return `${pagesPerDay} pages/day`;
}

function getMaxPace(cycles: AnnualCycleSummary[]): number {
  return cycles.reduce((max, cycle) => {
    if (cycle.pages_per_day === null) {
      return max;
    }

    return Math.max(max, cycle.pages_per_day);
  }, 0);
}

function PaceBar({
  pagesPerDay,
  maxPace,
  title,
}: {
  pagesPerDay: number | null;
  maxPace: number;
  title: string;
}) {
  if (pagesPerDay === null) {
    return null;
  }

  const ratio = maxPace > 0 ? Math.min(1, pagesPerDay / maxPace) : 0;

  return (
    <View
      accessibilityLabel={`${title}: ${pagesPerDay} pages per day`}
      style={{
        height: 8,
        borderRadius: 999,
        backgroundColor: Border.default,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${Math.max(4, Math.round(ratio * 100))}%`,
          height: "100%",
          borderRadius: 999,
          backgroundColor: Interactive.primary.default,
        }}
      />
    </View>
  );
}

function ColumnHeader({
  label,
  style,
  align = "left",
}: {
  label: string;
  style?: StyleProp<ViewStyle>;
  align?: "left" | "right";
}) {
  return (
    <View role="columnheader" style={style}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: TextColors.tertiary,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          textAlign: align,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function AnnualComparisonTable({
  cycles,
  isWide,
}: AnnualComparisonTableProps) {
  const maxPace = getMaxPace(cycles);

  if (!isWide) {
    return (
      <View style={{ gap: 2 }}>
        {cycles.map((cycle) => (
          <View
            key={`${cycle.book_id}-${cycle.reading_cycle}`}
            style={{
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: Border.default,
              gap: 6,
            }}
          >
            <Text
              selectable
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: TextColors.primary,
              }}
            >
              {cycle.title}
            </Text>
            <Text
              selectable
              style={{ fontSize: 13, color: TextColors.secondary }}
            >
              {cycle.author}
            </Text>
            {cycle.has_session_data ? (
              <Text
                selectable
                style={{
                  fontSize: 13,
                  color: TextColors.secondary,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {cycle.sessions} sessions · {formatDays(cycle.days)} ·{" "}
                {formatPace(cycle.pages_per_day)}
              </Text>
            ) : (
              <Text
                selectable
                style={{ fontSize: 13, color: TextColors.secondary }}
              >
                {cycle.sessions} sessions · {NO_SESSION_DATA}
              </Text>
            )}
            <PaceBar
              pagesPerDay={cycle.pages_per_day}
              maxPace={maxPace}
              title={cycle.title}
            />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View role="table" style={{ width: "100%" }}>
      <View
        role="row"
        style={{
          flexDirection: "row",
          gap: 16,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: Border.strong,
        }}
      >
        <ColumnHeader label="Book" style={{ flex: 1, minWidth: 200 }} />
        <ColumnHeader
          label="Sessions"
          align="right"
          style={{ width: SESSIONS_COLUMN_WIDTH }}
        />
        <ColumnHeader
          label="Days"
          align="right"
          style={{ width: DAYS_COLUMN_WIDTH }}
        />
        <ColumnHeader
          label="Pages per day"
          style={{ flex: 0.85, minWidth: 220 }}
        />
      </View>

      {cycles.map((cycle) => (
        <View
          key={`${cycle.book_id}-${cycle.reading_cycle}`}
          role="row"
          accessibilityLabel={`${cycle.title} by ${cycle.author}, ${
            cycle.sessions
          } sessions, ${
            cycle.has_session_data ? formatDays(cycle.days) : NO_SESSION_DATA
          }, ${
            cycle.has_session_data
              ? formatPace(cycle.pages_per_day)
              : NO_SESSION_DATA
          }`}
          style={{
            flexDirection: "row",
            gap: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: Border.default,
            alignItems: "center",
          }}
        >
          <View role="cell" style={{ flex: 1, minWidth: 200, gap: 2 }}>
            <Text
              selectable
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: TextColors.primary,
              }}
            >
              {cycle.title}
            </Text>
            <Text
              selectable
              numberOfLines={1}
              style={{ fontSize: 13, color: TextColors.secondary }}
            >
              {cycle.author}
            </Text>
          </View>
          <View role="cell" style={{ width: SESSIONS_COLUMN_WIDTH }}>
            <Text
              selectable
              style={{
                fontSize: 14,
                color: TextColors.primary,
                textAlign: "right",
                fontVariant: ["tabular-nums"],
              }}
            >
              {cycle.sessions}
            </Text>
          </View>
          {cycle.has_session_data ? (
            <>
              <View role="cell" style={{ width: DAYS_COLUMN_WIDTH }}>
                <Text
                  selectable
                  style={{
                    fontSize: 14,
                    color: TextColors.primary,
                    textAlign: "right",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {cycle.days}
                </Text>
              </View>
              <View role="cell" style={{ flex: 0.85, minWidth: 220, gap: 6 }}>
                <Text
                  selectable
                  style={{
                    fontSize: 14,
                    color: TextColors.primary,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {formatPace(cycle.pages_per_day)}
                </Text>
                <PaceBar
                  pagesPerDay={cycle.pages_per_day}
                  maxPace={maxPace}
                  title={cycle.title}
                />
              </View>
            </>
          ) : (
            <View
              role="cell"
              style={{
                flex: 0.85,
                minWidth: 220,
              }}
            >
              <Text style={{ fontSize: 13, color: TextColors.secondary }}>
                {NO_SESSION_DATA}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
