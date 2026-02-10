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

import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useBookDetails } from '@/hooks/useBooks';
import { BookInfoCard } from '@/components/bookInfoCard';
import { CurrentCycleStatsCard } from '@/components/currentCycleStatsCard';
import { ReadingCyclesHistoryCard } from '@/components/readingCyclesHistoryCard';
import {
  Background,
  Text as TextColors,
  Feedback,
} from '@/constants/colors';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookId = parseInt(id, 10);

  console.log('📖 BookDetailScreen render:', { id, bookId });

  const {
    data: bookDetails,
    isLoading,
    error,
  } = useBookDetails(bookId);

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

        {/* Current Cycle Statistics */}
        <CurrentCycleStatsCard stats={current_cycle_stats} />

        {/* Reading Cycles History */}
        <ReadingCyclesHistoryCard cycles={reading_cycles ?? []} />
      </ScrollView>
    </>
  );
}
