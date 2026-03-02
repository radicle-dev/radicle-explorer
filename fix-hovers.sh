#!/bin/bash

# Fix hover state color tokens
# The -hover variants don't exist in the new color system

set -e

FILES=$(find src public -type f \( -name "*.svelte" -o -name "*.css" \) ! -path "*/node_modules/*")

echo "Fixing hover state tokens..."

# Fix the primary brand hover
for file in $FILES; do
  if [ -f "$file" ]; then
    LC_ALL=C sed -i '' "s|var(--color-surface-brand-primary-hover)|var(--color-surface-brand-secondary)|g" "$file" || true
  fi
done
echo "✓ Fixed surface-brand-primary-hover → surface-brand-secondary"

# Fix surface-mid-hover (should be surface-strong)
for file in $FILES; do
  if [ -f "$file" ]; then
    LC_ALL=C sed -i '' "s|var(--color-surface-mid-hover)|var(--color-surface-strong)|g" "$file" || true
  fi
done
echo "✓ Fixed surface-mid-hover → surface-strong"

# Fix surface-subtle-hover (should be surface-mid)
for file in $FILES; do
  if [ -f "$file" ]; then
    LC_ALL=C sed -i '' "s|var(--color-surface-subtle-hover)|var(--color-surface-mid)|g" "$file" || true
  fi
done
echo "✓ Fixed surface-subtle-hover → surface-mid"

echo ""
echo "✓ All hover states fixed"
