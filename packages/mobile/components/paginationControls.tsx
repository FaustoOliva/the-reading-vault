/**
 * PaginationControls Component
 * Navigation controls for paginated lists
 * 
 * Rules:
 * - Use Pressable for buttons
 * - Disable buttons when not applicable
 * - Show current page and total pages
 * - Use flexbox for layout
 * - Use accessible colors from constants
 */

import { View, Text, Pressable } from 'react-native';
import { Interactive, Text as TextColors, Border } from '@/constants/colors';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
}: PaginationControlsProps) {
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
      }}
    >
      {/* Previous Button */}
      <Pressable
        onPress={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevious}
        style={({ pressed }) => ({
          flex: 1,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
          backgroundColor: hasPrevious
            ? pressed
              ? Interactive.primary.pressed
              : Interactive.primary.default
            : Border.default,
          alignItems: 'center',
          borderCurve: 'continuous',
        })}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: hasPrevious ? Interactive.primary.text : TextColors.disabled,
          }}
        >
          ← Previous
        </Text>
      </Pressable>

      {/* Page Info */}
      <View style={{ alignItems: 'center', gap: 2, minWidth: 80 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: TextColors.primary,
            fontVariant: ['tabular-nums'],
          }}
          selectable
        >
          {currentPage} / {totalPages}
        </Text>
        {totalItems !== undefined && (
          <Text
            style={{
              fontSize: 12,
              color: TextColors.tertiary,
              fontVariant: ['tabular-nums'],
            }}
            selectable
          >
            {totalItems} total
          </Text>
        )}
      </View>

      {/* Next Button */}
      <Pressable
        onPress={() => onPageChange(currentPage + 1)}
        disabled={!hasNext}
        style={({ pressed }) => ({
          flex: 1,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
          backgroundColor: hasNext
            ? pressed
              ? Interactive.primary.pressed
              : Interactive.primary.default
            : Border.default,
          alignItems: 'center',
          borderCurve: 'continuous',
        })}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: hasNext ? Interactive.primary.text : TextColors.disabled,
          }}
        >
          Next →
        </Text>
      </Pressable>
    </View>
  );
}
