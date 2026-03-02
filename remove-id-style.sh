#!/bin/bash

# Files to update
files=(
  "src/views/repos/Commit/CommitTeaser.svelte"
  "src/views/repos/Commit.svelte"
  "src/views/repos/Cob/CobCommitTeaser.svelte"
  "src/views/repos/Cob/Revision.svelte"
  "src/views/nodes/UserAgent.svelte"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    # Remove style="commit"
    LC_ALL=C sed -i '' 's/ style="commit"//g' "$file"
    # Remove style="oid"
    LC_ALL=C sed -i '' 's/ style="oid"//g' "$file"
    # Remove style="none"
    LC_ALL=C sed -i '' 's/ style="none"//g' "$file"
  fi
done

echo "Done removing style props from Id components"
