// Notification & non-disclosure posture for one identifier under attorney
// review. Renders the relevant constraint based on the identifier's
// account type:
//   - Enterprise identifier → controller-notification permission
//   - Consumer identifier  → user-notification permission
//
// When `source === "Exempt category"` (e.g. CSE / CSAM) the section adds
// a distinctive purple "Exempt: <category>" chip alongside the status
// badge to communicate "structural non-disclosure, not an NDO from the
// order" — common for child exploitation cases.
//
// Mounted inside the AttorneyReviewPanel (per-identifier). Fluent v9 +
// Griffel per docs/UI_LIBRARY_POLICY.md.

import {
  Badge,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ShieldKeyholeRegular,
  PersonRegular,
  BuildingRegular,
  InfoRegular,
  WarningRegular,
} from "@fluentui/react-icons";
import type {
  AccountIdentifier,
  DisclosureConstraints,
  DisclosureSource,
  FormData,
  NotificationPermission,
} from "../../types/caseTypes";

const useStyles = makeStyles({
  section: {
    marginTop: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
  },
  source: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  exemptChip: {
    marginLeft: "auto",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXS,
    alignItems: "start",
  },
  label: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground2,
  },
  valueCol: {
    display: "flex",
    flexDirection: "column",
    rowGap: "2px",
  },
  note: {
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
  },
});

function statusBadge(p: NotificationPermission) {
  switch (p) {
    case "Permitted":
      return <Badge color="success" appearance="filled">Permitted</Badge>;
    case "Required":
      return <Badge color="brand" appearance="filled">Required</Badge>;
    case "Prohibited":
      return <Badge color="danger" appearance="filled">Prohibited</Badge>;
    case "Delayed":
      return <Badge color="warning" appearance="filled">Delayed</Badge>;
  }
}

function sourceLabel(source: DisclosureSource): string {
  return source;
}

interface Props {
  case: FormData;
  identifier: AccountIdentifier;
}

export function DisclosureSection({ case: c, identifier }: Props) {
  const styles = useStyles();
  const dc: DisclosureConstraints | undefined = c.disclosureConstraints;
  if (!dc) return null;

  const isEnterprise = identifier.checkAccounts?.accountType === "Enterprise";
  const isExempt = dc.source === "Exempt category";

  return (
    <div className={styles.section}>
      <div className={styles.headerRow}>
        <ShieldKeyholeRegular fontSize={18} />
        <Text weight="semibold">Notification &amp; Non-disclosure</Text>
        <Text className={styles.source}>· Source: {sourceLabel(dc.source)}</Text>
        {isExempt && dc.exemptCategory && (
          <Badge
            className={styles.exemptChip}
            color="important"
            appearance="filled"
            icon={<WarningRegular />}
          >
            Exempt: {dc.exemptCategory}
          </Badge>
        )}
      </div>

      <div className={styles.row}>
        {isEnterprise ? (
          <>
            <div className={styles.label}>
              <BuildingRegular fontSize={16} />
              <Text>Notify the controller</Text>
            </div>
            <div className={styles.valueCol}>
              {statusBadge(dc.controllerNotification)}
              {dc.controllerNotificationNote && (
                <Text className={styles.note} size={200}>
                  {dc.controllerNotificationNote}
                </Text>
              )}
            </div>
          </>
        ) : (
          <>
            <div className={styles.label}>
              <PersonRegular fontSize={16} />
              <Text>Notify the user</Text>
            </div>
            <div className={styles.valueCol}>
              {statusBadge(dc.userNotification)}
              {dc.userNotification === "Delayed" &&
                dc.notificationDelayedUntil && (
                  <Text size={200}>
                    Permitted on or after{" "}
                    <strong>{dc.notificationDelayedUntil}</strong>
                  </Text>
                )}
              {dc.userNotificationNote && (
                <Text className={styles.note} size={200}>
                  {dc.userNotificationNote}
                </Text>
              )}
            </div>
          </>
        )}
      </div>

      {/* Surface the other side as a smaller informational row so the
          attorney sees both legs without dominating the section. */}
      {isEnterprise ? (
        <div className={styles.row}>
          <div className={styles.label}>
            <InfoRegular fontSize={14} />
            <Text size={200}>Notify the user</Text>
          </div>
          <div className={styles.valueCol}>
            {statusBadge(dc.userNotification)}
            {dc.userNotificationNote && (
              <Text className={styles.note} size={200}>
                {dc.userNotificationNote}
              </Text>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.row}>
          <div className={styles.label}>
            <InfoRegular fontSize={14} />
            <Text size={200}>Notify the controller</Text>
          </div>
          <div className={styles.valueCol}>
            {statusBadge(dc.controllerNotification)}
            {dc.controllerNotificationNote && (
              <Text className={styles.note} size={200}>
                {dc.controllerNotificationNote}
              </Text>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
