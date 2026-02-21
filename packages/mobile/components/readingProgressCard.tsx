/**
 * ReadingProgressCard Component
 * Consolidated card showing current reading progress with visual charts
 * 
 * Sections:
 * - Progress bar (% completion)
 * - Velocity chart (pages/day)
 * - Key metrics (sessions, days, pages read)
 * - Estimated completion date
 * 
 * Rules:
 * - Use visual charts (ProgressBar, VelocityChart)
 * - Keep metrics minimal and relevant
 * - Handle empty state (no sessions yet)
 * - Use fontVariant: 'tabular-nums' for numbers
 */

import { View, Text } from 'react-native';
import { BookDetails } from '@/types/book';
import { ProgressBar } from './progressBar';
import { VelocityChart } from './velocityChart';
import {
  Background,
  Text as TextColors,
  Border,
  Feedback,
} from '@/constants/colors';

interface ReadingProgressCardProps {
  stats: BookDetails['current_cycle_stats'];
  totalPages: number | null;
  pagesReadInCycle: number;
  bookStatus: string;
}

/**
 * Format date to readable string
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

export function ReadingProgressCard({ 
  stats, 
  totalPages,
  pagesReadInCycle,
  bookStatus 
}: ReadingProgressCardProps) {
  const hasData = (stats?.sessions_count ?? 0) > 0;

  // Calculate progress percentage
  const progressPercent = totalPages && totalPages > 0 
    ? Math.min((pagesReadInCycle / totalPages) * 100, 100)
    : 0;

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
        📈 Reading Progress
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
            No reading sessions logged yet. Start reading to see your progress!
          </Text>
        </View>
      ) : (
        <>
          {/* Progress Bar */}
          {totalPages !== null && (
            <ProgressBar 
              progress={progressPercent} 
              label="Book Completion"
            />
          )}

          {/* Velocity Chart */}
          <VelocityChart 
            currentVelocity={stats?.velocity ?? null}
            label="Current Velocity"
          />

          {/* Key Metrics Grid */}
          <View 
            style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 8 
            }}
          >
            {/* Sessions Count */}
            <View 
              style={{ 
                flex: 1, 
                minWidth: 100,
                gap: 4,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: TextColors.tertiary }}>
                Sessions
              </Text>
              <Text
                style={{ 
                  fontSize: 24, 
                  fontWeight: '700', 
                  fontVariant: ['tabular-nums'], 
                  color: TextColors.primary 
                }}
              >
                {stats?.sessions_count ?? 0}
              </Text>
            </View>

            {/* Days Elapsed */}
            <View 
              style={{ 
                flex: 1, 
                minWidth: 100,
                gap: 4,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: TextColors.tertiary }}>
                Days Elapsed
              </Text>
              <Text
                style={{ 
                  fontSize: 24, 
                  fontWeight: '700', 
                  fontVariant: ['tabular-nums'], 
                  color: TextColors.primary 
                }}
              >
                {stats?.days_elapsed ?? 0}
              </Text>
            </View>

            {/* Pages Read */}
            <View 
              style={{ 
                flex: 1, 
                minWidth: 100,
                gap: 4,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: TextColors.tertiary }}>
                Pages Read
              </Text>
              <Text
                style={{ 
                  fontSize: 24, 
                  fontWeight: '700', 
                  fontVariant: ['tabular-nums'], 
                  color: TextColors.primary 
                }}
              >
                {pagesReadInCycle.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Date Range */}
          <View 
            style={{ 
              flexDirection: 'row', 
              gap: 12,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: Border.default,
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: TextColors.tertiary }}>
                Started
              </Text>
              <Text style={{ fontSize: 13, color: TextColors.secondary }}>
                {formatDate(stats?.first_session_date ?? null)}
              </Text>
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: TextColors.tertiary }}>
                Last Session
              </Text>
              <Text style={{ fontSize: 13, color: TextColors.secondary }}>
                {formatDate(stats?.last_session_date ?? null)}
              </Text>
            </View>
          </View>

          {/* Estimated Completion - Only for READING status and future dates */}
          {bookStatus === 'READING' && 
           stats?.estimated_completion && 
           new Date(stats.estimated_completion) > new Date() && (
            <View
              style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor: Feedback.warning.background,
                borderWidth: 1,
                borderColor: Feedback.warning.border,
                borderCurve: 'continuous',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: Feedback.warning.text }}>
                  📅 Est. Completion
                </Text>
                <Text 
                  style={{ 
                    fontSize: 14, 
                    fontWeight: '700', 
                    color: Feedback.warning.text 
                  }}
                >
                  {formatDate(stats.estimated_completion)}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}
