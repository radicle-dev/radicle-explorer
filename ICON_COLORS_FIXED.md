# Icon Colors Fixed for Contrast ✓

## Issue
State icons (issue/patch status) were using background/surface colors that blended into hover states, making them barely visible.

## Root Cause
The icons were styled with light colors meant for backgrounds:
- `--color-feedback-success-bg` (light green background color)
- `--color-surface-merged` (light blue surface color)
- `--color-surface-brand-primary` (brand green)

When hover states applied a darker background (`--color-surface-mid`), these light icon colors disappeared into the background.

## Solution
Changed all state icons to use **text colors** which are designed for proper contrast:

### Files Fixed

#### 1. Issues.svelte (Filter Dropdown)
**Before:**
```javascript
const stateColor = {
  open: "var(--color-feedback-success-bg)",    // ❌ Light green bg
  closed: "var(--color-feedback-error-text)",  // ✓ Already correct
};
```

**After:**
```javascript
const stateColor = {
  open: "var(--color-text-open)",              // ✓ Green text
  closed: "var(--color-feedback-error-text)",  // ✓ Red text
};
```

#### 2. Patches.svelte (Filter Dropdown)
**Before:**
```javascript
const stateColor = {
  draft: "var(--color-text-tertiary)",         // ✓ Already correct
  open: "var(--color-feedback-success-bg)",    // ❌ Light green bg
  archived: "var(--color-text-archived)",      // ✓ Already correct
  merged: "var(--color-surface-merged)",       // ❌ Light blue surface
};
```

**After:**
```javascript
const stateColor = {
  draft: "var(--color-text-tertiary)",         // ✓ Gray text
  open: "var(--color-text-open)",              // ✓ Green text
  archived: "var(--color-text-archived)",      // ✓ Pink text
  merged: "var(--color-text-merged)",          // ✓ Blue text
};
```

#### 3. IssueTeaser.svelte (List Items)
**Before:**
```css
.open {
  color: var(--color-feedback-success-bg);    /* ❌ Light green bg */
}
.closed {
  color: var(--color-feedback-error-text);    /* ✓ Already correct */
}
```

**After:**
```css
.open {
  color: var(--color-text-open);              /* ✓ Green text */
}
.closed {
  color: var(--color-feedback-error-text);    /* ✓ Red text */
}
```

#### 4. PatchTeaser.svelte (List Items)
**Before:**
```css
.draft {
  color: var(--color-text-tertiary);          /* ✓ Already correct */
}
.open {
  color: var(--color-feedback-success-bg);    /* ❌ Light green bg */
}
.archived {
  color: var(--color-text-archived);          /* ✓ Already correct */
}
.merged {
  color: var(--color-surface-brand-primary);  /* ❌ Brand green */
}
```

**After:**
```css
.draft {
  color: var(--color-text-tertiary);          /* ✓ Gray text */
}
.open {
  color: var(--color-text-open);              /* ✓ Green text */
}
.archived {
  color: var(--color-text-archived);          /* ✓ Pink text */
}
.merged {
  color: var(--color-text-merged);            /* ✓ Blue text */
}
```

## Semantic Color Meanings

The new text colors maintain semantic meanings from the Garden design system:
- **Open** (green): `--color-text-open` - Success/active state
- **Closed** (red): `--color-feedback-error-text` - Error/closed state
- **Draft** (gray): `--color-text-tertiary` - Muted/inactive state
- **Merged** (blue): `--color-text-merged` - Completed/merged state
- **Archived** (pink): `--color-text-archived` - Archived state

## Visual Results

✓ Icons are clearly visible on default backgrounds (surface-subtle)
✓ Icons maintain visibility on hover states (surface-mid)
✓ Icons maintain visibility on selected states (surface-strong)
✓ Semantic colors are preserved (green=open, blue=merged, etc.)
✓ Works in both light and dark themes

## Related Fixes
- Part of the color migration from Explorer → Garden design system
- Related to hover state fixes (HOVER_STATES_FIXED.md)
