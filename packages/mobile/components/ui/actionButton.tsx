/**
 * ActionButton Component
 * Shared call-to-action button with accessible targets and states
 *
 * Rules:
 * - Minimum 44px target height
 * - Colors come from the design tokens (never hardcoded)
 * - Disabled state is conveyed by accessibilityState, not color alone
 */

import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import {
  Background,
  Border,
  Interactive,
  Text as TextColors,
} from "@/constants/colors";

type ActionButtonVariant = "primary" | "secondary";

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: ActionButtonVariant;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function ActionButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  accessibilityHint,
  style,
}: ActionButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        {
          minHeight: 44,
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderRadius: 10,
          borderCurve: "continuous",
          borderWidth: isPrimary ? 0 : 1,
          borderColor: Border.default,
          backgroundColor: isPrimary
            ? pressed
              ? Interactive.primary.pressed
              : Interactive.primary.default
            : pressed
              ? Interactive.secondary.pressed
              : Background.surface,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: "600",
          color: isPrimary ? Interactive.primary.text : TextColors.primary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
