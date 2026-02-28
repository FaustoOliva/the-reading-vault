/**
 * RecommendationCard Component
 * Displays a single AI-powered book recommendation
 *
 * Shows:
 * - Book title and author
 * - Synopsis (2-3 sentences)
 * - Compatibility score (60-95) with visual bar
 * - AI reasoning for the match
 * - "Add to Vault" action button
 *
 * Rules:
 * - Use flex gap for spacing
 * - Use borderCurve: 'continuous' for rounded corners
 * - Use accessible colors from constants
 * - Score bar: green (80+), yellow (70-79), orange (60-69)
 *
 * Phase: MVP (5.1 - AI Recommendations)
 */

import { View, Text, Pressable } from "react-native";
import { BookRecommendation } from "@/types/ai";
import {
  Background,
  Text as TextColors,
  Border,
  Interactive,
} from "@/constants/colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface RecommendationCardProps {
  recommendation: BookRecommendation;
  onAddToVault: () => void;
  isLoading?: boolean;
}

/**
 * Get color for compatibility score
 */
function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981"; // Green
  if (score >= 70) return "#f59e0b"; // Yellow
  return "#f97316"; // Orange
}

export function RecommendationCard({
  recommendation,
  onAddToVault,
  isLoading = false,
}: RecommendationCardProps) {
  const scoreColor = getScoreColor(recommendation.compatibilityScore);
  const scorePercentage = ((recommendation.compatibilityScore - 60) / 35) * 100; // Normalize 60-95 to 0-100%

  return (
    <View
      style={{
        backgroundColor: Background.surface,
        padding: 16,
        borderRadius: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: Border.default,
        borderCurve: "continuous",
      }}
    >
      {/* Title and Author */}
      <View style={{ gap: 4 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: TextColors.primary,
          }}
        >
          {recommendation.title}
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: TextColors.secondary,
          }}
        >
          by {recommendation.author}
        </Text>
      </View>

      {/* Synopsis */}
      <Text
        style={{
          fontSize: 14,
          color: TextColors.secondary,
          lineHeight: 20,
        }}
      >
        {recommendation.synopsis}
      </Text>

      {/* Compatibility Score */}
      <View style={{ gap: 6 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: TextColors.tertiary,
            }}
          >
            Compatibility
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: scoreColor,
            }}
          >
            {recommendation.compatibilityScore}%
          </Text>
        </View>

        {/* Score Bar */}
        <View
          style={{
            height: 6,
            backgroundColor: Border.default,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${scorePercentage}%`,
              backgroundColor: scoreColor,
            }}
          />
        </View>
      </View>

      {/* AI Reasoning */}
      <View
        style={{
          backgroundColor: Background.elevated,
          padding: 12,
          borderRadius: 8,
          borderLeftWidth: 3,
          borderLeftColor: Interactive.primary.default,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: TextColors.tertiary,
            marginBottom: 4,
          }}
        >
          💡 Why this matches
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: TextColors.secondary,
            lineHeight: 20,
          }}
        >
          {recommendation.reasoning}
        </Text>
      </View>

      {/* Add to Vault Button */}
      <Pressable
        onPress={onAddToVault}
        disabled={isLoading}
        style={({ pressed }) => ({
          backgroundColor: pressed
            ? Interactive.primary.hover
            : Interactive.primary.default,
          padding: 14,
          borderRadius: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: isLoading ? 0.6 : 1,
        })}
      >
        <IconSymbol
          name="plus.circle.fill"
          size={20}
          color={TextColors.inverse}
        />
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: TextColors.inverse,
          }}
        >
          {isLoading ? "Adding..." : "Add to Vault"}
        </Text>
      </Pressable>
    </View>
  );
}
