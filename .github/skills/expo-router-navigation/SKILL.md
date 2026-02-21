---
name: expo-router-navigation
description: Expo Router file-based routing rules, navigation patterns, and route structure conventions.
version: 1.0.0
license: MIT
---

# Expo Router Navigation

## When to Use

Apply when:

- Creating new screens or routes
- Navigating between screens
- Structuring app navigation (tabs, stacks, modals)
- Working with dynamic routes or route parameters

## File-Based Routing

**Routes live in `app/` directory.**

File structure defines the route:

```
app/
  _layout.tsx          → Root layout
  index.tsx            → / (home)
  modal.tsx            → /modal
  (tabs)/              → Group (not in URL)
    _layout.tsx        → Tab navigator
    index.tsx          → Tab 1
    books.tsx          → Tab 2
  books/
    [id].tsx           → /books/:id (dynamic)
```

**Route syntax:**

- `index.tsx` → root path in folder
- `[id].tsx` → dynamic segment (`:id`)
- `(folder)` → group (layout only, not in URL)
- `_layout.tsx` → nested layout

**MUST:**

- Ensure a route always matches "/" (usually `app/index.tsx`)
- Remove old route files when restructuring
- Never put components/hooks/types in `app/` (use `components/`, `hooks/`, `types/`)

## Navigation Methods

**Declarative (preferred):**

```tsx
import { Link } from 'expo-router';

<Link href="/books">Books</Link>
<Link href="/books/123">Book 123</Link>
<Link href={{ pathname: '/books/[id]', params: { id: '123' } }}>
  Book 123
</Link>
```

**Imperative:**

```tsx
import { router } from "expo-router";

router.push("/books");
router.replace("/login");
router.back();
```

**Use Link for:**

- Navigation from UI elements
- Tab/list items
- Menu items

**Use router for:**

- Programmatic navigation after actions (form submit, delete, etc.)
- Conditional redirects
- Back navigation

## Tab Navigation

**Recommended: Native tabs (iOS)**

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Image source="sf:house.fill" tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="books"
        options={{
          title: "Books",
          tabBarIcon: ({ color }) => (
            <Image source="sf:book.fill" tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

Native tabs provide better performance and platform consistency.

## Stack Navigation

**For hierarchical flows:**

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}
```

## Dynamic Routes

**File:** `app/books/[id].tsx`

**Access params:**

```tsx
import { useLocalSearchParams } from "expo-router";

export default function BookDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <Text>Book ID: {id}</Text>;
}
```

**Navigate to dynamic route:**

```tsx
<Link href={`/books/${bookId}`}>View Book</Link>;
// or
router.push(`/books/${bookId}`);
```

## Modals

**Present screen as modal:**

```tsx
// app/_layout.tsx
<Stack>
  <Stack.Screen name="modal" options={{ presentation: "modal" }} />
</Stack>
```

**Dismiss modal:**

```tsx
router.back();
// or
router.dismiss();
```

## Query Parameters

**Pass data:**

```tsx
<Link href={{ pathname: "/search", params: { query: "react" } }}>Search</Link>
```

**Read data:**

```tsx
const { query } = useLocalSearchParams<{ query: string }>();
```

## Navigation State

**Check if can go back:**

```tsx
import { router } from "expo-router";

const canGoBack = router.canGoBack();
if (canGoBack) router.back();
```

**Get current route:**

```tsx
import { usePathname } from "expo-router";

const pathname = usePathname(); // "/books/123"
```

## Best Practices

**DO:**

- Use `<Link>` for navigation from UI
- Use native tab bars when possible
- Keep routes shallow (avoid deep nesting)
- Type route params with `useLocalSearchParams<T>()`

**DON'T:**

- Put business logic in route files (extract to services/hooks)
- Mix navigation and data fetching in components (use hooks)
- Over-nest layouts (keep hierarchy simple)
- Use query params for complex data (prefer state or API refetch)
