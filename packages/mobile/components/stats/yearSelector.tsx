/**
 * YearSelector Component
 * Chooses the statistics year.
 *
 * Rules:
 * - Only years with at least one finished cycle (plus the current year) appear
 * - Newest year first
 * - Selection is conveyed by text (check glyph) and accessibilityState,
 *   never by color alone
 * - Minimum 44px targets
 */

import { Pressable, Text, View } from "react-native";
import {
  Background,
  Border,
  Interactive,
  Text as TextColors,
} from "@/constants/colors";

interface YearSelectorProps {
  years: number[];
  selectedYear: number;
  onSelectYear: (year: number) => void;
}

export function YearSelector({
  years,
  selectedYear,
  onSelectYear,
}: YearSelectorProps) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Statistics year"
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
    >
      {years.map((year) => {
        const isSelected = year === selectedYear;

        return (
          <Pressable
            key={year}
            onPress={() => onSelectYear(year)}
            accessibilityRole="radio"
            accessibilityLabel={String(year)}
            accessibilityState={{ selected: isSelected, checked: isSelected }}
            style={({ pressed }) => ({
              minHeight: 44,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: isSelected
                ? Interactive.primary.default
                : Border.default,
              backgroundColor: isSelected
                ? Interactive.primary.default
                : pressed
                  ? Interactive.secondary.pressed
                  : Background.surface,
              justifyContent: "center",
            })}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: isSelected
                  ? Interactive.primary.text
                  : TextColors.primary,
                fontVariant: ["tabular-nums"],
              }}
            >
              {isSelected ? `✓ ${year}` : String(year)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
