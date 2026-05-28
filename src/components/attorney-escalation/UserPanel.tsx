// Tier 2 Target Identifier card — one per identifier on the case. Shows
// last logon, IP-resolves (30d), mailbox / OneDrive region, and the
// conflict-of-law jurisdictions.
//
// Account-type gating: Last logon + IP-resolves (30d) are only valid
// signals for Consumer accounts. For Enterprise accounts those rows are
// suppressed (login telemetry is tenant-administered, not the
// per-user IP history we have for Consumer). Mailbox region, OneDrive
// region, and conflict-of-law stay — those are tenant-level facts and
// are relevant on Enterprise accounts too.
//
// Optional `onSeeLogins` callback opens the cross-border login activity
// drawer; wired by parent in Phase 3 of the merge.

import {
  Button,
  Text,
  Badge,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { PersonRegular, OpenRegular } from "@fluentui/react-icons";
import type { EnterpriseUserContext } from "../../types/caseTypes";

const useStyles = makeStyles({
  root: {
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    marginLeft: tokens.spacingHorizontalXXL,
    marginTop: tokens.spacingVerticalM,
    position: "relative",
  },
  rail: {
    position: "absolute",
    left: "-20px",
    top: 0,
    bottom: 0,
    width: "2px",
    backgroundColor: tokens.colorBrandStroke2,
  },
  title: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalM,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalXS,
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  geoRow: {
    display: "flex",
    columnGap: tokens.spacingHorizontalXS,
    rowGap: tokens.spacingVerticalXS,
    flexWrap: "wrap",
  },
  lastLogonRow: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
    flexWrap: "wrap",
  },
});

interface Props {
  user: EnterpriseUserContext;
  /** Phase 3: optional callback to open the cross-border login drawer.
   *  When undefined, the "See more" button is hidden. */
  onSeeLogins?: (identifierId: string) => void;
  /** Account type the identifier resolved to (CLASS / wizard check). Drives
   *  the consumer-only gating below: `"Enterprise"` suppresses the Last
   *  logon + IP-resolves (30d) rows because that telemetry isn't surfaced
   *  for Enterprise accounts. Treated as Consumer when undefined so
   *  prototype seeds that don't tag account type still render the rows. */
  accountType?: "Consumer" | "Enterprise";
}

export function UserPanel({ user, onSeeLogins, accountType }: Props) {
  const styles = useStyles();
  const isEnterprise = accountType === "Enterprise";
  return (
    <div className={styles.root}>
      <div className={styles.rail} aria-hidden />
      <div className={styles.title}>
        <PersonRegular fontSize={20} />
        <Text as="h3" weight="semibold" size={400}>
          Target Identifier — {user.identifierValue}
        </Text>
      </div>
      <div className={styles.grid}>
        {/* Consumer-only telemetry — Last logon + IP-resolves (30d).
            Enterprise accounts don't surface per-user IP history here, so
            both rows are suppressed when accountType === "Enterprise". */}
        {!isEnterprise && (
          <>
            <Text className={styles.label}>Last logon</Text>
            <div className={styles.lastLogonRow}>
              <Text>{user.lastLogonLocation ?? "—"}</Text>
              {onSeeLogins && (
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<OpenRegular />}
                  onClick={() => onSeeLogins(user.identifierId)}
                >
                  See more
                </Button>
              )}
            </div>

            <Text className={styles.label}>IP-resolves (30d)</Text>
            <div className={styles.geoRow}>
              {user.geoResolutions30d.map((g) => (
                <Badge key={g} appearance="tint" color="informative">
                  {g}
                </Badge>
              ))}
            </div>
          </>
        )}

        <Text className={styles.label}>Mailbox region</Text>
        <Text>{user.mailboxRegion ?? "—"}</Text>

        <Text className={styles.label}>OneDrive region</Text>
        <Text>{user.oneDriveRegion ?? "—"}</Text>

        <Text className={styles.label}>Conflict-of-law jurisdictions</Text>
        <div className={styles.geoRow}>
          {user.conflictOfLawJurisdictions.length === 0 ? (
            <Text>—</Text>
          ) : (
            user.conflictOfLawJurisdictions.map((j) => (
              <Badge
                key={j}
                appearance="tint"
                color={
                  user.conflictOfLawJurisdictions.length > 1
                    ? "warning"
                    : "success"
                }
              >
                {j}
              </Badge>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
