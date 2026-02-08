````skill
---
name: mobile-accessibility
description: Enforces WCAG AA accessibility standards for color contrast, text, and interactive elements in mobile UI.
version: 1.0.0
license: MIT
---

# Mobile Accessibility Standards

## When to Use

**ALWAYS** apply when:
- Creating or styling ANY visual component
- Adding text, backgrounds, borders, or icons
- Implementing buttons, badges, alerts, or status indicators
- Writing any style object with `color`, `backgroundColor`, or `borderColor`

## ⛔ PROHIBITED: Hardcoded Colors

**NEVER hardcode hex/rgb/named colors directly in components.**

```tsx
// ❌ FORBIDDEN
<View style={{ backgroundColor: '#FFFFFF' }}>
<Text style={{ color: '#000000' }}>
<View style={{ backgroundColor: pressed ? '#E0E7FF' : '#FFF' }}>

// ❌ FORBIDDEN - even with explanation
const scoreColor = score > 5 ? '#10B981' : '#EF4444';
```

**Why?** Hardcoded colors:
- Break accessibility compliance
- Create maintenance nightmares
- Bypass contrast validation
- Block theme support (light/dark mode)

## ✅ REQUIRED: Color System

**MUST import from `@/constants/colors`** for ALL colors:

```tsx
import { Text, Background, Border, Status, Interactive, Feedback } from '@/constants/colors';

// ✅ Correct
<View style={{ backgroundColor: Background.surface }}>
<Text style={{ color: Text.primary }}>
<View style={{ borderColor: Border.default }}>
```

### Available Color Categories

1. **Background** - Page/card/surface backgrounds
2. **Text** - All text colors (primary, secondary, tertiary, disabled)
3. **Border** - Border/divider colors
4. **Status** - Book status badges (wish list, reading, completed, abandoned)
5. **Interactive** - Buttons, links, pressable elements
6. **Feedback** - Alerts, errors, warnings, success messages
7. **Shadow** - Elevation shadows

## Contrast Requirements

**All text MUST meet WCAG AA:**
- **Normal text** (< 18px): 4.5:1 minimum
- **Large text** (≥ 18px or ≥ 14px bold): 3:1 minimum
- **Interactive elements**: 3:1 against adjacent colors

The color system in `colors.ts` already meets these standards.

## Adding New Dynamic Colors

When you need colors NOT in the system (e.g., score-based colors):

### ✅ Correct Pattern

1. Add to `constants/colors.ts`:

```typescript
export const Score = {
  excellent: { background: '#D1FAE5', text: '#065F46', border: '#10B981' },
  good: { background: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  poor: { background: '#FED7AA', text: '#7C2D12', border: '#F97316' },
  bad: { background: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
} as const;

export function getScoreColor(score: number) {
  if (score >= 8) return Score.excellent;
  if (score >= 6) return Score.good;
  if (score >= 4) return Score.poor;
  return Score.bad;
}
```

2. Use in component:

```tsx
import { getScoreColor } from '@/constants/colors';

const scoreColors = getScoreColor(book.score);
<View style={{ backgroundColor: scoreColors.background }}>
  <Text style={{ color: scoreColors.text }}>★ {book.score}</Text>
</View>
```

### ❌ Incorrect Pattern

```tsx
// ❌ NEVER define color logic in components
function getScoreColor(score: number) {  // <- This belongs in colors.ts!
  if (score >= 8) return '#10B981';
  return '#EF4444';
}
```

## Text Accessibility

**Required props:**

```tsx
// MUST use selectable for data/content
<Text selectable style={{ color: Text.primary }}>
  {book.title}
</Text>

// MUST use numberOfLines for overflow
<Text numberOfLines={2}>{longText}</Text>

// SHOULD use fontVariant for numbers
<Text style={{ fontVariant: 'tabular-nums' }}>
  {pageCount}
</Text>
```

**Text sizes:**
- **Minimum for body text**: 14px (for accessibility)
- **Preferred for readability**: 16px+

## Interactive Elements

**Pressable states MUST use system colors:**

```tsx
// ✅ Correct
<Pressable
  style={({ pressed }) => ({
    backgroundColor: pressed 
      ? Interactive.primary.pressed 
      : Interactive.primary.default,
  })}
>

// ❌ Wrong
<Pressable
  style={({ pressed }) => ({
    backgroundColor: pressed ? '#1E40AF' : '#2563EB',
  })}
>
```

**Button text contrast:**
- White text on primary button: Use `Interactive.primary.text`
- Dark text on secondary button: Use `Interactive.secondary.text`

## Color Documentation

**MUST add JSDoc when adding colors:**

```typescript
/**
 * Priority Colors - Task urgency badges
 * All combinations meet WCAG AA (4.5:1 minimum)
 */
export const Priority = {
  high: {
    background: '#FEF2F2',   // red-50
    text: '#991B1B',         // red-800 - Contrast: 9.7:1 ✅
    border: '#FCA5A5',       // red-300
  },
  // ... more
} as const;
```

## Testing Contrast

**Before adding new colors, verify contrast:**
1. Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
2. Ensure 4.5:1 for normal text
3. Document contrast ratio in JSDoc

## Migration Guide

**If you find hardcoded colors:**

1. **Stop immediately** - Do not continue implementation
2. Determine what the color represents (status, feedback, interaction, etc.)
3. Check if `colors.ts` has it → Use it
4. If missing → Add to `colors.ts` first with JSDoc
5. Import and use the system color

**Example Fix:**

```tsx
// ❌ Before
<View style={{ backgroundColor: '#EFF6FF' }}>
  <Text style={{ color: '#1E40AF' }}>Reading</Text>
</View>

// ✅ After
import { getStatusColors } from '@/constants/colors';

const colors = getStatusColors(BookStatus.READING);
<View style={{ backgroundColor: colors.background }}>
  <Text style={{ color: colors.text }}>Reading</Text>
</View>
```

## Theme Support (Future)

The color system is designed for light/dark mode:
- All colors will become theme-aware
- Components using the system will automatically adapt
- Hardcoded colors will break in dark mode

## Enforcement

**Pre-commit checks:**
- Grep for hex patterns in .tsx files (should fail)
- All color usage must import from `@/constants/colors`

**Code review checklist:**
- [ ] No hardcoded hex/rgb/named colors
- [ ] All colors imported from `@/constants/colors`
- [ ] Text has appropriate color (primary/secondary/tertiary)
- [ ] Interactive elements use Interactive colors
- [ ] New colors added to `colors.ts` with contrast docs

## Related Skills

- **building-native-ui**: UI patterns and components
- **vercel-react-native-skills**: React Native performance

---

**Remember:** Accessibility is not optional. Every color choice affects real users with visual impairments.
````
