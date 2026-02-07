---
name: native-data-fetching
description: Fetch API patterns, error handling, and authentication for network requests.
version: 2.0.0
license: MIT
---

# Network Request Patterns

## When to Use

Apply when:
- Implementing raw fetch calls
- Building API client utilities
- Handling HTTP errors
- Managing authentication tokens

**Note:** For server state management (caching, mutations, invalidation), see `mobile-state-management` skill.

## Fetch API Rules

**Basic Pattern:**

```tsx
const response = await fetch(url, options);
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
return response.json();
```

**MUST:**
- Check `response.ok` before parsing
- Use `JSON.stringify()` for request body
- Set `Content-Type: application/json` header for JSON requests

**MUST NOT:**
- Call `.json()` without checking `response.ok`
- Use axios (prefer native fetch)

## HTTP Methods

**GET:**
```tsx
const data = await fetch(`${baseUrl}/resource`);
```

**POST:**
```tsx
const data = await fetch(`${baseUrl}/resource`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

**PUT/PATCH/DELETE:** Same pattern as POST with method change.

## Error Handling

**Typed Errors:**

```tsx
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

**Error Wrapper:**

```tsx
const fetchApi = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        error.message || 'Request failed',
        response.status,
        error.code
      );
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Network error (offline, timeout)
    throw new ApiError('Network error', 0, 'NETWORK_ERROR');
  }
};
```

**MUST:**
- Distinguish between HTTP errors and network errors
- Parse error response body when available
- Throw typed errors (not strings)

## Retry Pattern

```tsx
const fetchWithRetry = async (
  url: string,
  options?: RequestInit,
  maxRetries = 3
) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchApi(url, options);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
};
```

**SHOULD:**
- Use exponential backoff between retries
- Limit retry attempts (3 is reasonable default)
- Only retry network errors (not 4xx client errors)

## Authentication

**Token Storage:**

```tsx
import * as SecureStore from 'expo-secure-store';

export const tokenStorage = {
  get: () => SecureStore.getItemAsync('auth_token'),
  set: (token: string) => SecureStore.setItemAsync('auth_token', token),
  remove: () => SecureStore.deleteItemAsync('auth_token'),
};
```

**MUST:**
- Use `expo-secure-store` for tokens (not AsyncStorage)
- Store sensitive data (tokens, passwords) securely

**Authenticated Requests:**

```tsx
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = await tokenStorage.get();
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: token ? `Bearer ${token}` : '',
    },
  });
};
```

**Token Refresh Pattern:**

```tsx
let refreshPromise: Promise<string> | null = null;

const getValidToken = async (): Promise<string> => {
  const token = await tokenStorage.get();
  
  if (!token || isTokenExpired(token)) {
    if (!refreshPromise) {
      refreshPromise = refreshToken().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  }
  
  return token;
};
```

**MUST:**
- Deduplicate concurrent token refreshes
- Clear refresh promise on completion/error

## API Client Pattern

**Structure:**

```tsx
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const api = {
  get: <T>(path: string) => 
    fetchApi<T>(`${BASE_URL}${path}`, { method: 'GET' }),
  
  post: <T>(path: string, body: unknown) =>
    fetchApi<T>(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  
  // ... other methods
};
```

**MUST:**
- Centralize base URL configuration
- Type return values with generics
- Reuse error handling across methods
