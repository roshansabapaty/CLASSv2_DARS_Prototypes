#!/usr/bin/env bash
#
# find-shadcn-import-counts.sh
#
# Counts how many distinct files in src/ import each shadcn primitive from
# src/components/ui/. Used by:
#   1. The Phase 0 gap-component audit (one-off, decides what Phase 3 builds).
#   2. The MIGRATION_PROGRESS.md dashboard (recurring, tracks migration trend).
#
# Usage:
#   scripts/find-shadcn-import-counts.sh           # human-readable table
#   scripts/find-shadcn-import-counts.sh --markdown # markdown table for the dashboard
#
# Output columns: <count> <primitive>
#   - <count> = number of distinct files under src/ that import that primitive
#   - <primitive> = the file basename in src/components/ui/ (without .tsx)

set -eu
# pipefail is intentionally NOT set: `grep -rl` with no matches exits 1, which
# is normal for primitives nobody imports. The pipeline's wc -l is what we want.

# Resolve the repo root from the script's location so the script can be run
# from anywhere.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UI_DIR="$REPO_ROOT/src/components/ui"
SRC_DIR="$REPO_ROOT/src"

if [ ! -d "$UI_DIR" ]; then
  echo "shadcn UI directory not found: $UI_DIR" >&2
  exit 1
fi

MARKDOWN=0
if [ "${1:-}" = "--markdown" ]; then
  MARKDOWN=1
fi

# Collect the primitive list from src/components/ui/*.tsx
mapfile -t PRIMITIVES < <(find "$UI_DIR" -maxdepth 1 -name '*.tsx' -printf '%f\n' | sed 's/\.tsx$//' | sort)

if [ "$MARKDOWN" -eq 1 ]; then
  echo "| Primitive | Files importing |"
  echo "|---|---|"
fi

for primitive in "${PRIMITIVES[@]}"; do
  # Match imports of the form:
  #   from "../ui/<primitive>"
  #   from "../../ui/<primitive>"
  #   from "@/components/ui/<primitive>"
  # Files are counted once even if they import the same primitive multiple times.
  count=$(grep -rl --include='*.ts' --include='*.tsx' \
            -E "from [\"'](\.\.?/)+ui/${primitive}[\"']|from [\"']@/components/ui/${primitive}[\"']" \
            "$SRC_DIR" 2>/dev/null | grep -v "/ui/" | sort -u | wc -l)

  if [ "$MARKDOWN" -eq 1 ]; then
    printf "| %s | %d |\n" "$primitive" "$count"
  else
    printf "%4d  %s\n" "$count" "$primitive"
  fi
done
