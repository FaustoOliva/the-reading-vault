/**
 * Statistics Screen
 * Displays global reading KPIs and metrics
 *
 * Features:
 * - Global KPI cards
 * - Pull-to-refresh
 * - Loading/error states
 * - Scrollable grid layout
 *
 * Rules:
 * - Use ScrollView for simple layouts
 * - Use contentInsetAdjustmentBehavior for safe areas
 * - Use RefreshControl for pull-to-refresh
 * - Display metrics in a clear, scannable format
 */

import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useGlobalKPIs } from "@/hooks/useKPIs";
import { KPICard } from "@/components/cards/kpiCard";
import {
  Background,
  Text as TextColors,
  Interactive,
  Feedback,
} from "@/constants/colors";

export default function StatisticsScreen() {
  const {
    data: response,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useGlobalKPIs();

  const kpis = response?.kpis;

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
          Loading statistics...
        </Text>
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: Background.primary }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
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
            ❌ Error Loading Statistics
          </Text>
          <Text style={{ fontSize: 14, color: Feedback.error.text }}>
            {error.message || "Failed to load statistics. Pull to retry."}
          </Text>
        </View>
      </ScrollView>
    );
  }

  /**
   * Render empty state
   */
  if (!kpis) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: Background.primary }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
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
            📊 No Statistics Available
          </Text>
          <Text style={{ fontSize: 14, color: Feedback.info.text }}>
            Start reading to see your statistics!
          </Text>
        </View>
      </ScrollView>
    );
  }

  /**
   * Calculate completion percentage
   */
  const completionPercent =
    kpis.total_books > 0
      ? Math.round((kpis.books_completed / kpis.total_books) * 100)
      : 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: Background.primary }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          tintColor={Interactive.primary.default}
        />
      }
    >
      {/* Header */}
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: TextColors.primary,
        }}
      >
        Your Reading Stats
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: TextColors.secondary,
          paddingVertical: 4,
        }}
      >
        A snapshot of your reading journey so far. Keep it up!
      </Text>
      {/* Volume Metrics */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: TextColors.secondary,
          marginTop: 8,
        }}
      >
        Library Overview
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <View style={{ width: "48%" }}>
          <KPICard title="Total Books" value={kpis.total_books} icon="📚" />
        </View>
        <View style={{ width: "48%" }}>
          <KPICard
            title="Completed"
            value={kpis.books_completed}
            icon="✅"
            subtitle={`${completionPercent}%`}
          />
        </View>
        <View style={{ width: "48%" }}>
          <KPICard
            title="In Progress"
            value={kpis.books_in_progress}
            icon="📖"
          />
        </View>
        <View style={{ width: "48%" }}>
          <KPICard title="Abandoned" value={kpis.books_abandoned} icon="⛔" />
        </View>
      </View>

      {/* Reading Activity */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: TextColors.secondary,
          marginTop: 16,
        }}
      >
        Reading Activity
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <View style={{ width: "48%" }}>
          <KPICard
            title="Total Pages"
            value={kpis.total_pages_read.toLocaleString()}
            icon="📄"
          />
        </View>
        <View style={{ width: "48%" }}>
          <KPICard title="Sessions" value={kpis.total_sessions} icon="⏱️" />
        </View>
        <View style={{ width: "48%" }}>
          <KPICard
            title="Avg Pages/Session"
            value={kpis.average_pages_per_session.toFixed(1)}
            icon="📊"
          />
        </View>
        <View style={{ width: "48%" }}>
          <KPICard title="Reading Days" value={kpis.reading_days} icon="📅" />
        </View>
      </View>

      {/* Velocity & Consistency */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: TextColors.secondary,
          marginTop: 16,
        }}
      >
        Velocity & Streaks
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <View style={{ width: "48%" }}>
          <KPICard
            title="Current Streak"
            value={`${kpis.current_streak}d`}
            icon="🔥"
          />
        </View>
        <View style={{ width: "48%" }}>
          <KPICard
            title="Longest Streak"
            value={`${kpis.longest_streak}d`}
            icon="🏆"
          />
        </View>
        <View style={{ width: "48%" }}>
          <KPICard
            title="Consistency"
            value={`${Math.round(kpis.consistency_rate * 100)}%`}
            icon="🎯"
          />
        </View>
        <View style={{ width: "48%" }}>
          <KPICard
            title="Pages/Day"
            value={kpis.average_pages_per_day.toFixed(1)}
            icon="🚀"
          />
        </View>
      </View>

      {/* Completion & Quality */}
      {(kpis.average_days_to_complete || kpis.average_score !== null) && (
        <>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: TextColors.secondary,
              marginTop: 16,
            }}
          >
            Quality & Completion
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "space-between",
            }}
          >
            {kpis.average_days_to_complete && (
              <View style={{ width: "48%" }}>
                <KPICard
                  title="Days to Complete"
                  value={kpis.average_days_to_complete}
                  icon="⏳"
                />
              </View>
            )}
            {kpis.average_score !== null && (
              <View style={{ width: "48%" }}>
                <KPICard
                  title="Avg Score"
                  value={kpis.average_score.toFixed(1)}
                  icon="⭐"
                  subtitle={`${kpis.books_rated} rated`}
                />
              </View>
            )}
          </View>
        </>
      )}

      {/* Period Info */}
      {response?.period && (
        <View style={{ marginTop: 24, padding: 12, gap: 4 }}>
          <Text
            style={{
              fontSize: 12,
              color: TextColors.tertiary,
              textAlign: "center",
            }}
          >
            Statistics Period: {response.period.days} days
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
