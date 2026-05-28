/**
 * OutlookDatePicker — single-month date picker with Outlook-style
 * Day → Month → Year drill-down navigation in the header.
 *
 *   • Day view (default): grid of days for the focused month.
 *     Header: [↑] [May 2026 ▾] [↓]   ↑↓ = prev/next month
 *     Clicking "May 2026" → switches to Month view.
 *
 *   • Month view: 3×4 grid of the 12 months for the focused year.
 *     Header: [↑] [2026 ▾] [↓]       ↑↓ = prev/next year
 *     Clicking a month → returns to Day view for that month.
 *     Clicking "2026" → switches to Year view.
 *
 *   • Year view: 3×4 grid of 12 years.
 *     Header: [↑] [2025–2036] [↓]    ↑↓ = prev/next 12-year window
 *     Clicking a year → returns to Month view for that year.
 *
 * Reuses react-day-picker for the day grid (so date math, week alignment,
 * outside-day handling, and a11y stay handled). The Caption + Nav are
 * replaced by our own header so the drill-down can hook into the same
 * `month` state rdp uses internally.
 */

import * as React from "react";
import {
  DayPicker,
  type DayPickerSingleProps,
} from "react-day-picker@8.10.1";
import { ChevronUp, ChevronDown } from "lucide-react@0.487.0";
import { addMonths, addYears, format } from "date-fns";
import { cn } from "./utils";
import { buttonVariants } from "./button";

export interface OutlookDatePickerProps {
  /** Currently-selected date (or `undefined` for no selection). */
  selected: Date | undefined;
  /** Fires when the user picks a day from the Day view. */
  onSelect: (date: Date | undefined) => void;
  /** Year window for the Year view's prev/next chevron clamp. Defaults
   *  to ±50 years around today, which is plenty for case SLA dates. */
  fromYear?: number;
  toYear?: number;
  /** Pass through to rdp for keyboard focus when the popover opens. */
  initialFocus?: boolean;
  className?: string;
}

type View = "day" | "month" | "year";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function OutlookDatePicker({
  selected,
  onSelect,
  fromYear,
  toYear,
  initialFocus,
  className,
}: OutlookDatePickerProps) {
  const today = React.useMemo(() => new Date(), []);
  const minYear = fromYear ?? today.getFullYear() - 50;
  const maxYear = toYear ?? today.getFullYear() + 50;

  const [view, setView] = React.useState<View>("day");
  const [focusedMonth, setFocusedMonth] = React.useState<Date>(
    selected ?? today,
  );
  // Year-view window. 12 years per page, like Outlook. Anchored on the
  // currently-focused year so opening Year view always lands the user
  // in the right neighbourhood.
  const [yearWindowStart, setYearWindowStart] = React.useState<number>(() =>
    yearWindowStartFor(focusedMonth.getFullYear()),
  );

  // Keep the year-window aligned to whichever year the user is currently
  // looking at if they drill back into Year view after navigating months.
  React.useEffect(() => {
    if (view === "year") {
      setYearWindowStart(yearWindowStartFor(focusedMonth.getFullYear()));
    }
    // We intentionally only re-anchor on view change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const focusedYear = focusedMonth.getFullYear();
  const focusedMonthIdx = focusedMonth.getMonth();

  // ── Day view ──────────────────────────────────────────────────────────
  if (view === "day") {
    const prevMonth = addMonths(focusedMonth, -1);
    const nextMonth = addMonths(focusedMonth, 1);
    const canGoPrev = prevMonth.getFullYear() >= minYear;
    const canGoNext = nextMonth.getFullYear() <= maxYear;

    return (
      <div className={cn("p-3 w-[280px]", className)}>
        <PickerHeader
          label={format(focusedMonth, "MMMM yyyy")}
          onLabelClick={() => setView("month")}
          onPrev={canGoPrev ? () => setFocusedMonth(prevMonth) : undefined}
          onNext={canGoNext ? () => setFocusedMonth(nextMonth) : undefined}
          ariaLabelPrev="Previous month"
          ariaLabelNext="Next month"
          ariaLabelLabel={`${format(focusedMonth, "MMMM yyyy")} — change month`}
        />
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={onSelect}
          month={focusedMonth}
          onMonthChange={setFocusedMonth}
          numberOfMonths={1}
          showOutsideDays
          initialFocus={initialFocus}
          components={{
            // Hide rdp's native caption + nav — our PickerHeader above
            // owns navigation for the day view.
            Caption: () => null,
          }}
          classNames={dayPickerClassNames}
        />
      </div>
    );
  }

  // ── Month view ────────────────────────────────────────────────────────
  if (view === "month") {
    const canGoPrev = focusedYear - 1 >= minYear;
    const canGoNext = focusedYear + 1 <= maxYear;

    return (
      <div className={cn("p-3 w-[280px]", className)}>
        <PickerHeader
          label={String(focusedYear)}
          onLabelClick={() => setView("year")}
          onPrev={
            canGoPrev
              ? () => setFocusedMonth(addYears(focusedMonth, -1))
              : undefined
          }
          onNext={
            canGoNext
              ? () => setFocusedMonth(addYears(focusedMonth, 1))
              : undefined
          }
          ariaLabelPrev="Previous year"
          ariaLabelNext="Next year"
          ariaLabelLabel={`${focusedYear} — change year`}
        />
        <div className="grid grid-cols-3 gap-1 mt-2">
          {MONTH_LABELS.map((label, idx) => {
            const isCurrent =
              selected &&
              selected.getFullYear() === focusedYear &&
              selected.getMonth() === idx;
            const isFocused = idx === focusedMonthIdx;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setFocusedMonth(new Date(focusedYear, idx, 1));
                  setView("day");
                }}
                className={cn(
                  "h-10 rounded text-sm font-medium transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                  isCurrent
                    ? "bg-[#0078d4] text-white hover:bg-[#106ebe]"
                    : isFocused
                      ? "bg-[#deecf9] text-[#0078d4] hover:bg-[#c7e0f4]"
                      : "text-[#323130] hover:bg-[#f3f2f1]",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Year view ─────────────────────────────────────────────────────────
  const yearsInWindow = Array.from(
    { length: 12 },
    (_, i) => yearWindowStart + i,
  );
  const canGoPrev = yearWindowStart - 12 + 11 >= minYear;
  const canGoNext = yearWindowStart + 12 <= maxYear;

  return (
    <div className={cn("p-3 w-[280px]", className)}>
      <PickerHeader
        label={`${yearWindowStart} – ${yearWindowStart + 11}`}
        // Year view is the top of the drill — clicking the label is a
        // no-op (no further drill target). Still rendered as a button
        // for visual consistency; click does nothing.
        onLabelClick={undefined}
        onPrev={
          canGoPrev ? () => setYearWindowStart((y) => y - 12) : undefined
        }
        onNext={
          canGoNext ? () => setYearWindowStart((y) => y + 12) : undefined
        }
        ariaLabelPrev="Previous 12 years"
        ariaLabelNext="Next 12 years"
        ariaLabelLabel={`Years ${yearWindowStart} through ${yearWindowStart + 11}`}
      />
      <div className="grid grid-cols-3 gap-1 mt-2">
        {yearsInWindow.map((y) => {
          const disabled = y < minYear || y > maxYear;
          const isCurrent = selected && selected.getFullYear() === y;
          const isFocused = y === focusedYear;
          return (
            <button
              key={y}
              type="button"
              disabled={disabled}
              onClick={() => {
                setFocusedMonth(new Date(y, focusedMonthIdx, 1));
                setView("month");
              }}
              className={cn(
                "h-10 rounded text-sm font-medium transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                disabled && "opacity-40 cursor-not-allowed",
                !disabled && isCurrent
                  ? "bg-[#0078d4] text-white hover:bg-[#106ebe]"
                  : !disabled && isFocused
                    ? "bg-[#deecf9] text-[#0078d4] hover:bg-[#c7e0f4]"
                    : !disabled &&
                      "text-[#323130] hover:bg-[#f3f2f1]",
              )}
            >
              {y}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Header sub-component (reused across the three views) ───────────────

interface PickerHeaderProps {
  label: string;
  onLabelClick: (() => void) | undefined;
  onPrev: (() => void) | undefined;
  onNext: (() => void) | undefined;
  ariaLabelPrev: string;
  ariaLabelNext: string;
  ariaLabelLabel: string;
}

function PickerHeader({
  label,
  onLabelClick,
  onPrev,
  onNext,
  ariaLabelPrev,
  ariaLabelNext,
  ariaLabelLabel,
}: PickerHeaderProps) {
  const labelClickable = !!onLabelClick;
  return (
    <div className="flex items-center justify-between gap-1 pb-1">
      <button
        type="button"
        onClick={onLabelClick}
        disabled={!labelClickable}
        aria-label={ariaLabelLabel}
        className={cn(
          "flex-1 text-left px-2 py-1 rounded text-sm font-semibold text-[#323130]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
          labelClickable ? "hover:bg-[#f3f2f1] cursor-pointer" : "cursor-default",
        )}
      >
        {label}
      </button>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={!onPrev}
          aria-label={ariaLabelPrev}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "size-7 p-0",
            !onPrev && "opacity-40 cursor-not-allowed",
          )}
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!onNext}
          aria-label={ariaLabelNext}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "size-7 p-0",
            !onNext && "opacity-40 cursor-not-allowed",
          )}
        >
          <ChevronDown className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────

function yearWindowStartFor(year: number): number {
  // 12-year window anchored so the supplied year is in the first row
  // (col 0, 1, or 2). Outlook uses a 12-cell grid; we mirror that.
  return year - (year % 12);
}

// Single-month classNames for the day-grid render. Independent of the
// shared `Calendar` classNames in ui/calendar.tsx so changes here don't
// ripple to other pickers in the app.
const dayPickerClassNames: DayPickerSingleProps["classNames"] = {
  months: "flex flex-col",
  month: "flex flex-col gap-2",
  table: "w-full border-collapse",
  head_row: "flex",
  head_cell:
    "text-[#605e5c] rounded w-9 font-normal text-[11px] uppercase tracking-wide",
  row: "flex w-full mt-1",
  cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
  day: "size-9 p-0 font-normal aria-selected:opacity-100 rounded text-[#323130] hover:bg-[#f3f2f1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4]",
  day_selected:
    "bg-[#0078d4] text-white hover:bg-[#106ebe] focus:bg-[#106ebe]",
  day_today: "bg-[#deecf9] text-[#0078d4] font-semibold",
  day_outside: "text-[#a19f9d]",
  day_disabled: "text-[#a19f9d] opacity-50",
  day_hidden: "invisible",
};
