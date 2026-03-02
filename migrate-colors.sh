#!/bin/bash

# Color Token Migration Script
# This script performs systematic search-and-replace for old color tokens to new ones

set -e

# Simple approach: use parallel arrays instead of associative array
old_tokens=(
  "--color-foreground-contrast"
  "--color-foreground-dim"
  "--color-foreground-disabled"
  "--color-foregroung-disabled"
  "--color-foreground-success"
  "--color-foreground-red"
  "--color-foreground-yellow"
  "--color-foreground-emphasized-hover"
  "--color-foreground-match-background"
  "--color-foreground-white"
  "--color-foreground-black"
  "--color-background-default"
  "--color-background-float"
  "--color-background-dip"
  "--color-fill-ghost"
  "--color-fill-ghost-hover"
  "--color-fill-float"
  "--color-fill-float-hover"
  "--color-fill-secondary"
  "--color-fill-secondary-hover"
  "--color-fill-gray"
  "--color-fill-selected"
  "--color-fill-separator"
  "--color-fill-counter"
  "--color-fill-merged"
  "--color-fill-delegate"
  "--color-fill-private"
  "--color-fill-diff-green"
  "--color-fill-diff-green-light"
  "--color-fill-diff-red"
  "--color-fill-diff-red-light"
  "--color-fill-success"
  "--color-fill-warning"
  "--color-fill-contrast"
  "--color-border-hint"
  "--color-border-default"
  "--color-border-focus"
  "--color-border-primary"
  "--color-border-error"
  "--color-border-warning"
  "--color-border-success"
)

new_tokens=(
  "--color-text-primary"
  "--color-text-tertiary"
  "--color-text-disabled"
  "--color-text-disabled"
  "--color-text-open"
  "--color-feedback-error-text"
  "--color-text-archived"
  "--color-text-on-brand"
  "--color-text-on-brand"
  "#ffffff"
  "#000000"
  "--color-surface-base"
  "--color-surface-subtle"
  "--color-surface-base"
  "--color-surface-mid"
  "--color-surface-strong"
  "--color-surface-subtle"
  "--color-border-alpha-subtle"
  "--color-surface-brand-primary"
  "--color-surface-brand-secondary"
  "--color-text-tertiary"
  "--color-surface-brand-primary"
  "--color-border-subtle"
  "--color-surface-alpha-subtle"
  "--color-surface-merged"
  "--color-surface-merged"
  "--color-surface-archived"
  "--color-feedback-success-bg"
  "--color-feedback-success-bg"
  "--color-feedback-error-bg"
  "--color-feedback-error-bg"
  "--color-feedback-success-bg"
  "--color-feedback-warning-bg"
  "--color-text-primary"
  "--color-border-subtle"
  "--color-border-mid"
  "--color-border-brand"
  "--color-border-brand"
  "--color-feedback-error-border"
  "--color-feedback-warning-border"
  "--color-feedback-success-border"
)

# Files to process
FILES=$(find src public -type f \( -name "*.svelte" -o -name "*.css" \) ! -path "*/node_modules/*")

echo "Migrating color tokens in $(echo "$FILES" | wc -l) files..."

# Iterate through parallel arrays
for i in "${!old_tokens[@]}"; do
  old="${old_tokens[$i]}"
  new="${new_tokens[$i]}"
  echo "Replacing: $old → $new"

  for file in $FILES; do
    if [ -f "$file" ]; then
      # Use sed for replacement (macOS compatible)
      LC_ALL=C sed -i '' "s|var($old)|var($new)|g" "$file" || true
      # Also handle the token definition itself (in case it appears in comments or strings)
      LC_ALL=C sed -i '' "s|$old|$new|g" "$file" || true
    fi
  done
done

echo "✓ Basic replacements complete"
echo ""
echo "⚠️  Manual review required for context-dependent tokens:"
echo "  - --color-foreground-emphasized (sometimes text, sometimes surface)"
echo "  - --color-foreground-primary (context-dependent)"
echo "  - --color-fill-primary (context-dependent)"
echo "  - --color-fill-yellow and --color-fill-yellow-iconic"
echo "  - --color-border-selected, --color-border-merged, --color-border-contrast"
echo ""
echo "Run: grep -r 'foreground-emphasized\|foreground-primary\|fill-primary\|fill-yellow\|border-selected\|border-merged\|border-contrast' src/"
