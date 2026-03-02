# ID Colors Fixed for Dark Mode ✓

## Issue
Global OID (object IDs) were using `--color-surface-brand-primary` (bright green) which had poor contrast on dark backgrounds, especially in dark mode. The bright brand color was intended for backgrounds, not text.

## Root Cause
Explorer was using two different classes for IDs:
- `.global-oid` - Used bright brand color (`--color-surface-brand-primary`)
- `.global-commit` - Used gray text color (`--color-text-tertiary`)

This inconsistency caused visibility issues in dark mode where the brand color would blend into darker backgrounds.

## Garden's Approach
Garden uses a single `.txt-id` class for all IDs:
- Color: `--color-text-tertiary` (gray, works in both light and dark themes)
- Font: Monospace, small size
- No hover color changes - IDs remain gray on hover
- Only underline appears on hover when wrapped in a link

## Solution
Unified all ID styling to match Garden's approach:

### 1. Updated `public/index.css`
**Before:**
```css
.global-oid {
  color: var(--color-surface-brand-primary);  /* ❌ Bright brand color */
  font-size: var(--font-size-small);
  family: var(--font-family-monospace);
  font-weight: var(--font-weight-regular);
}

.global-commit {
  color: var(--color-text-tertiary);          /* ✓ Already correct */
  font-size: var(--font-size-small);
  font-family: var(--font-family-monospace);
  font-weight: var(--font-weight-semibold);
}
```

**After:**
```css
.txt-id {
  color: var(--color-text-tertiary);          /* ✓ Gray text for all IDs */
  font-size: var(--font-size-small);
  font-family: var(--font-family-monospace);
  font-weight: var(--font-weight-regular);
}
```

### 2. Updated `src/components/Id.svelte`
**Removed:**
- `style` prop (no longer needed - all IDs are gray)
- `.target-oid:hover` and `.target-commit:hover` color change rules
- `class="target-{style} global-{style}"` dynamic classes

**Changed to:**
- `class="txt-id"` for all ID elements

### 3. Updated Direct Class References
**Files changed:**
- `src/views/repos/components/CommitButton.svelte` - `global-commit` → `txt-id`
- `src/views/repos/Commit.svelte` - `global-commit` → `txt-id`

### 4. Cleaned Up Id Component Usages
**Removed `style` prop from all Id components in:**
- `src/views/repos/Commit/CommitTeaser.svelte`
- `src/views/repos/Commit.svelte`
- `src/views/repos/Cob/CobCommitTeaser.svelte`
- `src/views/repos/Cob/Revision.svelte`
- `src/views/nodes/UserAgent.svelte`

## Visual Results

✓ All IDs (commit hashes, node IDs, etc.) now use gray color consistently
✓ IDs maintain proper contrast on all background colors
✓ Works correctly in both light and dark themes
✓ No more bright brand colors for text elements
✓ Hover behavior is consistent - no color changes, just underline when clickable
✓ Matches Garden's clean, unified approach

## Related Fixes
- Part of the color migration from Explorer → Garden design system
- Related to icon color fixes (ICON_COLORS_FIXED.md)
- Related to hover state fixes (HOVER_STATES_FIXED.md)
