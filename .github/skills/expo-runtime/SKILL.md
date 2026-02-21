---
name: expo-runtime
description: Expo runtime constraints, when to use Expo Go vs custom builds, library preferences, and file conventions.
---

# Expo Runtime Constraints

## When to Use

Apply when:
- Starting or running the Expo app
- Choosing between Expo Go and custom builds
- Selecting libraries or native modules
- Creating new files or folders in the mobile package

## Running the App

**Default: Always use Expo Go first.**

```bash
npx expo start
```

Scan the QR code with Expo Go app. This provides instant reload and works for 95% of features.

**Custom builds ONLY when:**
- Using custom native code in `modules/`
- Using third-party native modules not in Expo Go
- Testing platform-specific extensions (widgets, app clips)

If unsure, try Expo Go. Custom builds (`npx expo run:ios/android`) add complexity and slow iteration.

## Library Preferences

**MUST use:**
- `expo-image` for all images (not `react-native` Image)
- `expo-router` for navigation (file-based routing)
- `react-native-safe-area-context` for safe areas (not SafeAreaView)
- `fetch` for network requests (not axios)
- `@tanstack/react-query` for server state

**MUST NOT use:**
- Removed RN modules: Picker, WebView, AsyncStorage, SafeAreaView
- `expo-permissions` (legacy, use specific APIs)
- `axios` (prefer fetch)
- `Platform.OS` (use `process.env.EXPO_OS`)

**Image sources:**
- SF Symbols: `<Image source="sf:name" />`
- Local: `require('./path/to/image.png')`
- Remote: `{ uri: 'https://...' }`

## File Conventions

**Naming:**
- Files: kebab-case (`book-list-screen.tsx`, `use-books.ts`)
- Components: PascalCase export from kebab-case file
- No special characters in filenames

**Structure:**
- Routes only in `app/` directory
- Components in `components/`
- Hooks in `hooks/`
- Types in `types/`
- Services in `services/`
- Never co-locate non-route code in `app/`

**TypeScript:**
- Use path aliases from `tsconfig.json` (prefer `@/components/...` over `../../`)
- Always import types explicitly

## Environment Variables

Access via `process.env.EXPO_PUBLIC_*`:

```typescript
const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
```

All public env vars must be prefixed with `EXPO_PUBLIC_`.

## Safe Areas

See [building-native-ui](../building-native-ui/SKILL.md) skill for safe area handling rules (`contentInsetAdjustmentBehavior` pattern).

## Responsiveness

- Use `useWindowDimensions()` hook (never `Dimensions.get()`)
- Prefer flexbox over fixed dimensions
- Always wrap roots in ScrollView for keyboard/small screen safety

## Code Style

- Import statements at top
- Escape nested backticks correctly in template strings
- Remove old route files when restructuring navigation
- Ensure valid route always matches "/"
