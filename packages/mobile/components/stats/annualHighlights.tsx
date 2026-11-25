/**
 * AnnualHighlights Component
 * Extremes of the year: fastest finish, longest book and highest-rated book
 *
 * Rules:
 * - Each highlight carries a one-line detail
 * - Highlights never include cycles without measurable data
 * - Three across on the wide canvas, stacked when the page is narrow
 */

import { Text, View } from "react-native";
import { Background, Border, Text as TextColors } from "@/constants/colors";
import type { AnnualReadingHighlights } from "@/hooks/useAnnualReadingSummary";

type HighlightColumns = 1 | 3;

interface AnnualHighlightsProps {
  highlights: AnnualReadingHighlights;
  columns?: HighlightColumns;
}

function formatDays(days: number | null): string {
  if (days === null) {
    return "No session data";
  }

  return days === 1 ? "1 day" : `${days} days`;
}

function formatDetailNumber(value: number | null): string {
  return value === null ? "—" : String(value);
}

function buildDetail(primary: string, secondary: string) {
  return { primary, secondary };
}

export function AnnualHighlights({
  highlights,
  columns = 1,
}: AnnualHighlightsProps) {
  const items = [
    {
      label: "Fastest finish",
      ...(highlights.fastest_finish
        ? buildDetail(
            highlights.fastest_finish.title,
            `${formatDetailNumber(
              highlights.fastest_finish.pages_per_day,
            )} pages/day · ${formatDays(highlights.fastest_finish.days)}`,
          )
        : buildDetail("Not enough data yet", "Needs a cycle with sessions")),
    },
    {
      label: "Longest book",
      ...(highlights.longest_book
        ? buildDetail(
            highlights.longest_book.title,
            `${formatDetailNumber(highlights.longest_book.total_pages)} pages`,
          )
        : buildDetail("Not enough data yet", "Needs a book with a page count")),
    },
    {
      label: "Highest rated",
      ...(highlights.highest_rated
        ? buildDetail(
            highlights.highest_rated.title,
            `Score ${formatDetailNumber(highlights.highest_rated.score)}`,
          )
        : buildDetail("Not enough data yet", "Needs a rated finish")),
    },
  ];

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={{
            flexGrow: 1,
            flexBasis: columns === 3 ? 240 : 210,
            backgroundColor: Background.surface,
            borderWidth: 1,
            borderColor: Border.default,
            borderRadius: 14,
            borderCurve: "continuous",
            padding: 18,
            gap: 6,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: TextColors.tertiary,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            {item.label}
          </Text>
          <Text
            selectable
            numberOfLines={2}
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: TextColors.primary,
            }}
          >
            {item.primary}
          </Text>
          <Text
            selectable
            style={{ fontSize: 13, color: TextColors.secondary }}
          >
            {item.secondary}
          </Text>
        </View>
      ))}
    </View>
  );
}
