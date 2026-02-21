/**
 * BookInfoCard Component
 * Displays comprehensive book information
 * 
 * Shows:
 * - Author (name + nationality)
 * - ISBN
 * - Total pages
 * - Status badge
 * - Current reading cycle
 * - Pages read (total and in current cycle)
 * - Score (colored by value)
 * - Comment
 * 
 * Rules:
 * - Use flex gap for spacing
 * - Use borderCurve: 'continuous' for rounded corners
 * - Use accessible colors from constants
 * - Use selectable text for data fields
 */

import { View, Text } from 'react-native';
import { BookDetails } from '@/types/book';
import { BookStatusBadge } from '@/components/ui/bookStatusBadge';
import {
  Background,
  Text as TextColors,
  Border,
  getScoreColors,
} from '@/constants/colors';

interface BookInfoCardProps {
  book: BookDetails['book'];
}

export function BookInfoCard({ book }: BookInfoCardProps) {
  const scoreColors = book.score !== null ? getScoreColors(book.score) : null;

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
        📚 Book Information
      </Text>

      {/* Author */}
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
          Author
        </Text>
        <Text
          style={{ fontSize: 16, color: TextColors.primary }}
          selectable
        >
          {book?.author?.name ?? 'Unknown'}
          {book?.author?.nationality && (
            <Text style={{ color: TextColors.secondary }}>
              {' '}({book.author.nationality})
            </Text>
          )}
        </Text>
      </View>

      {/* ISBN (if exists) */}
      {book.isbn && (
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
            ISBN
          </Text>
          <Text
            style={{ fontSize: 14, fontFamily: 'monospace', color: TextColors.secondary }}
            selectable
          >
            {book.isbn}
          </Text>
        </View>
      )}

      {/* Total Pages */}
      {book.total_pages !== null && (
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
            Total Pages
          </Text>
          <Text
            style={{ fontSize: 16, fontVariant: ['tabular-nums'], color: TextColors.primary }}
            selectable
          >
            {book.total_pages.toLocaleString()}
          </Text>
        </View>
      )}

      {/* Status and Cycle (horizontal row) */}
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        {/* Status */}
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
            Status
          </Text>
          <BookStatusBadge status={book.status} />
        </View>

        {/* Current Reading Cycle */}
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
            Reading Cycle
          </Text>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              backgroundColor: Background.primary,
              borderWidth: 1,
              borderColor: Border.default,
              borderCurve: 'continuous',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
                color: TextColors.primary,
              }}
            >
              #{book?.current_reading_cycle ?? 1}
            </Text>
          </View>
        </View>
      </View>

      {/* Pages Read Stats (horizontal row) */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Pages Read Total */}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
            Total Pages Read
          </Text>
          <Text
            style={{ fontSize: 16, fontVariant: ['tabular-nums'], color: TextColors.primary }}
            selectable
          >
            {(book?.pages_read_total ?? 0).toLocaleString()}
          </Text>
        </View>

        {/* Pages Read in Current Cycle */}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
            Current Cycle
          </Text>
          <Text
            style={{ fontSize: 16, fontVariant: ['tabular-nums'], color: TextColors.primary }}
            selectable
          >
            {(book?.pages_read_in_current_cycle ?? 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Score (if exists) */}
      {book.score !== null && scoreColors && (
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
            Score
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: scoreColors.background,
                borderWidth: 1.5,
                borderColor: scoreColors.border,
                borderCurve: 'continuous',
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                  color: scoreColors.text,
                }}
              >
                {book.score}/10
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Comment (if exists) */}
      {book.comment && (
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
            Comment
          </Text>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: TextColors.secondary,
              fontStyle: 'italic',
            }}
            selectable
          >
            &ldquo;{book.comment}&rdquo;
          </Text>
        </View>
      )}
    </View>
  );
}
