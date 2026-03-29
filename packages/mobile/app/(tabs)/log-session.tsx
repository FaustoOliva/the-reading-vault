/**
 * Log Reading Session Screen
 * Form to create reading sessions for books in WISH_LIST or READING status
 *
 * Workflow:
 * - Show last reading session globally
 * - User selects a book
 * - User enters ending page (not pages read)
 * - Mobile calculates pagesRead from: endingPage - lastEndingPage
 * - API receives: { bookId, pagesRead, occurredAt, duration }
 */

import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { DatePicker } from "@/components/date-picker";
import { CustomDropdown } from "@/components/forms/customDropdown";
import { LastReadingSessionCard } from "@/components/lastReadingSessionCard";
import { useBooks, useBookDetails } from "@/hooks/useBooks";
import { useCreateReadingSession } from "@/hooks/useReadingSessions";
import { BookStatus } from "@/types/book";
import {
  logSessionSchema,
  validateEndingPageAgainstBook,
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
  const [endingPage, setEndingPage] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date());
  const [duration, setDuration] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Fetch only books that can receive reading sessions
  const { data: booksResponse, isLoading: booksLoading } = useBooks({
    statuses: [BookStatus.WISH_LIST, BookStatus.READING],
  });

  // Fetch selected book details
  const { data: bookDetails, isLoading: detailsLoading } = useBookDetails(
    selectedBookId ?? 0,
    { enabled: !!selectedBookId },
  );

  // Create session mutation
  const createSession = useCreateReadingSession();

  const books = useMemo(() => {
    const items = [...(booksResponse?.data ?? [])];

    return items.sort((left, right) => {
      const leftPriority = left.status === BookStatus.READING ? 0 : 1;
      const rightPriority = right.status === BookStatus.READING ? 0 : 1;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return right.id - left.id;
    });
  }, [booksResponse?.data]);

  // Transform books to dropdown options
  const bookOptions = useMemo(() => {
    return books.map((book) => ({
      label: `${book.title} - ${book.author.name}`,
      value: book.id,
    }));
  }, [books]);

  /**
   * Get the last recorded ending page for the selected book
   * Uses pages_read_in_current_cycle as the effective "ending page"
   * (i.e., where the reader left off in the current reading cycle)
   * If no reading data exists, returns 0.
   *
   * Note: This is an approximation based on cycle stats.
   * More precise data would require querying the last session directly.
   */
  const getLastEndingPage = (): number => {
    if (!bookDetails?.book) {
      return 0;
    }
    // Use the pages already read in current cycle as the de facto ending page
    return bookDetails.book.pages_read_in_current_cycle || 0;
  };

  /**
   * Calculate pagesRead: endingPage - lastEndingPage
   */
  const calculatePagesRead = (endingPageValue: number): number => {
    const lastEnding = getLastEndingPage();
    return Math.max(0, endingPageValue - lastEnding);
  };

  /**
   * Validation using Zod schema + dynamic book-based validation
   */
  const validateForm = (): boolean => {
    if (selectedBookId === null) {
      setValidationErrors({ bookId: "Please select a book" });
      return false;
    }

    const result = logSessionSchema.safeParse({
      bookId: selectedBookId,
      endingPage,
      sessionDate,
      duration,
    });

    if (!result.success) {
      setValidationErrors(getZodErrors(result.error));
      return false;
    }

    // Additional validation: ending page against book context
    const endingPageNumeric = Number(endingPage);
    const totalPages = bookDetails?.book.total_pages ?? null;
    const lastEnding = getLastEndingPage();

    const endingPageError = validateEndingPageAgainstBook(
      endingPageNumeric,
      totalPages,
      lastEnding,
    );

    if (endingPageError) {
      setValidationErrors({ endingPage: endingPageError });
      return false;
    }

    setValidationErrors({});
    return true;
  };

  const isFormValid = (): boolean => {
    return (
      selectedBookId !== null &&
      endingPage.trim().length > 0 &&
      !isNaN(Number(endingPage)) &&
      Number(endingPage) > 0
    );
  };

  /**
   * Handle form submission
   * Mobile calculates pagesRead from endingPage
   */
  const handleSubmit = async () => {
    if (!validateForm() || !selectedBookId) return;

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const endingPageNumeric = parseInt(endingPage, 10);
      const pagesRead = calculatePagesRead(endingPageNumeric);

      await createSession.mutateAsync({
        bookId: selectedBookId,
        pagesRead,
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
      setEndingPage("");
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

  const lastEnding = getLastEndingPage();
  const totalPages = bookDetails?.book.total_pages;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: Background.primary }}
      contentContainerStyle={{ padding: 16, gap: 20 }}
    >
      {/* Header */}
      <View style={{ gap: 4, marginBottom: 8 }}>
        <Text
          style={{ fontSize: 28, fontWeight: "700", color: TextColors.primary }}
        >
          Log Reading Session
        </Text>
        <Text
          style={{ fontSize: 14, color: TextColors.secondary, lineHeight: 20 }}
        >
          Track your reading progress by logging completed sessions for books in
          your wish list or currently reading.
        </Text>
      </View>

      {/* Last Reading Session Card */}
      <LastReadingSessionCard />

      {/* Book Selector */}
      <View style={{ gap: 8, position: "relative", zIndex: 20 }}>
        {booksLoading ? (
          <>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: TextColors.primary,
              }}
            >
              Book *
            </Text>
            <ActivityIndicator color={Interactive.primary.default} />
          </>
        ) : books.length === 0 ? (
          <>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: TextColors.primary,
              }}
            >
              Book *
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontStyle: "italic",
                padding: 16,
                textAlign: "center",
                color: TextColors.secondary,
              }}
              selectable
              accessibilityRole="text"
              accessibilityLabel="No books available"
            >
              No books available. Add a book to your wish list or start reading!
            </Text>
          </>
        ) : (
          <CustomDropdown
            label="Book *"
            value={selectedBookId ?? 0}
            onValueChange={(value) =>
              setSelectedBookId(value === 0 ? null : value)
            }
            options={[
              { label: "Select a book to log session", value: 0 },
              ...bookOptions,
            ]}
            error={validationErrors.bookId}
            accessibilityLabel="Select book"
            accessibilityHint="Choose a book from your wish list or currently reading"
          />
        )}
      </View>

      {/* Book Info */}
      {selectedBookId && detailsLoading && (
        <ActivityIndicator
          style={{ marginTop: -12 }}
          color={Interactive.primary.default}
        />
      )}
      {selectedBookId && !detailsLoading && bookDetails && (
        <View style={{ gap: 6 }}>
          <Text
            style={{
              fontSize: 14,
              marginLeft: 4,
              color: TextColors.secondary,
            }}
            selectable
            accessibilityRole="text"
          >
            Last page: {lastEnding}
            {totalPages ? ` / ${totalPages}` : ""}
          </Text>
          {endingPage &&
            !isNaN(Number(endingPage)) &&
            Number(endingPage) > 0 && (
              <Text
                style={{
                  fontSize: 14,
                  marginLeft: 4,
                  color: TextColors.secondary,
                  fontWeight: "500",
                }}
                selectable
              >
                Pages to read: {calculatePagesRead(Number(endingPage))}
              </Text>
            )}
        </View>
      )}

      {/* Ending Page Input */}
      <View style={{ gap: 8 }}>
        <Text
          style={{ fontSize: 16, fontWeight: "600", color: TextColors.primary }}
        >
          Ending Page *
        </Text>
        <TextInput
          style={{
            height: 50,
            borderWidth: 1.5,
            borderColor: validationErrors.endingPage
              ? Feedback.error.border
              : Border.default,
            borderRadius: 12,
            borderCurve: "continuous",
            paddingHorizontal: 16,
            fontSize: 16,
            backgroundColor: Background.surface,
            color: TextColors.primary,
          }}
          value={endingPage}
          onChangeText={setEndingPage}
          keyboardType="numeric"
          placeholder="Page where you stopped reading"
          placeholderTextColor={TextColors.tertiary}
          accessibilityLabel="Ending page"
          accessibilityHint="Enter the page number where you stopped reading"
          accessibilityRole="spinbutton"
        />
        {validationErrors.endingPage && (
          <Text
            style={{
              fontSize: 14,
              marginTop: -4,
              marginLeft: 4,
              color: Feedback.error.text,
            }}
            selectable
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {validationErrors.endingPage}
          </Text>
        )}
      </View>

      {/* Session Date */}
      <DatePicker
        value={sessionDate}
        onChange={setSessionDate}
        label="Reading Date *"
        maximumDate={new Date()}
        error={validationErrors.sessionDate}
        accessibilityHint="Select the date when this reading session occurred"
      />

      {/* Duration Input */}
      <View style={{ gap: 8 }}>
        <Text
          style={{ fontSize: 16, fontWeight: "600", color: TextColors.primary }}
        >
          Duration (optional)
        </Text>
        <TextInput
          style={{
            height: 50,
            borderWidth: 1.5,
            borderColor: validationErrors.duration
              ? Feedback.error.border
              : Border.default,
            borderRadius: 12,
            borderCurve: "continuous",
            paddingHorizontal: 16,
            fontSize: 16,
            backgroundColor: Background.surface,
            color: TextColors.primary,
          }}
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
          placeholder="Minutes, e.g., 45"
          placeholderTextColor={TextColors.tertiary}
          accessibilityLabel="Duration in minutes"
          accessibilityHint="Optional: Enter session duration in minutes"
          accessibilityRole="spinbutton"
        />
        <Text
          style={{
            fontSize: 14,
            marginTop: -4,
            marginLeft: 4,
            color: TextColors.secondary,
          }}
          selectable
        >
          Leave empty if not tracked
        </Text>
        {validationErrors.duration && (
          <Text
            style={{
              fontSize: 14,
              marginTop: -4,
              marginLeft: 4,
              color: Feedback.error.text,
            }}
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
        <View
          style={{
            padding: 16,
            backgroundColor: Feedback.success.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Feedback.success.border,
            borderCurve: "continuous",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              textAlign: "center",
              color: Feedback.success.text,
            }}
            selectable
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {successMessage}
          </Text>
        </View>
      )}

      {/* Error Message */}
      {errorMessage && (
        <View
          style={{
            padding: 16,
            backgroundColor: Feedback.error.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Feedback.error.border,
            borderCurve: "continuous",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              textAlign: "center",
              color: Feedback.error.text,
            }}
            selectable
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {errorMessage}
          </Text>
        </View>
      )}

      {/* Submit Button */}
      <Pressable
        onPress={handleSubmit}
        disabled={!isFormValid() || createSession.isPending}
        style={({ pressed }) => ({
          backgroundColor:
            !isFormValid() || createSession.isPending
              ? Interactive.primary.disabled
              : pressed
                ? Interactive.primary.pressed
                : Interactive.primary.default,
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderRadius: 12,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 12,
          minHeight: 56,
          opacity: !isFormValid() || createSession.isPending ? 0.7 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel="Log session"
        accessibilityHint="Submit the reading session"
        accessibilityState={{
          disabled: !isFormValid() || createSession.isPending,
        }}
      >
        {createSession.isPending ? (
          <ActivityIndicator size="small" color={Interactive.primary.text} />
        ) : (
          <Text
            style={{
              color: Interactive.primary.text,
              fontSize: 17,
              fontWeight: "600",
            }}
          >
            Log Session
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
