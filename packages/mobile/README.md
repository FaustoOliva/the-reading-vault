# The Reading Vault - Mobile App 📚

React Native mobile client for The Reading Vault, a book tracking application focused on Clean Architecture and user experience excellence.

## Overview

This is an [Expo](https://expo.dev) React Native application that provides a polished mobile interface for managing your personal reading library. Track books, log reading sessions, monitor progress, and analyze reading habits with WCAG AA accessibility compliance.

## Features

### Core Functionality
- **Book Management**: Create, edit, and organize your reading collection
- **Reading Sessions**: Log page progress and track reading time
- **Book States**: Manage books through their lifecycle (Wish List → Reading → Reviewing → Completed/Abandoned)
- **Reading Cycles**: Support multiple reading attempts per book
- **KPI Dashboard**: Visualize reading statistics and metrics

### User Experience Enhancements
- **🎨 Toast Notifications**: Non-blocking feedback using `react-native-toast-message`
- **💀 Skeleton Loaders**: Smooth loading states that match actual content layout
- **⚡ Optimistic Updates**: Instant UI feedback before server confirmation
- **✨ Micro-interactions**: Fade-in animations and scale feedback (respects `prefers-reduced-motion`)
- **🚀 Performance Optimization**: React.memo, FlatList optimizations, pull-to-refresh
- **♿ Accessibility**: WCAG AA color contrast (4.5:1+), semantic labels, reduced motion support

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- Android Studio (for Android) or Xcode (for iOS)

### Installation

1. **Install dependencies**
   ```bash
   cd packages/mobile
   npm install
   ```

2. **Configure API endpoint**
   
   Edit [services/api.ts](services/api.ts#L8) and set your API base URL:
   ```typescript
   const API_BASE_URL = 'http://YOUR_API_HOST:5001/api';
   ```

3. **Start development server**
   ```bash
   npx expo start
   ```

4. **Run on device/emulator**
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Scan QR code with Expo Go app for physical device

## Architecture

### Tech Stack
- **Framework**: React Native + Expo SDK 52
- **Routing**: Expo Router (file-based)
- **Language**: TypeScript (95%+)
- **Server State**: React Query (TanStack Query v5)
- **Validation**: Zod 3.x
- **Animations**: React Native Reanimated 4.x
- **Notifications**: React Native Toast Message 2.x

### Project Structure
```
app/
├── (tabs)/           # Tab-based navigation
│   ├── index.tsx     # Books list with filters
│   ├── create-book.tsx
│   └── kpi.tsx       # Reading statistics
├── book/[id].tsx     # Book detail screen
└── _layout.tsx       # Root layout with providers

components/
├── cards/            # Composite UI sections
├── list/             # List items + skeleton loaders
├── modals/           # Bottom sheet modals
└── ui/               # Reusable UI primitives (toast, animated, skeleton)

hooks/
├── useBooks.ts       # React Query hooks with optimistic updates
└── useReducedMotion.ts  # Accessibility hook

services/
└── api.ts            # Centralized fetch wrapper (30s timeout, AbortController)

types/
├── book.ts           # Domain type definitions
└── schemas.ts        # Zod validation schemas
```

### State Management Boundaries
- **Server State** (React Query): Books, KPIs, authors, countries
- **UI State** (useState): Modal visibility, filters, search
- **Form State** (Zod): Validation + submission state

## Key Implementation Details

### Performance Optimizations
- **React.memo**: BookListItem memoized with custom comparison (prevents re-renders)
- **FlatList**: `removeClippedSubviews`, `maxToRenderPerBatch`, `windowSize` tuning
- **Pull-to-Refresh**: RefreshControl on both list and detail screens

### Animations System
```typescript
// components/ui/animated.tsx
<FadeInView duration={200}>  {/* Respects prefers-reduced-motion */}
  <YourComponent />
</FadeInView>

<ScaleButton onPress={...}>  {/* Spring physics feedback */}
  <Text>Press Me</Text>
</ScaleButton>
```

### Toast Notifications
```typescript
import { showToast } from '@/components/ui/toast';

showToast.success('Book created successfully');
showToast.error('Failed to update book');
showToast.info('Calculating statistics...');
showToast.warning('Incomplete data detected');
```

### Optimistic Updates Pattern
All mutations (update, reopen, request review) implement:
1. **onMutate**: Cancel refetch, snapshot previous state, optimistically update cache
2. **onError**: Rollback to snapshot
3. **onSuccess**: Invalidate queries to sync with server

## Development Guidelines

### Code Standards
- **Language**: English (code, comments, commits)
- **Naming**: camelCase (files/vars), PascalCase (components/types)
- **Commits**: Conventional Commits (`feat(mobile):`, `fix(mobile):`)
- **Validation**: Only in form submission (Zod schemas)
- **Errors**: Never throw raw strings, extend `Error` class

### Testing
```bash
npm run test              # Run test suite
npm run test:coverage     # Generate coverage report
```

Target coverage: 70-80%

### Accessibility Checklist
- [ ] All Pressable/TouchableOpacity have `accessibilityRole`
- [ ] Images have `accessibilityLabel`
- [ ] Color contrast ≥ 4.5:1 (WCAG AA)
- [ ] Animations respect `useReducedMotion()`
- [ ] Forms have clear error messages

## API Integration

The app expects a REST API at the configured base URL with the following endpoints:

- `GET /books` - List books with filters/pagination
- `POST /books` - Create new book
- `GET /books/:id` - Get book details with stats
- `PUT /books/:id` - Update book
- `POST /books/:id/reopen` - Start new reading cycle
- `POST /books/:id/request-review` - Request manual review
- `POST /reading-sessions` - Log reading session
- `GET /kpi` - Get reading statistics
- `GET /authors` - List authors (autocomplete)
- `GET /countries` - List countries (autocomplete)

See [backend USE_CASES.md](../api/USE_CASES.MD) for detailed API contracts.

## Troubleshooting

### Network Issues
See [NETWORK_SETUP.md](NETWORK_SETUP.md) for Android emulator configuration.

### Debugging
See [DEBUGGING.md](DEBUGGING.md) for debugging strategies and tools.

### Accessibility Testing
See [ACCESSIBILITY.md](ACCESSIBILITY.md) for color contrast ratios and WCAG compliance.

## Documentation

- **Architecture**: This file
- **Domain Rules**: [DOMAIN.md](../../DOMAIN.md) (business logic)
- **Agent Guidelines**: [AGENTS.md](../../AGENTS.md) (AI assistant rules)
- **API Endpoints**: [endpoints.md](../../endpoints.md)

## Contributing

This project follows Clean Architecture principles:
- No business logic in UI components
- Validation only at form submission boundaries
- Server state managed by React Query
- Type safety enforced with TypeScript strict mode

## License

Private project - The Reading Vault
