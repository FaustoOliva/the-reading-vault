/**
 * Form Picker Component
 * Reusable picker/select with label and error handling
 *
 * Design Rules:
 * - Uses accessible colors from @/constants/colors
 * - Rounded corners with continuous curve
 * - Clear visual feedback for errors
 * - Proper contrast ratios (WCAG AA)
 */

import { View, Text } from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  Text as TextColors,
  Border,
  Feedback,
  Background,
} from "@/constants/colors";

interface FormPickerProps<T extends string | number> {
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: { label: string; value: T }[];
  error?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function FormPicker<T extends string | number>({
  label,
  value,
  onValueChange,
  options,
  error,
  accessibilityLabel,
  accessibilityHint,
}: FormPickerProps<T>) {
  // Detect if we're working with numbers based on the options
  const isNumericType =
    options.length > 0 && typeof options[0].value === "number";

  const handleValueChange = (selectedValue: T) => {
    // Picker in web returns strings, convert back to number if needed
    if (isNumericType && typeof selectedValue === "string") {
      const numericValue = Number(selectedValue) as T;
      onValueChange(numericValue);
    } else {
      onValueChange(selectedValue);
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "600",
          color: TextColors.primary,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: error ? Feedback.error.border : Border.default,
          borderRadius: 8,
          borderCurve: "continuous",
          backgroundColor: Background.surface,
          overflow: "hidden",
        }}
      >
        <Picker
          selectedValue={value}
          onValueChange={handleValueChange}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint}
          style={{
            color: TextColors.primary,
          }}
        >
          {options.map((option) => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      </View>
      {error && (
        <Text
          selectable
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            fontSize: 14,
            color: Feedback.error.text,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
