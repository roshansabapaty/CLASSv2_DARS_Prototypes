/**
 * Fluent-extensions barrel export.
 *
 * Components in this directory fill gaps where Fluent UI v9 doesn't ship a
 * direct primitive. Each component is a Fluent-themed wrapper (Griffel +
 * tokens) over the same upstream library the original shadcn version used,
 * so existing call sites can swap the import path without other changes.
 *
 * Usage:
 *   import { Calendar, Command } from "../fluent-extensions";
 *
 * See README.md for the catalog and migration notes.
 */
export { Calendar } from "./Calendar";
export type { CalendarProps } from "./Calendar";

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandSeparator,
  CommandItem,
  CommandShortcut,
} from "./Command";
