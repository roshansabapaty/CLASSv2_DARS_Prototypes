/**
 * Command (Fluent-themed)
 *
 * Drop-in replacement for `src/components/ui/command` (shadcn). Wraps `cmdk`
 * (same upstream lib shadcn used) but styled with Griffel + Fluent v9 tokens.
 *
 * cmdk gives us fuzzy search, keyboard navigation, group headers, and the
 * full search-listbox pattern that Fluent v9's `Combobox` doesn't quite
 * match. So we keep cmdk as the engine and just restyle.
 *
 * Exports the same set of components as the shadcn version so existing call
 * sites can swap the import path with no other changes.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search as SearchIcon } from "lucide-react";
import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    fontFamily: tokens.fontFamilyBase,
  },
  inputWrapper: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    height: "36px",
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  inputIcon: {
    width: "16px",
    height: "16px",
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
  },
  input: {
    flex: 1,
    height: "32px",
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase200,
    fontFamily: tokens.fontFamilyBase,
    outline: "none",
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    "::placeholder": {
      color: tokens.colorNeutralForeground3,
    },
    ":disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  },
  list: {
    maxHeight: "300px",
    overflowY: "auto",
    overflowX: "hidden",
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
  },
  empty: {
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    textAlign: "center",
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  group: {
    overflow: "hidden",
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalXS,
    paddingRight: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground1,
    "& [cmdk-group-heading]": {
      paddingLeft: tokens.spacingHorizontalS,
      paddingRight: tokens.spacingHorizontalS,
      paddingTop: tokens.spacingVerticalXS,
      paddingBottom: tokens.spacingVerticalXS,
      fontSize: tokens.fontSizeBase100,
      fontWeight: tokens.fontWeightMedium,
      color: tokens.colorNeutralForeground3,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
    },
  },
  separator: {
    marginLeft: `-${tokens.spacingHorizontalXS}`,
    marginRight: `-${tokens.spacingHorizontalXS}`,
    height: "1px",
    backgroundColor: tokens.colorNeutralStroke2,
  },
  item: {
    position: "relative",
    display: "flex",
    cursor: "pointer",
    userSelect: "none",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalSNudge,
    paddingBottom: tokens.spacingVerticalSNudge,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderTopLeftRadius: tokens.borderRadiusSmall,
    borderTopRightRadius: tokens.borderRadiusSmall,
    borderBottomLeftRadius: tokens.borderRadiusSmall,
    borderBottomRightRadius: tokens.borderRadiusSmall,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    outline: "none",
    "&[data-selected='true']": {
      backgroundColor: tokens.colorNeutralBackground2,
      color: tokens.colorNeutralForeground1Hover,
    },
    "&[data-disabled='true']": {
      pointerEvents: "none",
      opacity: 0.5,
    },
    "& svg": {
      pointerEvents: "none",
      flexShrink: 0,
      width: "16px",
      height: "16px",
      color: tokens.colorNeutralForeground3,
    },
  },
  shortcut: {
    marginLeft: "auto",
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    letterSpacing: "0.1em",
  },
});

// ── Components ────────────────────────────────────────────────────────────────

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  const styles = useStyles();
  return (
    <CommandPrimitive
      data-slot="command"
      className={mergeClasses(styles.root, className)}
      {...props}
    />
  );
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  const styles = useStyles();
  return (
    <div data-slot="command-input-wrapper" className={styles.inputWrapper}>
      <SearchIcon className={styles.inputIcon} />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={mergeClasses(styles.input, className)}
        {...props}
      />
    </div>
  );
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  const styles = useStyles();
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={mergeClasses(styles.list, className)}
      {...props}
    />
  );
}

function CommandEmpty(props: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  const styles = useStyles();
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={styles.empty}
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  const styles = useStyles();
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={mergeClasses(styles.group, className)}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  const styles = useStyles();
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={mergeClasses(styles.separator, className)}
      {...props}
    />
  );
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  const styles = useStyles();
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={mergeClasses(styles.item, className)}
      {...props}
    />
  );
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const styles = useStyles();
  return (
    <span
      data-slot="command-shortcut"
      className={mergeClasses(styles.shortcut, className)}
      {...props}
    />
  );
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandSeparator,
  CommandItem,
  CommandShortcut,
};
