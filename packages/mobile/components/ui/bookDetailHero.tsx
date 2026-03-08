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
import {
  Background,
  Text as TextColors,
  Border,
  Interactive,
} from "@/constants/colors";

interface BookDetailHeroProps {
  book: BookDetails["book"];
  onReview?: () => void;
  onRequestReview?: () => void;
  onReopen?: () => void;
  isActionPending?: boolean;
}

export function BookDetailHero({
  book,
  onReview,
  onRequestReview,
  onReopen,
  isActionPending = false,
}: BookDetailHeroProps) {
  const statusColorMap = {
    WISH_LIST: "#FFA500",
    READING: "#007BFF",
    COMPLETED: "#28A745",
    ABANDONED: "#DC3545",
    PENDING_SCORE: "#F59E0B",
  } as const;

  const statusLabelMap = {
    WISH_LIST: "Wish List",
    READING: "Reading",
    COMPLETED: "Completed",
    ABANDONED: "Abandoned",
    PENDING_SCORE: "Review Pending",
  } as const;

  const statusColor = statusColorMap[book.status];
  const statusLabel = statusLabelMap[book.status];

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

        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: statusColor,
            }}
          >
            {statusLabel}
          </Text>

          {book.status === BookStatus.READING && book.total_pages !== null && (
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                fontVariant: ["tabular-nums"],
                color: TextColors.secondary,
              }}
            >
              Page {book.pages_read_in_current_cycle.toLocaleString()} /{" "}
              {book.total_pages.toLocaleString()}
            </Text>
          )}
        </View>

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
    </View>
  );
}
