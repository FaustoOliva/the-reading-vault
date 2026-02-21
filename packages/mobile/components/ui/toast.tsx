/**
 * Toast Component
 * Centralized toast notification wrapper for react-native-toast-message
 * 
 * Usage:
 * - Import showToast from this file
 * - Call showToast.success(), showToast.error(), etc.
 * - Toast component must be rendered in root _layout.tsx
 * 
 * Rules:
 * - Use typed helper functions, not raw Toast.show()
 * - Keep messages concise (1-2 lines)
 * - Use appropriate types (success, error, info, warning)
 */

import Toast from 'react-native-toast-message';

/**
 * Typed toast helper functions
 */
export const showToast = {
  /**
   * Show success toast
   */
  success: (message: string, subtitle?: string) => {
    Toast.show({
      type: 'success',
      text1: message,
      text2: subtitle,
      position: 'top',
      visibilityTime: 3000,
      topOffset: 60,
    });
  },

  /**
   * Show error toast
   */
  error: (message: string, subtitle?: string) => {
    Toast.show({
      type: 'error',
      text1: message,
      text2: subtitle,
      position: 'top',
      visibilityTime: 4000,
      topOffset: 60,
    });
  },

  /**
   * Show info toast
   */
  info: (message: string, subtitle?: string) => {
    Toast.show({
      type: 'info',
      text1: message,
      text2: subtitle,
      position: 'top',
      visibilityTime: 3000,
      topOffset: 60,
    });
  },

  /**
   * Show warning toast
   */
  warning: (message: string, subtitle?: string) => {
    Toast.show({
      type: 'warning',
      text1: message,
      text2: subtitle,
      position: 'top',
      visibilityTime: 3500,
      topOffset: 60,
    });
  },

  /**
   * Hide current toast
   */
  hide: () => {
    Toast.hide();
  },
};

/**
 * Export Toast component for root layout
 */
export { default as ToastComponent } from 'react-native-toast-message';
