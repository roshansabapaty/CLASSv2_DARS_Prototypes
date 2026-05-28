# UI Library Policy

**Effective**: 2026-04-29 — onward.
**Status**: enforced by pre-commit hook ([scripts/check-no-new-shadcn-imports.sh](../scripts/check-no-new-shadcn-imports.sh)).

## TL;DR

| New code | Existing code |
|---|---|
| **Fluent UI v9** (`@fluentui/react-components`) | Stays as-is (shadcn) until touched |
| **Griffel** `makeStyles()` + `tokens.*` for styles | Tailwind utilities allowed until file is migrated |
| Imports from `src/components/ui/` are **forbidden** in new files | Imports allowed for files on the allowlist (`.shadcn-allowlist.txt`) |

When you migrate an existing file, remove its entry from `.shadcn-allowlist.txt`.

---

## Why this policy exists

The codebase mixes two UI libraries — shadcn (Radix-based primitives styled with Tailwind) and Fluent UI v9 — in roughly half the files. The mix produces inconsistent visual / motion / accessibility behavior and slows new contributors who aren't sure which library to reach for.

Rather than a high-risk big-bang migration, we **freeze new shadcn usage today** and migrate existing files **organically as they're touched** for any other reason (feature work, bug fixes, refactors). Over time, all files end up on Fluent v9 + Griffel; `src/components/ui/` and Tailwind config get deleted in the final cleanup.

---

## Decision tree for new code

```
I need a UI primitive (Button, Dialog, Tooltip, …)
│
├── Is it in @fluentui/react-components?
│   └── YES → use it. Done.
│
├── Is it in src/components/fluent-extensions/?
│   └── YES → use it. Done. (These are gap components — Fluent-themed wrappers.)
│
└── Neither?
    └── File an issue describing the need. Do NOT pull from src/components/ui/.
```

### Fluent v9 cheat sheet

| You want | Use |
|---|---|
| Button | `Button` |
| Badge / pill | `Badge` (or `Tag` for taggable contexts) |
| Tooltip | `Tooltip` |
| Dialog / modal | `Dialog`, `DialogSurface`, `DialogBody`, `DialogTitle`, `DialogContent`, `DialogActions` |
| Popover | `Popover`, `PopoverSurface`, `PopoverTrigger` |
| Menu | `Menu`, `MenuTrigger`, `MenuList`, `MenuItem`, `MenuItemCheckbox`, `MenuItemRadio` |
| Input | `Input` |
| Textarea | `Textarea` |
| Select | `Select`, `Option` |
| Combobox | `Combobox` |
| Checkbox | `Checkbox` |
| Radio | `RadioGroup`, `Radio` |
| Switch | `Switch` |
| Slider | `Slider` |
| Tabs | `TabList`, `Tab` |
| Accordion | `Accordion`, `AccordionItem`, `AccordionHeader`, `AccordionPanel` |
| Toolbar | `Toolbar`, `ToolbarButton`, `ToolbarDivider` |
| Progress | `ProgressBar` |
| Divider | `Divider` |
| Skeleton | `Skeleton`, `SkeletonItem` |
| Date picker / Calendar | `Calendar` from `src/components/fluent-extensions` (wraps `@fluentui/react-datepicker-compat`) |
| Command palette | `Command` from `src/components/fluent-extensions` (built on `Combobox` + filtering) |

### Gap components (`src/components/fluent-extensions/`)

These are Fluent-themed components for primitives Fluent v9 doesn't ship directly. They live alongside Fluent v9 imports.

```ts
import { Calendar, Command } from "../fluent-extensions";
```

See [src/components/fluent-extensions/README.md](../src/components/fluent-extensions/README.md) for the catalog.

---

## Styling: Tailwind → Griffel

**New code**: use Griffel's `makeStyles()` paired with Fluent's `tokens` system. No Tailwind utility classes.

**Before** (Tailwind):
```tsx
<div className="flex items-center gap-2 p-3 bg-[#faf9f8] border border-[#e1dfdd] rounded">
  <Icon />
  <span className="text-sm font-medium text-[#323130]">Label</span>
</div>
```

**After** (Griffel + Fluent tokens):
```tsx
import { makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  row: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  label: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightMedium,
    color: tokens.colorNeutralForeground1,
  },
});

const Component = () => {
  const styles = useStyles();
  return (
    <div className={styles.row}>
      <Icon />
      <span className={styles.label}>Label</span>
    </div>
  );
};
```

### Common token mappings

| Tailwind class | Token |
|---|---|
| `text-sm` | `tokens.fontSizeBase200` |
| `text-xs` | `tokens.fontSizeBase100` |
| `font-medium` | `tokens.fontWeightMedium` |
| `font-semibold` | `tokens.fontWeightSemibold` |
| `gap-2` / `space-x-2` | `tokens.spacingHorizontalS` |
| `p-3` | `tokens.spacingVerticalS` (×2 horiz) |
| `bg-[#faf9f8]` | `tokens.colorNeutralBackground2` |
| `text-[#323130]` | `tokens.colorNeutralForeground1` |
| `text-[#605e5c]` | `tokens.colorNeutralForeground2` |
| `border-[#e1dfdd]` | `tokens.colorNeutralStroke2` |
| `rounded-md` | `tokens.borderRadiusMedium` |
| `text-[#0078d4]` | `tokens.colorBrandForeground1` |

For a comprehensive list, see the [Fluent UI design tokens reference](https://react.fluentui.dev/?path=/docs/theme-color--page).

### Caveat: don't mix Griffel `makeStyles` with shorthand `border` / `padding`

Fluent v9's Griffel rejects shorthand CSS properties like `border` and `padding`. Use the long-form variants (`borderColor`, `borderWidth`, `borderStyle`, `paddingTop` / `paddingLeft` / etc.). Browser console will warn at runtime if you slip up.

---

## Migrating an existing file (file-level recipe)

When you touch a file that imports from `src/components/ui/`:

1. **Replace each shadcn import** with its Fluent v9 equivalent (see cheat sheet) or `fluent-extensions` import.
2. **Rewrite Tailwind classes** as `makeStyles({})` blocks using Fluent `tokens`.
3. **Verify visually**: dev server HMR + manual smoke check on the affected screens.
4. **Remove the file from `.shadcn-allowlist.txt`** so the pre-commit hook keeps the freeze monotonic.

Worked example: see [docs/SHADCN_TO_FLUENT_RECIPE.md](SHADCN_TO_FLUENT_RECIPE.md).

---

## Provider setup (already done)

`<FluentProvider theme={webLightTheme} style={{ height: "100%" }}>` lives at the root of `src/App.tsx`.

- **Do not** add `className` to it — Fluent's portal mirror clones className and overlays the page (whiteout regression).
- **Do** keep `style={{ height: "100%" }}`. The provider renders as a `<div>` with no intrinsic height; without it, every `h-full` chain inside the App collapses to 0 and full-screen panels (the fulfillment wizard, the case form's IdentifierPanel) render blank. `style` is not cloned by the portal mirror, so it's safe.

If you need a different theme for a subtree (rare), wrap that subtree with another `FluentProvider` — providers nest cleanly.

---

## Enforcement

[`scripts/check-no-new-shadcn-imports.sh`](../scripts/check-no-new-shadcn-imports.sh) runs as a pre-commit hook. It compares the staged file list against `.shadcn-allowlist.txt`. If a file imports `../ui/*` and is **not** on the allowlist, the commit fails with a pointer to this doc.

To migrate a file off the allowlist (after rewriting it), delete its entry from `.shadcn-allowlist.txt` in the same commit.

If you need to bypass the hook (e.g. an emergency hotfix that touches a forbidden file), use `git commit --no-verify` and explain in the PR description. CI re-runs the check, so this only delays the conversation, not avoids it.

---

## Roadmap

When all files for a given shadcn primitive have been migrated, delete:
1. `src/components/ui/<primitive>.tsx`
2. The primitive's row from `MIGRATION_PROGRESS.md`

When `src/components/ui/` is empty:
1. Remove `tailwind.config.*`, `postcss.config.*`
2. Remove the Tailwind import from the global CSS
3. Delete `src/components/ui/` entirely

This is when the codebase is "fully Fluent."

See [MIGRATION_PROGRESS.md](../MIGRATION_PROGRESS.md) for current state.
