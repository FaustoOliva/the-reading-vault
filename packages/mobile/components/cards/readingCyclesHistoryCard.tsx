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
 * Features:
 * - Current cycle always expanded
 * - Previous cycles collapsed by default
 * - Tap to expand/collapse previous cycles
 * 
 * Rules:
 * - Use flex gap for spacing
 * - Use borderCurve: 'continuous' for rounded corners
 * - Use fontVariant: 'tabular-nums' for numbers
 * - Highlight current cycle
 * - Sort cycles in reverse order (most recent first)
 */

import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ReadingCycle } from '@/types/book';
import { BookStatusBadge } from '@/components/ui/bookStatusBadge';
import {
  Background,
  Text as TextColors,
  Border,
  Feedback,
  Interactive,
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
function CycleItem({ cycle, isCurrent }: { cycle: ReadingCycle; isCurrent: boolean }) {
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 10,
        backgroundColor: isCurrent ? Feedback.info.background : Background.primary,
        borderWidth: 1,
        borderColor: isCurrent ? Feedback.info.border : Border.default,
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
          Cycle #{cycle?.cycle_number ?? 0}
        </Text>
        
        <BookStatusBadge status={cycle?.status ?? 'WISH_LIST'} />

        {isCurrent && (
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
            {(cycle?.total_pages_read ?? 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Date Range */}
      {cycle?.first_session && cycle?.last_session && (
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: TextColors.tertiary }}>
            Period
          </Text>
          <Text style={{ fontSize: 13, color: TextColors.secondary }}>
            {formatShortDate(cycle?.first_session ?? null)} → {formatShortDate(cycle?.last_session ?? null)}
          </Text>
        </View>
      )}
    </View>
  );
}

export function ReadingCyclesHistoryCard({ cycles }: ReadingCyclesHistoryCardProps) {
  // Sort cycles in reverse order (most recent first)
  const sortedCycles = [...(cycles ?? [])].sort((a, b) => (b?.cycle_number ?? 0) - (a?.cycle_number ?? 0));

  // Separate current cycle (last in the array) from previous cycles
  const currentCycle = sortedCycles.length > 0 ? sortedCycles[0] : null;
  const previousCycles = sortedCycles.slice(1);

  // State for collapsing previous cycles
  const [isExpanded, setIsExpanded] = useState(false);

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
        📖 Reading Cycles
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
          {/* Current Cycle - Always Visible */}
          {currentCycle && <CycleItem cycle={currentCycle} isCurrent={true} />}

          {/* Previous Cycles - Collapsible */}
          {previousCycles.length > 0 && (
            <>
              {/* Toggle Button */}
              <Pressable
                onPress={() => setIsExpanded(!isExpanded)}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: pressed 
                    ? Interactive.secondary.pressed 
                    : Interactive.secondary.default,
                  borderWidth: 1,
                  borderColor: Interactive.secondary.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderCurve: 'continuous',
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: Interactive.secondary.text }}>
                  Previous Cycles ({previousCycles.length})
                </Text>
                <Text style={{ fontSize: 16, color: Interactive.secondary.text }}>
                  {isExpanded ? '▼' : '▶'}
                </Text>
              </Pressable>

              {/* Previous Cycles List */}
              {isExpanded && previousCycles.map((cycle) => (
                <CycleItem key={`cycle-${cycle.cycle_number}`} cycle={cycle} isCurrent={false} />
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
}
