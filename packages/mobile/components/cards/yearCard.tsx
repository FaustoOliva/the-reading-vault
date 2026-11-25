/**
 * YearCard Component
 * In-place preview and PNG download of the annual story card.
 *
 * Rules:
 * - Web only (the card is rendered with the browser Canvas API)
 * - Aggregate content only
 * - Download triggers a browser download; Instagram upload stays manual
 */

import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";
import {
  Background,
  Border,
  Feedback,
  Text as TextColors,
} from "@/constants/colors";
import { ActionButton } from "@/components/ui/actionButton";
import type { AnnualReadingSummary } from "@/hooks/useAnnualReadingSummary";
import {
  buildYearCardData,
  createYearCardDataUrl,
  downloadYearCardPng,
} from "@/services/yearCardImage";

const isWeb = process.env.EXPO_OS === "web";

interface YearCardProps {
  summary: AnnualReadingSummary;
}

export function YearCard({ summary }: YearCardProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  if (!isWeb) {
    return null;
  }

  const handleCreate = () => {
    try {
      setDataUrl(createYearCardDataUrl(buildYearCardData(summary)));
      setHasError(false);
    } catch {
      setHasError(true);
    }
  };

  const handleDownload = () => {
    if (dataUrl) {
      downloadYearCardPng(dataUrl, summary.year);
    }
  };

  return (
    <View
      style={{
        backgroundColor: Background.surface,
        borderWidth: 1,
        borderColor: Border.default,
        borderRadius: 14,
        borderCurve: "continuous",
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text
          accessibilityRole="header"
          style={{ fontSize: 17, fontWeight: "700", color: TextColors.primary }}
        >
          Year card
        </Text>
        <Text style={{ fontSize: 13, color: TextColors.secondary }}>
          A 1080 × 1920 PNG with your year totals only. Download it and upload
          it to your Instagram Story yourself.
        </Text>
      </View>

      {dataUrl ? (
        <View style={{ alignItems: "center", gap: 12 }}>
          <View
            style={{
              borderRadius: 12,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: Border.default,
              overflow: "hidden",
            }}
          >
            <Image
              source={{ uri: dataUrl }}
              contentFit="contain"
              accessibilityLabel={`Year card preview for ${summary.year}`}
              style={{ width: 240, height: 426 }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <ActionButton
              label="Download PNG"
              onPress={handleDownload}
              accessibilityHint="Downloads the year card image"
            />
            <ActionButton
              label="Hide preview"
              variant="secondary"
              onPress={() => setDataUrl(null)}
            />
          </View>
        </View>
      ) : (
        <View style={{ alignItems: "flex-start", gap: 8 }}>
          <ActionButton
            label="Create year card"
            onPress={handleCreate}
            accessibilityHint="Renders a preview of the year card"
          />
          {hasError ? (
            <Text
              accessibilityRole="alert"
              selectable
              style={{ fontSize: 13, color: Feedback.error.text }}
            >
              Could not create the card. Try again.
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
