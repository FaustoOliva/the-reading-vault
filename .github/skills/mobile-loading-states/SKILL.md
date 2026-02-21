---
name: mobile-loading-states
description: Loading state patterns for React Native - Skeleton loaders, ActivityIndicator, Suspense boundaries, and progressive disclosure.
---

## Scope

This skill applies when:

- Implementing loading states for data fetching
- Creating skeleton placeholder components
- Showing progress indicators
- Implementing progressive disclosure
- Handling Suspense boundaries

---

## Core Principles

**Loading states should:**
- Match the layout of actual content (skeleton loaders)
- Provide immediate visual feedback (no blank screens)
- Be dismissable when data loads
- Respect accessibility (screen reader announcements)

**Loading states should NOT:**
- Block the entire screen for partial data
- Flash briefly (< 300ms) - show content immediately if fast
- Show generic spinners for known layouts (use skeletons instead)

---

## Skeleton Loader Pattern

### When to Use Skeletons

**USE skeletons when:**
- Loading list items (known layout structure)
- Loading detail screens (predictable sections)
- Initial page load (first time seeing content)

**DO NOT use skeletons when:**
- Reloading/refreshing data (use pull-to-refresh or subtle indicator)
- Loading unknown/dynamic content structure
- Sub-second loads (show content immediately)

### Skeleton Component Rules

**MUST:**
- Match dimensions of actual component
- Use subtle opacity (0.4-0.6)
- Use colors from `@/constants/colors` (Border.default)
- Create dedicated skeleton components (not inline)

**Example Structure:**

```tsx
// components/list/skeletonBookItem.tsx
export function SkeletonBookItem() {
  return (
    <View style={styles.container}>
      <View style={styles.badge} /> {/* 80x24, opacity 0.5 */}
      <View style={styles.title} /> {/* width 80%, height 20 */}
      <View style={styles.author} /> {/* width 50%, height 16 */}
      <View style={styles.statsRow}>
        <View style={styles.stat} />
        <View style={styles.stat} />
      </View>
    </View>
  );
}

// Styles: Match actual BookListItem dimensions, use Border.default color with opacity 0.5
```

**File location:**
- List skeletons: `components/list/skeleton*.tsx`
- Screen skeletons: `components/ui/skeleton*.tsx`

### Rendering Skeletons

```tsx
function BooksListScreen() {
  const { data: books, isLoading } = useBooks();

  if (isLoading) {
    return (
      <>
        <FilterBar /> {/* Keep UI visible */}
        {Array.from({ length: 5 }).map((_, i) => <SkeletonBookItem key={i} />)}
      </>
    );
  }

  return (
    <>
      <FilterBar />
      <FlatList data={books} renderItem={...} />
    </>
  );
}
```

**Rules:**
- Show 3-7 skeleton items (not too many)
- Keep filter/search UI visible during loading (don't hide it)
- Replace skeletons with real content when loaded (not append)

---

## ActivityIndicator Rules

### When to Use ActivityIndicator

**USE ActivityIndicator when:**
- Loading unknown content structure
- Submitting forms (button loading state)
- Pull-to-refresh in progress
- Background operations (subtle, non-blocking)

**DO NOT use ActivityIndicator when:**
- Loading list items (use skeletons)
- Loading detail screens (use skeletons)
- Full-screen initial loads (use skeletons)

### Button Loading State

```tsx
function SubmitButton({ onPress, isLoading }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      style={{
        backgroundColor: isLoading ? Border.default : Interactive.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: isLoading, busy: isLoading }}
    >
      {isLoading && <ActivityIndicator size="small" color="#FFFFFF" />}
      <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
        {isLoading ? 'Saving...' : 'Save'}
      </Text>
    </Pressable>
  );
}
```

**Rules:**
- Show spinner inline with button text
- Disable button during loading
- Update button text ("Saving...", "Loading...")
- Use `accessibilityState={{ busy: true }}` for screen readers

### Full-Screen Spinner (Last Resort)

```tsx
function LoadingSpinner() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Background.primary }}>
      <ActivityIndicator size="large" color={Interactive.primary} />
      <Text style={{ marginTop: 16, color: Text.secondary }}>Loading...</Text>
    </View>
  );
}
```

**Only use when:**
- No skeleton structure available
- Truly full-screen blocking operation
- Initial app bootstrap

---

## Progressive Disclosure

### Pattern: Render Critical Content First

```tsx
function BookDetailScreen() {
  const { data: book, isLoading } = useBookDetails(id);
  
  if (isLoading) {
    return <SkeletonBookDetail />;
  }

  return (
    <ScrollView>
      {/* Critical: Always render immediately */}
      <BookDetailHero book={book} />
      
      {/* Progressive: Render if available */}
      {book.current_cycle_stats && (
        <ReadingProgressCard stats={book.current_cycle_stats} />
      )}
      
      {/* Progressive: Render if available */}
      {book.reading_cycles && book.reading_cycles.length > 0 && (
        <ReadingCyclesHistoryCard cycles={book.reading_cycles} />
      )}
    </ScrollView>
  );
}
```

**Rules:**
- Render critical content first (hero/header)
- Conditionally render secondary content
- Don't block entire screen for missing optional data

---

## React Query Integration

### Loading State with React Query

```tsx
// ✅ GOOD: Conditional skeleton based on isLoading
function MyScreen() {
  const { data, isLoading, isRefetching } = useBooks();

  if (isLoading) {
    return <SkeletonList count={5} />;
  }

  return (
    <FlatList
      data={data}
      refreshing={isRefetching}
      onRefresh={refetch}
      // ... other props
    />
  );
}
```

```tsx
// ❌ BAD: Showing spinner for every state
function MyScreen() {
  const { data, isLoading, isError, isRefetching } = useBooks();

  if (isLoading || isRefetching || isError) {
    return <ActivityIndicator />; // Too aggressive
  }

  return <FlatList data={data} />;
}
```

**Rules:**
- Use `isLoading` for initial load (show skeleton)
- Use `isRefetching` for pull-to-refresh (don't hide content)
- Don't show full-screen spinner for refetch

---

## Pull-to-Refresh Pattern

### FlatList with RefreshControl

```tsx
import { RefreshControl } from 'react-native';

function MyList() {
  const { data, isRefetching, refetch } = useBooks();

  return (
    <FlatList
      data={data}
      renderItem={...}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={Interactive.primary}
        />
      }
    />
  );
}
```

**Rules:**
- MUST use `RefreshControl` (not custom implementation)
- MUST use `isRefetching` (not `isLoading`)
- MUST NOT hide content during refresh
- MUST use brand color for tint

### ScrollView with RefreshControl

```tsx
function MyDetail() {
  const { data, isRefetching, refetch } = useBookDetails(id);

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      {/* content */}
    </ScrollView>
  );
}
```

---

## Accessibility Rules

### Loading Announcements

**For screen readers:**

```tsx
<View accessibilityRole="progressbar" accessibilityLabel="Loading books">
  <ActivityIndicator />
</View>
```

**For dynamic loading states:**

```tsx
<View accessibilityLiveRegion="polite">
  {isLoading ? (
    <Text>Loading books...</Text>
  ) : (
    <Text>{books.length} books loaded</Text>
  )}
</View>
```

**Rules:**
- Use `accessibilityRole="progressbar"` for loaders
- Use `accessibilityLiveRegion="polite"` for status updates
- Announce when loading completes

---

## Expected Outcome

When this skill is applied correctly:

- Users see skeleton loaders instead of blank screens
- Loading states match actual content layout
- Pull-to-refresh works on all lists and detail screens
- Button loading states prevent double-submission
- Screen readers announce loading progress
- No flash of loading spinner for fast operations

---

## References

- [building-native-ui](../building-native-ui/SKILL.md) - Component styling rules
- [mobile-accessibility](../mobile-accessibility/SKILL.md) - Accessibility requirements
- [mobile-state-management](../mobile-state-management/SKILL.md) - React Query patterns
- [mobile-error-ui](../mobile-error-ui/SKILL.md) - Error vs loading states
