/**
 * Animated Components
 * Reusable animated wrappers with accessibility support
 * 
 * Features:
 * - FadeInView: Fade in animation on mount
 * - ScaleButton: Scale animation on press (subtle haptic feel)
 * - Respects useReducedMotion for accessibility
 * 
 * Rules:
 * - Always check prefersReducedMotion
 * - Keep animations subtle (80-300ms)
 * - Use native driver when possible
 */

import { useEffect } from 'react';
import { ViewProps, Pressable, PressableProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * FadeInView
 * Fades in content on mount
 */
interface FadeInViewProps extends ViewProps {
  duration?: number;
  delay?: number;
  children: React.ReactNode;
}

export function FadeInView({ 
  duration = 200, 
  delay = 0, 
  children, 
  style,
  ...props 
}: FadeInViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const opacity = useSharedValue(prefersReducedMotion ? 1 : 0);

  useEffect(() => {
    if (!prefersReducedMotion) {
      opacity.value = withTiming(1, { duration }, () => {});
    }
  }, [prefersReducedMotion, duration, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[style, animatedStyle]} {...props}>
      {children}
    </Animated.View>
  );
}

/**
 * ScaleButton
 * Button with subtle scale animation on press
 */
interface ScaleButtonProps extends PressableProps {
  children: React.ReactNode;
}

export function ScaleButton({ children, style, ...props }: ScaleButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!prefersReducedMotion) {
      scale.value = withSpring(0.95, {
        damping: 15,
        stiffness: 300,
      });
    }
    props.onPressIn?.({} as any);
  };

  const handlePressOut = () => {
    if (!prefersReducedMotion) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
    }
    props.onPressOut?.({} as any);
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...props}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
