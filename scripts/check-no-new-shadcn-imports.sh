#!/usr/bin/env bash
#
# check-no-new-shadcn-imports.sh
#
# Pre-commit gate. Fails the commit if a staged file imports from
# `src/components/ui/` and is NOT on .shadcn-allowlist.txt.
#
# This enforces the freeze policy in docs/UI_LIBRARY_POLICY.md:
#   - New code must use Fluent UI v9 (@fluentui/react-components)
#   - Existing files keep their shadcn imports until migrated
#   - When a file is migrated, remove its entry from .shadcn-allowlist.txt
#
# To install as a pre-commit hook (one-time):
#   ln -sf ../../scripts/check-no-new-shadcn-imports.sh .git/hooks/pre-commit
#
# To bypass (rare, use --no-verify on the commit):
#   git commit --no-verify -m "..."

set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ALLOWLIST="$REPO_ROOT/.shadcn-allowlist.txt"

if [ ! -f "$ALLOWLIST" ]; then
  echo "❌ .shadcn-allowlist.txt not found at $ALLOWLIST" >&2
  echo "   Re-generate with:" >&2
  echo "     bash scripts/find-shadcn-import-counts.sh > /dev/null  # builds the allowlist" >&2
  exit 1
fi

# Get list of staged files (Added or Modified). On a fresh repo with no HEAD,
# fall back to "all tracked files" — the script can also be invoked from CI.
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  STAGED=$(git diff --cached --name-only --diff-filter=AM)
else
  STAGED=$(git diff --cached --name-only --diff-filter=AM 2>/dev/null || true)
fi

if [ -z "$STAGED" ]; then
  exit 0
fi

# Pattern matching shadcn imports. Must match the same regex as
# find-shadcn-import-counts.sh so the two scripts agree.
SHADCN_IMPORT_RE='from ["'"'"'](\.\.?/)+ui/[a-z-]+["'"'"']|from ["'"'"']@/components/ui/[a-z-]+["'"'"']'

VIOLATORS=()

while IFS= read -r file; do
  # Only check TS/TSX files inside src/
  case "$file" in
    src/*.ts|src/*.tsx|src/**/*.ts|src/**/*.tsx)
      ;;
    *)
      continue
      ;;
  esac

  # Skip files inside src/components/ui/ — they re-export shadcn and stay until
  # the very end of the migration.
  case "$file" in
    src/components/ui/*) continue ;;
  esac

  # Skip if the file no longer exists (e.g., deleted in this commit).
  [ -f "$REPO_ROOT/$file" ] || continue

  # Does this file import a shadcn primitive?
  if grep -qE "$SHADCN_IMPORT_RE" "$REPO_ROOT/$file"; then
    # Is it on the allowlist?
    if ! grep -Fxq "$file" "$ALLOWLIST"; then
      VIOLATORS+=("$file")
    fi
  fi
done <<< "$STAGED"

if [ ${#VIOLATORS[@]} -eq 0 ]; then
  exit 0
fi

cat >&2 <<EOF
❌ shadcn UI freeze violation

The following file(s) import from src/components/ui/ but are not on
.shadcn-allowlist.txt — meaning they're new files (or files that were
already migrated). New code must use Fluent UI v9 instead.

EOF

for f in "${VIOLATORS[@]}"; do
  echo "  • $f" >&2
done

cat >&2 <<EOF

Fix one of two ways:
  1. (preferred) Replace the shadcn imports with Fluent v9 equivalents.
     See docs/UI_LIBRARY_POLICY.md for the cheat sheet.

  2. (only if unavoidable) Add the file to .shadcn-allowlist.txt and
     leave a note in the PR description explaining why.

To bypass this check for a single commit (e.g. emergency hotfix):
  git commit --no-verify

CI re-runs the check, so bypassing locally only delays the conversation.

Policy: docs/UI_LIBRARY_POLICY.md
EOF

exit 1
