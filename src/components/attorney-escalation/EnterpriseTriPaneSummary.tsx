// Spec §5.2 — read-only tri-pane scannable preview card. Three stripes:
//   ⚖ LE & Order  /  👤 Target Identifier  /  🏢 Enterprise Org
//
// Used in both the Attorney Dashboard preview pane and (later) as a
// header inside the case form. The Target Identifier stripe uses the
// file-tab pattern (active tab visually merges with the data box below;
// non-escalated identifiers live in a "+N not flagged" overflow menu;
// picking one promotes it to a tab with italic styling).
//
// Phase 3/4 dependencies are exposed as callback props. Without them:
//   - `onSeeLogins` undefined → the Last logon "See more" button hides
//   - `onOpenPriorCaseDetail` undefined → Prior LNS row renders plain count
// The Attorney Dashboard wires them in Phase 3 (cross-border) and
// Phase 4 (prior tenant history) respectively.

import {
  Badge,
  Button,
  Card,
  Divider,
  Link,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Fragment, useRef, useState, type KeyboardEvent } from "react";
import {
  ScalesRegular,
  PersonRegular,
  BuildingRegular,
  GlobeRegular,
  OpenRegular,
  GlobeLocationRegular,
} from "@fluentui/react-icons";
import type { FormData } from "../../types/caseTypes";
import {
  conflictOfLawHeat,
  getTargetUserSummary,
} from "../../utils/attorneyEscalationHelpers";
import { getEscalatedIdentifiers } from "../../utils/caseEscalation";

interface PriorCaseRef {
  caseId: string;
}

const useStyles = makeStyles({
  card: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  stripe: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
  },
  stripeHeader: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    fontWeight: tokens.fontWeightSemibold,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    columnGap: tokens.spacingHorizontalM,
    rowGap: "2px",
    fontSize: tokens.fontSizeBase200,
  },
  label: {
    color: tokens.colorNeutralForeground3,
  },
  heatRow: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  tabBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    columnGap: "2px",
    rowGap: "2px",
    marginTop: tokens.spacingVerticalXS,
    marginBottom: "-1px",
    position: "relative",
    zIndex: 1,
  },
  tab: {
    cursor: "pointer",
    paddingTop: "6px",
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: "6px",
    paddingLeft: tokens.spacingHorizontalM,
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
    fontSize: tokens.fontSizeBase200,
    fontFamily: "inherit",
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    whiteSpace: "nowrap",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2,
    },
    ":focus-visible": {
      outlineStyle: "solid",
      outlineWidth: "2px",
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "2px",
    },
  },
  tabActive: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
    borderTopWidth: "2px",
    borderTopColor: tokens.colorBrandStroke1,
    paddingTop: "5px",
    borderBottomColor: tokens.colorNeutralBackground1,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1,
    },
  },
  tabPromoted: {
    fontStyle: "italic",
    color: tokens.colorNeutralForeground2,
  },
  tabPromotedActive: {
    borderTopColor: tokens.colorNeutralStroke1,
  },
  notFlaggedChip: {
    marginLeft: "6px",
    fontStyle: "normal",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    paddingLeft: "4px",
    paddingRight: "4px",
    paddingTop: "1px",
    paddingBottom: "1px",
    borderTopLeftRadius: tokens.borderRadiusSmall,
    borderTopRightRadius: tokens.borderRadiusSmall,
    borderBottomRightRadius: tokens.borderRadiusSmall,
    borderBottomLeftRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
  notFlaggedMenu: {
    cursor: "pointer",
    paddingTop: "6px",
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: "6px",
    paddingLeft: tokens.spacingHorizontalM,
    borderTopStyle: "none",
    borderRightStyle: "none",
    borderBottomStyle: "none",
    borderLeftStyle: "none",
    fontSize: tokens.fontSizeBase200,
    fontFamily: "inherit",
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
    marginLeft: tokens.spacingHorizontalS,
    ":hover": {
      color: tokens.colorNeutralForeground1,
    },
  },
  linkedDetail: {
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
    borderTopLeftRadius: "0",
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground1,
    position: "relative",
  },
  lastLogonRow: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
  },
  // Footer hint for the "all" Target Identifier mode when the case has
  // more than ALL_IDENTIFIERS_INLINE_CAP identifiers. Sits one row
  // below the table, muted + italic, so it reads as a pointer rather
  // than another data row.
  identifiersOverflow: {
    marginTop: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalXS,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    borderTopColor: tokens.colorNeutralStroke3,
    fontStyle: "italic",
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

function heatColor(h: ReturnType<typeof conflictOfLawHeat>) {
  if (h === "HIGH") return "danger" as const;
  if (h === "MEDIUM") return "warning" as const;
  return "success" as const;
}

/** Locale-safe short date — "May 23, 2026" rather than "2026-05-23" or
 *  the ambiguous "5/23/26". Matches the formatting the rest of the
 *  case form uses (see `formatDateToMMM` in fulfillmentWizardHelpers
 *  and `date-fns` MMM d, yyyy elsewhere). Falls back to em-dash when
 *  the value is missing or not a valid Date. */
function formatDate(d: Date | string | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface Props {
  case: FormData;
  /** Phase 3: opens the cross-border login activity drawer for an
   *  identifier. When undefined, the Last logon "See more" button hides. */
  onSeeLogins?: (identifierId: string) => void;
  /** Phase 4: opens the Prior Case Detail drawer. When undefined, the
   *  Prior LNS row shows only the count (no links). */
  onOpenPriorCaseDetail?: (caseId: string) => void;
  /** Phase 4: lookup helper for prior LNS by tenant. When undefined, the
   *  Prior LNS row shows "—". */
  getPriorCasesForTenant?: (tenantId: string) => PriorCaseRef[];
  /** Variant for the Target Identifier stripe:
   *   - `"flagged-focus"` (default): tab pattern centered on escalated
   *     identifiers — the attorney view. Surfaces escalated identifiers
   *     as tabs, hides non-flagged ones in a "+N not flagged" overflow,
   *     and shows enriched detail (Last logon, Geo) for the active tab.
   *   - `"all"`: simple Type · Value list of every identifier on the
   *     case, capped at 5 with an overflow pointer that nudges the user
   *     to open the case. Used by the RS / TS preview pane on the Case
   *     Queue — they need to scan the full identifier set to gauge
   *     case complexity, not focus on which ones an attorney flagged. */
  targetIdentifierMode?: "flagged-focus" | "all";
}

/** Max identifiers shown inline in `targetIdentifierMode === "all"`.
 *  Above this we render a pointer row so the preview pane doesn't
 *  bloat — the user can open the case for the full list. */
const ALL_IDENTIFIERS_INLINE_CAP = 5;

export function EnterpriseTriPaneSummary({
  case: c,
  onSeeLogins,
  onOpenPriorCaseDetail,
  getPriorCasesForTenant,
  targetIdentifierMode = "flagged-focus",
}: Props) {
  const styles = useStyles();
  const ec = c.enterpriseContext;

  const escalated = getEscalatedIdentifiers(c);
  const defaultId = escalated[0]?.id ?? c.identifiers[0]?.id;
  const [selectedIdentifierId, setSelectedIdentifierId] = useState<
    string | undefined
  >(defaultId);

  const validSelection = selectedIdentifierId
    ? c.identifiers.find((id) => id.id === selectedIdentifierId)
    : undefined;
  const effectiveId = validSelection ? selectedIdentifierId : defaultId;
  const user = getTargetUserSummary(c, effectiveId);
  // Phase 3 cross-border merge — "View Consumer User Locations"
  // surfaces only when the active Target Identifier is Consumer.
  // Enterprise identifiers use the Org Home Location vs Issuing
  // Authority comparison in the Enterprise Org stripe below instead.
  const activeIdentifier = c.identifiers.find((id) => id.id === effectiveId);
  const activeIsConsumer =
    activeIdentifier?.checkAccounts?.accountType === "Consumer";

  const heat = conflictOfLawHeat(c);
  const tenantId = ec?.org.tenantId;
  const priorCases =
    tenantId && getPriorCasesForTenant ? getPriorCasesForTenant(tenantId) : [];

  const notEscalated = c.identifiers.filter(
    (id) => !escalated.some((e) => e.id === id.id),
  );
  const multipleIdentifiers = c.identifiers.length > 1;

  const promotedNotEscalated = notEscalated.find((id) => id.id === effectiveId);
  const displayedTabs = promotedNotEscalated
    ? [...escalated, promotedNotEscalated]
    : escalated;
  const remainingMenu = notEscalated.filter(
    (id) => id.id !== promotedNotEscalated?.id,
  );

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (displayedTabs.length === 0) return;
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % displayedTabs.length;
    else if (e.key === "ArrowLeft")
      next = (index - 1 + displayedTabs.length) % displayedTabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = displayedTabs.length - 1;
    if (next === -1) return;
    e.preventDefault();
    setSelectedIdentifierId(displayedTabs[next].id);
    tabRefs.current[next]?.focus();
  }

  // Issuing authority — DARS may have it on the eevidenceIssuingAuthority
  // block; for non-eEvidence cases, fall back to the agency.
  const issuingAuthority =
    c.eevidenceIssuingAuthority?.name ?? c.agency ?? "—";

  return (
    <Card className={styles.card}>
      <div className={styles.stripe}>
        <div className={styles.stripeHeader}>
          <ScalesRegular fontSize={20} />
          <Text as="h2">LE &amp; Order</Text>
        </div>
        <div className={styles.row}>
          <Text className={styles.label}>Request type</Text>
          <Text>{c.requestType}</Text>
          <Text className={styles.label}>Agency</Text>
          <Text>{c.agency}</Text>
          <Text className={styles.label}>Country</Text>
          <Text>{c.country}</Text>
          <Text className={styles.label}>Issuing authority</Text>
          <Text>{issuingAuthority}</Text>
          <Text className={styles.label}>Crime</Text>
          <Text>{c.natureOfCrimes.join(", ") || "—"}</Text>
          <Text className={styles.label}>Prior LNS</Text>
          <Text>
            {!getPriorCasesForTenant
              ? "—"
              : priorCases.length === 0
                ? "0"
                : (
                  <>
                    {priorCases.map((p, i) => (
                      <span key={p.caseId}>
                        {i > 0 && ", "}
                        {onOpenPriorCaseDetail ? (
                          <Link
                            as="button"
                            onClick={() => onOpenPriorCaseDetail(p.caseId)}
                          >
                            {p.caseId}
                          </Link>
                        ) : (
                          p.caseId
                        )}
                      </span>
                    ))}
                  </>
                )}
          </Text>
          {/* Due date, Received date, Origin — promoted from the
              preview-pane Snapshot section so all LE / order metadata
              lives in one stripe. Formatting matches the surrounding
              row pattern: ISO date for date fields, plain text for
              the request origin (e.g. "LEAPI", "LE Portal"). */}
          <Text className={styles.label}>Due date</Text>
          <Text>{formatDate(c.dueDate)}</Text>
          <Text className={styles.label}>Received date</Text>
          <Text>{formatDate(c.dateReceived || c.createDate)}</Text>
          <Text className={styles.label}>Origin</Text>
          <Text>{c.requestOrigin || "—"}</Text>
        </div>
      </div>

      <Divider />

      <div className={styles.stripe}>
        <div className={styles.stripeHeader}>
          <PersonRegular fontSize={20} />
          <Text as="h2">
            {targetIdentifierMode === "all"
              ? `Target Identifiers (${c.identifiers.length})`
              : "Target Identifier"}
          </Text>
        </div>

        {targetIdentifierMode === "all" ? (
          // Simple Type · Value list — RS / TS variant. Caps at 5 rows
          // with an overflow pointer so the preview pane stays compact
          // even on multi-identifier cases.
          c.identifiers.length === 0 ? (
            <Text style={{ color: tokens.colorNeutralForeground3 }}>—</Text>
          ) : (
            <>
              <div className={styles.row}>
                {c.identifiers
                  .slice(0, ALL_IDENTIFIERS_INLINE_CAP)
                  .map((id) => (
                    <Fragment key={id.id}>
                      <Text className={styles.label}>{id.type}</Text>
                      <Text>{id.value}</Text>
                    </Fragment>
                  ))}
              </div>
              {c.identifiers.length > ALL_IDENTIFIERS_INLINE_CAP && (
                <div className={styles.identifiersOverflow}>
                  Showing {ALL_IDENTIFIERS_INLINE_CAP} of{" "}
                  {c.identifiers.length} — open the case to review all
                  identifiers.
                </div>
              )}
            </>
          )
        ) : null}

        {targetIdentifierMode === "flagged-focus" && multipleIdentifiers && (
          <div className={styles.tabBar}>
            <div
              role="tablist"
              aria-label="Target identifier"
              style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}
            >
              {displayedTabs.map((id, index) => {
                const active = effectiveId === id.id;
                const isPromoted = id.id === promotedNotEscalated?.id;
                const className = [
                  styles.tab,
                  active && styles.tabActive,
                  isPromoted && styles.tabPromoted,
                  isPromoted && active && styles.tabPromotedActive,
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={id.id}
                    ref={(el) => {
                      tabRefs.current[index] = el;
                    }}
                    id={`tab-${id.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`tabpanel-target-identifier-${c.caseId}`}
                    tabIndex={active ? 0 : -1}
                    className={className}
                    onClick={() => setSelectedIdentifierId(id.id)}
                    onKeyDown={(e) => onTabKeyDown(e, index)}
                  >
                    {id.value}
                    {isPromoted && (
                      <span className={styles.notFlaggedChip}>Not flagged</span>
                    )}
                  </button>
                );
              })}
            </div>
            {remainingMenu.length > 0 && (
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <button
                    type="button"
                    className={styles.notFlaggedMenu}
                    aria-label={`Switch to one of ${remainingMenu.length} identifiers not flagged for review`}
                  >
                    +{remainingMenu.length} not flagged ▾
                  </button>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    {remainingMenu.map((id) => (
                      <MenuItem
                        key={id.id}
                        onClick={() => setSelectedIdentifierId(id.id)}
                      >
                        {id.value}
                      </MenuItem>
                    ))}
                  </MenuList>
                </MenuPopover>
              </Menu>
            )}
          </div>
        )}

        {targetIdentifierMode === "flagged-focus" && (
        <div
          className={multipleIdentifiers ? styles.linkedDetail : undefined}
          role={multipleIdentifiers ? "tabpanel" : undefined}
          id={
            multipleIdentifiers
              ? `tabpanel-target-identifier-${c.caseId}`
              : undefined
          }
          aria-labelledby={
            multipleIdentifiers && effectiveId
              ? `tab-${effectiveId}`
              : undefined
          }
          tabIndex={multipleIdentifiers ? 0 : undefined}
        >
          <div className={styles.row}>
            <Text className={styles.label}>Identifier</Text>
            <Text>{user?.identifierValue ?? "—"}</Text>
            <Text className={styles.label}>Last logon</Text>
            <span className={styles.lastLogonRow}>
              <Text>{user?.lastLogonLocation ?? "—"}</Text>
              {onSeeLogins && user && activeIsConsumer && (
                <Button
                  size="small"
                  appearance="outline"
                  icon={<GlobeLocationRegular />}
                  onClick={() => onSeeLogins(user.identifierId)}
                >
                  View Consumer User Locations
                </Button>
              )}
            </span>
            <Text className={styles.label}>Geo (30d)</Text>
            <Text>
              {user && user.geoResolutions30d.length > 0
                ? user.geoResolutions30d.join(", ")
                : "—"}
            </Text>
            {user?.mailboxRegion && (
              <>
                <Text className={styles.label}>Mailbox</Text>
                <Text>{user.mailboxRegion}</Text>
              </>
            )}
            {user?.oneDriveRegion && (
              <>
                <Text className={styles.label}>OneDrive</Text>
                <Text>{user.oneDriveRegion}</Text>
              </>
            )}
          </div>
        </div>
        )}
      </div>

      {ec && (
        <>
          <Divider />
          <div className={styles.stripe}>
            <div className={styles.stripeHeader}>
              <BuildingRegular fontSize={20} />
              <Text as="h2">Enterprise Org</Text>
            </div>
            <div className={styles.row}>
              <Text className={styles.label}>Tenant</Text>
              <Text>
                {ec.org.tenantDisplayName} ({ec.org.tenantPrimaryDomain})
                {ec.orgs && ec.orgs.length > 1 && (
                  <>
                    {" "}
                    <Badge
                      appearance="tint"
                      color="brand"
                      size="small"
                    >
                      +{ec.orgs.length - 1} more tenant
                      {ec.orgs.length - 1 === 1 ? "" : "s"}
                    </Badge>
                  </>
                )}
              </Text>
              {ec.org.parentTpid && (
                <>
                  <Text className={styles.label}>Parent TPID</Text>
                  <Text>
                    {ec.org.parentTpidDisplayName ?? ec.org.parentTpid}
                  </Text>
                </>
              )}
              {/* Phase 3 cross-border merge — "Org Home Location" is the
                  Enterprise cross-border signal source. When the tenant
                  home country differs from the issuing-authority
                  country, we surface a Cross-border chip inline so the
                  attorney sees the gap without opening the OrgPanel. */}
              <Text className={styles.label}>Org Home Location</Text>
              <Text>
                {ec.org.hqCountry ?? "—"}
                {ec.org.hqCountry &&
                  c.country &&
                  (ec.org.hqCountry.trim().toLowerCase() !==
                  c.country.trim().toLowerCase() ? (
                    <>
                      {" "}
                      <Badge
                        color="warning"
                        appearance="filled"
                        size="small"
                      >
                        Cross-border vs {c.country}
                      </Badge>
                    </>
                  ) : (
                    <>
                      {" "}
                      <Badge color="success" appearance="tint" size="small">
                        In-jurisdiction
                      </Badge>
                    </>
                  ))}
              </Text>
              <Text className={styles.label}>Seats</Text>
              <Text>
                {ec.org.exchangeSeatCount?.toLocaleString() ?? "—"}{" "}
                {ec.org.isS500 && (
                  <Badge color="important" appearance="tint">
                    S500
                  </Badge>
                )}{" "}
                {ec.org.hasDerogation && (
                  <Badge color="warning" appearance="tint">
                    Derogation
                  </Badge>
                )}
              </Text>
              <Text className={styles.label}>Storage</Text>
              <Text>{ec.org.defaultStorageRegion ?? "—"}</Text>
              {/* Admin contact — surfaces the tenant admin's name, email,
                  and phone so the attorney has direct outreach details
                  for case redirects / controller-notification follow-ups
                  without leaving the tri-pane. */}
              <Text className={styles.label}>Admin contact</Text>
              <Text>
                {ec.org.adminContact ? (
                  <>
                    <strong>{ec.org.adminContact.name}</strong>
                    {" · "}
                    <Link href={`mailto:${ec.org.adminContact.email}`}>
                      {ec.org.adminContact.email}
                    </Link>
                    {" · "}
                    <Link href={`tel:${ec.org.adminContact.phone}`}>
                      {ec.org.adminContact.phone}
                    </Link>
                  </>
                ) : (
                  "—"
                )}
              </Text>
            </div>
          </div>
        </>
      )}

      <Divider />

      <div className={styles.heatRow}>
        <GlobeRegular fontSize={20} />
        <Text weight="semibold">Aggregate conflict-of-law:</Text>
        <Badge color={heatColor(heat)} appearance="filled">
          {heat}
        </Badge>
      </div>
    </Card>
  );
}
