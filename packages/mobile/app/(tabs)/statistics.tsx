/**
 * Statistics Screen
 * Annual reading view: one scrolling page per year with headline figures,
 * highlights, the finished-cycle comparison and the share card.
 *
 * Rules:
 * - A book counts when it reaches review (PENDING_SCORE) during the year
 * - Figures are cycle-scoped (DOMAIN.md §4.2, §5.1, §5.3)
 * - Years without finishes are never selectable
 * - Missing session data is shown as "No session data", never as zero days
 * - The wide canvas is used as an annual report: full-width KPI row,
 *   highlight row and a comparison table that grows with the screen
 */

import { useMemo } from "react";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Background,
  Border,
  Feedback,
  Interactive,
  Text as TextColors,
} from "@/constants/colors";
import { ActionButton } from "@/components/ui/actionButton";
import {
  PageHeader,
  PageScroll,
  SectionHeading,
} from "@/components/ui/pageLayout";
import { AnnualComparisonTable } from "@/components/stats/annualComparisonTable";
import { AnnualHighlights } from "@/components/stats/annualHighlights";
import { ReadingActivityChart } from "@/components/stats/readingActivityChart";
import {
  HeadlineStats,
  type HeadlineStat,
} from "@/components/stats/headlineStats";
import { YearSelector } from "@/components/stats/yearSelector";
import { YearCard } from "@/components/cards/yearCard";
import { useAnnualReadingSummary } from "@/hooks/useAnnualReadingSummary";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useSelectedYear } from "@/hooks/useSelectedYear";

const integerFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

export default function StatisticsScreen() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useSelectedYear(currentYear);
  const { data, isLoading, error, refetch, isRefetching } =
    useAnnualReadingSummary(selectedYear);
  const { contentWidth, isSplitLayout, isUltraWide } = useResponsiveLayout();
  const { push } = useRouter();

  const comparisonWide = contentWidth >= 820;

  const years = useMemo(() => {
    const uniqueYears = new Set<number>(data?.available_years ?? []);
    uniqueYears.add(currentYear);

    return Array.from(uniqueYears).sort((left, right) => right - left);
  }, [currentYear, data?.available_years]);

  const otherYearWithData = useMemo(() => {
    const candidates = (data?.available_years ?? []).filter(
      (year) => year !== selectedYear,
    );

    return candidates.length > 0 ? candidates[0] : null;
  }, [data?.available_years, selectedYear]);

  const hasFinishes = (data?.books_finished ?? 0) > 0;

  const monthlyActivity = data?.monthly_activity ?? [];
  const activityTotalPages = monthlyActivity.reduce(
    (total, month) => total + Math.max(0, month.pages_read),
    0,
  );

  const headlineStats: HeadlineStat[] = data
    ? [
        {
          label: "Books finished",
          value: integerFormatter.format(data.books_finished),
        },
        {
          label: "Pages read",
          value: integerFormatter.format(data.pages_read),
        },
        {
          label: "Reading days",
          value: integerFormatter.format(data.reading_days),
        },
        {
          label: "Average pages per day",
          value:
            data.average_pages_per_day === null
              ? "—"
              : decimalFormatter.format(data.average_pages_per_day),
        },
      ]
    : [];

  const summaryLine = data
    ? `${integerFormatter.format(data.books_finished)} ${
        data.books_finished === 1 ? "book" : "books"
      } finished in ${selectedYear}`
    : "Loading your reading year...";

  return (
    <PageScroll
      gap={isSplitLayout ? 32 : 24}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={Interactive.primary.default}
        />
      }
    >
      <PageHeader
        eyebrow="Annual review"
        title="Reading year"
        subtitle={summaryLine}
        actions={
          <YearSelector
            years={years}
            selectedYear={selectedYear}
            onSelectYear={setSelectedYear}
          />
        }
      />

      {isLoading && !data ? (
        <View style={{ paddingVertical: 48, alignItems: "center", gap: 12 }}>
          <ActivityIndicator size="large" color={Interactive.primary.default} />
          <Text style={{ fontSize: 14, color: TextColors.secondary }}>
            Loading {selectedYear} statistics...
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          style={{
            padding: 18,
            backgroundColor: Feedback.error.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Feedback.error.border,
            borderCurve: "continuous",
            gap: 10,
          }}
        >
          <Text
            accessibilityRole="alert"
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: Feedback.error.text,
            }}
          >
            Error loading statistics
          </Text>
          <Text selectable style={{ fontSize: 14, color: Feedback.error.text }}>
            {error.message || "Pull to refresh and try again."}
          </Text>
          <ActionButton
            label="Try again"
            variant="secondary"
            onPress={() => refetch()}
          />
        </View>
      ) : null}

      {data && !hasFinishes ? (
        <View
          style={{
            padding: 24,
            backgroundColor: Background.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: Border.default,
            borderCurve: "continuous",
            gap: 12,
            maxWidth: isSplitLayout ? 720 : undefined,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: TextColors.primary,
            }}
          >
            No books finished in {selectedYear} yet.
          </Text>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: TextColors.secondary,
            }}
          >
            A book counts here once it reaches review after you finish it.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <ActionButton
              label="Log a session"
              onPress={() => push("/log-session")}
            />
            {otherYearWithData !== null ? (
              <ActionButton
                label={`View ${otherYearWithData} instead`}
                variant="secondary"
                onPress={() => setSelectedYear(otherYearWithData)}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {data && hasFinishes ? (
        <>
          <View style={{ gap: 14 }}>
            <SectionHeading
              title="Headline stats"
              caption="Every figure is scoped to the books you finished this year."
            />
            <HeadlineStats
              stats={headlineStats}
              columns={isUltraWide ? 4 : 2}
              emphasis={isUltraWide ? "large" : "regular"}
            />
          </View>

          <View style={{ gap: 14 }}>
            <SectionHeading
              title="Highlights"
              caption="The extremes of the year, cycle by cycle."
            />
            <AnnualHighlights
              highlights={data.highlights}
              columns={isSplitLayout ? 3 : 1}
            />
          </View>

          <View style={{ gap: 14 }}>
            <SectionHeading
              title={`Finished in ${selectedYear}`}
              caption="One row per finished reading cycle, most recent finish first. Bar length compares pages per day."
            />
            <AnnualComparisonTable
              cycles={data.cycles}
              isWide={comparisonWide}
            />
          </View>
        </>
      ) : null}

      {data && activityTotalPages > 0 ? (
        <View style={{ gap: 14 }}>
          <SectionHeading
            title="Reading activity"
            caption={`Pages read by month in ${selectedYear} — every book, including ones still in progress or abandoned. Each month is its own total, so the line can rise or fall. Counts, highlights and the comparison above use finished cycles only.`}
          />
          <ReadingActivityChart year={data.year} months={monthlyActivity} />
        </View>
      ) : null}

      {data && hasFinishes ? (
        <View style={{ maxWidth: isSplitLayout ? 560 : undefined }}>
          <YearCard key={data.year} summary={data} />
        </View>
      ) : null}
    </PageScroll>
  );
}
