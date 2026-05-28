#!/usr/bin/env bash
#
# find-mixed-library-files.sh
#
# Lists files that import from BOTH shadcn (`src/components/ui/`) AND Fluent
# UI v9 (`@fluentui/react-components`). These are the highest-priority
# candidates for the long-tail migration described in
# docs/UI_LIBRARY_POLICY.md — they're already half-done.
#
# Usage:
#   bash scripts/find-mixed-library-files.sh

set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="$REPO_ROOT/src"

# Files importing shadcn (anywhere in src/, excluding ui/ itself)
SHADCN_FILES=$(grep -rlE 'from ["'"'"'](\.\.?/)+ui/[a-z-]+["'"'"']|from ["'"'"']@/components/ui/[a-z-]+["'"'"']' \
  --include='*.ts' --include='*.tsx' "$SRC_DIR" 2>/dev/null | grep -v "/ui/" | sort -u || true)

# Files importing Fluent v9
FLUENT_FILES=$(grep -rlE 'from ["'"'"']@fluentui/react-components["'"'"']' \
  --include='*.ts' --include='*.tsx' "$SRC_DIR" 2>/dev/null | sort -u || true)

# Intersection
MIXED=$(comm -12 <(echo "$SHADCN_FILES") <(echo "$FLUENT_FILES"))

if [ -z "$MIXED" ]; then
  echo "No mixed-library files found."
  exit 0
fi

count=$(echo "$MIXED" | wc -l)
echo "$count file(s) import BOTH shadcn AND Fluent v9 — prioritize for migration:"
echo
echo "$MIXED" | sed -E "s|^${REPO_ROOT}/||" | sed 's/^/  /'
