/**
 * BookListItem Component
 * Typography-first list row optimized for scanability and reading progress.
 *
 * Rules:
 * - Compact screens keep the two-column row: content left, status right
 * - Ultra-wide screens move the progress bar into its own column so rows
 *   align into a readable table of progress
 * - Memoized: only book identity and displayed fields trigger a re-render
 */

import { View, Text, Pressable } from "react-native";
import { Link } from "expo-router";
import { memo } from "react";
import { Book, BookStatus } from "@/types/book";
import { BookStatusBadge } from "@/components/ui/bookStatusBadge";
import { useBookStats } from "@/hooks/useBookStats";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { FadeInView } from "@/components/ui/animated";
import { Text as TextColors, Border, Interactive } from "@/constants/colors";

interface BookListItemProps {
  book: Book;
}

const PROGRESS_COLUMN_WIDTH = 240;

/**
 * Percentage width for a progress fill.
 * Keeps the value inside 0-100 and returns the literal percentage type React
 * Native expects, so an unknown total can never render an invalid `null%`.
 */
function formatProgressPercent(percent: number): `${number}%` {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return `${clamped}%`;
}

const BookListItemComponent = ({ book }: BookListItemProps) => {
  const { isUltraWide } = useResponsiveLayout();
  const isReading = book.status === BookStatus.READING;
  const { data: readingStats } = useBookStats(isReading ? book.id : undefined);

  const pagesRead = readingStats?.current_cycle_stats?.pages_read ?? 0;
  const hasTotalPages =
    typeof book.totalPages === "number" && book.totalPages > 0;
  const progressPercent =
    hasTotalPages && Number.isFinite(pagesRead)
      ? Math.max(
          0,
          Math.min(100, (pagesRead / (book.totalPages as number)) * 100),
        )
      : null;
  const showInlineProgress =
    isUltraWide && isReading && progressPercent !== null;

  const metadataParts: string[] = [];
  if (book.publicationYear !== null) {
    metadataParts.push(String(book.publicationYear));
  }
  if (book.totalPages) {
    metadataParts.push(`${book.totalPages} pages`);
  }
  const metadata = metadataParts.join(" • ");

  /**
   * Progress readout for a measured book. The caller only renders it once a
   * real percentage exists, so no progress is invented for unknown totals.
   */
  const renderProgressBlock = (percent: number) => (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: TextColors.secondary,
          fontVariant: ["tabular-nums"],
        }}
        selectable
      >
        {pagesRead} / {book.totalPages} pages
      </Text>
      <View
        style={{
          height: 8,
          borderRadius: 999,
          backgroundColor: Border.default,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: formatProgressPercent(percent),
            backgroundColor: Interactive.primary.default,
          }}
        />
      </View>
    </View>
  );

  return (
    <FadeInView duration={200}>
      <View style={{ marginBottom: 8 }}>
        <Link href={`/book/${book.id}` as any} asChild>
          <Pressable
            style={({ pressed }) => ({
              paddingTop: isUltraWide ? 18 : 16,
              paddingBottom: isUltraWide ? 18 : 16,
              paddingHorizontal: isUltraWide ? 12 : 4,
              borderRadius: 10,
              borderCurve: "continuous",
              backgroundColor: pressed
                ? Interactive.secondary.hover
                : "transparent",
            })}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: isUltraWide ? 24 : 12,
              }}
            >
              {/* Left column: Main content */}
              <View style={{ flex: 1, gap: 8 }}>
                <Text
                  style={{
                    fontSize: isUltraWide ? 20 : 19,
                    fontWeight: "600",
                    color: TextColors.primary,
                    lineHeight: isUltraWide ? 26 : 25,
                    letterSpacing: -0.2,
                  }}
                  numberOfLines={2}
                  selectable
                >
                  {book.title}
                </Text>

                <Text
                  style={{
                    fontSize: 15,
                    color: TextColors.secondary,
                    lineHeight: 20,
                  }}
                  numberOfLines={1}
                  selectable
                >
                  {book.author.name}
                </Text>

                {metadata.length > 0 && (
                  <Text
                    style={{
                      fontSize: 13,
                      color: TextColors.tertiary,
                    }}
                    selectable
                  >
                    {metadata}
                  </Text>
                )}

                {isReading &&
                !showInlineProgress &&
                progressPercent !== null ? (
                  <View style={{ marginTop: 4 }}>
                    {renderProgressBlock(progressPercent)}
                  </View>
                ) : null}
              </View>

              {/* Middle column: aligned progress on ultra-wide rows */}
              {showInlineProgress && progressPercent !== null ? (
                <View
                  style={{
                    width: PROGRESS_COLUMN_WIDTH,
                    paddingTop: 2,
                  }}
                >
                  {renderProgressBlock(progressPercent)}
                </View>
              ) : null}

              {/* Right column: Status and rating stacked vertically */}
              <View
                style={{
                  gap: 10,
                  alignItems: "flex-end",
                  justifyContent: "flex-start",
                  minWidth: 100,
                }}
              >
                <BookStatusBadge status={book.status} />
                {book.score !== null && (
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: TextColors.secondary,
                      fontVariant: ["tabular-nums"],
                    }}
                    selectable
                  >
                    ⭐ {book.score.toFixed(1)}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        </Link>
        {/* Visible separator */}
        <View
          style={{
            height: 1,
            backgroundColor: Border.focus,
          }}
        />
      </View>
    </FadeInView>
  );
};

// Memoize component to prevent unnecessary re-renders
// Only re-render if book.id or book props change
export const BookListItem = memo(
  BookListItemComponent,
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if book data changed
    return (
      prevProps.book.id === nextProps.book.id &&
      prevProps.book.title === nextProps.book.title &&
      prevProps.book.status === nextProps.book.status &&
      prevProps.book.score === nextProps.book.score &&
      prevProps.book.publicationYear === nextProps.book.publicationYear &&
      prevProps.book.totalPages === nextProps.book.totalPages &&
      prevProps.book.currentReadingCycle === nextProps.book.currentReadingCycle
    );
  },
);
