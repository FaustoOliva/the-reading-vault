/**
 * useReducedMotion Hook
 * Detects if user prefers reduced motion for accessibility
 *
 * Usage:
 * const prefersReducedMotion = useReducedMotion();
 * if (!prefersReducedMotion) {
 *   // Run animations
 * }
 *
 * Rules:
 * - Always respect user's accessibility preferences
 * - Return true if animations should be disabled
 */

import { useReducedMotion as useReanimatedReducedMotion } from "react-native-reanimated";

export function useReducedMotion(): boolean {
  return useReanimatedReducedMotion() ?? false;
}
