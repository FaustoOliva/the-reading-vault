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

## Quick Reference

**Most common patterns:**

- **List items** → See [List Item Patterns](#list-item-patterns) (two-column layout, spacing, separators)
- **Dropdowns** → See [Custom Dropdowns](#custom-dropdowns) (never use native Picker)
- **Filters** → See [Filter Chips (Horizontal)](#filter-chips-horizontal) (scrollable status chips)
- **Colors** → MUST use `@/constants/colors` (see mobile-accessibility skill)
- **Rounded corners** → MUST use `borderCurve: 'continuous'`
- **Safe areas** → MUST use `contentInsetAdjustmentBehavior="automatic"`

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

## List Item Patterns

**Two-Column Layout:**

MUST use two-column structure for list items with metadata:

```tsx
// ✅ Correct - Left content, right metadata
<View style={{ flexDirection: 'row', gap: 12 }}>
  <View style={{ flex: 1, gap: 8 }}>
    <Text style={{ fontSize: 19, fontWeight: '600' }}>{title}</Text>
    <Text style={{ fontSize: 15, color: Text.secondary }}>{author}</Text>
    <Text style={{ fontSize: 13, color: Text.tertiary }}>{metadata}</Text>
  </View>
  <View style={{ gap: 10, alignItems: 'flex-end', minWidth: 100 }}>
    <StatusBadge />
    <Text style={{ fontSize: 15, fontWeight: '600' }}>⭐ {rating}</Text>
  </View>
</View>

// ❌ Wrong - Single column with inline elements
<View>
  <Text>{title}</Text>
  <View style={{ flexDirection: 'row', gap: 8 }}>
    <StatusBadge />
    <Text>⭐ {rating}</Text>
  </View>
</View>
```

**List Item Spacing:**

- MUST use `marginBottom` on wrapper (16-20px) for clear separation
- MUST include visible separator between items (1px line with `Border.focus` color)
- MUST use 16-18px internal `paddingVertical` for content breathing room

```tsx
// ✅ Correct
<View style={{ marginBottom: 20 }}>
  <Pressable style={{ paddingVertical: 16 }}>{/* Content */}</Pressable>
  <View style={{ height: 1, backgroundColor: Border.focus, marginTop: 16 }} />
</View>
```

**Why?** Without spacing + separators, lists become infinitely dense and hard to scan.

## Custom Dropdowns

**MUST NOT use native Picker component** (looks vanilla/outdated).

**MUST create custom dropdowns** with Pressable + floating menu:

```tsx
const [isOpen, setIsOpen] = useState(false);

<View style={{ gap: 8, position: "relative", zIndex: 10 }}>
  <Pressable
    onPress={() => setIsOpen(!isOpen)}
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: isOpen ? Interactive.primary.default : Border.default,
      borderRadius: 12,
      borderCurve: "continuous",
    }}
  >
    <Text>{selectedOption.label}</Text>
    <Text style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}>
      ▼
    </Text>
  </Pressable>

  {isOpen && (
    <>
      <Pressable
        style={{
          position: "absolute",
          top: -16,
          left: -16,
          right: -16,
          bottom: -16,
          zIndex: 999,
        }}
        onPress={() => setIsOpen(false)}
      />
      <View
        style={{
          position: "absolute",
          top: 70,
          backgroundColor: Background.surface,
          borderRadius: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          zIndex: 1000,
        }}
      >
        {options.map((option) => (
          <Pressable
            onPress={() => {
              handleSelect(option);
              setIsOpen(false);
            }}
          >
            <Text>{option.label}</Text>
            {isSelected && <Text>✓</Text>}
          </Pressable>
        ))}
      </View>
    </>
  )}
</View>;
```

**Required features:**

- Border color changes to primary when open
- Down arrow rotates 180° when open
- Selected option shows checkmark (✓)
- Selected option has bold font + primary color
- Transparent overlay to close menu on outside tap
- Auto-close on selection

## Filter Chips (Horizontal)

**Pattern for status/category filtering:**

```tsx
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{ gap: 8 }}
>
  {statusOptions.map((status) => {
    const isActive = filters.status === status;
    return (
      <Pressable
        onPress={() => setFilters({ status })}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: isActive
            ? Interactive.primary.default
            : Background.surface,
          borderWidth: 1,
          borderColor: isActive ? Interactive.primary.default : Border.default,
          borderCurve: "continuous",
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: isActive ? Interactive.primary.text : Text.primary,
          }}
        >
          {status.label}
        </Text>
      </Pressable>
    );
  })}
</ScrollView>
```

**Rules:**

- MUST be horizontally scrollable
- MUST hide scroll indicator
- Active chip: primary background + white text
- Inactive chip: surface background + border
- Compact padding: 12px horizontal, 6px vertical
