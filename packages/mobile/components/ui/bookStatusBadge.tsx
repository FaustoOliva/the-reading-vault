/**
 * BookStatusBadge Component
 * Displays a colored badge for book status
 *
 * Rules:
 * - Use borderCurve: 'continuous' for rounded corners
 * - Use accessible colors from constants
 * - Meet WCAG AA contrast standards
 */

import { View, Text } from "react-native";
import { BookStatus } from "@/types/book";
import { BOOK_STATUS_LABELS } from "@/constants/bookStatus";
import { getStatusColors } from "@/constants/colors";

interface BookStatusBadgeProps {
  status: BookStatus;
}

export function BookStatusBadge({ status }: BookStatusBadgeProps) {
  const colors = getStatusColors(status);

  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderCurve: "continuous",
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: colors.text,
        }}
      >
        {BOOK_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}
