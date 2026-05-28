/**
 * LeftNavRail — Microsoft 365 style hero navigation rail.
 *
 * Fixed 48px-wide column on the leftmost edge of the viewport. Hosts the
 * three top-level "apps" the user switches between:
 *
 *   1. Notifications    (top)        — replaces the AppHeader bell. Badge
 *                                       shows total unread cross-case
 *                                       inbound items.
 *   ─ separator ─
 *   2. Cases            (hero app)   — the existing queue / case form /
 *                                       collection flow.
 *   3. Attorney Dashboard            — filtered case list scoped to
 *                                       escalated / lawyer-assigned cases.
 *
 * Future bottom-anchored slot is reserved for Settings / Help. Not wired
 * in this iteration.
 */

import * as React from "react";
import { makeStyles, tokens } from "@fluentui/react-components";
import {
  Alert24Regular,
  Alert24Filled,
  Briefcase24Regular,
  Briefcase24Filled,
  Scales24Regular,
  Scales24Filled,
} from "@fluentui/react-icons";
import { LeftNavRailItem } from "./LeftNavRailItem";

export type ActiveApp =
  | "queue"
  | "attorneyDashboard"
  | "attorneyCaseView"
  | "notifications";

const useStyles = makeStyles({
  rail: {
    flex: "0 0 48px",
    width: "48px",
    height: "100%",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRightWidth: "1px",
    borderRightStyle: "solid",
    borderRightColor: tokens.colorNeutralStroke2,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
  },
  separator: {
    height: "1px",
    marginTop: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalS,
    marginLeft: tokens.spacingHorizontalM,
    marginRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralStroke2,
  },
});

export interface LeftNavRailProps {
  activeApp: ActiveApp;
  onChangeApp: (next: ActiveApp) => void;
  /** Total unread inbound count rendered as the Notifications badge. */
  unreadCount: number;
}

export function LeftNavRail({
  activeApp,
  onChangeApp,
  unreadCount,
}: LeftNavRailProps) {
  const styles = useStyles();
  return (
    <nav aria-label="Workspace navigation" className={styles.rail}>
      <LeftNavRailItem
        label="Notifications"
        icon={<Alert24Regular />}
        activeIcon={<Alert24Filled />}
        active={activeApp === "notifications"}
        badgeCount={unreadCount}
        onClick={() => onChangeApp("notifications")}
      />
      <div className={styles.separator} aria-hidden="true" />
      <LeftNavRailItem
        label="Cases"
        icon={<Briefcase24Regular />}
        activeIcon={<Briefcase24Filled />}
        active={activeApp === "queue"}
        onClick={() => onChangeApp("queue")}
      />
      <LeftNavRailItem
        label="Attorney Dashboard"
        icon={<Scales24Regular />}
        activeIcon={<Scales24Filled />}
        active={activeApp === "attorneyDashboard"}
        onClick={() => onChangeApp("attorneyDashboard")}
      />
    </nav>
  );
}
