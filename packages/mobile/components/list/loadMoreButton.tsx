/**
 * LoadMoreButton Component
 * Smart pagination with context for "Load More" pattern
 *
 * Features:
 * - Always visible counter (Showing X of Y books)
 * - Contextual Load More button (Load N more - X remaining)
 * - Auto-hide when all loaded
 * - Loading state
 *
 * Rules:
 * - Use Pressable for button
 * - Show loading indicator when fetching
 * - Disable button when loading
 * - Use accessible colors from constants
 * - Use tabular numbers for counters
 */

import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { ScaleButton } from "@/components/ui/animated";
import {
  Interactive,
  Text as TextColors,
  Border,
  Background,
} from "@/constants/colors";

interface LoadMoreButtonProps {
  /**
   * Currently displayed items count
   */
  displayedCount: number;

  /**
   * Total items available
   */
  totalCount: number;

  /**
   * Number of items to load per page
   */
  pageSize: number;

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Callback when Load More is pressed
   */
  onLoadMore: () => void;
}

export function LoadMoreButton({
  displayedCount,
  totalCount,
  pageSize,
  isLoading,
  onLoadMore,
}: LoadMoreButtonProps) {
  const remainingCount = totalCount - displayedCount;
  const hasMore = remainingCount > 0;
  const nextLoadCount = Math.min(pageSize, remainingCount);

  return (
    <View
      style={{
        paddingVertical: 16,
        gap: 12,
        alignItems: "center",
      }}
    >
      {/* Always visible counter */}
      <Text
        style={{
          fontSize: 14,
          color: TextColors.secondary,
          fontVariant: ["tabular-nums"],
        }}
        selectable
      >
        Showing {displayedCount} of {totalCount} book
        {totalCount !== 1 ? "s" : ""}
      </Text>

      {/* Load More button - only show if there are more items */}
      {hasMore && (
        <ScaleButton
          onPress={onLoadMore}
          disabled={isLoading}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 12,
            backgroundColor: isLoading
              ? Border.default
              : Interactive.primary.default,
            alignItems: "center",
            justifyContent: "center",
            minWidth: 200,
            minHeight: 48,
            borderCurve: "continuous",
            flexDirection: "row",
            gap: 12,
          }}
        >
          {isLoading ? (
            <>
              <ActivityIndicator
                size="small"
                color={Interactive.primary.text}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: TextColors.disabled,
                }}
              >
                Loading...
              </Text>
            </>
          ) : (
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: Interactive.primary.text,
                }}
              >
                Load {nextLoadCount} more
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: Interactive.primary.text,
                  opacity: 0.8,
                  fontVariant: ["tabular-nums"],
                }}
              >
                ({remainingCount} remaining)
              </Text>
            </View>
          )}
        </ScaleButton>
      )}

      {/* All loaded message */}
      {!hasMore && totalCount > 0 && (
        <View
          style={{
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 8,
            backgroundColor: Background.surface,
            borderWidth: 1,
            borderColor: Border.default,
            borderCurve: "continuous",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: TextColors.tertiary,
              textAlign: "center",
            }}
          >
            ✓ All books loaded
          </Text>
        </View>
      )}
    </View>
  );
}
