/**
 * SearchBar Component
 * Text input with search icon and debouncing for book title search
 * 
 * Features:
 * - Debounced input (300ms delay)
 * - Clear button when text is present
 * - Search icon
 * - Platform-specific styling
 * 
 * Rules:
 * - Use useEffect with debounce for onChange
 * - Don't call onChange on every keystroke
 * - Clear button should reset local state and call onChange('')
 */

import { useState, useEffect } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet } from 'react-native';
import { Background, Text as TextColors, Border, Interactive } from '@/constants/colors';

interface SearchBarProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchBar({ 
  value, 
  onChange, 
  placeholder = 'Search books by title...',
  debounceMs = 300 
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync external value changes (e.g., when filters are reset)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce onChange callback
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [localValue, debounceMs, onChange, value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          value={localValue}
          onChangeText={setLocalValue}
          placeholder={placeholder}
          placeholderTextColor={TextColors.secondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never" // Custom clear button
        />
        {localValue.length > 0 && (
          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [
              styles.clearButton,
              pressed && styles.clearButtonPressed,
            ]}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
          >
            <Text style={styles.clearIcon}>✕</Text>
          </Pressable>
        )}
      </View>
      {/* Minimum character hint */}
      {localValue.length > 0 && localValue.length < 3 && (
        <Text style={styles.hintText}>
          Type at least 3 characters to search ({3 - localValue.length} more)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Background.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Border.default,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchIcon: {
    fontSize: 18,
    color: TextColors.secondary,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: TextColors.primary,
    paddingVertical: 0, // Remove default padding on Android
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Interactive.secondary.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonPressed: {
    backgroundColor: Interactive.secondary.pressed,
  },
  clearIcon: {
    fontSize: 14,
    color: TextColors.secondary,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 13,
    color: TextColors.tertiary,
    marginTop: 6,
    marginLeft: 4,
  },
});
