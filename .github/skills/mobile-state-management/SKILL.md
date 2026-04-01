---
name: mobile-state-management
description: Clear state boundaries - server state (React Query) vs UI state (useState) vs form state.
version: 1.0.0
license: MIT
---

# Mobile State Management

## When to Use

Apply when:

- Fetching or mutating server data
- Managing UI state (toggles, selected items, etc.)
- Handling form inputs and validation
- Deciding between useState, React Query, or Context

## State Boundaries

### 1. Server State → React Query

**What qualifies as server state:**

- Data from API endpoints
- Remote resources (books, sessions, users)
- Anything that requires HTTP requests

**Use `@tanstack/react-query`:**

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Fetching
const { data, isLoading, error } = useQuery({
  queryKey: ["books"],
  queryFn: () => api.get<Book[]>("/api/books"),
});

// Mutating
const mutation = useMutation({
  mutationFn: (newBook: CreateBookInput) => api.post("/api/books", newBook),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["books"] });
  },
});
```

**Setup (in `app/_layout.tsx`):**

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack />
    </QueryClientProvider>
  );
}
```

### 2. UI State → useState / useReducer

**What qualifies as UI state:**

- Modal open/closed
- Selected tab/item
- Expanded/collapsed sections
- Loading indicators for UI actions
- Temporary filters or sorts (not persisted)

**Use React hooks:**

```tsx
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedId, setSelectedId] = useState<number | null>(null);
const [isExpanded, setIsExpanded] = useState(false);
```

**For complex UI state:**

```tsx
const [state, dispatch] = useReducer(reducer, initialState);
```

### 3. Form State → Local State + Validation

**What qualifies as form state:**

- Input values (controlled)
- Validation errors
- Touched/dirty fields
- Submit state

**Pattern:**

```tsx
const [title, setTitle] = useState("");
const [authorName, setAuthorName] = useState("");
const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = async () => {
  // Validate
  const validation = bookSchema.safeParse({ title, authorName });
  if (!validation.success) {
    setErrors(validation.error.flatten().fieldErrors);
    return;
  }

  // Submit via mutation
  await createBookMutation.mutateAsync(validation.data);
};
```

**MUST:**

- Validate on submit (not on every keystroke)
- Use Zod schemas for type-safe validation
- Clear errors when user starts typing (optional UX enhancement)

**MUST NOT:**

- Use React Query for form state
- Send unvalidated data to API
- Store form data in Context unless shared across routes

## React Query Patterns

### Query Keys

**Structure:**

```tsx
// List
["books"][("books", { status: "READING" })][
  // Detail
  ("books", bookId)
][
  // Nested
  ("books", bookId, "sessions")
];
```

**Convention:**

- First element: resource type
- Second element: identifier or filter object
- Third+: nested resources

### Invalidation

**After mutations:**

```tsx
const mutation = useMutation({
  mutationFn: createBook,
  onSuccess: () => {
    // Invalidate list
    queryClient.invalidateQueries({ queryKey: ["books"] });
  },
});
```

**Granular invalidation:**

```tsx
// Specific book
queryClient.invalidateQueries({ queryKey: ["books", bookId] });

// All books queries
queryClient.invalidateQueries({ queryKey: ["books"] });
```

### Optimistic Updates

**For immediate UI feedback:**

```tsx
const mutation = useMutation({
  mutationFn: deleteBook,
  onMutate: async (bookId) => {
    await queryClient.cancelQueries({ queryKey: ["books"] });

    const previous = queryClient.getQueryData(["books"]);

    queryClient.setQueryData(["books"], (old) =>
      old?.filter((book) => book.id !== bookId),
    );

    return { previous };
  },
  onError: (err, bookId, context) => {
    queryClient.setQueryData(["books"], context.previous);
  },
});
```

**Use sparingly—only for instant gratification UX (delete, toggle).**

### Error Handling

**In components:**

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ["books"],
  queryFn: fetchBooks,
});

if (error) {
  return <ErrorView message={error.message} />;
}
```

**Global error handling:**

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        console.error("Query failed:", error);
      },
    },
  },
});
```

## Context (Shared State)

**ONLY use Context for:**

- Theme/appearance settings
- User authentication state
- App-wide configuration

**NEVER use Context for:**

- Server data (use React Query)
- Form state (use local state)
- Route-specific state (use local state)

**Pattern:**

```tsx
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be within ThemeProvider");
  return context;
}
```

## Best Practices

**DO:**

- Separate concerns (server vs UI vs form state)
- Use React Query for all API data
- Keep UI state close to where it's used
- Validate forms before submission

**DON'T:**

- Mix server state and UI state in useState
- Fetch data in useEffect (use useQuery)
- Put everything in Context
- Over-optimize (no caching/offline unless needed)

## What's NOT Covered (Future)

- Offline support (not needed now)
- Advanced caching strategies
- Background sync
- State persistence to device storage

These are speculative features—add only when requirements demand it.
