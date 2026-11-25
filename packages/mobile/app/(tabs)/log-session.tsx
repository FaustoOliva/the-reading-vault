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
 *
 * Layout:
 * - Wide screens keep the form on the left and reading context on the right
 * - Compact screens stack context under the header, as before
 */

import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { DatePicker } from "@/components/date-picker";
import { CustomDropdown } from "@/components/forms/customDropdown";
import { LastReadingSessionCard } from "@/components/lastReadingSessionCard";
import {
  FormSection,
  PageHeader,
  PageScroll,
  SectionHeading,
} from "@/components/ui/pageLayout";
import { useBooks, useBookDetails } from "@/hooks/useBooks";
import { useCreateReadingSession } from "@/hooks/useReadingSessions";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
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
  const { isSplitLayout } = useResponsiveLayout();

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
  const submitDisabled = !isFormValid() || createSession.isPending;

  const bookSelector = (
    <View style={{ gap: 8, position: "relative", zIndex: 20 }}>
      {booksLoading ? (
        <>
          <Text
            style={{
              fontSize: 15,
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
              fontSize: 15,
              fontWeight: "600",
              color: TextColors.primary,
            }}
          >
            Book *
          </Text>
          <Text
            style={{
              fontSize: 15,
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
  );

  const bookContextLine = (
    <>
      {selectedBookId && detailsLoading ? (
        <ActivityIndicator color={Interactive.primary.default} />
      ) : null}
      {selectedBookId && !detailsLoading && bookDetails ? (
        <View style={{ gap: 6 }}>
          <Text
            style={{
              fontSize: 14,
              color: TextColors.secondary,
              fontVariant: ["tabular-nums"],
            }}
            selectable
            accessibilityRole="text"
          >
            Last page: {lastEnding}
            {totalPages ? ` / ${totalPages}` : ""}
          </Text>
          {endingPage &&
          !isNaN(Number(endingPage)) &&
          Number(endingPage) > 0 ? (
            <Text
              style={{
                fontSize: 14,
                color: TextColors.secondary,
                fontWeight: "500",
                fontVariant: ["tabular-nums"],
              }}
              selectable
            >
              Pages to read: {calculatePagesRead(Number(endingPage))}
            </Text>
          ) : null}
        </View>
      ) : null}
    </>
  );

  const endingPageField = (
    <View style={{ gap: 8 }}>
      <Text
        style={{ fontSize: 15, fontWeight: "600", color: TextColors.primary }}
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
      {validationErrors.endingPage ? (
        <Text
          style={{
            fontSize: 14,
            color: Feedback.error.text,
          }}
          selectable
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {validationErrors.endingPage}
        </Text>
      ) : null}
    </View>
  );

  const durationField = (
    <View style={{ gap: 8 }}>
      <Text
        style={{ fontSize: 15, fontWeight: "600", color: TextColors.primary }}
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
      <Text style={{ fontSize: 13, color: TextColors.secondary }} selectable>
        Leave empty if not tracked
      </Text>
      {validationErrors.duration ? (
        <Text
          style={{
            fontSize: 14,
            color: Feedback.error.text,
          }}
          selectable
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {validationErrors.duration}
        </Text>
      ) : null}
    </View>
  );

  const feedbackMessages = (
    <>
      {successMessage ? (
        <View
          style={{
            padding: 16,
            backgroundColor: Feedback.success.background,
            borderRadius: 12,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: Feedback.success.border,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: Feedback.success.text,
            }}
            selectable
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {successMessage}
          </Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View
          style={{
            padding: 16,
            backgroundColor: Feedback.error.background,
            borderRadius: 12,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: Feedback.error.border,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: Feedback.error.text,
            }}
            selectable
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {errorMessage}
          </Text>
        </View>
      ) : null}
    </>
  );

  const submitButton = (
    <Pressable
      onPress={handleSubmit}
      disabled={submitDisabled}
      style={({ pressed }) => ({
        backgroundColor: submitDisabled
          ? Interactive.primary.disabled
          : pressed
            ? Interactive.primary.pressed
            : Interactive.primary.default,
        paddingVertical: 15,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderCurve: "continuous",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 52,
        flex: isSplitLayout ? undefined : 1,
        minWidth: isSplitLayout ? 260 : undefined,
        opacity: submitDisabled ? 0.7 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel="Log session"
      accessibilityHint="Submit the reading session"
      accessibilityState={{ disabled: submitDisabled }}
    >
      {createSession.isPending ? (
        <ActivityIndicator size="small" color={Interactive.primary.text} />
      ) : (
        <Text
          style={{
            color: Interactive.primary.text,
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          Log Session
        </Text>
      )}
    </Pressable>
  );

  const contextPanel = (
    <View style={{ flex: 1, gap: 20 }}>
      <LastReadingSessionCard />

      <View
        style={{
          backgroundColor: Background.surface,
          borderWidth: 1,
          borderColor: Border.default,
          borderRadius: 14,
          borderCurve: "continuous",
          padding: 18,
          gap: 12,
        }}
      >
        <SectionHeading title="Session preview" />
        {selectedBookId && bookDetails ? (
          <View style={{ gap: 10 }}>
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 12, color: TextColors.tertiary }}>
                Book
              </Text>
              <Text
                selectable
                numberOfLines={2}
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: TextColors.primary,
                }}
              >
                {bookDetails.book.title}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 24 }}>
              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 12, color: TextColors.tertiary }}>
                  Last page
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: TextColors.primary,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {lastEnding}
                  {totalPages ? ` / ${totalPages}` : ""}
                </Text>
              </View>

              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 12, color: TextColors.tertiary }}>
                  Pages this session
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: TextColors.primary,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {endingPage && !isNaN(Number(endingPage))
                    ? calculatePagesRead(Number(endingPage))
                    : "—"}
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 13,
                lineHeight: 19,
                color: TextColors.secondary,
              }}
            >
              Pages are calculated from the ending page minus your last recorded
              page in this cycle.
            </Text>
          </View>
        ) : (
          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: TextColors.secondary,
            }}
          >
            Select a book to preview how this session will be recorded.
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <PageScroll gap={28}>
      <PageHeader
        eyebrow="Reading log"
        title="Log a session"
        subtitle="Track your reading progress by logging completed sessions for books in your wish list or currently reading."
      />

      <View
        style={{
          flexDirection: isSplitLayout ? "row" : "column",
          alignItems: "flex-start",
          gap: 28,
        }}
      >
        <View
          style={{
            flex: isSplitLayout ? 1.4 : undefined,
            width: isSplitLayout ? undefined : "100%",
            gap: 20,
          }}
        >
          {isSplitLayout ? null : <LastReadingSessionCard />}

          <FormSection
            title="Session"
            caption="One session per reading sitting."
            bordered={isSplitLayout}
          >
            {bookSelector}
            {bookContextLine}
            {endingPageField}
            <DatePicker
              value={sessionDate}
              onChange={setSessionDate}
              label="Reading Date *"
              maximumDate={new Date()}
              error={validationErrors.sessionDate}
              accessibilityHint="Select the date when this reading session occurred"
            />
            {durationField}
          </FormSection>

          {feedbackMessages}

          <View
            style={{
              flexDirection: "row",
              justifyContent: isSplitLayout ? "flex-end" : "flex-start",
            }}
          >
            {submitButton}
          </View>
        </View>

        {isSplitLayout ? contextPanel : null}
      </View>
    </PageScroll>
  );
}
