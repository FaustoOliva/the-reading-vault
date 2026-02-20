/**
 * Book Detail Screen
 * Displays comprehensive information about a single book
 * 
 * Sections:
 * - Basic book info (title, author, ISBN, pages, status, score, comment)
 * - Current cycle statistics (sessions, velocity, estimated completion)
 * - Reading cycles history
 * 
 * Rules:
 * - Use ScrollView with contentContainerStyle for padding
 * - Use contentInsetAdjustmentBehavior for safe areas
 * - Use cards (containers) for each section
 * - Handle loading/error/empty states properly
 */

import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useBookDetails, useReopenBook, useRequestReview } from '@/hooks/useBooks';
import { BookInfoCard } from '@/components/bookInfoCard';
import { CurrentCycleStatsCard } from '@/components/currentCycleStatsCard';
import { ReadingCyclesHistoryCard } from '@/components/readingCyclesHistoryCard';
import { ReviewBookModal } from '@/components/reviewBookModal';
import { EditBookModal } from '@/components/editBookModal';
import { BookStatus } from '@/types/book';
import {
  Background,
  Text as TextColors,
  Feedback,
  Interactive,
  Border,
} from '@/constants/colors';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookId = parseInt(id, 10);

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  console.log('📖 BookDetailScreen render:', { id, bookId });

  const {
    data: bookDetails,
    isLoading,
    error,
  } = useBookDetails(bookId);

  const reopenMutation = useReopenBook();
  const requestReviewMutation = useRequestReview();

  console.log('📊 Query state:', {
    isLoading,
    hasError: !!error,
    errorMessage: error?.message,
    hasData: !!bookDetails,
  });

  /**
   * Loading State
   */
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Background.primary,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color={Feedback.info.text} />
        <Text
          style={{
            marginTop: 12,
            fontSize: 14,
            color: TextColors.secondary,
          }}
        >
          Loading book details...
        </Text>
      </View>
    );
  }

  /**
   * Error State
   */
  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Background.primary,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <Stack.Screen options={{ title: 'Error' }} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: Feedback.error.text,
            marginBottom: 8,
          }}
        >
          ❌ Error Loading Book
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: TextColors.secondary,
            textAlign: 'center',
          }}
          selectable
        >
          {error.message}
        </Text>
      </View>
    );
  }

  /**
   * Empty State
   */
  if (!bookDetails) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Background.primary,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Stack.Screen options={{ title: 'Not Found' }} />
        <Text
          style={{
            fontSize: 16,
            color: TextColors.secondary,
          }}
        >
          Book not found
        </Text>
      </View>
    );
  }

  const { book, current_cycle_stats, reading_cycles } = bookDetails;

  const handleReopen = () => {
    Alert.alert(
      'Reopen Book',
      `Do you want to reopen "${book.title}"? This will start a new reading cycle.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen',
          style: 'default',
          onPress: () => {
            reopenMutation.mutate(book.id);
          },
        },
      ]
    );
  };

  const handleRequestReview = () => {
    Alert.alert(
      'Request Review',
      `Do you want to mark "${book.title}" for review? This will allow you to score and complete or abandon the book.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Review',
          style: 'default',
          onPress: () => {
            requestReviewMutation.mutate(book.id, {
              onSuccess: () => {
                // Automatically open review modal after transition
                setReviewModalVisible(true);
              },
            });
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: book?.title ?? 'Book Details' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: Background.primary }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Book Information */}
        <BookInfoCard book={book} />

        {/* Action Buttons */}
        <View style={{ gap: 12 }}>
          {/* Review Button - Only for PENDING_SCORE */}
          {book.status === BookStatus.PENDING_SCORE && (
            <Pressable
              onPress={() => setReviewModalVisible(true)}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? Interactive.primary.pressed
                  : Interactive.primary.default,
                padding: 16,
                borderRadius: 8,
                borderCurve: 'continuous',
                alignItems: 'center',
              })}
            >
              <Text
                style={{
                  color: Interactive.primary.text,
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                📝 Review Book (Score Required)
              </Text>
            </Pressable>
          )}

          {/* Request Review Button - Only for READING */}
          {book.status === BookStatus.READING && (
            <Pressable
              onPress={handleRequestReview}
              disabled={requestReviewMutation.isPending}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? Interactive.secondary.pressed
                  : Interactive.secondary.default,
                padding: 16,
                borderRadius: 8,
                borderCurve: 'continuous',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: Interactive.secondary.border,
                opacity: requestReviewMutation.isPending ? 0.5 : 1,
              })}
            >
              <Text
                style={{
                  color: Interactive.secondary.text,
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                🏁 Finish & Review Book
              </Text>
            </Pressable>
          )}

          {/* Edit Button - All statuses except ABANDONED */}
          {book.status !== BookStatus.ABANDONED && (
            <Pressable
              onPress={() => setEditModalVisible(true)}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? Interactive.secondary.pressed
                  : Interactive.secondary.default,
                padding: 16,
                borderRadius: 8,
                borderCurve: 'continuous',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: Interactive.secondary.border,
              })}
            >
              <Text
                style={{
                  color: Interactive.secondary.text,
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                ✏️ Edit Book Metadata
              </Text>
            </Pressable>
          )}

          {/* Reopen Button - Only for ABANDONED */}
          {book.status === BookStatus.ABANDONED && (
            <Pressable
              onPress={handleReopen}
              disabled={reopenMutation.isPending}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? Interactive.primary.pressed
                  : Interactive.primary.default,
                padding: 16,
                borderRadius: 8,
                borderCurve: 'continuous',
                alignItems: 'center',
                opacity: reopenMutation.isPending ? 0.5 : 1,
              })}
            >
              <Text
                style={{
                  color: Interactive.primary.text,
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                🔄 Reopen Book (New Cycle)
              </Text>
            </Pressable>
          )}
        </View>

        {/* Current Cycle Statistics */}
        <CurrentCycleStatsCard stats={current_cycle_stats} />

        {/* Reading Cycles History */}
        <ReadingCyclesHistoryCard cycles={reading_cycles ?? []} />
      </ScrollView>

      {/* Review Modal */}
      <ReviewBookModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        bookId={book.id}
        bookTitle={book.title}
        totalPages={book.total_pages}
        pagesReadInCycle={book.pages_read_in_current_cycle}
      />

      {/* Edit Modal */}
      <EditBookModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        book={{
          id: book.id,
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          totalPages: book.total_pages,
          status: book.status,
          currentReadingCycle: book.current_reading_cycle,
          score: book.score,
          comment: book.comment,
        }}
      />
    </>
  );
}
