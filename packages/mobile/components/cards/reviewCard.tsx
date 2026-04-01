import { View, Text } from "react-native";
import { BookDetails } from "@/types/book";
import { Background, Text as TextColors, Border } from "@/constants/colors";

interface ReviewCardProps {
  score: BookDetails["book"]["score"];
  comment: BookDetails["book"]["comment"];
}

export function ReviewCard({ score, comment }: ReviewCardProps) {
  return (
    <View
      style={{
        backgroundColor: Background.surface,
        padding: 16,
        borderRadius: 12,
        gap: 14,
        borderWidth: 1,
        borderColor: Border.default,
        borderCurve: "continuous",
      }}
    >
      <Text
        style={{ fontSize: 18, fontWeight: "700", color: TextColors.primary }}
      >
        Review
      </Text>

      <View style={{ gap: 4 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: TextColors.tertiary,
          }}
        >
          Score
        </Text>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: TextColors.primary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {score !== null ? `⭐ ${score.toFixed(1)} / 10` : "Not scored"}
        </Text>
      </View>

      <View style={{ gap: 4 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: TextColors.tertiary,
          }}
        >
          Comment
        </Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: TextColors.secondary,
            fontStyle: comment ? "italic" : "normal",
          }}
        >
          {comment ? `\"${comment}\"` : "No comment added"}
        </Text>
      </View>
    </View>
  );
}
