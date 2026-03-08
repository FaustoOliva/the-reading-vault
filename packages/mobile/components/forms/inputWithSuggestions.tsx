/**
 * InputWithSuggestions Component
 * Simple text input with inline suggestion chips
 *
 * No dropdowns, no zIndex, no floating elements.
 * Displays suggestions as horizontal scrollable chips below the input.
 * Backend handles create-if-not-exists logic.
 *
 * UX Flow:
 * 1. User types in input
 * 2. Matching suggestions appear as chips below
 * 3. User can tap chip to autofill or continue typing
 * 4. Backend creates new entry if it doesn't exist
 */

import { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, ScrollView, Pressable } from "react-native";
import {
  Text as TextColors,
  Border,
  Background,
  Interactive,
  Feedback,
} from "@/constants/colors";

interface InputWithSuggestionsProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suggestions?: string[];
  placeholder?: string;
  error?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function InputWithSuggestions({
  label,
  value,
  onChangeText,
  suggestions = [],
  placeholder = "Type here...",
  error,
  autoCapitalize = "words",
  accessibilityLabel,
  accessibilityHint,
}: InputWithSuggestionsProps) {
  const [isFocused, setIsFocused] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  // Filter suggestions based on current input
  const filteredSuggestions = suggestions
    .filter((suggestion) =>
      suggestion.toLowerCase().includes(value.toLowerCase()),
    )
    .slice(0, 10); // Limit to 10 suggestions

  // Only show suggestions if user has typed something and there are matches
  const showSuggestions =
    isFocused && value.trim().length > 0 && filteredSuggestions.length > 0;

  const handleSelectSuggestion = (suggestion: string) => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    onChangeText(suggestion);
    setIsFocused(false);
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow chip press to register
    blurTimeoutRef.current = setTimeout(() => {
      setIsFocused(false);
      blurTimeoutRef.current = null;
    }, 200);
  };

  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: TextColors.primary,
        }}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={TextColors.tertiary}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={accessibilityHint}
        style={{
          height: 50,
          borderWidth: 1.5,
          borderColor: error
            ? Feedback.error.border
            : isFocused
              ? Interactive.primary.default
              : Border.default,
          borderRadius: 12,
          borderCurve: "continuous",
          paddingHorizontal: 16,
          fontSize: 16,
          backgroundColor: Background.surface,
          color: TextColors.primary,
        }}
      />

      {/* Inline Suggestions */}
      {showSuggestions && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <Pressable
              key={`${suggestion}-${index}`}
              onPress={() => handleSelectSuggestion(suggestion)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: Border.default,
                backgroundColor: pressed
                  ? Interactive.secondary.pressed
                  : Interactive.secondary.default,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: TextColors.primary,
                }}
              >
                {suggestion}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Helper text */}
      {!error && isFocused && (
        <Text
          style={{
            fontSize: 13,
            color: TextColors.tertiary,
            marginTop: -4,
          }}
        >
          {filteredSuggestions.length > 0
            ? "Tap a suggestion or continue typing to create new"
            : "Type to create new entry"}
        </Text>
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
