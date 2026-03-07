/**
 * CountryFlag Component
 * Displays a country flag icon based on ISO code.
 */

import { View, Text, Image } from "react-native";

/**
 * Flag icon size variants in pixels
 */
type FlagSize = "small" | "medium" | "large";

const SIZE_MAP: Record<FlagSize, number> = {
  small: 16,
  medium: 24,
  large: 32,
};

interface CountryFlagProps {
  isoCode?: string | null;
  size?: FlagSize;
  showText?: boolean;
  countryName?: string;
}

export function CountryFlag({
  isoCode,
  size = "medium",
  showText = false,
  countryName,
}: CountryFlagProps) {
  const sizePixels = SIZE_MAP[size];
  const normalizedIso = isoCode?.trim().toUpperCase();
  const hasValidIso = !!normalizedIso && /^[A-Z]{2}$/.test(normalizedIso);
  const flagUri = hasValidIso
    ? `https://flagcdn.com/w40/${normalizedIso.toLowerCase()}.png`
    : null;

  return (
    <View
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: showText && countryName ? 6 : 0,
      }}
    >
      {hasValidIso ? (
        <Image
          source={{ uri: flagUri! }}
          style={{
            width: sizePixels,
            height: sizePixels,
            borderRadius: 2,
          }}
          resizeMode="cover"
          accessibilityLabel={`Flag of ${countryName || normalizedIso}`}
        />
      ) : (
        <Text
          style={{
            fontSize: sizePixels,
            lineHeight: sizePixels,
            width: sizePixels,
            height: sizePixels,
            textAlign: "center",
          }}
          accessibilityLabel={`Flag unavailable for ${countryName || "unknown country"}`}
        >
          🌍
        </Text>
      )}

      {showText && countryName && (
        <Text
          style={{
            fontSize: 14,
            color: "#333",
          }}
        >
          {countryName}
        </Text>
      )}
    </View>
  );
}
