/**
 * Last Reading Session Card Component
 * Displays the most recent reading session with book information
 *
 * Shows:
 * - Book title and author
 * - Reading date (short local format)
 * - Pages read in that session
 */

import { View, Text, ActivityIndicator } from "react-native";
import { useLastReadingSession } from "@/hooks/useLastReadingSession";
import {
  Interactive,
  Background,
  Text as TextColors,
  Border,
} from "@/constants/colors";

export function LastReadingSessionCard() {
  const { data: lastSession, isLoading, error } = useLastReadingSession();

  if (isLoading) {
    return (
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: TextColors.secondary,
          }}
        >
          Last Reading Session
        </Text>
        <ActivityIndicator color={Interactive.primary.default} size="small" />
      </View>
    );
  }

  if (!lastSession || error) {
    return null;
  }

  // Format date as local short format (e.g., 09/03/2026)
  const sessionDate = new Date(lastSession.occurredAt);
  const formattedDate = sessionDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <View
      style={{
        gap: 8,
        padding: 16,
        backgroundColor: Background.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Border.default,
        borderCurve: "continuous",
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: TextColors.secondary,
          marginBottom: 4,
        }}
      >
        Last Reading Session
      </Text>

      <View style={{ gap: 12 }}>
        {/* Book Info */}
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: TextColors.primary,
            }}
            numberOfLines={1}
            selectable
            accessibilityRole="text"
          >
            {lastSession.book.title}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: TextColors.secondary,
            }}
            numberOfLines={1}
            selectable
            accessibilityRole="text"
          >
            by {lastSession.book.authorName}
          </Text>
        </View>

        {/* Date and Page Info */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 12,
                color: TextColors.tertiary,
              }}
              selectable
            >
              Reading Date
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: TextColors.primary,
                marginTop: 2,
              }}
              selectable
              accessibilityRole="text"
            >
              {formattedDate}
            </Text>
          </View>

          <View>
            <Text
              style={{
                fontSize: 12,
                color: TextColors.tertiary,
              }}
              selectable
            >
              Pages Read
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: TextColors.primary,
                marginTop: 2,
              }}
              selectable
              accessibilityRole="text"
              accessibilityLabel="Page"
            >
              {lastSession.pagesRead}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
