/**
 * KPICard Component
 * Displays a single KPI metric with icon and optional subtitle
 *
 * Shows:
 * - Icon (emoji)
 * - Title
 * - Value (large number)
 * - Optional subtitle
 *
 * Rules:
 * - Use flex gap for spacing
 * - Use borderCurve: 'continuous' for rounded corners
 * - Use accessible colors from constants
 * - Centered layout for visual consistency
 */

import { View, Text } from "react-native";
import { Background, Text as TextColors, Border } from "@/constants/colors";

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: string;
  subtitle?: string;
}

export function KPICard({ title, value, icon, subtitle }: KPICardProps) {
  return (
    <View
      style={{
        backgroundColor: Background.surface,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        gap: 8,
        borderWidth: 1,
        borderColor: Border.default,
        borderCurve: "continuous",
        height: 140,
        justifyContent: "center",
      }}
    >
      {/* Icon */}
      {icon && <Text style={{ fontSize: 32, marginBottom: 4 }}>{icon}</Text>}

      {/* Value */}
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: TextColors.primary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}{" "}
        {subtitle ? (
          <Text
            style={{
              fontSize: 12,
              color: TextColors.secondary,
              textAlign: "center",
            }}
          >
            {subtitle}
          </Text>
        ) : (
          ""
        )}
      </Text>

      {/* Title */}
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: TextColors.tertiary,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </View>
  );
}
