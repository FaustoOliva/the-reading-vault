/**
 * Log Reading Session Screen
 * Form to create reading sessions for books in READING status
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useBooks, useBookDetails } from '@/hooks/useBooks';
import { useCreateReadingSession } from '@/hooks/useReadingSessions';
import { BookStatus } from '@/types/book';
import { 
  Interactive, 
  Background, 
  Text as TextColors,
  Border,
  Feedback 
} from '@/constants/colors';

export default function LogSessionScreen() {

  // Form state
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [pagesRead, setPagesRead] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [duration, setDuration] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch books in READING status
  const { data: booksResponse, isLoading: booksLoading } = useBooks({
    status: BookStatus.READING,
  });

  // Fetch selected book details
  const { data: bookDetails, isLoading: detailsLoading } = useBookDetails(
    selectedBookId ?? 0,
    { enabled: !!selectedBookId }
  );

  // Create session mutation
  const createSession = useCreateReadingSession();

  const books = booksResponse?.data ?? [];

  // Calculate pages read in current cycle
  const calculatePagesReadInCycle = (): number => {
    if (!bookDetails) return 0;

    const currentCycle = bookDetails.currentReadingCycle;
    const sessionsInCycle = bookDetails.readingSessions.filter(
      (session) => session.readingCycle === currentCycle
    );

    return sessionsInCycle.reduce((sum, session) => sum + session.pagesRead, 0);
  };

  // Calculate remaining pages
  const getRemainingPages = (): number | null => {
    if (!bookDetails?.totalPages) return null;
    const pagesReadInCycle = calculatePagesReadInCycle();
    return bookDetails.totalPages - pagesReadInCycle;
  };

  // Validation
  const validatePagesRead = (): string | null => {
    const pages = parseInt(pagesRead, 10);

    if (!pagesRead || isNaN(pages)) {
      return 'Pages read is required';
    }

    if (pages <= 0) {
      return 'Pages must be greater than zero';
    }

    const remaining = getRemainingPages();
    if (remaining !== null && pages > remaining) {
      return `Cannot exceed ${remaining} remaining pages`;
    }

    return null;
  };

  const validateDuration = (): string | null => {
    if (!duration) return null; // Optional field

    const mins = parseInt(duration, 10);
    if (isNaN(mins) || mins < 0) {
      return 'Duration must be a positive number';
    }

    return null;
  };

  const validateSessionDate = (): string | null => {
    const now = new Date();
    if (sessionDate > now) {
      return 'Session date cannot be in the future';
    }
    return null;
  };

  const isFormValid = (): boolean => {
    return (
      selectedBookId !== null &&
      !validatePagesRead() &&
      !validateDuration() &&
      !validateSessionDate()
    );
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid() || !selectedBookId) return;

    setErrorMessage('');
    setSuccessMessage('');

    try {
      await createSession.mutateAsync({
        bookId: selectedBookId,
        pagesRead: parseInt(pagesRead, 10),
        occurredAt: sessionDate.toISOString(),
        duration: duration ? parseInt(duration, 10) : undefined,
      });

      // Success feedback
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setSuccessMessage('Session logged successfully!');

      // Clear form
      setSelectedBookId(null);
      setPagesRead('');
      setDuration('');
      setSessionDate(new Date());

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      // Error feedback
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      // Parse error message
      if (error.message?.includes('BookNotFoundError')) {
        setErrorMessage('Book not found. Please refresh the list.');
      } else if (error.message?.includes('BookClosedError')) {
        setErrorMessage('This book is abandoned. Reopen it to log sessions.');
      } else if (error.message?.includes('InvalidStateTransitionError')) {
        setErrorMessage('Invalid operation. Please refresh and try again.');
      } else {
        setErrorMessage('Failed to log session. Please try again.');
      }
    }
  };

  const pagesError = pagesRead ? validatePagesRead() : null;
  const durationError = duration ? validateDuration() : null;
  const dateError = validateSessionDate();

  const remaining = getRemainingPages();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: Background.primary }}
      contentContainerStyle={styles.scrollContent}>
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
              accessibilityLabel="No books available">
              No books in progress. Start a book first!
            </Text>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedBookId}
                onValueChange={(value) => setSelectedBookId(value)}
                style={styles.picker}
                accessibilityLabel="Select book"
                accessibilityHint="Choose a book you're currently reading">
                <Picker.Item label="Select a book you're reading" value={null} />
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
          <ActivityIndicator style={styles.loader} color={Interactive.primary.default} />
        )}
        {selectedBookId && !detailsLoading && bookDetails && (
          <Text
            style={styles.pagesInfo}
            selectable
            accessibilityRole="text">
            {remaining !== null
              ? `Remaining: ${remaining} pages`
              : 'No page limit (legacy book)'}
          </Text>
        )}

        {/* Pages Read Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Pages Read *</Text>
          <TextInput
            style={[
              styles.input,
              pagesError && styles.inputError,
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
          {pagesError && (
            <Text
              style={styles.error}
              selectable
              accessibilityRole="alert"
              accessibilityLiveRegion="polite">
              {pagesError}
            </Text>
          )}
        </View>

        {/* Session Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Session Date *</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[
              styles.dateButton,
              dateError && styles.dateButtonError,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Session date: ${sessionDate.toLocaleDateString()}`}
            accessibilityHint="Tap to change session date">
            <Text style={styles.dateButtonText}>
              {sessionDate.toLocaleDateString()}
            </Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={sessionDate}
              mode="date"
              display="default"
              onChange={(_event: any, date?: Date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setSessionDate(date);
              }}
              maximumDate={new Date()}
            />
          )}
          {dateError && (
            <Text
              style={styles.error}
              selectable
              accessibilityRole="alert"
              accessibilityLiveRegion="polite">
              {dateError}
            </Text>
          )}
        </View>

        {/* Duration Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Duration (optional)</Text>
          <TextInput
            style={[
              styles.input,
              durationError && styles.inputError,
            ]}
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
            style={styles.helperText}
            selectable>
            Leave empty if not tracked
          </Text>
          {durationError && (
            <Text
              style={styles.error}
              selectable
              accessibilityRole="alert"
              accessibilityLiveRegion="polite">
              {durationError}
            </Text>
          )}
        </View>

        {/* Success Message */}
        {successMessage && (
          <Text
            style={styles.success}
            selectable
            accessibilityRole="alert"
            accessibilityLiveRegion="polite">
            {successMessage}
          </Text>
        )}

        {/* Error Message */}
        {errorMessage && (
          <Text
            style={styles.errorMessage}
            selectable
            accessibilityRole="alert"
            accessibilityLiveRegion="polite">
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
          }}>
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
    fontWeight: 'bold',
    marginBottom: 8,
    color: TextColors.primary,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: TextColors.primary,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Border.default,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: Background.surface,
    overflow: 'hidden',
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
    borderCurve: 'continuous',
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
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    justifyContent: 'center',
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
    fontStyle: 'italic',
    padding: 16,
    textAlign: 'center',
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
    fontWeight: '600',
    textAlign: 'center',
    padding: 12,
    color: Feedback.success.text,
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: Interactive.primary.text,
    fontSize: 18,
    fontWeight: '600',
  },
  loader: {
    marginTop: -12,
  },
});
