/**
 * DatePicker Component
 * Platform-aware date picker that works on web and native platforms
 * - Web: Uses native HTML date input
 * - iOS/Android: Uses @react-native-community/datetimepicker
 */

import { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Border,
  Text as TextColors,
  Background,
  Feedback,
} from "@/constants/colors";

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label: string;
  maximumDate?: Date;
  minimumDate?: Date;
  error?: string;
  accessibilityHint?: string;
}

export function DatePicker({
  value,
  onChange,
  label,
  maximumDate,
  minimumDate,
  error,
  accessibilityHint,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Web implementation using HTML input type="date"
  if (Platform.OS === "web") {
    // Format date as YYYY-MM-DD for HTML input
    const formatDateForInput = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Parse date from HTML input
    const handleWebDateChange = (dateString: string) => {
      if (!dateString) return;
      const newDate = new Date(dateString + "T00:00:00");
      if (!isNaN(newDate.getTime())) {
        onChange(newDate);
      }
    };

    const maxDateString = maximumDate
      ? formatDateForInput(maximumDate)
      : undefined;
    const minDateString = minimumDate
      ? formatDateForInput(minimumDate)
      : undefined;

    return (
      <View style={{ gap: 8 }}>
        <Text
          style={{ fontSize: 16, fontWeight: "600", color: TextColors.primary }}
        >
          {label}
        </Text>
        <input
          type="date"
          value={formatDateForInput(value)}
          onChange={(e) => handleWebDateChange(e.target.value)}
          max={maxDateString}
          min={minDateString}
          style={{
            paddingLeft: 16,
            paddingRight: 16,
            fontSize: 16,
            borderWidth: 1.5,
            borderStyle: "solid",
            borderColor: error ? Feedback.error.border : Border.default,
            borderRadius: 12,
            backgroundColor: Background.surface,
            color: TextColors.primary,
            fontFamily: "System",
            width: "100%",
            height: 50,
            boxSizing: "border-box",
          }}
          aria-label={label}
          aria-describedby={accessibilityHint}
        />
        {error && (
          <Text
            style={{
              fontSize: 14,
              color: Feedback.error.text,
              marginTop: -4,
            }}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        )}
      </View>
    );
  }

  // Native implementation using @react-native-community/datetimepicker
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{ fontSize: 16, fontWeight: "600", color: TextColors.primary }}
      >
        {label}
      </Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value.toLocaleDateString()}`}
        accessibilityHint={accessibilityHint || "Tap to change date"}
        style={{
          height: 50,
          borderWidth: 1.5,
          borderColor: error ? Feedback.error.border : Border.default,
          borderRadius: 12,
          borderCurve: "continuous",
          paddingHorizontal: 16,
          justifyContent: "center",
          backgroundColor: Background.surface,
        }}
      >
        <Text style={{ fontSize: 16, color: TextColors.primary }}>
          {value.toLocaleDateString()}
        </Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={(_event: any, date?: Date) => {
            setShowPicker(Platform.OS === "ios");
            if (date) onChange(date);
          }}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}
      {error && (
        <Text
          style={{
            fontSize: 14,
            color: Feedback.error.text,
            marginTop: -4,
          }}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
    </View>
  );
}
