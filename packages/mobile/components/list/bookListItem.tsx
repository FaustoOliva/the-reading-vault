/**
 * BookListItem Component
 * Displays a single book in the list with navigation
 *
 * Visual Hierarchy:
 * - Left: Title (bold, large) + Author (gray, small)
 * - Right column: Score (top, colored by value) + Status badge (bottom)
 * - Card background differentiated from list background
 *
 * Rules:
 * - Use Pressable for touchable feedback
 * - Use borderCurve: 'continuous' for rounded corners
 * - Use boxShadow for elevation (not shadowOpacity/elevation)
 * - Use flex gap for spacing
 * - Score colors scale with value (red→orange→yellow→green)
 */

import { View, Text, Pressable } from "react-native";
import { Link } from "expo-router";
import { memo } from "react";
import { Book } from "@/types/book";
import { BookStatusBadge } from "@/components/ui/bookStatusBadge";
import { FadeInView } from "@/components/ui/animated";
import {
  Background,
  Text as TextColors,
  Border,
  Shadow,
  Interactive,
  getScoreColors,
} from "@/constants/colors";

interface BookListItemProps {
  book: Book;
}

const BookListItemComponent = ({ book }: BookListItemProps) => {
  const scoreColors = book.score !== null ? getScoreColors(book.score) : null;

  return (
    <FadeInView duration={200}>
      <Link href={`/book/${book.id}` as any} asChild>
        <Pressable
          style={({ pressed }) => ({
            padding: 16,
            backgroundColor: pressed
              ? Interactive.primary.hover
              : Background.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Border.default,
            gap: 12,
            boxShadow: Shadow.small,
            borderCurve: "continuous",
          })}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            {/* Left: Title + Author */}
            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: TextColors.primary,
                  lineHeight: 24,
                  letterSpacing: -0.2,
                }}
                numberOfLines={2}
                selectable
              >
                {book.title}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: TextColors.tertiary,
                  lineHeight: 18,
                }}
                numberOfLines={1}
                selectable
              >
                {book.author.name}
              </Text>
            </View>

            {/* Right: Score + Status in column */}
            <View style={{ alignItems: "flex-end", gap: 8, minWidth: 80 }}>
              {book.score !== null && scoreColors && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: scoreColors.background,
                    borderWidth: 1.5,
                    borderColor: scoreColors.border,
                    borderCurve: "continuous",
                  }}
                >
                  <Text style={{ fontSize: 14 }}>⭐</Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: scoreColors.text,
                      fontVariant: ["tabular-nums"],
                    }}
                    selectable
                  >
                    {book.score.toFixed(1)}
                  </Text>
                </View>
              )}
              <BookStatusBadge status={book.status} />
            </View>
          </View>

          {/* Bottom metadata row */}
          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            {book.totalPages && (
              <Text
                style={{
                  fontSize: 13,
                  color: TextColors.tertiary,
                  fontWeight: "500",
                }}
                selectable
              >
                📄 {book.totalPages} pages
              </Text>
            )}

            {book.currentReadingCycle > 1 && (
              <Text
                style={{
                  fontSize: 13,
                  color: TextColors.tertiary,
                  fontWeight: "500",
                }}
                selectable
              >
                🔄 Cycle {book.currentReadingCycle}
              </Text>
            )}
          </View>
        </Pressable>
      </Link>
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
      prevProps.book.currentReadingCycle === nextProps.book.currentReadingCycle
    );
  },
);
