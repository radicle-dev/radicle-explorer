#!/bin/bash

# Typography Migration Script: Explorer → Garden
# Migrates from separate typography tokens to combined tokens

set -e

echo "========================================"
echo "Typography Migration Script"
echo "Explorer → Garden Design System"
echo "========================================"
echo ""

# Count files to process
total_files=$(find src -name "*.svelte" | wc -l | tr -d ' ')
echo "Found $total_files Svelte files to process"
echo ""

# Create backup
echo "Creating backup..."
backup_dir="typography-migration-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"
cp -r src "$backup_dir/"
echo "Backup created in: $backup_dir"
echo ""

# Log file
log_file="typography-migration.log"
echo "Migration started at $(date)" > "$log_file"
echo "======================================" >> "$log_file"
echo "" >> "$log_file"

processed=0
modified=0

echo "Starting migration..."
echo ""

# Process each Svelte file
for file in $(find src -name "*.svelte"); do
  processed=$((processed + 1))

  # Create temp file for changes
  temp_file="${file}.tmp"
  cp "$file" "$temp_file"

  changes_made=false

  # ====================
  # PASS 1: Font-size + regular weight (most common)
  # ====================

  # Tiny + regular
  if grep -q "font-size: var(--font-size-tiny)" "$temp_file"; then
    LC_ALL=C sed -i '' 's/font-size: var(--font-size-tiny);/font: var(--txt-body-s-regular);/g' "$temp_file"
    changes_made=true
    echo "  [tiny→body-s-regular] $file" >> "$log_file"
  fi

  # Small + regular (MOST COMMON)
  if grep -q "font-size: var(--font-size-small)" "$temp_file"; then
    LC_ALL=C sed -i '' 's/font-size: var(--font-size-small);/font: var(--txt-body-m-regular);/g' "$temp_file"
    changes_made=true
    echo "  [small→body-m-regular] $file" >> "$log_file"
  fi

  # Regular + regular
  if grep -q "font-size: var(--font-size-regular)" "$temp_file"; then
    LC_ALL=C sed -i '' 's/font-size: var(--font-size-regular);/font: var(--txt-body-l-regular);/g' "$temp_file"
    changes_made=true
    echo "  [regular→body-l-regular] $file" >> "$log_file"
  fi

  # Medium → heading-m (headings always semibold)
  if grep -q "font-size: var(--font-size-medium)" "$temp_file"; then
    LC_ALL=C sed -i '' 's/font-size: var(--font-size-medium);/font: var(--txt-heading-m);/g' "$temp_file"
    changes_made=true
    echo "  [medium→heading-m] $file" >> "$log_file"
  fi

  # Large → heading-l
  if grep -q "font-size: var(--font-size-large)" "$temp_file"; then
    LC_ALL=C sed -i '' 's/font-size: var(--font-size-large);/font: var(--txt-heading-l);/g' "$temp_file"
    changes_made=true
    echo "  [large→heading-l] $file" >> "$log_file"
  fi

  # X-Large → heading-xl
  if grep -q "font-size: var(--font-size-x-large)" "$temp_file"; then
    LC_ALL=C sed -i '' 's/font-size: var(--font-size-x-large);/font: var(--txt-heading-xl);/g' "$temp_file"
    changes_made=true
    echo "  [x-large→heading-xl] $file" >> "$log_file"
  fi

  # XX-Large → heading-xxl
  if grep -q "font-size: var(--font-size-xx-large)" "$temp_file"; then
    LC_ALL=C sed -i '' 's/font-size: var(--font-size-xx-large);/font: var(--txt-heading-xxl);/g' "$temp_file"
    changes_made=true
    echo "  [xx-large→heading-xxl] $file" >> "$log_file"
  fi

  # ====================
  # PASS 2: Font-weight standalone (leave for manual review)
  # Just add TODO comments for now
  # ====================

  if grep -q "font-weight: var(--font-weight-" "$temp_file"; then
    # Just log it for manual review
    echo "  [MANUAL] Font-weight without size in $file" >> "$log_file"
  fi

  # ====================
  # PASS 3: Font-family monospace → code font
  # ====================

  if grep -q "font-family: var(--font-family-monospace)" "$temp_file"; then
    LC_ALL=C sed -i '' 's/font-family: var(--font-family-monospace);/font: var(--txt-code-regular);/g' "$temp_file"
    changes_made=true
    echo "  [monospace→code-regular] $file" >> "$log_file"
  fi

  # ====================
  # PASS 4: Remove font-family sans-serif (Booton is default)
  # ====================

  if grep -q "font-family: var(--font-family-sans-serif)" "$temp_file"; then
    # Remove the entire line
    LC_ALL=C sed -i '' '/font-family: var(--font-family-sans-serif);/d' "$temp_file"
    changes_made=true
    echo "  [removed sans-serif] $file" >> "$log_file"
  fi

  # ====================
  # PASS 5: Inline style attributes
  # ====================

  # style:font-size="var(--font-size-small)" → style:font="var(--txt-body-m-regular)"
  if grep -q 'style:font-size="var(--font-size-small)"' "$temp_file"; then
    LC_ALL=C sed -i '' 's/style:font-size="var(--font-size-small)"/style:font="var(--txt-body-m-regular)"/g' "$temp_file"
    changes_made=true
    echo "  [inline-small→body-m] $file" >> "$log_file"
  fi

  if grep -q 'style:font-size="var(--font-size-tiny)"' "$temp_file"; then
    LC_ALL=C sed -i '' 's/style:font-size="var(--font-size-tiny)"/style:font="var(--txt-body-s-regular)"/g' "$temp_file"
    changes_made=true
    echo "  [inline-tiny→body-s] $file" >> "$log_file"
  fi

  # Apply changes if any were made
  if [ "$changes_made" = true ]; then
    mv "$temp_file" "$file"
    modified=$((modified + 1))

    # Show progress every 10 files
    if [ $((processed % 10)) -eq 0 ]; then
      echo "  Processed $processed/$total_files files..."
    fi
  else
    rm "$temp_file"
  fi
done

echo ""
echo "========================================"
echo "Migration Summary"
echo "========================================"
echo "Total files processed: $processed"
echo "Files modified: $modified"
echo "Files unchanged: $((processed - modified))"
echo ""
echo "Log file: $log_file"
echo "Backup: $backup_dir"
echo ""
echo "Next steps:"
echo "1. Review migration log for MANUAL review items"
echo "2. Check for remaining old tokens: grep -r 'font-size-\\|font-weight-' src/"
echo "3. Handle multi-line property blocks manually"
echo "4. Update utility classes in templates"
echo "5. Test the application"
echo ""
echo "Migration completed at $(date)" >> "$log_file"
