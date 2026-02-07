/**
 * Books List Screen
 * Main screen displaying all books with filtering and pagination
 * 
 * Features:
 * - Status filter (dropdown)
 * - Pagination (prev/next buttons)
 * - Pull-to-refresh
 * - Loading/error/empty states
 * 
 * Rules:
 * - Use FlatList for performance
 * - Use contentContainerStyle for padding (not style)
 * - Use contentInsetAdjustmentBehavior for safe areas
 * - Use RefreshControl for pull-to-refresh
 */

import { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useBooks } from '@/hooks/useBooks';
import { BookListItem } from '@/components/bookListItem';
import { PaginationControls } from '@/components/paginationControls';
import { BookStatus, BooksFilter } from '@/types/book';
import { BOOK_STATUS_OPTIONS } from '@/constants/bookStatus';
import { api } from '@/services/api';
import {
  Background,
  Text as TextColors,
  Border,
  Interactive,
  Feedback,
} from '@/constants/colors';

const ITEMS_PER_PAGE = 10;

export default function BooksListScreen() {
  const [filters, setFilters] = useState<BooksFilter>({});
  const [page, setPage] = useState(1);

  console.log('🏠 BooksListScreen render:', { filters, page });

  const {
    data: response,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useBooks(filters, { page, limit: ITEMS_PER_PAGE });

  console.log('📊 Query state:', {
    isLoading,
    isRefetching,
    hasError: !!error,
    errorMessage: error?.message,
    hasData: !!response,
    booksCount: response?.data?.length,
  });

  const books = response?.data || [];
  const pagination = response?.pagination;

  /**
   * Render debug info
   */
  const DebugInfo = () => (
    <View
      style={{
        padding: 12,
        backgroundColor: Feedback.warning.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Feedback.warning.border,
        gap: 4,
        marginBottom: 12,
        borderCurve: 'continuous',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: Feedback.warning.text }}>
        🐛 Debug Info
      </Text>
      <Text style={{ fontSize: 11, color: Feedback.warning.text, fontFamily: 'monospace' }} selectable>
        API URL: {api.baseUrl}
      </Text>
      <Text style={{ fontSize: 11, color: Feedback.warning.text, fontFamily: 'monospace' }} selectable>
        Endpoint: /api/books?page={page}&limit={ITEMS_PER_PAGE}
      </Text>
      <Text style={{ fontSize: 11, color: Feedback.warning.text }}>
        Status: {isLoading ? '⏳ Loading...' : error ? '❌ Error' : '✅ Success'}
      </Text>
      {error && (
        <Text style={{ fontSize: 11, color: Feedback.error.text }} selectable>
          Error: {error.message}
        </Text>
      )}
    </View>
  );

  /**
   * Handle status filter change
   */
  const handleStatusChange = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: status ? (status as BookStatus) : undefined,
    }));
    setPage(1); // Reset to first page when filter changes
  };

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = () => {
    refetch();
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Background.primary, padding: 16 }}>
        <DebugInfo />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Interactive.primary.default} />
          <Text style={{ marginTop: 12, fontSize: 15, color: TextColors.secondary }}>
            Loading books...
          </Text>
        </View>
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <FlatList
        data={[]}
        renderItem={() => null}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: Background.primary }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <>
            <DebugInfo />
            <View
              style={{
                padding: 16,
                backgroundColor: Feedback.error.background,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: Feedback.error.border,
                gap: 8,
                borderCurve: 'continuous',
              }}
            >
            <Text
              style={{
                fontSize: 17,
                fontWeight: '600',
                color: Feedback.error.text,
              }}
            >
              Error Loading Books
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: Feedback.error.text,
              }}
              selectable
            >
              {error.message || 'An unexpected error occurred'}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: Feedback.error.text,
                marginTop: 4,
              }}
            >
              Pull down to retry
            </Text>
          </View>
          </>
        }
      />
    );
  }

  /**
   * Render empty state
   */
  if (books.length === 0) {
    return (
      <FlatList
        data={[]}
        renderItem={() => null}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: Background.primary }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <>
            <DebugInfo />
            {/* Filter Section */}
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: TextColors.primary,
                }}
              >
                Filter by Status
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: Border.default,
                  borderRadius: 8,
                  backgroundColor: Background.surface,
                  overflow: 'hidden',
                  borderCurve: 'continuous',
                }}
              >
                <Picker
                  selectedValue={filters.status || ''}
                  onValueChange={handleStatusChange}
                >
                  {BOOK_STATUS_OPTIONS.map((option) => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Empty State */}
            <View
              style={{
                padding: 32,
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 64,
                  marginBottom: 8,
                }}
              >
                📚
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: TextColors.primary,
                  textAlign: 'center',
                }}
              >
                No books found
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: TextColors.secondary,
                  textAlign: 'center',
                  lineHeight: 22,
                }}
              >
                {filters.status
                  ? 'Try changing the filter or add a new book'
                  : 'Add your first book to get started'}
              </Text>
            </View>
          </>
        }
      />
    );
  }

  /**
   * Render books list
   */
  return (
    <FlatList
      data={books}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <BookListItem book={item} />}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: Background.primary }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
      }
      ListHeaderComponent={
        <>
          <DebugInfo />
          <View style={{ gap: 6, marginBottom: 12 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: TextColors.primary,
            }}
          >
            Filter by Status
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: Border.default,
              borderRadius: 8,
              backgroundColor: Background.surface,
              overflow: 'hidden',
              borderCurve: 'continuous',
            }}
          >
            <Picker
              selectedValue={filters.status || ''}
              onValueChange={handleStatusChange}
            >
              {BOOK_STATUS_OPTIONS.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
          </View>
        </>
      }
      ListFooterComponent={
        pagination && pagination.totalPages > 1 ? (
          <PaginationControls
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            onPageChange={handlePageChange}
          />
        ) : null
      }
    />
  );
}