# Hover States Fixed ✓

## Issue
Hover states were broken because the migration script didn't account for `-hover` suffix tokens that don't exist in the Garden color system.

## Root Cause
The old Explorer system used explicit `-hover` tokens:
- `--color-surface-brand-primary-hover`
- `--color-surface-mid-hover`
- `--color-surface-subtle-hover`

Garden uses a **hierarchical approach** instead - go one level darker for hover:
```
surface-subtle → surface-mid (hover)
surface-mid → surface-strong (hover)
surface-brand-primary → surface-brand-secondary (hover)
```

## Fixes Applied

### 1. Brand Hover (3 occurrences)
**Before:** `--color-surface-brand-primary-hover`
**After:** `--color-surface-brand-secondary`

**Affected:**
- Button secondary variant hover
- ExternalLink hover

### 2. Mid Surface Hover (10 occurrences)
**Before:** `--color-surface-mid-hover`
**After:** `--color-surface-strong`

**Affected:**
- Button gray/gray-white/not-selected hover
- Dropdown items hover
- File tree items hover
- Seed button hover
- Sidebar navigation hover
- Header elements hover

### 3. Subtle Surface Hover (11 occurrences)
**Before:** `--color-surface-subtle-hover`
**After:** `--color-surface-mid`

**Affected:**
- Button selected state
- RepoCard hover
- CommitTeaser hover
- FileDiff hover
- Blob line hover
- PatchTeaser hover
- IssueTeaser hover

### 4. Tab Button Special Case
**Before:** `--color-surface-mid` (incorrect from previous migration)
**After:** `--color-border-alpha-subtle` (matches Garden)

Garden uses the alpha variant for very subtle hover on transparent tabs.

### 5. Seed Button Counter
**Before:** `--color-surface-brand-primary-counter` (token doesn't exist)
**After:** `--color-surface-brand-secondary`

### 6. Markdown Footnote
**Before:** `--color-foreground` (old token)
**After:** `--color-text-primary`

## Files Modified

**Components (5):**
- Button.svelte (multiple hover states)
- DropdownList/DropdownListItem.svelte
- ExternalLink.svelte
- RepoCard.svelte
- Markdown.svelte

**Views (11):**
- views/repos/Header.svelte
- views/repos/Header/SeedButton.svelte
- views/repos/Sidebar.svelte
- views/repos/Commit/CommitTeaser.svelte
- views/repos/Patch/PatchTeaser.svelte
- views/repos/Issue/IssueTeaser.svelte
- views/repos/Changeset/FileDiff.svelte
- views/repos/Source/Blob.svelte
- views/repos/Source/Tree/File.svelte

## Verification

All hover states should now work correctly:
- ✓ Tab buttons show hover background
- ✓ Dropdown items highlight on hover
- ✓ Seed button shows hover state
- ✓ Branch selector dropdown trigger shows hover
- ✓ File tree items highlight on hover
- ✓ Card/teaser components show hover state

Test both light and dark themes to verify visual appearance.
