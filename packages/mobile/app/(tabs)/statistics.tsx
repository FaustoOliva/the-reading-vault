import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useGlobalKPIs } from "@/hooks/useKPIs";
import {
  Background,
  Text as TextColors,
  Interactive,
  Feedback,
  Border,
} from "@/constants/colors";

type InsightCardProps = {
  title: string;
  primary: string;
  secondary?: string;
};

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatPercentFromRatio(value: number) {
  return `${Math.round(value * 100)}%`;
}

function MetricCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <View
      style={{
        width: "48%",
        backgroundColor: Background.surface,
        borderWidth: 1,
        borderColor: Border.default,
        borderRadius: 14,
        borderCurve: "continuous",
        padding: 14,
        gap: 6,
      }}
    >
      <Text
        selectable
        style={{
          fontSize: 26,
          lineHeight: 30,
          fontWeight: "800",
          color: TextColors.primary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
        {suffix ? (
          <Text style={{ fontSize: 14, color: TextColors.secondary }}>
            {" "}
            {suffix}
          </Text>
        ) : null}
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: TextColors.tertiary,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function InsightCard({ title, primary, secondary }: InsightCardProps) {
  return (
    <View
      style={{
        backgroundColor: Background.surface,
        borderWidth: 1,
        borderColor: Border.default,
        borderRadius: 14,
        borderCurve: "continuous",
        padding: 14,
        gap: 6,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          color: TextColors.tertiary,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {title}
      </Text>
      <Text
        selectable
        style={{ fontSize: 18, fontWeight: "700", color: TextColors.primary }}
      >
        {primary}
      </Text>
      {secondary ? (
        <Text selectable style={{ fontSize: 13, color: TextColors.secondary }}>
          {secondary}
        </Text>
      ) : null}
    </View>
  );
}

function SectionTitle({ title, caption }: { title: string; caption?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{ fontSize: 18, fontWeight: "700", color: TextColors.primary }}
      >
        {title}
      </Text>
      {caption ? (
        <Text style={{ fontSize: 13, color: TextColors.secondary }}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

export default function StatisticsScreen() {
  const {
    data: response,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useGlobalKPIs();

  const kpis = response?.kpis;

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Background.primary,
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <ActivityIndicator size="large" color={Interactive.primary.default} />
        <Text
          style={{ marginTop: 12, fontSize: 15, color: TextColors.secondary }}
        >
          Loading all-time statistics...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: Background.primary }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Interactive.primary.default}
          />
        }
      >
        <View
          style={{
            padding: 16,
            backgroundColor: Feedback.error.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Feedback.error.border,
            gap: 8,
            borderCurve: "continuous",
          }}
        >
          <Text
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
        </View>
      </ScrollView>
    );
  }

  if (!kpis) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: Background.primary }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Interactive.primary.default}
          />
        }
      >
        <View
          style={{
            padding: 16,
            backgroundColor: Feedback.info.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Feedback.info.border,
            gap: 8,
            borderCurve: "continuous",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: Feedback.info.text,
            }}
          >
            No statistics available
          </Text>
          <Text style={{ fontSize: 14, color: Feedback.info.text }}>
            Complete books to unlock all-time insights.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const completionRate =
    kpis.total_books > 0
      ? Math.round((kpis.books_completed / kpis.total_books) * 100)
      : 0;

  const insights = kpis.library_insights;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: Background.primary }}
      contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 28 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={Interactive.primary.default}
        />
      }
    >
      <View style={{ gap: 4 }}>
        <Text
          style={{ fontSize: 30, fontWeight: "800", color: TextColors.primary }}
        >
          Statistics
        </Text>
        <Text style={{ fontSize: 14, color: TextColors.secondary }}>
          All-time dashboard based on completed books.
        </Text>
      </View>

      <SectionTitle title="Library Overview" caption="Overall library state" />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "space-between",
        }}
      >
        <MetricCard
          label="Total Books"
          value={formatNumber(kpis.total_books)}
        />
        <MetricCard
          label="Completed Books"
          value={formatNumber(kpis.books_completed)}
        />
        <MetricCard
          label="Abandoned Books"
          value={formatNumber(kpis.books_abandoned)}
        />
        <MetricCard
          label="Completion Rate"
          value={formatNumber(completionRate)}
          suffix="%"
        />
      </View>

      <SectionTitle title="Reading Habits" caption="How you read over time" />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "space-between",
        }}
      >
        <MetricCard
          label="Total Pages Read"
          value={formatNumber(kpis.total_pages_read)}
        />
        <MetricCard
          label="Avg Pages per Session"
          value={kpis.average_pages_per_session.toFixed(1)}
        />
      </View>

      <SectionTitle
        title="Reading Performance"
        caption="Speed and consistency"
      />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "space-between",
        }}
      >
        <MetricCard
          label="Avg Reading Speed"
          value={kpis.average_pages_per_session.toFixed(1)}
          suffix="pps"
        />
        <MetricCard
          label="Current Streak"
          value={formatNumber(kpis.current_streak)}
          suffix="days"
        />
        <MetricCard
          label="Longest Streak"
          value={formatNumber(kpis.longest_streak)}
          suffix="days"
        />
        <MetricCard
          label="Reading Consistency"
          value={formatPercentFromRatio(kpis.consistency_rate).replace("%", "")}
          suffix="%"
        />
        <MetricCard
          label="Avg Days to Finish"
          value={
            kpis.average_days_to_complete
              ? formatNumber(kpis.average_days_to_complete)
              : "-"
          }
          suffix={kpis.average_days_to_complete ? "days" : undefined}
        />
      </View>

      <SectionTitle
        title="Library Insights"
        caption="Highlights from completed books"
      />
      <View style={{ gap: 10 }}>
        <InsightCard
          title="Most Read Author"
          primary={
            insights.most_read_author
              ? `${insights.most_read_author.author_name}`
              : "No completed books yet"
          }
          secondary={
            insights.most_read_author
              ? `${insights.most_read_author.books_completed} books completed`
              : undefined
          }
        />
        <InsightCard
          title="Fastest Book"
          primary={
            insights.fastest_book
              ? `${insights.fastest_book.title}`
              : "No completed books yet"
          }
          secondary={
            insights.fastest_book
              ? `${insights.fastest_book.total_pages ?? 0} pages in ${insights.fastest_book.days_to_finish} days`
              : undefined
          }
        />
        <InsightCard
          title="Slowest Book"
          primary={
            insights.slowest_book
              ? insights.slowest_book.title
              : "No completed books yet"
          }
          secondary={
            insights.slowest_book
              ? `${insights.slowest_book.total_pages ?? 0} pages in ${insights.slowest_book.days_to_finish} days`
              : undefined
          }
        />
        <InsightCard
          title="Longest Book"
          primary={
            insights.longest_book
              ? insights.longest_book.title
              : "No completed books yet"
          }
          secondary={
            insights.longest_book
              ? `${insights.longest_book.total_pages} pages`
              : undefined
          }
        />
        <InsightCard
          title="Shortest Book"
          primary={
            insights.shortest_book
              ? insights.shortest_book.title
              : "No completed books yet"
          }
          secondary={
            insights.shortest_book
              ? `${insights.shortest_book.total_pages} pages`
              : undefined
          }
        />
        <InsightCard
          title="Highest Rated Book"
          primary={
            insights.highest_rated_book
              ? insights.highest_rated_book.title
              : "No rated completed books"
          }
          secondary={
            insights.highest_rated_book
              ? `Score ${insights.highest_rated_book.score}`
              : undefined
          }
        />
        <InsightCard
          title="Lowest Rated Book"
          primary={
            insights.lowest_rated_book
              ? insights.lowest_rated_book.title
              : "No rated completed books"
          }
          secondary={
            insights.lowest_rated_book
              ? `Score ${insights.lowest_rated_book.score}`
              : undefined
          }
        />
      </View>
    </ScrollView>
  );
}
