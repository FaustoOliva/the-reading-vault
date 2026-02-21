/**
 * CurrentCycleStatsCard Component
 * Displays statistics for the current reading cycle
 * 
 * Shows:
 * - Sessions count
 * - First session date
 * - Last session date
 * - Days elapsed
 * - Reading velocity (pages/day)
 * - Estimated completion date
 * 
 * Rules:
 * - Use flex gap for spacing
 * - Use borderCurve: 'continuous' for rounded corners
 * - Use fontVariant: 'tabular-nums' for numbers
 * - Format dates in readable format
 * - Handle null values gracefully
 */

import { View, Text } from 'react-native';
import { BookDetails } from '@/types/book';
import {
  Background,
  Text as TextColors,
  Border,
  Feedback,
} from '@/constants/colors';

interface CurrentCycleStatsCardProps {
  stats: BookDetails['current_cycle_stats'];
}

/**
 * Format date to readable string
 * Example: "Jan 15, 2026"
 */
function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format velocity to readable string
 * Example: "12.5 pages/day"
 */
function formatVelocity(velocity: number | null): string {
  if (velocity === null) return 'N/A';
  return `${velocity.toFixed(1)} pages/day`;
}

export function CurrentCycleStatsCard({ stats }: CurrentCycleStatsCardProps) {
  const hasData = (stats?.sessions_count ?? 0) > 0;

  return (
    <View
      style={{
        backgroundColor: Background.surface,
        padding: 16,
        borderRadius: 12,
        gap: 16,
        borderWidth: 1,
        borderColor: Border.default,
        borderCurve: 'continuous',
      }}
    >
      {/* Section Title */}
      <Text style={{ fontSize: 16, fontWeight: '700', color: TextColors.primary }}>
        📊 Current Cycle Statistics
      </Text>

      {!hasData ? (
        /* No sessions yet */
        <View
          style={{
            padding: 16,
            borderRadius: 8,
            backgroundColor: Feedback.info.background,
            borderWidth: 1,
            borderColor: Feedback.info.border,
            borderCurve: 'continuous',
          }}
        >
          <Text style={{ fontSize: 14, color: Feedback.info.text, textAlign: 'center' }}>
            No reading sessions logged in this cycle yet
          </Text>
        </View>
      ) : (
        <>
          {/* Sessions Count */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
              Sessions Logged
            </Text>
            <Text
              style={{ fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'], color: TextColors.primary }}
              selectable
            >
              {stats?.sessions_count ?? 0}
            </Text>
          </View>

          {/* Date Range (horizontal row) */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* First Session */}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
                Started
              </Text>
              <Text
                style={{ fontSize: 14, color: TextColors.secondary }}
                selectable
              >
                {formatDate(stats?.first_session_date ?? null)}
              </Text>
            </View>

            {/* Last Session */}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
                Last Session
              </Text>
              <Text
                style={{ fontSize: 14, color: TextColors.secondary }}
                selectable
              >
                {formatDate(stats?.last_session_date ?? null)}
              </Text>
            </View>
          </View>

          {/* Days Elapsed */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
              Days Elapsed
            </Text>
            <Text
              style={{ fontSize: 16, fontVariant: ['tabular-nums'], color: TextColors.primary }}
              selectable
            >
              {stats?.days_elapsed ?? 0} {(stats?.days_elapsed ?? 0) === 1 ? 'day' : 'days'}
            </Text>
          </View>

          {/* Velocity */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
              Reading Velocity
            </Text>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: Feedback.success.background,
                borderWidth: 1,
                borderColor: Feedback.success.border,
                alignSelf: 'flex-start',
                borderCurve: 'continuous',
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  fontVariant: ['tabular-nums'],
                  color: Feedback.success.text,
                }}
                selectable
              >
                {formatVelocity(stats?.velocity ?? null)}
              </Text>
            </View>
          </View>

          {/* Estimated Completion */}
          {stats?.estimated_completion && (
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
                Estimated Completion
              </Text>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: Feedback.warning.background,
                  borderWidth: 1,
                  borderColor: Feedback.warning.border,
                  alignSelf: 'flex-start',
                  borderCurve: 'continuous',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: Feedback.warning.text,
                  }}
                  selectable
                >
                  {formatDate(stats?.estimated_completion ?? null)}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}
