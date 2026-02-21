/**
 * BookDetailHero Component
 * Hero section with book metadata and action buttons
 *
 * Layout:
 * - Title with action buttons on the right
 * - Author, ISBN, Total Pages
 * - Status badge + Reading Cycle
 * - Score + Comment (if exists)
 *
 * Rules:
 * - Use flex layout for title + buttons
 * - Keep buttons small and visually balanced
 * - Use accessible colors with good contrast
 * - Use borderCurve: 'continuous'
 */

import { View, Text, Pressable } from "react-native";
import { BookDetails, BookStatus } from "@/types/book";
import { BookStatusBadge } from "@/components/ui/bookStatusBadge";
import {
  Background,
  Text as TextColors,
  Border,
  Interactive,
  getScoreColors,
} from "@/constants/colors";

interface BookDetailHeroProps {
  book: BookDetails["book"];
  onEdit?: () => void;
  onReview?: () => void;
  onRequestReview?: () => void;
  onReopen?: () => void;
  isActionPending?: boolean;
}

export function BookDetailHero({
  book,
  onEdit,
  onReview,
  onRequestReview,
  onReopen,
  isActionPending = false,
}: BookDetailHeroProps) {
  const scoreColors = book.score !== null ? getScoreColors(book.score) : null;

  return (
    <View
      style={{
        backgroundColor: Background.surface,
        padding: 16,
        borderRadius: 12,
        gap: 16,
        borderWidth: 1,
        borderColor: Border.default,
        borderCurve: "continuous",
      }}
    >
      {/* Title + Action Buttons */}
      <View style={{ gap: 12 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: TextColors.primary,
            lineHeight: 30,
          }}
          selectable
        >
          {book.title}
        </Text>

        {/* Action Buttons Row */}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {/* Review Button - PENDING_SCORE */}
          {book.status === BookStatus.PENDING_SCORE && onReview && (
            <Pressable
              onPress={onReview}
              disabled={isActionPending}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? Interactive.primary.pressed
                  : Interactive.primary.default,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderCurve: "continuous",
                opacity: isActionPending ? 0.5 : 1,
              })}
            >
              <Text
                style={{
                  color: Interactive.primary.text,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                📝 Review
              </Text>
            </Pressable>
          )}

          {/* Request Review Button - READING */}
          {book.status === BookStatus.READING && onRequestReview && (
            <Pressable
              onPress={onRequestReview}
              disabled={isActionPending}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? Interactive.secondary.pressed
                  : Interactive.secondary.default,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: Interactive.secondary.border,
                borderCurve: "continuous",
                opacity: isActionPending ? 0.5 : 1,
              })}
            >
              <Text
                style={{
                  color: Interactive.secondary.text,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                🏁 Finish
              </Text>
            </Pressable>
          )}

          {/* Edit Button - All except ABANDONED */}
          {book.status !== BookStatus.ABANDONED && onEdit && (
            <Pressable
              onPress={onEdit}
              disabled={isActionPending}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? Interactive.secondary.pressed
                  : Interactive.secondary.default,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: Interactive.secondary.border,
                borderCurve: "continuous",
                opacity: isActionPending ? 0.5 : 1,
              })}
            >
              <Text
                style={{
                  color: Interactive.secondary.text,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                ✏️ Edit
              </Text>
            </Pressable>
          )}

          {/* Reopen Button - ABANDONED */}
          {book.status === BookStatus.ABANDONED && onReopen && (
            <Pressable
              onPress={onReopen}
              disabled={isActionPending}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? Interactive.primary.pressed
                  : Interactive.primary.default,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderCurve: "continuous",
                opacity: isActionPending ? 0.5 : 1,
              })}
            >
              <Text
                style={{
                  color: Interactive.primary.text,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                🔄 Reopen
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Author */}
      <View style={{ gap: 4 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: TextColors.tertiary,
          }}
        >
          Author
        </Text>
        <Text style={{ fontSize: 16, color: TextColors.primary }} selectable>
          {book.author?.name ?? "Unknown"}
          {book.author?.nationality && (
            <Text style={{ color: TextColors.secondary }}>
              {" "}
              ({book.author.nationality})
            </Text>
          )}
        </Text>
      </View>

      {/* Metadata Row: ISBN + Total Pages */}
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        {/* ISBN */}
        {book.isbn && (
          <View style={{ flex: 1, minWidth: 120, gap: 4 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: TextColors.tertiary,
              }}
            >
              ISBN
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "monospace",
                color: TextColors.secondary,
              }}
              selectable
            >
              {book.isbn}
            </Text>
          </View>
        )}

        {/* Total Pages */}
        {book.total_pages !== null && (
          <View style={{ flex: 1, minWidth: 100, gap: 4 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: TextColors.tertiary,
              }}
            >
              Total Pages
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                fontVariant: ["tabular-nums"],
                color: TextColors.primary,
              }}
              selectable
            >
              {book.total_pages.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Status + Cycle Row */}
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        {/* Status */}
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: TextColors.tertiary,
            }}
          >
            Status
          </Text>
          <BookStatusBadge status={book.status} />
        </View>

        {/* Current Reading Cycle */}
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: TextColors.tertiary,
            }}
          >
            Cycle
          </Text>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              backgroundColor: Background.primary,
              borderWidth: 1,
              borderColor: Border.default,
              borderCurve: "continuous",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                fontVariant: ["tabular-nums"],
                color: TextColors.primary,
              }}
            >
              #{book.current_reading_cycle ?? 1}
            </Text>
          </View>
        </View>
      </View>

      {/* Score (if exists) */}
      {book.score !== null && scoreColors && (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: TextColors.tertiary,
            }}
          >
            Score
          </Text>
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: scoreColors.background,
              borderWidth: 1.5,
              borderColor: scoreColors.border,
              alignSelf: "flex-start",
              borderCurve: "continuous",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
                color: scoreColors.text,
              }}
            >
              {book.score}/10
            </Text>
          </View>
        </View>
      )}

      {/* Comment (if exists) */}
      {book.comment && (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: TextColors.tertiary,
            }}
          >
            Comment
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: TextColors.secondary,
              lineHeight: 20,
              fontStyle: "italic",
            }}
            selectable
          >
            &ldquo;{book.comment}&rdquo;
          </Text>
        </View>
      )}
    </View>
  );
}
