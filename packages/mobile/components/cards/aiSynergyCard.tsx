import { View, Text } from "react-native";
import {
  Background,
  Border,
  Feedback,
  Text as TextColors,
} from "@/constants/colors";
import type { SynergyCompatibility } from "@/types/ai";

interface AISynergyCardProps {
  title: string;
  subtitle?: string;
  compatibility: SynergyCompatibility;
}

function getScoreColor(score: number): string {
  if (score >= 85) return Feedback.success.text;
  if (score >= 70) return "#0ea5e9";
  if (score >= 50) return "#f59e0b";
  return Feedback.error.text;
}

export function AISynergyCard({
  title,
  subtitle,
  compatibility,
}: AISynergyCardProps) {
  const scoreColor = getScoreColor(compatibility.score);
  const scorePercentage = Math.max(0, Math.min(100, compatibility.score));

  return (
    <View
      style={{
        backgroundColor: Background.surface,
        borderWidth: 1,
        borderColor: Border.default,
        borderRadius: 12,
        padding: 16,
        gap: 10,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: TextColors.primary,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 13,
              color: TextColors.tertiary,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

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
              color: TextColors.secondary,
              fontWeight: "600",
            }}
          >
            Compatibility
          </Text>
          <Text
            style={{
              color: scoreColor,
              fontWeight: "700",
              fontSize: 18,
            }}
          >
            {compatibility.score}%
          </Text>
        </View>

        <View
          style={{
            height: 6,
            backgroundColor: Border.default,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${scorePercentage}%`,
              height: "100%",
              backgroundColor: scoreColor,
            }}
          />
        </View>
      </View>

      <Text
        style={{
          fontSize: 14,
          color: TextColors.secondary,
          lineHeight: 20,
        }}
      >
        {compatibility.reasoning}
      </Text>

      {compatibility.positiveSignals?.length > 0 ? (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: 13,
              color: Feedback.success.text,
              fontWeight: "700",
            }}
          >
            Positive signals
          </Text>
          {compatibility.positiveSignals.slice(0, 2).map((signal) => (
            <Text
              key={signal}
              style={{
                fontSize: 13,
                color: TextColors.secondary,
              }}
            >
              • {signal}
            </Text>
          ))}
        </View>
      ) : null}

      {compatibility.cautionSignals?.length > 0 ? (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: 13,
              color: Feedback.warning.text,
              fontWeight: "700",
            }}
          >
            Caution signals
          </Text>
          {compatibility.cautionSignals.slice(0, 2).map((signal) => (
            <Text
              key={signal}
              style={{
                fontSize: 13,
                color: TextColors.secondary,
              }}
            >
              • {signal}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
