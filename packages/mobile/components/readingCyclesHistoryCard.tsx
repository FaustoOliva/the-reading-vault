/**
 * ReadingCyclesHistoryCard Component
 * Displays the reading cycle history for a book
 * 
 * Shows for each cycle:
 * - Cycle number
 * - Status
 * - Sessions count
 * - Pages read
 * - Date range (first to last session)
 * - Current cycle indicator
 * 
 * Rules:
 * - Use flex gap for spacing
 * - Use borderCurve: 'continuous' for rounded corners
 * - Use fontVariant: 'tabular-nums' for numbers
 * - Highlight current cycle
 * - Sort cycles in reverse order (most recent first)
 */

import { View, Text } from 'react-native';
import { ReadingCycle } from '@/types/book';
import { BookStatusBadge } from './bookStatusBadge';
import {
  Background,
  Text as TextColors,
  Border,
  Feedback,
} from '@/constants/colors';

interface ReadingCyclesHistoryCardProps {
  cycles: ReadingCycle[];
}

/**
 * Format date to short readable string
 * Example: "Jan 15"
 */
function formatShortDate(date: Date | null): string {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Single cycle item component
 */
function CycleItem({ cycle }: { cycle: ReadingCycle }) {
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 10,
        backgroundColor: cycle.is_current ? Feedback.info.background : Background.primary,
        borderWidth: 1,
        borderColor: cycle.is_current ? Feedback.info.border : Border.default,
        gap: 10,
        borderCurve: 'continuous',
      }}
    >
      {/* Header: Cycle number + Status + Current badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            fontVariant: ['tabular-nums'],
            color: TextColors.primary,
          }}
        >
          Cycle #{cycle?.reading_cycle ?? 0}
        </Text>
        
        <BookStatusBadge status={cycle?.status ?? 'WISH_LIST'} />

        {(cycle?.is_current ?? false) && (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: Feedback.info.text,
              borderCurve: 'continuous',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#FFFFFF',
              }}
            >
              CURRENT
            </Text>
          </View>
        )}
      </View>

      {/* Stats Row */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Sessions */}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: TextColors.tertiary }}>
            Sessions
          </Text>
          <Text
            style={{ fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'], color: TextColors.primary }}
          >
            {cycle?.sessions_count ?? 0}
          </Text>
        </View>

        {/* Pages Read */}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: TextColors.tertiary }}>
            Pages
          </Text>
          <Text
            style={{ fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'], color: TextColors.primary }}
          >
            {(cycle?.pages_read ?? 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Date Range */}
      {cycle?.first_session_date && cycle?.last_session_date && (
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: TextColors.tertiary }}>
            Period
          </Text>
          <Text style={{ fontSize: 13, color: TextColors.secondary }}>
            {formatShortDate(cycle?.first_session_date ?? null)} → {formatShortDate(cycle?.last_session_date ?? null)}
          </Text>
        </View>
      )}
    </View>
  );
}

export function ReadingCyclesHistoryCard({ cycles }: ReadingCyclesHistoryCardProps) {
  // Sort cycles in reverse order (most recent first)
  const sortedCycles = [...(cycles ?? [])].sort((a, b) => (b?.reading_cycle ?? 0) - (a?.reading_cycle ?? 0));

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
        📖 Reading Cycles History
      </Text>

      {/* Total Cycles Count */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: Background.primary,
          borderWidth: 1,
          borderColor: Border.default,
          alignSelf: 'flex-start',
          borderCurve: 'continuous',
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.secondary }}>
          {cycles?.length ?? 0} {(cycles?.length ?? 0) === 1 ? 'cycle' : 'cycles'}
        </Text>
      </View>

      {/* Cycles List */}
      {sortedCycles.length === 0 ? (
        <Text style={{ fontSize: 14, color: TextColors.tertiary, textAlign: 'center' }}>
          No reading cycles yet
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {sortedCycles.map((cycle) => (
            <CycleItem key={`cycle-${cycle.reading_cycle}`} cycle={cycle} />
          ))}
        </View>
      )}
    </View>
  );
}
