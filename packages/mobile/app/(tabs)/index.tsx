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

import { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useBooks } from '@/hooks/useBooks';
import { BookListItem } from '@/components/list/bookListItem';
import { LoadMoreButton } from '@/components/list/loadMoreButton';
import { SearchBar } from '@/components/forms/searchBar';
import { AdvancedFiltersModal } from '@/components/modals/advancedFiltersModal';
import { BookStatus, BooksFilter, Book } from '@/types/book';
import { BOOK_STATUS_OPTIONS } from '@/constants/bookStatus';
import {
  Background,
  Text as TextColors,
  Border,
  Interactive,
  Feedback,
} from '@/constants/colors';

const ITEMS_PER_PAGE = 100;
const AUTO_LOAD_THRESHOLD = 50;

export default function BooksListScreen() {
  const [filters, setFilters] = useState<BooksFilter>({});
  const [page, setPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [accumulatedBooks, setAccumulatedBooks] = useState<Book[]>([]);

  if (__DEV__) {
    console.log('🏠 BooksListScreen render:', { filters, page, accumulatedBooksCount: accumulatedBooks.length });
  }

  const {
    data: response,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useBooks(filters, { page, limit: ITEMS_PER_PAGE });

  if (__DEV__) {
    console.log('📊 Query state:', {
      isLoading,
      isRefetching,
      hasError: !!error,
      errorMessage: error?.message,
      hasData: !!response,
      booksCount: response?.data?.length,
      totalBooks: response?.pagination?.total,
    });
  }

  const currentPageBooks = response?.data || [];
  const pagination = response?.pagination;

  /**
   * Reset accumulated books when filters change or on initial load
   */
  useEffect(() => {
    if (page === 1 && currentPageBooks.length > 0) {
      if (__DEV__) {
        console.log('🔄 Resetting accumulated books (page 1)');
      }
      setAccumulatedBooks(currentPageBooks);
    }
  }, [page, currentPageBooks.length > 0 ? currentPageBooks[0]?.id : null]);

  /**
   * Accumulate books when loading more pages
   */
  useEffect(() => {
    if (page > 1 && currentPageBooks.length > 0) {
      if (__DEV__) {
        console.log('➕ Adding books to accumulated list (page', page, ')');
      }
      setAccumulatedBooks((prev) => {
        // Avoid duplicates
        const newBooks = currentPageBooks.filter(
          (newBook: Book) => !prev.some((existingBook) => existingBook.id === newBook.id)
        );
        return [...prev, ...newBooks];
      });
    }
  }, [page, currentPageBooks.length]);

  /**
   * Auto-load all books if total is below threshold
   */
  useEffect(() => {
    if (
      pagination &&
      pagination.total <= AUTO_LOAD_THRESHOLD &&
      pagination.total > accumulatedBooks.length &&
      !isLoading &&
      !isRefetching
    ) {
      if (__DEV__) {
        console.log('🚀 Auto-loading all books (total:', pagination.total, ')');
      }
      // Load all remaining pages
      const totalPages = pagination.totalPages;
      if (page < totalPages) {
        setPage(page + 1);
      }
    }
  }, [pagination?.total, pagination?.totalPages, accumulatedBooks.length, isLoading, isRefetching, page]);

  /**
   * Determine which books to display
   * - Use accumulated books if we have multiple pages loaded
   * - Use current page books on initial load
   */
  const displayedBooks = useMemo(() => {
    if (page > 1 || accumulatedBooks.length > 0) {
      return accumulatedBooks;
    }
    return currentPageBooks;
  }, [page, accumulatedBooks, currentPageBooks]);

  /**
   * Handle status filter change
   */
  const handleStatusChange = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: status ? (status as BookStatus) : undefined,
    }));
    setPage(1); // Reset to first page when filter changes
    setAccumulatedBooks([]); // Clear accumulated books
  };

  /**
   * Handle search query change
   * Requires minimum 3 characters to trigger search
   */
  const handleSearchChange = (searchText: string) => {
    // Only apply search if 3+ characters or empty (to clear)
    const shouldSearch = searchText.length === 0 || searchText.length >= 3;
    
    if (shouldSearch) {
      setFilters((prev) => ({
        ...prev,
        titleSearch: searchText || undefined,
      }));
      setPage(1); // Reset to first page when search changes
      setAccumulatedBooks([]); // Clear accumulated books
    }
  };

  /**
   * Handle advanced filters apply
   */
  const handleAdvancedFiltersApply = (newFilters: BooksFilter) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
    setAccumulatedBooks([]); // Clear accumulated books
  };

  /**
   * Count active filters (excluding status and titleSearch which have their own UI)
   */
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.countryId) count++;
    if (filters.authorId) count++;
    if (filters.minScore !== undefined) count++;
    if (filters.maxScore !== undefined) count++;
    if (filters.minPages !== undefined) count++;
    if (filters.maxPages !== undefined) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  /**
   * Handle Load More button press
   */
  const handleLoadMore = () => {
    if (pagination && page < pagination.totalPages) {
      if (__DEV__) {
        console.log('📄 Loading next page:', page + 1);
      }
      setPage(page + 1);
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = () => {
    if (__DEV__) {
      console.log('🔄 Refreshing books list');
    }
    setPage(1);
    setAccumulatedBooks([]);
    refetch();
  };

  /**
   * Render loading state (only on initial load)
   * Don't show full-screen spinner when refetching with existing data
   */
  if (isLoading && displayedBooks.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: Background.primary, padding: 16 }}>
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
  if (displayedBooks.length === 0) {
    return (
      <>
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
              {/* Search Bar */}
              <SearchBar
                value={filters.titleSearch || ''}
                onChange={handleSearchChange}
                placeholder="Search books by title..."
              />

              {/* Filter Controls */}
              <View style={{ gap: 12, marginBottom: 12 }}>
                {/* Status Filter */}
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

                {/* Advanced Filters Button */}
                <Pressable
                  onPress={() => setShowAdvancedFilters(true)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: pressed
                      ? Interactive.secondary.pressed
                      : Interactive.secondary.default,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: Border.default,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    gap: 8,
                  })}
                >
                  <Text style={{ fontSize: 20 }}>⚙️</Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: TextColors.primary,
                    }}
                  >
                    Advanced Filters
                    {activeFiltersCount > 0 && ` (${activeFiltersCount})`}
                  </Text>
                </Pressable>
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
                  {filters.status || filters.titleSearch || activeFiltersCount > 0
                    ? 'Try changing the filters or add a new book'
                    : 'Add your first book to get started'}
                </Text>
              </View>
            </>
          }
        />

        {/* Advanced Filters Modal */}
        <AdvancedFiltersModal
          visible={showAdvancedFilters}
          filters={filters}
          onClose={() => setShowAdvancedFilters(false)}
          onApply={handleAdvancedFiltersApply}
        />
      </>
    );
  }

  /**
   * Render books list
   */
  return (
    <>
      <FlatList
        data={displayedBooks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <BookListItem book={item} />}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: Background.primary }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching && page === 1} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <>
            {/* Search Bar */}
            <SearchBar
              value={filters.titleSearch || ''}
              onChange={handleSearchChange}
              placeholder="Search books by title..."
            />

            {/* Filter Controls */}
            <View style={{ gap: 12, marginBottom: 12 }}>
              {/* Status Filter */}
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

              {/* Advanced Filters Button */}
              <Pressable
                onPress={() => setShowAdvancedFilters(true)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed
                    ? Interactive.secondary.pressed
                    : Interactive.secondary.default,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: Border.default,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  gap: 8,
                })}
              >
                <Text style={{ fontSize: 20 }}>⚙️</Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: TextColors.primary,
                  }}
                >
                  Advanced Filters
                  {activeFiltersCount > 0 && ` (${activeFiltersCount})`}
                </Text>
              </Pressable>
            </View>
          </>
        }
        ListFooterComponent={
          pagination && pagination.total > 0 ? (
            <LoadMoreButton
              displayedCount={displayedBooks.length}
              totalCount={pagination.total}
              pageSize={ITEMS_PER_PAGE}
              isLoading={isLoading || isRefetching}
              onLoadMore={handleLoadMore}
            />
          ) : null
        }
      />

      {/* Advanced Filters Modal */}
      <AdvancedFiltersModal
        visible={showAdvancedFilters}
        filters={filters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={handleAdvancedFiltersApply}
      />
    </>
  );
}