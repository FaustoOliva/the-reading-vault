---
name: mobile-toast-patterns
description: Toast notification patterns for React Native - Centralized wrapper, typed helpers, duration defaults, and accessibility.
---

## Scope

This skill applies when:

- Adding user feedback notifications
- Replacing blocking Alert.alert() calls
- Implementing success/error/info/warning messages
- Creating non-blocking status updates

---

## Core Principles

**Toast notifications should:**

- Be non-blocking (don't stop user interaction)
- Auto-dismiss after appropriate duration
- Be centralized (one toast system, not multiple)
- Use typed helpers (not raw API calls)
- Be accessible (ARIA live regions)

**Toast notifications should NOT:**

- Require user confirmation (use modal for that)
- Show multiple toasts simultaneously (queue them)
- Block critical user flows
- Replace persistent UI elements (use for transient feedback only)

---

## Library Setup

### Installation

**MUST use:** `react-native-toast-message`

```bash
npm install react-native-toast-message
```

**Why:** Battle-tested, accessible, supports custom styling, works with Expo.

### Root Integration

**File:** `app/_layout.tsx`

```tsx
import Toast from "react-native-toast-message";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Stack />
          <Toast /> {/* MUST be last child for proper z-index */}
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

**Rules:**

- MUST render `<Toast />` at root level
- MUST be last child (z-index layering)
- DO NOT render in individual screens

---

## Centralized Wrapper Pattern

### Helper File Structure

**File:** `components/ui/toast.tsx`

```tsx
import Toast from "react-native-toast-message";

/**
 * Typed toast helper functions
 */
export const showToast = {
  /**
   * Show success toast (green)
   */
  success: (message: string, subtitle?: string) => {
    Toast.show({
      type: "success",
      text1: message,
      text2: subtitle,
      position: "top",
      visibilityTime: 3000,
      autoHide: true,
    });
  },

  /**
   * Show error toast (red)
   */
  error: (message: string, subtitle?: string) => {
    Toast.show({
      type: "error",
      text1: message,
      text2: subtitle,
      position: "top",
      visibilityTime: 4000, // Errors stay longer
      autoHide: true,
    });
  },

  /**
   * Show info toast (blue)
   */
  info: (message: string, subtitle?: string) => {
    Toast.show({
      type: "info",
      text1: message,
      text2: subtitle,
      position: "top",
      visibilityTime: 3000,
      autoHide: true,
    });
  },

  /**
   * Show warning toast (yellow/orange)
   */
  warning: (message: string, subtitle?: string) => {
    Toast.show({
      type: "warning",
      text1: message,
      text2: subtitle,
      position: "top",
      visibilityTime: 3500,
      autoHide: true,
    });
  },
};

/**
 * Export Toast component for root rendering
 */
export { default as ToastComponent } from "react-native-toast-message";
```

**Rules:**

- MUST use typed helpers (`showToast.success()`, not `Toast.show()`)
- MUST include JSDoc comments for each helper
- MUST export both helpers and component
- MUST use consistent durations (success: 3s, error: 4s)

---

## Usage Patterns

### Basic Success/Error

```tsx
import { showToast } from "@/components/ui/toast";

function MyComponent() {
  const createMutation = useCreateBook();

  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync(data);
      showToast.success("Book created", "Added to your library");
    } catch (error) {
      showToast.error("Failed to create book", error.message);
    }
  };
}
```

### Replacing Alert.alert()

```tsx
// ❌ BAD: Blocking alert
Alert.alert("Success", "Book created successfully");

// ✅ GOOD: Non-blocking toast
showToast.success("Book created successfully");
```

---

## Duration Guidelines

### Standard Durations

- **Success:** 3000ms (3 seconds)
- **Error:** 4000ms (4 seconds) - users need more time to read errors
- **Info:** 3000ms (3 seconds)
- **Warning:** 3500ms (3.5 seconds)

### Custom Durations

```tsx
// For longer messages (use sparingly)
Toast.show({
  type: "info",
  text1: "Long important message",
  text2: "Additional context that takes more time to read",
  visibilityTime: 5000, // Extend to 5 seconds
  autoHide: true,
});
```

**When to extend:**

- Message is > 10 words
- Critical error requiring user action
- Multi-step process feedback

**DO NOT:**

- Make toasts persistent (`autoHide: false`)
- Extend beyond 6 seconds
- Use for confirmation dialogs (use modal instead)

---

## Position Rules

### Standard Position

**MUST use `position: 'top'`** for all toasts.

**Why:**

- Doesn't obscure content
- Consistent with mobile patterns
- Doesn't interfere with bottom navigation

### DO NOT Use Bottom Position

```tsx
// ❌ BAD: Bottom obscures tab bar
Toast.show({
  position: "bottom", // Avoid
  // ...
});
```

---

## Accessibility

### ARIA Live Regions

The `react-native-toast-message` library automatically handles accessibility:

- Success/Info toasts: `aria-live="polite"`
- Error/Warning toasts: `aria-live="assertive"`

**No additional work needed** - library handles announcements.

### Content Guidelines

**message (text1):**

- Keep to 5-8 words
- Be specific: "Book created" not "Success"
- Use sentence case: "Session logged" not "SESSION LOGGED"

**subtitle (text2):**

- Optional additional context
- Keep to one sentence
- Provide actionable info if needed: "Check your library"

---

## When NOT to Use Toasts

### Use Modal Instead When:

- Requiring user confirmation (destructive actions)
- Capturing additional input
- Blocking user until decision made

### Use Inline Errors Instead When:

- Form validation errors (show below field)
- Field-specific feedback
- Persistent error state

### Use Alert.alert() Instead When:

- Critical system-level errors (rare)
- Permission requests with explanation
- Truly blocking operations (e.g., app update required)

---

## Testing Toasts

### In Development

```tsx
// Test all toast types
showToast.success("Test success message");
showToast.error("Test error message", "With subtitle");
showToast.info("Test info message");
showToast.warning("Test warning message");
```

### Verify:

- ✅ Toast appears at top
- ✅ Auto-dismisses after duration
- ✅ Doesn't block interaction below
- ✅ Only one toast visible at a time
- ✅ Screen reader announces message

---

## Expected Outcome

When this skill is applied correctly:

- All user feedback uses centralized toast helpers
- No blocking `Alert.alert()` calls for success/error feedback
- Toast durations are consistent across the app
- Toasts are accessible to screen readers
- Users can continue interacting while toast is visible

---

## References

- [building-native-ui](../building-native-ui/SKILL.md) - UI component patterns
- [mobile-accessibility](../mobile-accessibility/SKILL.md) - Accessibility requirements
- [mobile-error-ui](../mobile-error-ui/SKILL.md) - Error UI patterns
