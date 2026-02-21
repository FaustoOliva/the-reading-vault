---
name: building-native-ui
description: UI component patterns, styling rules, and visual element guidelines for React Native apps.
license: MIT
---

# React Native UI Patterns

## When to Use

Apply when:

- Creating components or screens
- Styling views, text, or lists
- Working with platform-specific UI elements
- Implementing visual feedback (haptics, animations)

**IMPORTANT:** For ALL color/contrast/accessibility decisions, see **`mobile-accessibility`** skill (mandatory).

## Component Rules

**MUST use:**

- `<Pressable>` for touchables (not TouchableOpacity)
- `<Text selectable />` for data/error messages
- `<Switch />` from react-native (has built-in haptics)

**MUST NOT use:**

- Intrinsic elements (`img`, `div`) unless in webview
- Custom text on pages (use Stack screen title instead)
- `measure()` API (use `onLayout` instead)

## Styling Rules

**Layout:**

- MUST use flex gap over margin/padding when possible
- MUST prefer padding over margin
- MUST use flexbox (not fixed dimensions)
- MUST use `useWindowDimensions()` (never `Dimensions.get()`)

**Safe Areas:**

- MUST account for top and bottom safe areas
- MUST use `contentInsetAdjustmentBehavior="automatic"` on ScrollView/FlatList
- MUST NOT wrap roots in SafeAreaView (use contentInsetAdjustmentBehavior instead)

**Rounded Corners:**

- MUST use `{ borderCurve: 'continuous' }` (not default circular)
- Exception: Capsule shapes can use circular

**Shadows:**

- MUST use `boxShadow` CSS property
- MUST NOT use legacy `shadowOpacity`, `shadowRadius`, or `elevation`

```tsx
// ✅ Correct
<View style={{ boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }} />

// ❌ Wrong
<View style={{ shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }} />
```

**ScrollView Padding:**

- MUST use `contentContainerStyle` for padding/gap (not style prop)
- Prevents clipping issues

```tsx
// ✅ Correct
<ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>

// ❌ Wrong
<ScrollView style={{ padding: 16 }}>
```

**Text:**

- MUST add `selectable` prop to Text elements with important data
- MUST use `{ fontVariant: 'tabular-nums' }` for counters (alignment)

**Colors & Accessibility:**

- See [mobile-accessibility](../mobile-accessibility/SKILL.md) skill for all color system rules (MANDATORY)

**Styling Method:**

- MUST use inline styles or StyleSheet.create
- MUST NOT use CSS or Tailwind (not supported)

## Visual Feedback

**Haptics:**

- SHOULD use `expo-haptics` on iOS for delightful interactions
- Built-in haptics: `<Switch />`, `DateTimePicker`

**Animations:**

- SHOULD add entering/exiting animations for state changes
- Use Reanimated for smooth transitions

## Stack Headers

**Title:**

- MUST set title via Stack.Screen options (not custom Text component)

```tsx
<Stack.Screen options={{ title: "Books" }} />
```

**Search:**

- SHOULD use `headerSearchBarOptions` for search bars (not custom component)

## Link Enhancements

**Context Menus:**

- SHOULD add context menus to links for iOS conventions

```tsx
<Link href="/settings" asChild>
  <Link.Trigger>
    <Pressable><Card /></Pressable>
  </Link.Trigger>
  <Link.Menu>
    <Link.MenuAction title="Share" icon="square.and.arrow.up" onPress={...} />
    <Link.MenuAction title="Delete" icon="trash" destructive onPress={...} />
  </Link.Menu>
</Link>
```

**Previews:**

- SHOULD add `<Link.Preview />` for long-press previews

```tsx
<Link href="/book/123">
  <Link.Trigger>
    <Pressable>...</Pressable>
  </Link.Trigger>
  <Link.Preview />
</Link>
```

## Modals & Sheets

**Modal:**

```tsx
<Stack.Screen name="modal" options={{ presentation: "modal" }} />
```

**Form Sheet:**

```tsx
<Stack.Screen
  name="sheet"
  options={{
    presentation: "formSheet",
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.5, 1.0],
    contentStyle: { backgroundColor: "transparent" }, // liquid glass on iOS 26+
  }}
/>
```

MUST prefer native modals over custom modal components.

## Number Formatting

SHOULD format large numbers for readability (1.4M, 38k) when appropriate.
