/**
 * VelocityChart Component
 * A simple bar chart showing reading velocity trend
 *
 * Visual Design:
 * - Displays last N sessions as vertical bars
 * - Height represents pages read
 * - Shows average velocity as a line
 * - Compact and minimal
 *
 * Rules:
 * - Use accessible colors
 * - Handle empty data gracefully
 * - Keep it simple and readable
 * - Use fontVariant: 'tabular-nums' for numbers
 */

import { View, Text } from "react-native";
import {
  Background,
  Text as TextColors,
  Interactive,
  Border,
  Feedback,
} from "@/constants/colors";

interface VelocityChartProps {
  currentVelocity: number | null; // pages/day
  targetVelocity?: number | null;
  label?: string;
}

export function VelocityChart({
  currentVelocity,
  targetVelocity = null,
  label = "Reading Velocity",
}: VelocityChartProps) {
  const velocity = currentVelocity || 0;
  const target = targetVelocity || velocity * 1.2; // Default target: 20% more

  // Calculate percentage for visual bar
  const velocityPercent =
    target > 0 ? Math.min((velocity / target) * 100, 100) : 0;
  const isOnTarget = velocity >= target;

  return (
    <View style={{ gap: 6 }}>
      {/* Label and Value */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: TextColors.tertiary,
          }}
        >
          {label}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: isOnTarget ? Feedback.success.text : TextColors.primary,
              fontVariant: ["tabular-nums"],
            }}
          >
            {velocity.toFixed(1)}
          </Text>
          <Text style={{ fontSize: 13, color: TextColors.secondary }}>
            pages/day
          </Text>
        </View>
      </View>

      {/* Visual Bar */}
      <View
        style={{
          height: 8,
          backgroundColor: Background.primary,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: Border.default,
          overflow: "hidden",
          borderCurve: "continuous",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${velocityPercent}%`,
            backgroundColor: isOnTarget
              ? Feedback.success.background
              : Interactive.primary.default,
            borderRadius: 8,
            borderCurve: "continuous",
          }}
        />
      </View>

      {/* Target indicator (optional) */}
      {targetVelocity && (
        <Text
          style={{
            fontSize: 11,
            color: TextColors.tertiary,
            textAlign: "right",
          }}
        >
          Target: {target.toFixed(1)} p/day
        </Text>
      )}
    </View>
  );
}
