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

import { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import {
  useBookDetails,
  useReopenBook,
  useRequestReview,
} from "@/hooks/useBooks";
import { BookDetailHero } from "@/components/ui/bookDetailHero";
import { ReadingProgressCard } from "@/components/cards/readingProgressCard";
import { ReadingCyclesHistoryCard } from "@/components/cards/readingCyclesHistoryCard";
import { ReviewCard } from "@/components/cards/reviewCard";
import { BookDetailsCard } from "@/components/cards/bookDetailsCard";
import { ReviewBookModal } from "@/components/modals/reviewBookModal";
import { EditBookModal } from "@/components/modals/editBookModal";
import { SkeletonBookDetail } from "@/components/ui/skeletonBookDetail";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { BookStatus } from "@/types/book";
import { Background, Text as TextColors, Feedback } from "@/constants/colors";

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookId = parseInt(id, 10);

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "reopen" | "requestReview" | null
  >(null);

  const {
    data: bookDetails,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useBookDetails(bookId);

  const reopenMutation = useReopenBook();
  const requestReviewMutation = useRequestReview();

  const isActionPending =
    reopenMutation.isPending || requestReviewMutation.isPending;

  // Auto-open review modal after successful request-review transition
  useEffect(() => {
    if (
      requestReviewMutation.isSuccess &&
      bookDetails?.book.status === "PENDING_SCORE"
    ) {
      setReviewModalVisible(true);
      // Reset mutation state so it doesn't auto-open again
      requestReviewMutation.reset();
    }
  }, [requestReviewMutation.isSuccess, bookDetails?.book.status]);

  if (__DEV__) {
    console.log("📊 Query state:", {
      isLoading,
      hasError: !!error,
      errorMessage: error?.message,
      hasData: !!bookDetails,
    });
  }

  /**
   * Loading State - Show skeleton
   */
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Loading..." }} />
        <SkeletonBookDetail />
      </>
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
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Stack.Screen options={{ title: "Error" }} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
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
            textAlign: "center",
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
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Stack.Screen options={{ title: "Not Found" }} />
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
  const hasMultipleCycles = (reading_cycles?.length ?? 0) > 1;
  const shouldShowReview =
    book.status === BookStatus.PENDING_SCORE ||
    book.status === BookStatus.COMPLETED ||
    book.status === BookStatus.ABANDONED ||
    book.score !== null ||
    !!book.comment;

  /**
   * Action Handlers
   */
  const handleReopen = () => {
    setConfirmAction("reopen");
  };

  const handleRequestReview = () => {
    setConfirmAction("requestReview");
  };

  return (
    <>
      <Stack.Screen options={{ title: book?.title ?? "Book Details" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: Background.primary }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
          />
        }
        contentContainerStyle={{ padding: 16, gap: 20 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Title + status context */}
        <BookDetailHero
          book={book}
          onReview={() => setReviewModalVisible(true)}
          onRequestReview={handleRequestReview}
          onReopen={handleReopen}
          isActionPending={isActionPending}
        />

        {/* Reading Progress */}
        {book.status !== BookStatus.WISH_LIST && (
          <ReadingProgressCard
            stats={current_cycle_stats}
            totalPages={book.total_pages}
            pagesReadInCycle={book.pages_read_in_current_cycle}
            bookStatus={book.status}
          />
        )}

        {/* Review */}
        {shouldShowReview && (
          <ReviewCard score={book.score} comment={book.comment} />
        )}

        {/* Reading Cycles (only useful when there is history) */}
        {hasMultipleCycles && (
          <ReadingCyclesHistoryCard cycles={reading_cycles ?? []} />
        )}

        {/* Book Details */}
        <BookDetailsCard
          book={book}
          onEdit={() => setEditModalVisible(true)}
          isActionPending={isActionPending}
        />
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
          bookType: book.bookType,
          genres: book.genres,
          synopsis: book.synopsis,
          totalPages: book.total_pages,
          publicationYear: book.publicationYear,
          status: book.status,
          currentReadingCycle: book.current_reading_cycle,
          score: book.score,
          comment: book.comment,
        }}
      />

      {/* Confirm Dialog (cross-platform; Alert.alert is a no-op on web) */}
      <ConfirmDialog
        visible={confirmAction !== null}
        title={
          confirmAction === "requestReview" ? "Request Review" : "Reopen Book"
        }
        message={
          confirmAction === "requestReview"
            ? `Do you want to mark "${book.title}" for review? This will allow you to score and complete or abandon the book.`
            : `Do you want to reopen "${book.title}"? This will start a new reading cycle.`
        }
        confirmLabel={
          confirmAction === "requestReview" ? "Request Review" : "Reopen"
        }
        onConfirm={() => {
          if (confirmAction === "requestReview") {
            requestReviewMutation.mutate(book.id);
          } else if (confirmAction === "reopen") {
            reopenMutation.mutate(book.id);
          }
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}
