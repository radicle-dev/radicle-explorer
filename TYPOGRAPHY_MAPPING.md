# Typography Migration Mapping: Explorer → Garden

## Overview
This document maps Explorer's separate typography tokens to Garden's combined typography tokens.

**Key Change:** Explorer uses separate tokens for size, weight, and family. Garden combines all three into single tokens using the CSS `font:` shorthand.

---

## Token Mapping Reference

### Font Size + Weight Combinations → Combined Tokens

#### Tiny Text (0.75rem / 12px)
```
font-size: var(--font-size-tiny);
font-weight: var(--font-weight-regular);
→ font: var(--txt-body-s-regular);

font-size: var(--font-size-tiny);
font-weight: var(--font-weight-medium);
→ font: var(--txt-body-s-medium);

font-size: var(--font-size-tiny);
font-weight: var(--font-weight-semibold);
→ font: var(--txt-body-s-semibold);

font-size: var(--font-size-tiny);
font-weight: var(--font-weight-bold);
→ font: var(--txt-body-s-semibold);  /* Map bold to semibold (600) */
```

#### Small Text (0.875rem / 14px) - MOST COMMON
```
font-size: var(--font-size-small);
font-weight: var(--font-weight-regular);
→ font: var(--txt-body-m-regular);

font-size: var(--font-size-small);
font-weight: var(--font-weight-medium);
→ font: var(--txt-body-m-medium);

font-size: var(--font-size-small);
font-weight: var(--font-weight-semibold);
→ font: var(--txt-body-m-semibold);

font-size: var(--font-size-small);
font-weight: var(--font-weight-bold);
→ font: var(--txt-body-m-semibold);  /* Map bold to semibold (600) */
```

#### Regular Text (1rem / 16px)
```
font-size: var(--font-size-regular);
font-weight: var(--font-weight-regular);
→ font: var(--txt-body-l-regular);

font-size: var(--font-size-regular);
font-weight: var(--font-weight-medium);
→ font: var(--txt-body-l-medium);

font-size: var(--font-size-regular);
font-weight: var(--font-weight-semibold);
→ font: var(--txt-body-l-semibold);

font-size: var(--font-size-regular);
font-weight: var(--font-weight-bold);
→ font: var(--txt-body-l-semibold);  /* Map bold to semibold (600) */
```

#### Medium Text (1.25rem / 20px) - HEADINGS
```
font-size: var(--font-size-medium);
(any weight)
→ font: var(--txt-heading-m);  /* Headings always use semibold (600) */
```

#### Large Text (1.5rem / 24px) - HEADINGS
```
font-size: var(--font-size-large);
(any weight)
→ font: var(--txt-heading-l);  /* Headings always use semibold (600) */
```

#### X-Large Text (2rem / 32px) - HEADINGS
```
font-size: var(--font-size-x-large);
(any weight)
→ font: var(--txt-heading-xl);  /* Headings always use semibold (600) */
```

#### XX-Large Text (3rem / 48px) - HEADINGS
```
font-size: var(--font-size-xx-large);
(any weight)
→ font: var(--txt-heading-xxl);  /* Headings always use semibold (600) */
```

---

## Single-Property Patterns

### Font-Size Only (No Explicit Weight)
When only `font-size` is specified, assume `--font-weight-regular` (400):

```
font-size: var(--font-size-small);
→ font: var(--txt-body-m-regular);

font-size: var(--font-size-tiny);
→ font: var(--txt-body-s-regular);

font-size: var(--font-size-regular);
→ font: var(--txt-body-l-regular);
```

For heading sizes, use heading tokens (always semibold):
```
font-size: var(--font-size-medium);
→ font: var(--txt-heading-m);

font-size: var(--font-size-large);
→ font: var(--txt-heading-l);
```

### Font-Weight Only (No Explicit Size)
**Context-dependent** - requires manual review:
- Check parent element or inherited size
- Common in Button, Badge variants
- Look for semantics: is this body text or a heading?

### Font-Family Only

#### Monospace Font
```
font-family: var(--font-family-monospace);
→ font: var(--txt-code-regular);
```

**Note:** If size/weight are also specified with monospace, still use `--txt-code-regular` or `--txt-code-bold`:
```
font-family: var(--font-family-monospace);
font-size: var(--font-size-small);
font-weight: var(--font-weight-bold);
→ font: var(--txt-code-bold);
```

#### Sans-Serif Font
```
font-family: var(--font-family-sans-serif);
→ (remove - Booton is now the default)
```

---

## Special Cases

### Multi-Line Property Blocks
When typography properties are on separate lines, consolidate into single `font:` declaration:

**Before:**
```css
.element {
  font-family: var(--font-family-sans-serif);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-semibold);
  line-height: 1.2;
}
```

**After:**
```css
.element {
  font: var(--txt-body-m-semibold);
  /* Note: line-height is now built into the token */
}
```

### Inline Styles (Svelte)
Apply same mappings to inline `style:` attributes:

**Before:**
```html
<div style:font-size="var(--font-size-small)">
```

**After:**
```html
<div style:font="var(--txt-body-m-regular)">
```

### Calc() Expressions
**Manual review required** - determine semantic intent:

**Example:**
```css
font-size: calc(var(--font-size-x-large) * 0.75);
```

**Analysis:**
- `--font-size-x-large` = 2rem
- 2rem * 0.75 = 1.5rem
- This equals `--font-size-large` (1.5rem)
- **Map to:** `font: var(--txt-heading-l);`

### Utility Classes

**Before (Explorer):**
```
.txt-tiny       →  .txt-body-s-regular
.txt-small      →  .txt-body-m-regular
.txt-regular    →  .txt-body-l-regular
.txt-medium     →  .txt-heading-m
.txt-large      →  .txt-heading-l
.txt-huge       →  .txt-heading-xl
.txt-humongous  →  .txt-heading-xxl
.txt-bold       →  (remove - use -semibold variant instead)
.txt-semibold   →  (remove - use -semibold variant instead)
.txt-monospace  →  .txt-code-regular
```

**After (Garden):**
Garden provides these utility classes in typography.css:
- `.txt-heading-xxs`, `.txt-heading-xs`, `.txt-heading-s`, `.txt-heading-m`, `.txt-heading-l`, `.txt-heading-xl`, `.txt-heading-xxl`
- `.txt-body-s-regular`, `.txt-body-s-medium`, `.txt-body-s-semibold`
- `.txt-body-m-regular`, `.txt-body-m-medium`, `.txt-body-m-semibold`
- `.txt-body-l-regular`, `.txt-body-l-medium`, `.txt-body-l-semibold`
- `.txt-code-regular`, `.txt-code-bold`

---

## Context-Specific Guidelines

### Buttons
- Default buttons: `font: var(--txt-body-m-semibold);`
- Large buttons: `font: var(--txt-body-l-semibold);`
- Small buttons: `font: var(--txt-body-s-semibold);`

### Badges
- Small badges: `font: var(--txt-body-s-regular);`
- Regular badges: `font: var(--txt-body-m-regular);`

### Headings / Titles
- Page titles: `font: var(--txt-heading-l);`
- Section titles: `font: var(--txt-heading-m);`
- Small headers: `font: var(--txt-heading-s);`

### Body Text
- Primary content: `font: var(--txt-body-m-regular);`
- Secondary/meta text: `font: var(--txt-body-s-regular);`
- Emphasis: Use `-medium` or `-semibold` variant

### Code / Monospace
- Code blocks: `font: var(--txt-code-regular);`
- Bold code: `font: var(--txt-code-bold);`
- IDs/hashes: `font: var(--txt-code-regular);` (via `.txt-id` class)

### Forms / Inputs
- Input text: `font: var(--txt-body-m-regular);`
- Labels: `font: var(--txt-body-m-medium);`
- Helper text: `font: var(--txt-body-s-regular);`

---

## Migration Decision Tree

```
1. Does it specify font-family: monospace?
   YES → Use --txt-code-regular or --txt-code-bold
   NO  → Continue to step 2

2. What is the font-size?
   - tiny (0.75rem)   → --txt-body-s-*
   - small (0.875rem) → --txt-body-m-*
   - regular (1rem)   → --txt-body-l-*
   - medium+ (≥1.25rem) → --txt-heading-*

3. What is the font-weight?
   - regular (400)   → *-regular variant
   - medium (500)    → *-medium variant
   - semibold (600)  → *-semibold variant
   - bold (700)      → *-semibold variant (map to 600)

4. Is this a heading context?
   YES → Use --txt-heading-* (always semibold)
   NO  → Use --txt-body-* with appropriate weight
```

---

## Font Weight Changes

**Explorer weights:**
- Regular: 400
- Medium: 500
- SemiBold: 600
- Bold: 700

**Garden weights:**
- Regular: 400
- Medium: **468** ← Custom weight
- SemiBold: 600
- (Bold 700 removed - map to 600)

**Impact:** Weight 500 → 468 is subtle, weight 700 → 600 is more noticeable but semantically correct (headings should be semibold, not bold).

---

## Line Height Changes

**Explorer:** Line heights not embedded in tokens, often specified separately

**Garden:** Line heights embedded in combined tokens:
- Body-s: 1rem line-height (0.75rem font size)
- Body-m: 1.25rem line-height (0.875rem font size)
- Body-l: 1.5rem line-height (1rem font size)
- Headings: Varied, optimized per size

**Impact:** Vertical spacing may change slightly. Review components with tight spacing (badges, buttons, inline elements).

---

## Files Using Typography Tokens

**High-priority components (frequent usage):**
1. Badge.svelte - 5+ font-size declarations
2. Button.svelte - 5+ combined properties
3. Markdown.svelte - 6+ font-size, uses calc()
4. Modal.svelte
5. Command.svelte
6. ErrorMessage.svelte
7. Commit/CommitTeaser.svelte
8. Issue/IssueTeaser.svelte
9. Patch/PatchTeaser.svelte
10. FileDiff.svelte

**Total:** 100+ component files

---

## Verification Checklist

After migration, verify:
- [ ] No references to `--font-size-*` tokens remain
- [ ] No references to `--font-weight-*` tokens remain (except in comments)
- [ ] No references to `--font-family-sans-serif` remain
- [ ] `--font-family-monospace` replaced with `--txt-code-*` tokens
- [ ] All calc() expressions resolved to static tokens
- [ ] Utility classes updated (.txt-small → .txt-body-m-regular)
- [ ] Booton font loads correctly in browser
- [ ] Line heights look correct (no clipping/overlap)
- [ ] Text doesn't overflow containers
- [ ] Buttons/badges render properly
- [ ] Code blocks use monospace font
- [ ] Headings use semibold weight (600)
