/**
 * Books Library Screen
 * Primary reading library: search, status filters, sorting and the book list.
 *
 * Rules:
 * - Grouping, sorting and pagination behavior is unchanged
 * - Wide screens use the extra canvas: a filter rail beside the list
 * - Compact screens keep the header and filters inside the scrolling list
 * - Section headers read as a table of contents, not as extra cards
 */

import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useBooks } from "@/hooks/useBooks";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { SearchBar } from "@/components/forms/searchBar";
import { CustomDropdown } from "@/components/forms/customDropdown";
import { BookListItem } from "@/components/list/bookListItem";
import { LoadMoreButton } from "@/components/list/loadMoreButton";
import { SkeletonBookItem } from "@/components/list/skeletonBookItem";
import { ActionButton } from "@/components/ui/actionButton";
import { PageContainer, PageHeader } from "@/components/ui/pageLayout";
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
const FILTER_RAIL_WIDTH = 300;

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

function StatusChip({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`Filter by ${label}`}
      style={({ pressed }) => ({
        minHeight: 36,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: isActive ? Interactive.primary.default : Border.default,
        backgroundColor: isActive
          ? Interactive.primary.default
          : pressed
            ? Interactive.secondary.pressed
            : Interactive.secondary.default,
        justifyContent: "center",
      })}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: isActive ? Interactive.primary.text : TextColors.primary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function LibrarySummary({
  completedCount,
  readingCount,
  totalCount,
}: {
  completedCount: number;
  readingCount: number;
  totalCount: number;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        selectable
        style={{
          fontSize: 13,
          color: TextColors.secondary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {totalCount} books in view
      </Text>
      <Text
        selectable
        style={{
          fontSize: 13,
          color: TextColors.tertiary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {completedCount} completed · {readingCount} in progress
      </Text>
    </View>
  );
}

export default function BooksListScreen() {
  const router = useRouter();
  const { isSplitLayout } = useResponsiveLayout();
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

  const renderStatusChips = (wrap: boolean) => {
    const chips = [
      <StatusChip
        key="all"
        label="All"
        isActive={!filters.status}
        onPress={() => handleStatusChange(undefined)}
      />,
      ...STATUS_GROUP_ORDER.map((status) => (
        <StatusChip
          key={status}
          label={BOOK_STATUS_LABELS[status]}
          isActive={filters.status === status}
          onPress={() => handleStatusChange(status)}
        />
      )),
    ];

    if (wrap) {
      return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {chips}
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {chips}
      </ScrollView>
    );
  };

  const renderSortControl = () => (
    <CustomDropdown
      label="Sort by"
      value={sortBy}
      onValueChange={setSortBy}
      options={SORT_OPTIONS}
      renderInModal
      accessibilityLabel="Sort books"
      accessibilityHint="Select how books are sorted"
    />
  );

  const summary = (
    <LibrarySummary
      completedCount={completedCount}
      readingCount={readingCount}
      totalCount={displayedBooks.length}
    />
  );

  const filterRail = (
    <View style={{ width: FILTER_RAIL_WIDTH, flexShrink: 0, gap: 20 }}>
      <View
        style={{
          backgroundColor: Background.surface,
          borderWidth: 1,
          borderColor: Border.default,
          borderRadius: 14,
          borderCurve: "continuous",
          padding: 18,
          gap: 18,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontSize: 16, fontWeight: "700", color: TextColors.primary }}
        >
          Refine library
        </Text>

        <SearchBar
          value={filters.titleSearch || ""}
          onChange={handleSearchChange}
          placeholder="Search title or author"
        />

        <View style={{ gap: 10 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: TextColors.tertiary,
            }}
          >
            Status
          </Text>
          {renderStatusChips(true)}
        </View>

        {renderSortControl()}
      </View>

      {summary}
    </View>
  );

  const compactHeader = (
    <View style={{ gap: 16, paddingBottom: 4 }}>
      <PageHeader
        eyebrow="Library"
        title="Books"
        subtitle="Track progress, continue reading, and review your habits"
      />

      <SearchBar
        value={filters.titleSearch || ""}
        onChange={handleSearchChange}
        placeholder="Search title or author"
      />

      {renderStatusChips(false)}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>{renderSortControl()}</View>
      </View>

      {summary}
    </View>
  );

  const wideHeader = (
    <PageHeader
      eyebrow="Library"
      title="Books"
      subtitle="Track progress, continue reading, and review your habits"
      actions={
        <ActionButton
          label="Add book"
          onPress={() => router.push("/(tabs)/create-book")}
          accessibilityHint="Opens the add book form"
        />
      }
    />
  );

  const listBody = (
    <SectionList
      sections={groupedSections}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <BookListItem book={item} />}
      renderSectionHeader={({ section }) => (
        <View
          style={{
            paddingTop: section.isFirstSection ? (isSplitLayout ? 4 : 16) : 24,
            paddingBottom: 8,
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            backgroundColor: Background.primary,
            borderBottomWidth: 1,
            borderBottomColor: Border.default,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: TextColors.tertiary,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            {section.title}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: TextColors.tertiary,
              fontVariant: ["tabular-nums"],
            }}
          >
            {section.data.length}
          </Text>
        </View>
      )}
      ListHeaderComponent={isSplitLayout ? undefined : compactHeader}
      ListEmptyComponent={
        <View
          style={{
            paddingVertical: 32,
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
      style={{ flex: 1, backgroundColor: Background.primary }}
      contentContainerStyle={{ paddingBottom: 32 }}
    />
  );

  if (isLoading && displayedBooks.length === 0) {
    return (
      <PageContainer>
        {isSplitLayout ? wideHeader : null}
        <View
          style={{
            flex: 1,
            flexDirection: isSplitLayout ? "row" : "column",
            gap: 28,
            paddingTop: 20,
          }}
        >
          {isSplitLayout ? filterRail : null}
          <FlatList
            data={[1, 2, 3, 4, 5]}
            keyExtractor={(item) => `skeleton-${item}`}
            renderItem={() => <SkeletonBookItem />}
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1, backgroundColor: Background.primary }}
            contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
            ListHeaderComponent={isSplitLayout ? undefined : compactHeader}
          />
        </View>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        {isSplitLayout ? wideHeader : null}
        <View
          style={{
            flex: 1,
            flexDirection: isSplitLayout ? "row" : "column",
            gap: 28,
            paddingTop: 20,
          }}
        >
          {isSplitLayout ? filterRail : null}
          <FlatList
            data={[]}
            renderItem={() => null}
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1, backgroundColor: Background.primary }}
            contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
              />
            }
            ListHeaderComponent={
              <>
                {isSplitLayout ? null : compactHeader}
                <View
                  style={{
                    padding: 16,
                    backgroundColor: Feedback.error.background,
                    borderRadius: 10,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: Feedback.error.border,
                    gap: 8,
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
                    selectable
                    style={{ fontSize: 14, color: Feedback.error.text }}
                  >
                    {error.message || "An unexpected error occurred"}
                  </Text>
                </View>
              </>
            }
          />
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {isSplitLayout ? wideHeader : null}
      <View
        style={{
          flex: 1,
          flexDirection: isSplitLayout ? "row" : "column",
          gap: 28,
          paddingTop: isSplitLayout ? 24 : 8,
        }}
      >
        {isSplitLayout ? filterRail : null}
        <View style={{ flex: 1 }}>{listBody}</View>
      </View>
    </PageContainer>
  );
}
