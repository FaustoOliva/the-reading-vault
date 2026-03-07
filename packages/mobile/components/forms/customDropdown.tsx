/**
 * CustomDropdown Component
 * Modern dropdown with custom styling, no native Picker
 *
 * Features:
 * - Custom trigger button with arrow indicator
 * - Dropdown with solid background
 * - Selected state with checkmark
 * - Full-screen backdrop to close on outside tap
 * - Accessible labels and hints
 *
 * UX Flow:
 * 1. User taps trigger button
 * 2. Dropdown appears below with options
 * 3. User selects option (checkmark shows selected)
 * 4. Dropdown closes and value updates
 */

import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import {
  Text as TextColors,
  Border,
  Background,
  Interactive,
  Feedback,
} from "@/constants/colors";

interface DropdownOption<T> {
  label: string;
  value: T;
}

interface CustomDropdownProps<T> {
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: DropdownOption<T>[];
  error?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function CustomDropdown<T extends string | number>({
  label,
  value,
  onValueChange,
  options,
  error,
  accessibilityLabel,
  accessibilityHint,
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (newValue: T) => {
    onValueChange(newValue);
    setIsOpen(false);
  };

  return (
    <View style={{ gap: 8, position: "relative", zIndex: isOpen ? 10000 : 1 }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: TextColors.primary,
        }}
      >
        {label}
      </Text>

      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={
          accessibilityHint || `Currently ${selectedOption?.label}. Tap to change.`
        }
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1.5,
          borderColor: error
            ? Feedback.error.border
            : isOpen
              ? Interactive.primary.default
              : Border.default,
          borderRadius: 12,
          backgroundColor: pressed
            ? Interactive.secondary.pressed
            : Background.surface,
          borderCurve: "continuous",
          minHeight: 50,
        })}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "500",
            color: TextColors.primary,
          }}
        >
          {selectedOption?.label || "Select..."}
        </Text>
        <Text
          style={{
            fontSize: 18,
            color: TextColors.tertiary,
            transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
          }}
        >
          ▼
        </Text>
      </Pressable>

      {/* Backdrop to close dropdown - covers entire screen */}
      {isOpen && (
        <Pressable
          style={{
            position: "absolute",
            top: -1000,
            left: -1000,
            right: -1000,
            bottom: -1000,
            zIndex: 9999,
          }}
          onPress={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <View
          style={{
            position: "absolute",
            top: 78,
            left: 0,
            right: 0,
            backgroundColor: Background.surface,
            borderWidth: 1.5,
            borderColor: Border.focus,
            borderRadius: 12,
            borderCurve: "continuous",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 10,
            zIndex: 10000,
            overflow: "hidden",
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isFirst = index === 0;
            const isLast = index === options.length - 1;

            return (
              <Pressable
                key={String(option.value)}
                onPress={() => handleSelect(option.value)}
                accessibilityRole="menuitem"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: pressed
                    ? Interactive.secondary.pressed
                    : isSelected
                      ? Interactive.secondary.hover
                      : Background.surface,
                  borderTopLeftRadius: isFirst ? 12 : 0,
                  borderTopRightRadius: isFirst ? 12 : 0,
                  borderBottomLeftRadius: isLast ? 12 : 0,
                  borderBottomRightRadius: isLast ? 12 : 0,
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: isSelected ? "600" : "400",
                      color: isSelected
                        ? Interactive.primary.default
                        : TextColors.primary,
                    }}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Text
                      style={{
                        fontSize: 16,
                        color: Interactive.primary.default,
                      }}
                    >
                      ✓
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Error message */}
      {error && (
        <Text
          selectable
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            fontSize: 14,
            color: Feedback.error.text,
            marginTop: -4,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
