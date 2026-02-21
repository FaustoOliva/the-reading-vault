/**
 * ProgressBar Component
 * A horizontal progress bar showing reading progress percentage
 * 
 * Visual Design:
 * - Background track (full width)
 * - Filled portion (percentage)
 * - Percentage label overlay
 * - Smooth rounded corners
 * 
 * Rules:
 * - Use accessible color contrast
 * - Support 0-100% values
 * - Handle edge cases (null, > 100%)
 * - Use borderCurve: 'continuous'
 */

import { View, Text } from 'react-native';
import { Background, Text as TextColors, Interactive, Border } from '@/constants/colors';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ 
  progress, 
  label = 'Progress',
  showPercentage = true 
}: ProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress || 0));

  return (
    <View style={{ gap: 6 }}>
      {/* Label */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: TextColors.tertiary }}>
          {label}
        </Text>
        {showPercentage && (
          <Text 
            style={{ 
              fontSize: 14, 
              fontWeight: '700', 
              color: TextColors.primary,
              fontVariant: ['tabular-nums']
            }}
          >
            {clampedProgress.toFixed(0)}%
          </Text>
        )}
      </View>

      {/* Progress Bar Track */}
      <View
        style={{
          height: 12,
          backgroundColor: Background.primary,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: Border.default,
          overflow: 'hidden',
          borderCurve: 'continuous',
        }}
      >
        {/* Progress Bar Fill */}
        <View
          style={{
            height: '100%',
            width: `${clampedProgress}%`,
            backgroundColor: Interactive.primary.default,
            borderRadius: 12,
            borderCurve: 'continuous',
          }}
        />
      </View>
    </View>
  );
}
