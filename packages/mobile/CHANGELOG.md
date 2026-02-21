# Changelog

All notable changes to The Reading Vault mobile app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### User Experience Enhancements (February 2026)

- **Toast Notification System**
  - Non-blocking toast notifications using `react-native-toast-message`
  - Typed helper functions: `showToast.success()`, `showToast.error()`, `showToast.info()`, `showToast.warning()`
  - Replaced blocking `Alert.alert()` calls in book creation and editing flows
  - Auto-dismiss with customizable duration

- **Skeleton Loading States**
  - `SkeletonBookItem` component matching BookListItem dimensions
  - `SkeletonBookDetail` component matching book detail screen layout
  - Applied to main list (5 skeleton items) and detail screen
  - Smooth visual transitions reduce perceived loading times

- **Optimistic UI Updates**
  - Instant feedback for mutations before server response
  - Implemented on:
    - Book updates (title, author, pages, status, etc.)
    - Book reopen (new reading cycle)
    - Request manual review (status change)
  - Automatic rollback on error with snapshot restoration
  - Query invalidation and cache sync on success

- **Animations & Micro-interactions**
  - `FadeInView` component with 200ms opacity transition
  - `ScaleButton` component with spring physics feedback (0.95 scale on press)
  - Applied to:
    - Book list items (fade-in entrance)
    - Load More button (scale feedback)
  - `useReducedMotion` hook respecting accessibility preferences
  - All animations disabled when user prefers reduced motion

- **Performance Optimizations**
  - React.memo wrapper on `BookListItem` with custom comparison function
  - FlatList optimizations:
    - `removeClippedSubviews={true}` - Unmount off-screen items
    - `maxToRenderPerBatch={10}` - Render 10 items per batch
    - `updateCellsBatchingPeriod={50}` - 50ms update interval
    - `initialNumToRender={15}` - Initial render count
    - `windowSize={21}` - Memory management
  - Pull-to-refresh on both list and detail screens
  - Prevents unnecessary re-renders when parent state changes

#### UX Bug Fixes (February 2026)

- **Search Improvements**
  - 3-character minimum for search activation
  - Hint text: "Type at least 3 characters to search (X more)"
  - Prevents excessive API calls on short input
  - Clear indicator of search requirements

- **Page Flashing Fix**
  - Conditional loading spinner only when `displayedBooks.length === 0`
  - Keep existing content visible during refetch
  - Eliminates white flash when changing filters
  - Smoother perceived performance

#### Bug Fixes (February 2026)

- Fixed corrupted `api.ts` file structure causing "'with' in strict mode" syntax error
- Fixed Zod v3 API compatibility:
  - Changed `error.errors` to `error.issues`
  - Replaced `required_error` with `message` parameter
  - Removed invalid `invalid_type_error` usage
- Fixed TypeScript implicit any type errors in filter callbacks
- Removed duplicate `kpiCard.tsx` file from incorrect location

### Changed

- Updated README.md with comprehensive project documentation
  - Architecture overview
  - Setup instructions
  - Key implementation details
  - Development guidelines
  - API integration docs

### Technical Details

#### Dependencies Updated
- `react-native-toast-message`: ^2.2.1 (new)

#### File Changes
- `components/ui/toast.tsx` (new, 86 lines)
- `components/list/skeletonBookItem.tsx` (new, 74 lines)
- `components/ui/skeletonBookDetail.tsx` (new, 106 lines)
- `components/ui/animated.tsx` (new, 109 lines)
- `hooks/useReducedMotion.ts` (new, 19 lines)
- `hooks/useBooks.ts` (enhanced with optimistic updates, 341 lines)
- `components/list/bookListItem.tsx` (memoized, 171 lines)
- `app/(tabs)/index.tsx` (search validation, skeleton loaders, FlatList optimizations, 623 lines)
- `app/book/[id].tsx` (skeleton loader, pull-to-refresh, 242 lines)
- `services/api.ts` (repaired structure, 148 lines)
- `types/schemas.ts` (Zod v3 compatibility, 239 lines)

#### Commits
1. `57a2eff` - fix: repair corrupted api.ts file structure
2. `56e49a4` - fix: correct Zod v3 API usage and type annotations
3. `7df0609` - feat: add 3-char minimum for search and fix page flashing
4. `25c0289` - chore: remove duplicate kpiCard.tsx file
5. `32b46d1` - feat: implement toast notification system
6. `e36bf44` - feat: add skeleton loaders for loading states
7. `724e922` - feat: implement optimistic updates for mutations
8. `c472bee` - feat: add animations and micro-interactions
9. `38b8801` - feat: add FlatList performance optimizations and pull-to-refresh

---

## [0.1.0] - 2026-02-07

### Added
- Initial mobile app implementation
- Core screens: Books list, Create book, KPI dashboard, Book detail
- Tab-based navigation with Expo Router
- React Query integration for server state
- Zod validation schemas
- WCAG AA color system
- Error handling with ErrorBoundary
- API timeout configuration (30s)
- Smart pagination (auto-load for ≤50 items)
- Advanced filters (status, score, reading cycles)
- Book lifecycle management (WISH_LIST → READING → REVIEWING → COMPLETED/ABANDONED)

### Documentation
- ACCESSIBILITY.md - WCAG compliance guidelines
- DEBUGGING.md - Debugging strategies
- NETWORK_SETUP.md - Android emulator network configuration

---

## Legend

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Features marked for removal
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes
