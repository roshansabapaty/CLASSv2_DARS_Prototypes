/**
 * Calendar (Fluent-themed)
 *
 * Drop-in replacement for `src/components/ui/calendar` (shadcn). Wraps
 * `react-day-picker` (same upstream lib shadcn used) but styled with Griffel
 * + Fluent v9 tokens so it visually matches the rest of the Fluent app.
 *
 * The component's prop surface is `React.ComponentProps<typeof DayPicker>`,
 * identical to the shadcn version. Migration of existing call sites is just
 * a matter of swapping the import path.
 */

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  // Outer container around DayPicker
  root: {
    paddingTop: tokens.spacingVerticalS,
    paddingRight: tokens.spacingHorizontalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalS,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
  },
  months: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  month: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  caption: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: tokens.spacingVerticalXS,
    position: "relative",
    width: "100%",
  },
  captionLabel: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },
  navButton: {
    width: "28px",
    height: "28px",
    padding: 0,
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground2,
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
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  navButtonPrevious: {
    position: "absolute",
    left: tokens.spacingHorizontalXS,
  },
  navButtonNext: {
    position: "absolute",
    right: tokens.spacingHorizontalXS,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: tokens.fontSizeBase200,
  },
  headRow: {
    display: "flex",
  },
  headCell: {
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightRegular,
    fontSize: tokens.fontSizeBase100,
    width: "36px",
    textAlign: "center",
  },
  row: {
    display: "flex",
    width: "100%",
    marginTop: tokens.spacingVerticalXS,
  },
  cell: {
    padding: 0,
    width: "36px",
    height: "36px",
    textAlign: "center",
    position: "relative",
    fontSize: tokens.fontSizeBase200,
  },
  day: {
    width: "36px",
    height: "36px",
    padding: 0,
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground1,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    cursor: "pointer",
    fontWeight: tokens.fontWeightRegular,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  daySelected: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    ":hover": {
      backgroundColor: tokens.colorBrandBackgroundHover,
    },
    ":focus": {
      backgroundColor: tokens.colorBrandBackgroundPressed,
    },
  },
  dayToday: {
    backgroundColor: tokens.colorNeutralBackground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  dayOutside: {
    color: tokens.colorNeutralForeground4,
    opacity: 0.5,
  },
  dayDisabled: {
    color: tokens.colorNeutralForeground4,
    opacity: 0.4,
    cursor: "not-allowed",
  },
  dayHidden: {
    visibility: "hidden",
  },
});

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const styles = useStyles();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={mergeClasses(styles.root, className)}
      classNames={{
        months: styles.months,
        month: styles.month,
        caption: styles.caption,
        caption_label: styles.captionLabel,
        nav: styles.nav,
        nav_button: styles.navButton,
        nav_button_previous: mergeClasses(styles.navButton, styles.navButtonPrevious),
        nav_button_next: mergeClasses(styles.navButton, styles.navButtonNext),
        table: styles.table,
        head_row: styles.headRow,
        head_cell: styles.headCell,
        row: styles.row,
        cell: styles.cell,
        day: styles.day,
        day_selected: styles.daySelected,
        day_today: styles.dayToday,
        day_outside: styles.dayOutside,
        day_disabled: styles.dayDisabled,
        day_hidden: styles.dayHidden,
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft size={16} />,
        IconRight: () => <ChevronRight size={16} />,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";
