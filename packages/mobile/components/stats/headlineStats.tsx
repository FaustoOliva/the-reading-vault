/**
 * HeadlineStats Component
 * The four annual headline figures: books finished, pages read,
 * reading days and average pages per day.
 *
 * Rules:
 * - Exactly four stats, no more
 * - A missing metric renders as an em dash, never as a fabricated zero
 * - The requested column count is enforced per row, so a narrow canvas can
 *   never squeeze four cards (and their labels) into a single row
 */

import { Text, View } from "react-native";
import { Background, Border, Text as TextColors } from "@/constants/colors";

export interface HeadlineStat {
  label: string;
  value: string;
  suffix?: string;
}

type HeadlineColumns = 2 | 3 | 4;

interface HeadlineStatsProps {
  stats: HeadlineStat[];
  /** Columns per row: two on medium canvases, four on ultra-wide ones. */
  columns?: HeadlineColumns;
  /** Larger figures once the canvas is wide enough to carry them. */
  emphasis?: "regular" | "large";
}

/**
 * Split stats into fixed-size rows.
 * Flex wrapping alone cannot guarantee a column count: with `flexGrow` the
 * cards keep shrinking into one row instead of wrapping.
 */
function chunkIntoRows<T>(items: T[], columns: number): T[][] {
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }

  return rows;
}

export function HeadlineStats({
  stats,
  columns = 2,
  emphasis = "regular",
}: HeadlineStatsProps) {
  const isLarge = emphasis === "large";
  const rows = chunkIntoRows(stats, columns);

  return (
    <View style={{ gap: 16 }}>
      {rows.map((row, rowIndex) => (
        <View
          key={`kpi-row-${rowIndex}`}
          style={{ flexDirection: "row", gap: 16 }}
        >
          {row.map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                minWidth: 0,
                backgroundColor: Background.surface,
                borderWidth: 1,
                borderColor: Border.default,
                borderRadius: 14,
                borderCurve: "continuous",
                padding: isLarge ? 20 : 16,
                gap: 8,
              }}
            >
              <Text
                selectable
                style={{
                  fontSize: isLarge ? 36 : 30,
                  lineHeight: isLarge ? 42 : 36,
                  fontWeight: "800",
                  letterSpacing: -0.6,
                  color: TextColors.primary,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {stat.value}
                {stat.suffix ? (
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: TextColors.secondary,
                    }}
                  >
                    {" "}
                    {stat.suffix}
                  </Text>
                ) : null}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: TextColors.tertiary,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {stat.label}
              </Text>
            </View>
          ))}

          {/* Keep the last row aligned when it holds fewer than a full row */}
          {Array.from({ length: columns - row.length }).map(
            (_, fillerIndex) => (
              <View
                key={`kpi-filler-${rowIndex}-${fillerIndex}`}
                style={{ flex: 1 }}
              />
            ),
          )}
        </View>
      ))}
    </View>
  );
}
