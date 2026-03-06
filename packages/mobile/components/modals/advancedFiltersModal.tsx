/**
 * AdvancedFiltersModal Component
 * Modal with comprehensive filtering options for books
 *
 * Filters:
 * - Country (author's nationality)
 * - Author
 * - Score range (min/max)
 * - Page count range (min/max)
 * - Date range (start/end)
 *
 * Features:
 * - Apply button (closes modal)
 * - Reset button (clears all filters)
 * - Close button (discards changes)
 *
 * Rules:
 * - Use local state for form values
 * - Only call onApply when user confirms
 * - Show active filter count in parent button
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useAuthors } from "@/hooks/useAuthors";
import { useCountries } from "@/hooks/useCountries";
import { BooksFilter } from "@/types/book";
import {
  validateFilters,
  parseFilterValues,
  FilterValidationErrors,
} from "@/types/filterValidation";
import {
  Background,
  Text as TextColors,
  Border,
  Interactive,
  Feedback,
} from "@/constants/colors";

interface AdvancedFiltersModalProps {
  visible: boolean;
  filters: BooksFilter;
  onClose: () => void;
  onApply: (filters: BooksFilter) => void;
}

export function AdvancedFiltersModal({
  visible,
  filters,
  onClose,
  onApply,
}: AdvancedFiltersModalProps) {
  // Local form state
  const [countryId, setCountryId] = useState<number | undefined>(
    filters.countryId,
  );
  const [authorId, setAuthorId] = useState<number | undefined>(
    filters.authorId,
  );
  const [minScore, setMinScore] = useState<string>(
    filters.minScore?.toString() || "",
  );
  const [maxScore, setMaxScore] = useState<string>(
    filters.maxScore?.toString() || "",
  );
  const [minPages, setMinPages] = useState<string>(
    filters.minPages?.toString() || "",
  );
  const [maxPages, setMaxPages] = useState<string>(
    filters.maxPages?.toString() || "",
  );
  const [startDate, setStartDate] = useState<string>(filters.startDate || "");
  const [endDate, setEndDate] = useState<string>(filters.endDate || "");
  const [errors, setErrors] = useState<FilterValidationErrors>({});

  const { data: authorsResponse } = useAuthors();
  const { data: countriesResponse } = useCountries();

  const authors = authorsResponse || [];
  const countries = countriesResponse || [];

  // Sync form state when filters prop changes
  useEffect(() => {
    setCountryId(filters.countryId);
    setAuthorId(filters.authorId);
    setMinScore(filters.minScore?.toString() || "");
    setMaxScore(filters.maxScore?.toString() || "");
    setMinPages(filters.minPages?.toString() || "");
    setMaxPages(filters.maxPages?.toString() || "");
    setStartDate(filters.startDate || "");
    setEndDate(filters.endDate || "");
  }, [filters, visible]);

  const handleReset = () => {
    setCountryId(undefined);
    setAuthorId(undefined);
    setMinScore("");
    setMaxScore("");
    setMinPages("");
    setMaxPages("");
    setStartDate("");
    setEndDate("");
    setErrors({});
  };

  const handleApply = () => {
    // Validate all filter values
    const validation = validateFilters({
      countryId,
      authorId,
      minScore,
      maxScore,
      minPages,
      maxPages,
      startDate,
      endDate,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Parse validated values
    const parsedValues = parseFilterValues({
      countryId,
      authorId,
      minScore,
      maxScore,
      minPages,
      maxPages,
      startDate,
      endDate,
    });

    const newFilters: BooksFilter = {
      ...filters,
      ...parsedValues,
    };

    onApply(newFilters);
    onClose();
    setErrors({});
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
          <Text style={styles.title}>Advanced Filters</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Filters Form */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Country Filter */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Country (Author&apos;s Nationality)
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={countryId}
                onValueChange={(value) => {
                  // Picker in web returns strings, convert to number
                  const numericValue = Number(value);
                  setCountryId(numericValue === 0 ? undefined : numericValue);
                }}
                style={styles.picker}
              >
                <Picker.Item label="All Countries" value={0} />
                {countries.map((country: { id: number; name: string }) => (
                  <Picker.Item
                    key={country.id}
                    label={country.name}
                    value={country.id}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Author Filter */}
          <View style={styles.section}>
            <Text style={styles.label}>Author</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={authorId}
                onValueChange={(value) => {
                  // Picker in web returns strings, convert to number
                  const numericValue = Number(value);
                  setAuthorId(numericValue === 0 ? undefined : numericValue);
                }}
                style={styles.picker}
              >
                <Picker.Item label="All Authors" value={0} />
                {authors.map(
                  (author: {
                    id: number;
                    name: string;
                    nationality?: string | null;
                  }) => (
                    <Picker.Item
                      key={author.id}
                      label={`${author.name}${author.nationality ? ` (${author.nationality})` : ""}`}
                      value={author.id}
                    />
                  ),
                )}
              </Picker>
            </View>
          </View>

          {/* Score Range */}
          <View style={styles.section}>
            <Text style={styles.label}>Score Range (0-10)</Text>
            <View style={styles.rangeContainer}>
              <View style={styles.rangeInput}>
                <Text style={styles.rangeLabel}>Min</Text>
                <TextInput
                  style={[styles.input, errors.minScore && styles.inputError]}
                  value={minScore}
                  onChangeText={(text) => {
                    setMinScore(text);
                    if (errors.minScore)
                      setErrors({ ...errors, minScore: undefined });
                  }}
                  placeholder="0.0"
                  placeholderTextColor={TextColors.secondary}
                  keyboardType="decimal-pad"
                  maxLength={4}
                  accessibilityHint="Minimum score (0-10)"
                />
              </View>
              <Text style={styles.rangeSeparator}>—</Text>
              <View style={styles.rangeInput}>
                <Text style={styles.rangeLabel}>Max</Text>
                <TextInput
                  style={[styles.input, errors.maxScore && styles.inputError]}
                  value={maxScore}
                  onChangeText={(text) => {
                    setMaxScore(text);
                    if (errors.maxScore)
                      setErrors({ ...errors, maxScore: undefined });
                  }}
                  placeholder="10.0"
                  placeholderTextColor={TextColors.secondary}
                  keyboardType="decimal-pad"
                  maxLength={4}
                  accessibilityHint="Maximum score (0-10)"
                />
              </View>
            </View>
            {(errors.minScore || errors.maxScore) && (
              <Text
                style={styles.errorText}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {errors.minScore || errors.maxScore}
              </Text>
            )}
          </View>

          {/* Page Count Range */}
          <View style={styles.section}>
            <Text style={styles.label}>Page Count Range</Text>
            <View style={styles.rangeContainer}>
              <View style={styles.rangeInput}>
                <Text style={styles.rangeLabel}>Min Pages</Text>
                <TextInput
                  style={[styles.input, errors.minPages && styles.inputError]}
                  value={minPages}
                  onChangeText={(text) => {
                    setMinPages(text);
                    if (errors.minPages)
                      setErrors({ ...errors, minPages: undefined });
                  }}
                  placeholder="0"
                  placeholderTextColor={TextColors.secondary}
                  keyboardType="number-pad"
                  maxLength={5}
                  accessibilityHint="Minimum page count"
                />
              </View>
              <Text style={styles.rangeSeparator}>—</Text>
              <View style={styles.rangeInput}>
                <Text style={styles.rangeLabel}>Max Pages</Text>
                <TextInput
                  style={[styles.input, errors.maxPages && styles.inputError]}
                  value={maxPages}
                  onChangeText={(text) => {
                    setMaxPages(text);
                    if (errors.maxPages)
                      setErrors({ ...errors, maxPages: undefined });
                  }}
                  placeholder="9999"
                  placeholderTextColor={TextColors.secondary}
                  keyboardType="number-pad"
                  maxLength={5}
                  accessibilityHint="Maximum page count"
                />
              </View>
            </View>
            {(errors.minPages || errors.maxPages) && (
              <Text
                style={styles.errorText}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {errors.minPages || errors.maxPages}
              </Text>
            )}
          </View>

          {/* Date Range - Simplified (ISO string input) */}
          <View style={styles.section}>
            <Text style={styles.label}>Date Range</Text>
            <Text style={styles.helperText}>
              Format: YYYY-MM-DD (e.g., 2025-01-15)
            </Text>
            <View style={styles.dateContainer}>
              <View style={styles.dateInput}>
                <Text style={styles.rangeLabel}>Start Date</Text>
                <TextInput
                  style={[styles.input, errors.startDate && styles.inputError]}
                  value={startDate}
                  onChangeText={(text) => {
                    setStartDate(text);
                    if (errors.startDate)
                      setErrors({ ...errors, startDate: undefined });
                  }}
                  placeholder="2025-01-01"
                  placeholderTextColor={TextColors.secondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityHint="Start date in YYYY-MM-DD format"
                />
              </View>
              <View style={styles.dateInput}>
                <Text style={styles.rangeLabel}>End Date</Text>
                <TextInput
                  style={[styles.input, errors.endDate && styles.inputError]}
                  value={endDate}
                  onChangeText={(text) => {
                    setEndDate(text);
                    if (errors.endDate)
                      setErrors({ ...errors, endDate: undefined });
                  }}
                  placeholder="2025-12-31"
                  placeholderTextColor={TextColors.secondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityHint="End date in YYYY-MM-DD format"
                />
              </View>
            </View>
            {(errors.startDate || errors.endDate) && (
              <Text
                style={styles.errorText}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {errors.startDate || errors.endDate}
              </Text>
            )}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.resetButtonPressed,
            ]}
          >
            <Text style={styles.resetButtonText}>Reset All</Text>
          </Pressable>
          <Pressable
            onPress={handleApply}
            style={({ pressed }) => [
              styles.applyButton,
              pressed && styles.applyButtonPressed,
            ]}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Border.default,
    backgroundColor: Background.elevated,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Interactive.secondary.default,
  },
  closeButtonText: {
    fontSize: 20,
    color: TextColors.primary,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: TextColors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: TextColors.primary,
    marginBottom: 4,
  },
  helperText: {
    fontSize: 12,
    color: TextColors.secondary,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: Background.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Border.default,
    overflow: "hidden",
  },
  picker: {
    height: Platform.OS === "ios" ? 200 : 50,
  },
  rangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rangeInput: {
    flex: 1,
    gap: 4,
  },
  rangeLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: TextColors.secondary,
  },
  rangeSeparator: {
    fontSize: 16,
    color: TextColors.secondary,
    marginTop: 20,
  },
  dateContainer: {
    gap: 12,
  },
  dateInput: {
    gap: 4,
  },
  input: {
    backgroundColor: Background.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Border.default,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: TextColors.primary,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Border.default,
    backgroundColor: Background.elevated,
  },
  resetButton: {
    flex: 1,
    backgroundColor: Interactive.secondary.default,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  resetButtonPressed: {
    backgroundColor: Interactive.secondary.pressed,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: TextColors.primary,
  },
  applyButton: {
    flex: 2,
    backgroundColor: Interactive.primary.default,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonPressed: {
    backgroundColor: Interactive.primary.pressed,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Interactive.primary.text,
  },
  inputError: {
    borderColor: Feedback.error.border,
    backgroundColor: Feedback.error.background,
  },
  errorText: {
    fontSize: 13,
    color: Feedback.error.text,
    marginTop: 4,
  },
});
