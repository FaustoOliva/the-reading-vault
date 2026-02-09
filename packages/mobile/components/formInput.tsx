/**
 * Form Input Component
 * Reusable text input with label and error handling
 * 
 * Design Rules:
 * - Uses accessible colors from @/constants/colors
 * - Rounded corners with continuous curve
 * - Clear visual feedback for errors
 * - Proper contrast ratios (WCAG AA)
 */

import { View, Text, TextInput, TextInputProps } from 'react-native';
import { Text as TextColors, Border, Feedback, Background } from '@/constants/colors';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function FormInput({ label, error, ...props }: FormInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text 
        style={{ 
          fontSize: 15, 
          fontWeight: '600', 
          color: TextColors.primary 
        }}
      >
        {label}
      </Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: error ? Feedback.error.border : Border.default,
          borderRadius: 8,
          borderCurve: 'continuous',
          padding: 12,
          fontSize: 16,
          backgroundColor: Background.surface,
          color: TextColors.primary,
        }}
        placeholderTextColor={TextColors.tertiary}
        {...props}
      />
      {error && (
        <Text 
          selectable
          style={{ 
            fontSize: 14, 
            color: Feedback.error.text 
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
