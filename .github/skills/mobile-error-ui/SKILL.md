---
name: mobile-error-ui
description: Error UI patterns for React Native - ErrorBoundary, retry buttons, fallback states, and error message translation.
---

## Scope

This skill applies when:

- Implementing error handling UI
- Creating fallback components
- Designing retry mechanisms
- Translating API errors to user-facing messages
- Building ErrorBoundary components

---

## ErrorBoundary Pattern

### Implementation Rules

**MUST use class component** (React Native requires it):

```tsx
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

**Placement:**
- Wrap root layout (`app/_layout.tsx`)
- Wrap complex screens individually if needed
- Do NOT wrap every component (too granular)

**Fallback UI:**
- MUST show error message
- MUST provide retry/reset button
- MUST use accessible colors from `@/constants/colors`
- SHOULD include error code if available

---

## Fallback UI Components

### Error Screen Pattern

```tsx
function ErrorFallback({ error, onReset }: Props) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: Background.primary }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
      <Text style={{ fontSize: 18, fontWeight: '600', color: Text.primary, marginBottom: 8 }}>
        Something went wrong
      </Text>
      <Text style={{ fontSize: 14, color: Text.secondary, marginBottom: 24, textAlign: 'center' }}>
        {error?.message || 'An unexpected error occurred'}
      </Text>
      <Pressable
        onPress={onReset}
        style={{ backgroundColor: Interactive.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Try Again</Text>
      </Pressable>
    </View>
  );
}
```

**Rules:**
- Simple, centered layout
- Clear error message (user-friendly)
- Single primary action (retry/reset)
- Accessible button with role and label

### Empty State Pattern

```tsx
function EmptyState({ title, message, icon, action }: Props) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>{icon || '📭'}</Text>
      <Text style={{ fontSize: 18, fontWeight: '600', color: Text.primary, marginBottom: 8 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 14, color: Text.secondary, textAlign: 'center', marginBottom: 24 }}>
        {message}
      </Text>
      {action && action}
    </View>
  );
}
```

**Use cases:**
- No books in list
- Search returned no results
- No reading sessions logged

**Rules:**
- Distinct from error state (use different icon/message)
- Suggest next action (e.g., "Create your first book")
- Optional action button

---

## Retry Mechanisms

### Retry Button with Loading State

```tsx
function RetryButton({ onRetry, isRetrying }: Props) {
  return (
    <Pressable
      onPress={onRetry}
      disabled={isRetrying}
      style={{
        backgroundColor: isRetrying ? Border.default : Interactive.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
      accessibilityRole="button"
      accessibilityLabel={isRetrying ? 'Retrying' : 'Try again'}
      accessibilityState={{ disabled: isRetrying }}
    >
      {isRetrying && <ActivityIndicator size="small" color="#FFFFFF" />}
      <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
        {isRetrying ? 'Retrying...' : 'Try Again'}
      </Text>
    </Pressable>
  );
}
```

**Rules:**
- MUST disable button during retry
- MUST show loading indicator during retry
- MUST update accessibility state
- MUST use distinct visual state (disabled color)

### Inline Error with Retry

```tsx
function InlineError({ message, onRetry }: Props) {
  return (
    <View style={{ padding: 16, backgroundColor: Feedback.errorBackground, borderRadius: 8, gap: 8 }}>
      <Text style={{ color: Feedback.error, fontSize: 14, fontWeight: '600' }}>
        ❌ {message}
      </Text>
      <Pressable onPress={onRetry} accessibilityRole="button">
        <Text style={{ color: Interactive.primary, fontSize: 14, fontWeight: '600' }}>
          Try again
        </Text>
      </Pressable>
    </View>
  );
}
```

**Use cases:**
- Form submission error
- Image upload error
- Partial page error (doesn't crash entire screen)

---

## Error Message Translation

### API Error → User Message

**Pattern:**

```tsx
function translateError(error: ApiError): string {
  // Network errors
  if (error.message?.includes('Network request failed')) {
    return 'No internet connection. Please check your network and try again.';
  }
  if (error.message?.includes('timeout')) {
    return 'Request took too long. Please try again.';
  }

  // HTTP status codes
  if (error.status === 400) {
    return error.message || 'Invalid request. Please check your input.';
  }
  if (error.status === 401) {
    return 'Session expired. Please log in again.';
  }
  if (error.status === 404) {
    return 'Resource not found.';
  }
  if (error.status === 409) {
    return error.message || 'This item already exists.';
  }
  if (error.status === 500) {
    return 'Server error. Please try again later.';
  }

  // Default fallback
  return error.message || 'An unexpected error occurred. Please try again.';
}
```

**Rules:**
- MUST translate technical errors to user-friendly messages
- MUST preserve specific error details when helpful (e.g., validation errors)
- MUST provide actionable guidance ("check your network", "try again later")
- MUST use generic fallback for unknown errors

### Form Validation Errors

**Pattern:**

```tsx
function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  
  return (
    <Text
      style={{ color: Feedback.error, fontSize: 12, marginTop: 4 }}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {message}
    </Text>
  );
}
```

**Rules:**
- MUST use `accessibilityRole="alert"` for screen reader announcements
- MUST use `accessibilityLiveRegion="polite"` for dynamic updates
- MUST show below input field (not inline)
- MUST use error color from `@/constants/colors`

---

## Permission Denied States

### Camera/Storage Permission

```tsx
function PermissionDeniedState({ permission, onOpenSettings }: Props) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🔒</Text>
      <Text style={{ fontSize: 18, fontWeight: '600', color: Text.primary, marginBottom: 8 }}>
        Permission Required
      </Text>
      <Text style={{ fontSize: 14, color: Text.secondary, textAlign: 'center', marginBottom: 24 }}>
        This app needs {permission} permission to continue. Please enable it in Settings.
      </Text>
      <Pressable
        onPress={onOpenSettings}
        style={{ backgroundColor: Interactive.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}
        accessibilityRole="button"
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Open Settings</Text>
      </Pressable>
    </View>
  );
}
```

**Rules:**
- Explain WHY permission is needed
- Provide clear path to enable (open Settings)
- Use distinct icon (lock, shield, etc.)

---

## Expected Outcome

When this skill is applied correctly:

- All errors are caught and handled gracefully
- Users see helpful, actionable error messages
- Retry mechanisms work reliably
- Error states are visually distinct from empty/loading states
- Accessibility props are present on all error UI

---

## References

- [building-native-ui](../building-native-ui/SKILL.md) - Component styling rules
- [mobile-accessibility](../mobile-accessibility/SKILL.md) - Color system and accessibility
- [mobile-loading-states](../mobile-loading-states/SKILL.md) - Loading patterns
- [native-data-fetching](../native-data-fetching/SKILL.md) - API error handling
