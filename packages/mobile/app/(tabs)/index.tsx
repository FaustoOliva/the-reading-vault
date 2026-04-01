import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  SectionList,
  Text,
  View,
  Pressable,
} from "react-native";
import { useBooks } from "@/hooks/useBooks";
import { SearchBar } from "@/components/forms/searchBar";
import { CustomDropdown } from "@/components/forms/customDropdown";
import { BookListItem } from "@/components/list/bookListItem";
import { LoadMoreButton } from "@/components/list/loadMoreButton";
import { SkeletonBookItem } from "@/components/list/skeletonBookItem";
import { Book, BookStatus, BooksFilter } from "@/types/book";
import { BOOK_STATUS_LABELS } from "@/constants/bookStatus";
import {
  Background,
  Border,
  Feedback,
  Interactive,
  Text as TextColors,
} from "@/constants/colors";

const ITEMS_PER_PAGE = 100;
const AUTO_LOAD_THRESHOLD = 50;

type SortOptionValue =
  | "LAST_ACTIVITY"
  | "TITLE"
  | "RATING"
  | "YEAR"
  | "PAGES"
  | "RECENTLY_ADDED";

interface SortOption {
  value: SortOptionValue;
  label: string;
}

interface BookSection {
  title: string;
  status: BookStatus;
  data: Book[];
  isFirstSection: boolean;
}

const SORT_OPTIONS: SortOption[] = [
  { value: "LAST_ACTIVITY", label: "Last activity" },
  { value: "TITLE", label: "Title" },
  { value: "RATING", label: "Rating" },
  { value: "YEAR", label: "Year" },
  { value: "PAGES", label: "Pages" },
  { value: "RECENTLY_ADDED", label: "Recently added" },
];

const STATUS_GROUP_ORDER: BookStatus[] = [
  BookStatus.READING,
  BookStatus.COMPLETED,
  BookStatus.PENDING_SCORE,
  BookStatus.ABANDONED,
  BookStatus.WISH_LIST,
];

function getComparableTimestamp(book: Book): number {
  const updated = book.updatedAt ? Date.parse(book.updatedAt) : Number.NaN;
  if (!Number.isNaN(updated)) {
    return updated;
  }

  const created = book.createdAt ? Date.parse(book.createdAt) : Number.NaN;
  if (!Number.isNaN(created)) {
    return created;
  }

  return book.id;
}

function compareNullableNumbersDesc(
  a: number | null,
  b: number | null,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

function sortBooks(books: Book[], sortBy: SortOptionValue): Book[] {
  const sorted = [...books];

  sorted.sort((left, right) => {
    if (sortBy === "TITLE") {
      return left.title.localeCompare(right.title, undefined, {
        sensitivity: "base",
      });
    }

    if (sortBy === "RATING") {
      return compareNullableNumbersDesc(left.score, right.score);
    }

    if (sortBy === "YEAR") {
      return compareNullableNumbersDesc(
        left.publicationYear,
        right.publicationYear,
      );
    }

    if (sortBy === "PAGES") {
      return compareNullableNumbersDesc(left.totalPages, right.totalPages);
    }

    if (sortBy === "RECENTLY_ADDED") {
      const leftCreated = left.createdAt
        ? Date.parse(left.createdAt)
        : Number.NaN;
      const rightCreated = right.createdAt
        ? Date.parse(right.createdAt)
        : Number.NaN;

      if (!Number.isNaN(leftCreated) && !Number.isNaN(rightCreated)) {
        return rightCreated - leftCreated;
      }

      return right.id - left.id;
    }

    return getComparableTimestamp(right) - getComparableTimestamp(left);
  });

  return sorted;
}

function groupBooksByStatus(books: Book[]): BookSection[] {
  const sections = STATUS_GROUP_ORDER.map((status) => ({
    title: BOOK_STATUS_LABELS[status],
    status,
    data: books.filter((book) => book.status === status),
  })).filter((section) => section.data.length > 0);

  return sections.map((section, index) => ({
    ...section,
    isFirstSection: index === 0,
  }));
}

export default function BooksListScreen() {
  const [filters, setFilters] = useState<BooksFilter>({});
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOptionValue>("LAST_ACTIVITY");
  const [accumulatedBooks, setAccumulatedBooks] = useState<Book[]>([]);

  const {
    data: response,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useBooks(filters, { page, limit: ITEMS_PER_PAGE });

  const currentPageBooks = useMemo(
    () => response?.data ?? [],
    [response?.data],
  );
  const pagination = response?.pagination;

  useEffect(() => {
    if (page === 1) {
      setAccumulatedBooks(currentPageBooks);
    }
  }, [page, currentPageBooks]);

  useEffect(() => {
    if (page > 1 && currentPageBooks.length > 0) {
      setAccumulatedBooks((prev) => {
        const newBooks = currentPageBooks.filter(
          (newBook) =>
            !prev.some((existingBook) => existingBook.id === newBook.id),
        );

        return [...prev, ...newBooks];
      });
    }
  }, [page, currentPageBooks]);

  useEffect(() => {
    if (
      pagination &&
      pagination.total <= AUTO_LOAD_THRESHOLD &&
      pagination.total > accumulatedBooks.length &&
      !isLoading &&
      !isRefetching &&
      page < pagination.totalPages
    ) {
      setPage((prev) => prev + 1);
    }
  }, [pagination, accumulatedBooks.length, isLoading, isRefetching, page]);

  const displayedBooks = useMemo(() => {
    if (page > 1 || accumulatedBooks.length > 0) {
      return accumulatedBooks;
    }

    return currentPageBooks;
  }, [page, accumulatedBooks, currentPageBooks]);

  const sortedBooks = useMemo(
    () => sortBooks(displayedBooks, sortBy),
    [displayedBooks, sortBy],
  );

  const groupedSections = useMemo(
    () => groupBooksByStatus(sortedBooks),
    [sortedBooks],
  );

  const completedCount = useMemo(
    () =>
      displayedBooks.filter((book) => book.status === BookStatus.COMPLETED)
        .length,
    [displayedBooks],
  );

  const readingCount = useMemo(
    () =>
      displayedBooks.filter((book) => book.status === BookStatus.READING)
        .length,
    [displayedBooks],
  );

  const handleStatusChange = (status: BookStatus | undefined) => {
    setFilters((prev) => ({
      ...prev,
      status,
    }));
    setPage(1);
    setAccumulatedBooks([]);
  };

  const handleSearchChange = (searchText: string) => {
    setFilters((prev) => ({
      ...prev,
      titleSearch: searchText || undefined,
    }));
    setPage(1);
    setAccumulatedBooks([]);
  };

  const handleLoadMore = () => {
    if (pagination && page < pagination.totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setAccumulatedBooks([]);
    refetch();
  };

  const renderFiltersHeader = () => (
    <View style={{ gap: 12, marginBottom: 8, marginTop: 4 }}>
      <View style={{ gap: 4 }}>
        <Text
          style={{ fontSize: 28, fontWeight: "700", color: TextColors.primary }}
        >
          Library
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: TextColors.secondary,
            paddingVertical: 4,
          }}
        >
          Track progress, continue reading, and review your habits
        </Text>
      </View>

      <SearchBar
        value={filters.titleSearch || ""}
        onChange={handleSearchChange}
        placeholder="Search title or author"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        <Pressable
          onPress={() => handleStatusChange(undefined)}
          style={({ pressed }) => ({
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: !filters.status
              ? Interactive.primary.default
              : Border.default,
            backgroundColor: !filters.status
              ? Interactive.primary.default
              : pressed
                ? Interactive.secondary.pressed
                : Interactive.secondary.default,
          })}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: !filters.status
                ? Interactive.primary.text
                : TextColors.primary,
            }}
          >
            All
          </Text>
        </Pressable>

        {STATUS_GROUP_ORDER.map((status) => {
          const isActive = filters.status === status;
          return (
            <Pressable
              key={status}
              onPress={() => handleStatusChange(status)}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: isActive
                  ? Interactive.primary.default
                  : Border.default,
                backgroundColor: isActive
                  ? Interactive.primary.default
                  : pressed
                    ? Interactive.secondary.pressed
                    : Interactive.secondary.default,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: isActive
                    ? Interactive.primary.text
                    : TextColors.primary,
                }}
              >
                {BOOK_STATUS_LABELS[status]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View>
        <CustomDropdown
          label="Sort by"
          value={sortBy}
          onValueChange={setSortBy}
          options={SORT_OPTIONS}
          renderInModal
          accessibilityLabel="Sort books"
          accessibilityHint="Select how books are sorted"
        />
      </View>

      <View
        style={{
          paddingVertical: 2,
        }}
      >
        <Text style={{ fontSize: 13, color: TextColors.tertiary }}>
          📚 {completedCount} books completed • {readingCount} currently reading
        </Text>
      </View>
    </View>
  );

  if (isLoading && displayedBooks.length === 0) {
    return (
      <FlatList
        data={[1, 2, 3, 4, 5]}
        keyExtractor={(item) => `skeleton-${item}`}
        renderItem={() => <SkeletonBookItem />}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: Background.primary }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListHeaderComponent={renderFiltersHeader}
      />
    );
  }

  if (error) {
    return (
      <FlatList
        data={[]}
        renderItem={() => null}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: Background.primary }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <>
            {renderFiltersHeader()}
            <View
              style={{
                padding: 16,
                backgroundColor: Feedback.error.background,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: Feedback.error.border,
                gap: 8,
                borderCurve: "continuous",
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: Feedback.error.text,
                }}
              >
                Error loading books
              </Text>
              <Text
                style={{ fontSize: 14, color: Feedback.error.text }}
                selectable
              >
                {error.message || "An unexpected error occurred"}
              </Text>
            </View>
          </>
        }
      />
    );
  }

  return (
    <SectionList
      sections={groupedSections}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <BookListItem book={item} />}
      renderSectionHeader={({ section }) => (
        <View
          style={{
            paddingTop: section.isFirstSection ? 16 : 28,
            paddingBottom: 10,
            backgroundColor: Background.primary,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: TextColors.secondary,
              letterSpacing: 0.2,
            }}
          >
            {section.title} ({section.data.length})
          </Text>
        </View>
      )}
      ListHeaderComponent={renderFiltersHeader}
      ListEmptyComponent={
        <View
          style={{
            paddingVertical: 28,
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: TextColors.primary,
            }}
          >
            No books found
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: TextColors.secondary,
              textAlign: "center",
            }}
          >
            Try a different search or status filter.
          </Text>
        </View>
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
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && page === 1}
          onRefresh={handleRefresh}
        />
      }
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: Background.primary }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
    />
  );
}
