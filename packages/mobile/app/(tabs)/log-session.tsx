/**
 * Log Reading Session Screen
 * Form to create reading sessions for books in WISH_LIST or READING status
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as Haptics from "expo-haptics";
import { DatePicker } from "@/components/date-picker";
import { useBooks, useBookDetails } from "@/hooks/useBooks";
import { useCreateReadingSession } from "@/hooks/useReadingSessions";
import { BookStatus } from "@/types/book";
import {
  logSessionSchema,
  validatePagesAgainstRemaining,
  getZodErrors,
} from "@/types/schemas";
import {
  Interactive,
  Background,
  Text as TextColors,
  Border,
  Feedback,
} from "@/constants/colors";

export default function LogSessionScreen() {
  // Form state
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [pagesRead, setPagesRead] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date());
  const [duration, setDuration] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Fetch all books - will filter on client side
  const { data: booksResponse, isLoading: booksLoading } = useBooks();

  // Fetch selected book details
  const { data: bookDetails, isLoading: detailsLoading } = useBookDetails(
    selectedBookId ?? 0,
    { enabled: !!selectedBookId },
  );

  // Create session mutation
  const createSession = useCreateReadingSession();

  // Filter books to show only WISH_LIST and READING statuses
  const books = (booksResponse?.data ?? []).filter(
    (book) =>
      book.status === BookStatus.WISH_LIST ||
      book.status === BookStatus.READING,
  );

  // Calculate pages read in current cycle
  // The API already provides this value in bookDetails.book.pages_read_in_current_cycle
  const calculatePagesReadInCycle = (): number => {
    if (!bookDetails?.book) return 0;
    return bookDetails.book.pages_read_in_current_cycle;
  };

  // Calculate remaining pages
  const getRemainingPages = (): number | null => {
    if (!bookDetails?.book.total_pages) return null;
    const pagesReadInCycle = calculatePagesReadInCycle();
    return bookDetails.book.total_pages - pagesReadInCycle;
  };

  // Validation using Zod schema
  const validateForm = (): boolean => {
    if (selectedBookId === null) {
      setValidationErrors({ bookId: "Please select a book" });
      return false;
    }

    const result = logSessionSchema.safeParse({
      bookId: selectedBookId,
      pagesRead,
      sessionDate,
      duration,
    });

    if (!result.success) {
      setValidationErrors(getZodErrors(result.error));
      return false;
    }

    // Additional validation: pages against remaining
    const pagesNumeric = Number(pagesRead);
    const remaining = getRemainingPages();
    const pagesError = validatePagesAgainstRemaining(pagesNumeric, remaining);

    if (pagesError) {
      setValidationErrors({ pagesRead: pagesError });
      return false;
    }

    setValidationErrors({});
    return true;
  };

  const isFormValid = (): boolean => {
    return (
      selectedBookId !== null &&
      pagesRead.trim().length > 0 &&
      !isNaN(Number(pagesRead)) &&
      Number(pagesRead) > 0
    );
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid() || !selectedBookId) return;

    setErrorMessage("");
    setSuccessMessage("");

    try {
      await createSession.mutateAsync({
        bookId: selectedBookId,
        pagesRead: parseInt(pagesRead, 10),
        occurredAt: sessionDate.toISOString(),
        duration: duration ? parseInt(duration, 10) : undefined,
      });

      // Success feedback
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setSuccessMessage("Session logged successfully!");

      // Clear form
      setSelectedBookId(null);
      setPagesRead("");
      setDuration("");
      setSessionDate(new Date());
      setValidationErrors({});

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      // Error feedback
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      // Parse error message
      if (error.message?.includes("BookNotFoundError")) {
        setErrorMessage("Book not found. Please refresh the list.");
      } else if (error.message?.includes("BookClosedError")) {
        setErrorMessage(
          "This book is closed. Please reopen or review it first.",
        );
      } else if (error.message?.includes("BookPendingReviewError")) {
        setErrorMessage(
          "This book requires review (score) before logging more sessions.",
        );
      } else if (error.message?.includes("InvalidStateTransitionError")) {
        setErrorMessage("Invalid operation. Please refresh and try again.");
      } else {
        setErrorMessage("Failed to log session. Please try again.");
      }
    }
  };

  const remaining = getRemainingPages();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: Background.primary }}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.title}>Log Reading Session</Text>

      {/* Book Selector */}
      <View style={styles.field}>
        <Text style={styles.label}>Book *</Text>
        {booksLoading ? (
          <ActivityIndicator color={Interactive.primary.default} />
        ) : books.length === 0 ? (
          <Text
            style={styles.noBooks}
            selectable
            accessibilityRole="text"
            accessibilityLabel="No books available"
          >
            No books available. Add a book to your wish list or start reading!
          </Text>
        ) : (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedBookId}
              onValueChange={(value) => {
                // Picker in web returns strings, convert to number
                const numericValue = value === null ? null : Number(value);
                setSelectedBookId(numericValue);
              }}
              style={styles.picker}
              accessibilityLabel="Select book"
              accessibilityHint="Choose a book from your wish list or currently reading"
            >
              <Picker.Item label="Select a book to log session" value={null} />
              {books.map((book) => (
                <Picker.Item
                  key={book.id}
                  label={`${book.title} - ${book.author.name}`}
                  value={book.id}
                />
              ))}
            </Picker>
          </View>
        )}
      </View>

      {/* Pages Info */}
      {selectedBookId && detailsLoading && (
        <ActivityIndicator
          style={styles.loader}
          color={Interactive.primary.default}
        />
      )}
      {selectedBookId && !detailsLoading && bookDetails && (
        <Text style={styles.pagesInfo} selectable accessibilityRole="text">
          {remaining !== null
            ? `Remaining: ${remaining} pages`
            : "No page limit (legacy book)"}
        </Text>
      )}

      {/* Pages Read Input */}
      <View style={styles.field}>
        <Text style={styles.label}>Pages Read *</Text>
        <TextInput
          style={[
            styles.input,
            validationErrors.pagesRead && styles.inputError,
          ]}
          value={pagesRead}
          onChangeText={setPagesRead}
          keyboardType="numeric"
          placeholder="e.g., 45"
          placeholderTextColor={TextColors.tertiary}
          accessibilityLabel="Pages read"
          accessibilityHint="Enter the number of pages you read in this session"
          accessibilityRole="spinbutton"
        />
        {validationErrors.pagesRead && (
          <Text
            style={styles.error}
            selectable
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {validationErrors.pagesRead}
          </Text>
        )}
      </View>

      {/* Session Date */}
      <DatePicker
        value={sessionDate}
        onChange={setSessionDate}
        label="Session Date *"
        maximumDate={new Date()}
        error={validationErrors.sessionDate}
        accessibilityHint="Select the date when this reading session occurred"
      />

      {/* Duration Input */}
      <View style={styles.field}>
        <Text style={styles.label}>Duration (optional)</Text>
        <TextInput
          style={[styles.input, validationErrors.duration && styles.inputError]}
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
          placeholder="Minutes, e.g., 45"
          placeholderTextColor={TextColors.tertiary}
          accessibilityLabel="Duration in minutes"
          accessibilityHint="Optional: Enter session duration in minutes"
          accessibilityRole="spinbutton"
        />
        <Text style={styles.helperText} selectable>
          Leave empty if not tracked
        </Text>
        {validationErrors.duration && (
          <Text
            style={styles.error}
            selectable
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {validationErrors.duration}
          </Text>
        )}
      </View>

      {/* Success Message */}
      {successMessage && (
        <Text
          style={styles.success}
          selectable
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {successMessage}
        </Text>
      )}

      {/* Error Message */}
      {errorMessage && (
        <Text
          style={styles.errorMessage}
          selectable
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {errorMessage}
        </Text>
      )}

      {/* Submit Button */}
      <Pressable
        onPress={handleSubmit}
        disabled={!isFormValid() || createSession.isPending}
        style={({ pressed }) => [
          styles.submitButton,
          {
            backgroundColor:
              !isFormValid() || createSession.isPending
                ? Interactive.primary.disabled
                : pressed
                  ? Interactive.primary.pressed
                  : Interactive.primary.default,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Log session"
        accessibilityHint="Submit the reading session"
        accessibilityState={{
          disabled: !isFormValid() || createSession.isPending,
        }}
      >
        {createSession.isPending ? (
          <ActivityIndicator color={Interactive.primary.text} />
        ) : (
          <Text style={styles.submitButtonText}>Log Session</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: TextColors.primary,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: TextColors.primary,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Border.default,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: Background.surface,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: TextColors.primary,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: Border.default,
    borderRadius: 8,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: Background.surface,
    color: TextColors.primary,
  },
  inputError: {
    borderColor: Feedback.error.border,
  },
  dateButton: {
    height: 50,
    borderWidth: 1,
    borderColor: Border.default,
    borderRadius: 8,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: Background.surface,
  },
  dateButtonError: {
    borderColor: Feedback.error.border,
  },
  dateButtonText: {
    color: TextColors.primary,
  },
  pagesInfo: {
    fontSize: 14,
    marginTop: -12,
    marginLeft: 4,
    color: TextColors.secondary,
  },
  helperText: {
    fontSize: 14,
    marginTop: -4,
    marginLeft: 4,
    color: TextColors.secondary,
  },
  noBooks: {
    fontSize: 16,
    fontStyle: "italic",
    padding: 16,
    textAlign: "center",
    color: TextColors.secondary,
  },
  error: {
    fontSize: 14,
    marginTop: -4,
    marginLeft: 4,
    color: Feedback.error.text,
  },
  errorMessage: {
    fontSize: 14,
    marginTop: -4,
    marginLeft: 4,
    color: Feedback.error.text,
  },
  success: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    padding: 12,
    color: Feedback.success.text,
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    borderCurve: "continuous",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: Interactive.primary.text,
    fontSize: 18,
    fontWeight: "600",
  },
  loader: {
    marginTop: -12,
  },
});
