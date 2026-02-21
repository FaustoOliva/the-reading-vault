/**
 * Book Detail Screen
 * Displays comprehensive information about a single book
 * 
 * Structure:
 * - Hero: Book metadata + action buttons inline
 * - Reading Progress: Visual charts + current cycle stats
 * - Reading Cycles: Current cycle expanded, previous collapsed
 * 
 * Rules:
 * - Use ScrollView with contentContainerStyle for padding
 * - Use contentInsetAdjustmentBehavior for safe areas
 * - Use cards (containers) for each section
 * - Handle loading/error/empty states properly
 */

import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useBookDetails, useReopenBook, useRequestReview } from '@/hooks/useBooks';
import { BookDetailHero } from '@/components/bookDetailHero';
import { ReadingProgressCard } from '@/components/readingProgressCard';
import { ReadingCyclesHistoryCard } from '@/components/readingCyclesHistoryCard';
import { ReviewBookModal } from '@/components/reviewBookModal';
import { EditBookModal } from '@/components/editBookModal';
import { BookStatus } from '@/types/book';
import {
  Background,
  Text as TextColors,
  Feedback,
} from '@/constants/colors';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookId = parseInt(id, 10);

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const {
    data: bookDetails,
    isLoading,
    error,
  } = useBookDetails(bookId);

  const reopenMutation = useReopenBook();
  const requestReviewMutation = useRequestReview();

  const isActionPending = reopenMutation.isPending || requestReviewMutation.isPending;

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

  /**
   * Action Handlers
   */
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
        {/* Hero Section: Book metadata + action buttons */}
        <BookDetailHero
          book={book}
          onEdit={() => setEditModalVisible(true)}
          onReview={() => setReviewModalVisible(true)}
          onRequestReview={handleRequestReview}
          onReopen={handleReopen}
          isActionPending={isActionPending}
        />

        {/* Reading Progress: Visual charts + current cycle stats */}
        {book.status !== BookStatus.WISH_LIST && (
          <ReadingProgressCard
            stats={current_cycle_stats}
            totalPages={book.total_pages}
            pagesReadInCycle={book.pages_read_in_current_cycle}
            bookStatus={book.status}
          />
        )}

        {/* Reading Cycles: Current expanded, previous collapsed */}
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
