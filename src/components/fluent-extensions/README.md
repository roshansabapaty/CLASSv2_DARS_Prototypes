# Fluent Extensions

Fluent-themed wrappers for primitives that Fluent UI v9 doesn't ship directly. Each component is a drop-in replacement for the equivalent shadcn primitive in `src/components/ui/`, so migrating call sites is just an import-path swap.

These are part of the [shadcn → Fluent v9 migration](../../../docs/UI_LIBRARY_POLICY.md). Add a new gap component here if Fluent v9 doesn't have an equivalent for a primitive your feature needs and you can't compose one out of existing Fluent components.

## Catalog

| Component | Wraps | Replaces (shadcn) | Notes |
|---|---|---|---|
| `Calendar` | `react-day-picker` | `src/components/ui/calendar` | Drop-in. Same prop surface as `DayPicker`. |
| `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandSeparator`, `CommandItem`, `CommandShortcut` | `cmdk` | `src/components/ui/command` | Drop-in. Same export names. `CommandDialog` (the modal-wrapped variant) is **not** ported — no current importers. |

## Usage

```tsx
// Before (shadcn)
import { Calendar } from "../ui/calendar";
import { Command, CommandInput, CommandList } from "../ui/command";

// After (fluent-extensions)
import { Calendar, Command, CommandInput, CommandList } from "../fluent-extensions";
```

## Styling

These components use Griffel `makeStyles()` + Fluent `tokens.*` for all visual styling. They inherit the Fluent theme from the root `<FluentProvider>` in [src/App.tsx](../../App.tsx). No Tailwind utility classes.

## Migration path (long-term)

When Fluent v9 ships a first-party equivalent (e.g., a date picker that fully replaces `react-day-picker`), prefer that — and delete the wrapper from this directory once nothing imports it.
