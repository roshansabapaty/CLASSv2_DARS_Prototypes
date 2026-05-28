# Recipe: migrate one file from shadcn to Fluent v9

This doc shows the file-level mechanics for migrating a single component off shadcn primitives. It's the long-tail companion to [UI_LIBRARY_POLICY.md](UI_LIBRARY_POLICY.md), which establishes the freeze.

When you touch a file for any other reason (feature, bug fix, refactor) and the file imports from `src/components/ui/`, take 10–30 minutes to migrate it as part of your PR. The pre-commit hook will then let you remove the file's entry from `.shadcn-allowlist.txt`.

## Step 1 — replace each shadcn import

Open the file. Find every `import { ... } from "../ui/<primitive>"`. Replace with the Fluent v9 (or `fluent-extensions`) equivalent.

Use the [cheat sheet in the policy doc](UI_LIBRARY_POLICY.md#fluent-v9-cheat-sheet) for the mapping. Common ones:

```tsx
// Before
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

// After
import {
  Button,
  Badge,
  Tooltip,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
} from "@fluentui/react-components";
```

For shadcn → Fluent name shifts that aren't 1:1:

| shadcn | Fluent v9 |
|---|---|
| `Tooltip` + `TooltipTrigger` + `TooltipContent` | `Tooltip` (single component, prop-based) |
| `Dialog` + `DialogContent` + `DialogHeader` | `Dialog` + `DialogSurface` + `DialogBody` + `DialogTitle` + `DialogContent` + `DialogActions` |
| `Popover` + `PopoverTrigger` + `PopoverContent` | `Popover` + `PopoverTrigger` + `PopoverSurface` |
| `Select` + `SelectTrigger` + `SelectContent` + `SelectItem` | `Select` + `Option` (or `Combobox` + `Option` for searchable) |
| `Checkbox` (Radix) | `Checkbox` (Fluent — `onChange` arg shape differs: `(_, data) => data.checked`) |
| `Calendar` | `Calendar` from `../fluent-extensions` |
| `Command` and friends | `Command`, `CommandInput`, etc. from `../fluent-extensions` |

## Step 2 — convert Tailwind classes to Griffel

Find every `className="..."` with Tailwind utility classes. Replace with a Griffel `makeStyles()` block at the top of the file using Fluent `tokens.*`.

```tsx
// Before
<div className="flex items-center gap-2 p-3 bg-[#faf9f8] rounded-md text-sm font-medium text-[#323130]">
  ...
</div>

// After
import { makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  card: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    paddingRight: tokens.spacingHorizontalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalS,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightMedium,
    color: tokens.colorNeutralForeground1,
  },
});

function MyComponent() {
  const styles = useStyles();
  return <div className={styles.card}>...</div>;
}
```

### Two important Griffel rules

1. **No CSS shorthands**. Griffel rejects `border`, `padding`, `margin`, `borderRadius`, etc. as single properties. Use the long-form (`borderTopWidth`, `borderTopStyle`, `borderTopColor`, `paddingTop`, `paddingRight`, …). The browser console warns at runtime when you slip up.
2. **Multiple classes**: use `mergeClasses(styles.a, styles.b, conditionallyTrue && styles.c)` — exported from `@fluentui/react-components`. Don't use the `cn()` utility from `../ui/utils` in new code.

### Token cheat sheet

Already in [UI_LIBRARY_POLICY.md](UI_LIBRARY_POLICY.md#common-token-mappings).

## Step 3 — verify

1. Vite dev server should HMR-update without errors. Watch the console.
2. Eyeball the affected screen — pixel parity isn't required, but nothing should be visually broken.
3. Common runtime warnings to watch for:
   - `@griffel/react: You are using unsupported shorthand CSS property "..."` — switch that property to the long-form variant.
   - `Cannot find name 'cn'` etc. — leftover shadcn util usage, remove the import.
   - Z-index regressions on Tooltips/Popovers/Dialogs — Fluent uses portals; usually fine but flag any layering bugs in the PR.

## Step 4 — remove the file from `.shadcn-allowlist.txt`

```bash
# the file should no longer match the shadcn import pattern
bash scripts/check-no-new-shadcn-imports.sh   # should pass

# remove the line for this file (one occurrence)
grep -v '^src/components/MyComponent\.tsx$' .shadcn-allowlist.txt > .shadcn-allowlist.txt.tmp \
  && mv .shadcn-allowlist.txt.tmp .shadcn-allowlist.txt
```

Or delete the line manually — it's plain text, one path per line.

## Step 5 — (optional) refresh the dashboard

```bash
bash scripts/find-shadcn-import-counts.sh --markdown   # paste the updated table into MIGRATION_PROGRESS.md
```

This is run automatically by CI on merge, so you don't strictly need to do it locally — but it's a satisfying way to watch the numbers go down.

---

## Worked example: a hypothetical `BulkActionsBar.tsx`

Before:
```tsx
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../ui/utils";

export function BulkActionsBar({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between p-3 bg-[#faf9f8] border border-[#e1dfdd] rounded">
      <Badge className="text-xs">{count} selected</Badge>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-8 px-3", count === 0 && "opacity-50")}>
            Apply
          </Button>
        </TooltipTrigger>
        <TooltipContent>Apply to {count} selected</TooltipContent>
      </Tooltip>
    </div>
  );
}
```

After:
```tsx
import {
  Button,
  Badge,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: tokens.spacingVerticalS,
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
  },
  applyDisabled: {
    opacity: 0.5,
  },
});

export function BulkActionsBar({ count }: { count: number }) {
  const styles = useStyles();
  return (
    <div className={styles.bar}>
      <Badge appearance="outline">{count} selected</Badge>
      <Tooltip content={`Apply to ${count} selected`} relationship="label">
        <Button
          appearance="outline"
          size="small"
          className={mergeClasses(count === 0 && styles.applyDisabled)}
        >
          Apply
        </Button>
      </Tooltip>
    </div>
  );
}
```

Notable shifts:
- `Tooltip` collapses three components into one (`content` + `relationship` props).
- `Button` uses `appearance="outline"` and `size="small"` instead of `variant`/`size`.
- `Badge` uses `appearance="outline"`.
- All Tailwind classes moved into `makeStyles({})`. Long-form border/padding properties used.
- `cn(...)` replaced with `mergeClasses(...)`.

Then remove the file's path from `.shadcn-allowlist.txt`. Done.
