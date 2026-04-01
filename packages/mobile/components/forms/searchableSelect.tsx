/**
 * SearchableSelect Component
 * Autocomplete input with filtered dropdown and create option
 *
 * Features:
 * - Search/filter items as you type
 * - Select from existing items
 * - Create new item with "+ Create [search text]"
 * - Accessible colors and design
 *
 * UX Flow:
 * 1. User types in input
 * 2. Dropdown shows filtered results
 * 3. User can select existing or create new
 */

import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Keyboard,
} from "react-native";
import {
  Text as TextColors,
  Border,
  Background,
  Interactive,
  Feedback,
} from "@/constants/colors";

interface SearchableSelectProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelectItem?: (item: { id: number; name: string }) => void;
  items: { id: number; name: string }[];
  placeholder?: string;
  error?: string;
  createLabel?: string;
  zIndex?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function SearchableSelect({
  label,
  value,
  onChangeText,
  onSelectItem,
  items,
  placeholder = "Search or create...",
  error,
  createLabel = "Create",
  zIndex = 1,
  accessibilityLabel,
  accessibilityHint,
}: SearchableSelectProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter items based on search text
  const filteredItems = useMemo(() => {
    if (!value.trim()) return items;

    const searchLower = value.toLowerCase();
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchLower),
    );
  }, [items, value]);

  // Check if exact match exists
  const exactMatch = useMemo(() => {
    return items.find(
      (item) => item.name.toLowerCase() === value.toLowerCase(),
    );
  }, [items, value]);

  const handleFocus = () => {
    setIsFocused(true);
    setShowDropdown(true);
  };

  const handleSelectItem = (item: { id: number; name: string }) => {
    onChangeText(item.name);
    onSelectItem?.(item);
    setShowDropdown(false);
    setIsFocused(false);
    Keyboard.dismiss();
  };

  const handleCreateNew = () => {
    setShowDropdown(false);
    setIsFocused(false);
    Keyboard.dismiss();
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

      <View style={{ zIndex: showDropdown ? 10000 + zIndex : zIndex }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          placeholder={placeholder}
          placeholderTextColor={TextColors.tertiary}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={
            accessibilityHint ||
            `Search or type to create new ${label.toLowerCase()}`
          }
          accessibilityRole="search"
          returnKeyType="done"
          autoCorrect={false}
          blurOnSubmit={false}
          style={{
            borderWidth: 1,
            borderColor: error
              ? Feedback.error.border
              : isFocused
                ? Border.focus
                : Border.default,
            borderRadius: 8,
            borderCurve: "continuous",
            padding: 12,
            fontSize: 16,
            backgroundColor: Background.surface,
            color: TextColors.primary,
          }}
        />

        {/* Dropdown */}
        {showDropdown && (
          <View
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 4,
              zIndex: 10000,
              elevation: 10,
            }}
          >
            <View
              style={{
                backgroundColor: Background.surface,
                borderRadius: 8,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: Border.default,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                maxHeight: 240,
                overflow: "hidden",
              }}
              accessibilityRole="menu"
              accessibilityLabel={`${filteredItems.length} results found`}
            >
              {filteredItems.length === 0 && !value.trim() ? (
                <View style={{ padding: 16, alignItems: "center" }}>
                  <Text style={{ color: TextColors.tertiary, fontSize: 14 }}>
                    Start typing to search...
                  </Text>
                </View>
              ) : filteredItems.length === 0 && value.trim() ? (
                <View style={{ padding: 12 }}>
                  <Text style={{ color: TextColors.tertiary, fontSize: 14 }}>
                    No results found
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredItems}
                  keyExtractor={(item) => item.id.toString()}
                  keyboardShouldPersistTaps="always"
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleSelectItem(item)}
                      accessibilityRole="menuitem"
                      accessibilityLabel={`Select ${item.name}`}
                      style={({ pressed }) => ({
                        padding: 12,
                        backgroundColor: pressed
                          ? Background.primary
                          : Background.surface,
                      })}
                    >
                      <Text style={{ color: TextColors.primary, fontSize: 15 }}>
                        {item.name}
                      </Text>
                    </Pressable>
                  )}
                  ListFooterComponent={
                    value.trim() && !exactMatch ? (
                      <Pressable
                        onPress={handleCreateNew}
                        accessibilityRole="button"
                        accessibilityLabel={`Create new ${label.toLowerCase()}: ${value}`}
                        accessibilityHint="This will create a new entry"
                        style={({ pressed }) => ({
                          padding: 12,
                          backgroundColor: pressed
                            ? Interactive.primary.hover
                            : Background.surface,
                          borderTopWidth: 1,
                          borderTopColor: Border.default,
                        })}
                      >
                        <Text
                          style={{
                            color: Interactive.primary.default,
                            fontSize: 15,
                            fontWeight: "600",
                          }}
                        >
                          ➕ {createLabel} &apos;{value}&apos;
                        </Text>
                      </Pressable>
                    ) : null
                  }
                />
              )}
            </View>
          </View>
        )}
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
