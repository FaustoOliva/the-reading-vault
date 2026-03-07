/**
 * BookListItem Component
 * Typography-first list row optimized for scanability and reading progress.
 */

import { View, Text, Pressable } from "react-native";
import { Link } from "expo-router";
import { memo } from "react";
import { Book, BookStatus } from "@/types/book";
import { BookStatusBadge } from "@/components/ui/bookStatusBadge";
import { useBookStats } from "@/hooks/useBookStats";
import { FadeInView } from "@/components/ui/animated";
import {
  Text as TextColors,
  Border,
  Interactive,
} from "@/constants/colors";

interface BookListItemProps {
  book: Book;
}

const BookListItemComponent = ({ book }: BookListItemProps) => {
  const isReading = book.status === BookStatus.READING;
  const { data: readingStats } = useBookStats(isReading ? book.id : undefined);

  const pagesRead = readingStats?.current_cycle_stats?.pages_read ?? 0;
  const hasTotalPages = typeof book.totalPages === "number" && book.totalPages > 0;
  const progressPercent = hasTotalPages
    ? Math.max(0, Math.min(100, (pagesRead / (book.totalPages as number)) * 100))
    : null;

  const metadataParts: string[] = [];
  if (book.publicationYear !== null) {
    metadataParts.push(String(book.publicationYear));
  }
  if (book.totalPages) {
    metadataParts.push(`${book.totalPages} pages`);
  }
  const metadata = metadataParts.join(" • ");

  return (
    <FadeInView duration={200}>
      <View style={{ marginBottom: 20 }}>
        <Link href={`/book/${book.id}` as any} asChild>
          <Pressable
            style={({ pressed }) => ({
              paddingTop: 16,
              paddingBottom: 16,
              paddingHorizontal: 4,
              backgroundColor: pressed ? Interactive.secondary.hover : "transparent",
            })}
          >
            <View style={{ flexDirection: "row", gap: 12 }}>
              {/* Left column: Main content */}
              <View style={{ flex: 1, gap: 8 }}>
                <Text
                  style={{
                    fontSize: 19,
                    fontWeight: "600",
                    color: TextColors.primary,
                    lineHeight: 25,
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

                {isReading && hasTotalPages && progressPercent !== null && (
                  <View style={{ gap: 8, marginTop: 8 }}>
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
                          width: `${progressPercent}%`,
                          backgroundColor: Interactive.primary.default,
                        }}
                      />
                    </View>
                  </View>
                )}
              </View>

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
            marginTop: 16,
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
