# Migration Progress: shadcn → Fluent UI v9

**Goal**: drive every shadcn primitive's import count to **0**, then delete the primitive's source file. When `src/components/ui/` is empty, remove Tailwind config and the migration is complete.

**Policy**: [docs/UI_LIBRARY_POLICY.md](docs/UI_LIBRARY_POLICY.md). New code is forbidden from importing `src/components/ui/`. Existing files migrate organically as they're touched.

**Snapshot**: 2026-04-29 (initial baseline).
**Total files importing shadcn**: 66 (see [.shadcn-allowlist.txt](.shadcn-allowlist.txt)).

---

## Refresh

```bash
bash scripts/find-shadcn-import-counts.sh --markdown > /tmp/m.md   # then paste below
bash scripts/find-shadcn-import-counts.sh > /dev/null              # also re-emits .shadcn-allowlist.txt (TODO)
```

(Run weekly or on PR merges. CI integration is part of Phase 4.)

---

## Active primitives (>0 imports — migrate when files are touched)

Sorted by import count desc:

| Primitive | Files importing | Notes |
|---|---|---|
| badge | 46 | Map → Fluent `Badge` (or `Tag`) |
| button | 40 | Map → Fluent `Button` |
| tooltip | 33 | Map → Fluent `Tooltip` |
| card | 22 | No direct Fluent equivalent; use `Surface`, `makeStyles` styled `<div>`, or compose with Griffel tokens |
| input | 14 | Map → Fluent `Input` |
| label | 13 | Map → Fluent `Label` |
| select | 12 | Map → Fluent `Select` + `Option` (or `Combobox` for searchable) |
| popover | 9 | Map → Fluent `Popover`, `PopoverSurface`, `PopoverTrigger` |
| dialog | 8 | Map → Fluent `Dialog`, `DialogSurface`, `DialogBody`, `DialogTitle`, `DialogContent`, `DialogActions` |
| separator | 7 | Map → Fluent `Divider` |
| table | 7 | No direct Fluent v9 equivalent; consider `DataGrid` or styled `<table>` with Griffel |
| alert-dialog | 6 | Map → Fluent `Dialog` with confirmation pattern |
| checkbox | 6 | Map → Fluent `Checkbox` |
| textarea | 6 | Map → Fluent `Textarea` |
| **command** | 5 | Map → `Command` from `src/components/fluent-extensions/` (Phase 3) |
| **calendar** | 4 | Map → `Calendar` from `src/components/fluent-extensions/` (Phase 3) |
| switch | 4 | Map → Fluent `Switch` |
| tabs | 4 | Map → Fluent `TabList` + `Tab` |
| country-combobox | 1 | App-specific composite; rebuild on Fluent `Combobox` when touched |
| date-range-picker | 1 | App-specific composite; rebuild on `Calendar` (fluent-extensions) when touched |
| dropdown-menu | 1 | Map → Fluent `Menu`, `MenuItem` |
| validated-input | 1 | App-specific wrapper; rebuild with Fluent `Field` + `Input` |
| validated-select | 1 | App-specific wrapper; rebuild with Fluent `Field` + `Select` |
| validated-textarea | 1 | App-specific wrapper; rebuild with Fluent `Field` + `Textarea` |

---

## Dead primitives (0 imports — safe to delete now)

These shadcn files exist but aren't imported anywhere in `src/`. They can be removed in a janitorial cleanup PR without affecting any feature.

`accordion`, `alert`, `aspect-ratio`, `avatar`, `breadcrumb`, `carousel`, `chart`, `collapsible`, `context-menu`, `drawer`, `form`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `progress`, `radio-group`, `resizable`, `scroll-area`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `toggle`, `toggle-group`

---

## Closed primitives (deleted from `src/components/ui/`)

_None yet._

---

## How to migrate a file

See [docs/SHADCN_TO_FLUENT_RECIPE.md](docs/SHADCN_TO_FLUENT_RECIPE.md). Quick version:

1. Replace each shadcn import with its Fluent v9 / fluent-extensions equivalent.
2. Convert Tailwind utility classes to Griffel `makeStyles({})` using Fluent `tokens.*`.
3. Verify visual parity (HMR reload + manual smoke).
4. Remove the file's path from `.shadcn-allowlist.txt`.
5. (Optional) Update this dashboard's import counts by re-running `bash scripts/find-shadcn-import-counts.sh --markdown`.
