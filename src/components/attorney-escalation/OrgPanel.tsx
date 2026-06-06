// Tier 3 enterprise org card. Renders the tenant's HQ, seat count + threshold
// chips, S500/Derogation/Custom-contract badges, account manager, admin
// contact, and a "Prior LNS history" row (the button itself lands in Phase 4
// when ViewPriorHistoryButton + the store action come in).
//
// Fluent v9 + Griffel. Long-form border properties per UI_LIBRARY_POLICY.md.

import {
  Badge,
  Link,
  Text,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  BuildingRegular,
  StarFilled,
  WarningRegular,
  PersonChatRegular,
  GlobeProhibitedRegular,
  CheckmarkCircleRegular,
} from "@fluentui/react-icons";
import type {
  EnterpriseOrgContext,
  FormData,
} from "../../types/caseTypes";
import { getParentTenantOrg } from "../../utils/caseEscalation";

const useStyles = makeStyles({
  root: {
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
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
  value: {
    fontSize: tokens.fontSizeBase300,
  },
  badgeRow: {
    display: "flex",
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
    flexWrap: "wrap",
    marginTop: tokens.spacingVerticalS,
  },
  // Multi-line value cell — used for the mailing address. Default grid
  // value cell sits on one line; this lets the address wrap as authored.
  addressValue: {
    fontSize: tokens.fontSizeBase300,
    whiteSpace: "pre-line",
  },
  // Domain chip list — wraps inside the value cell so long domain sets
  // (and the second parent-tenant group) stay inside the column.
  domainList: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: tokens.spacingHorizontalXS,
    rowGap: tokens.spacingVerticalXXS,
  },
  domainGroupHeading: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    marginTop: tokens.spacingVerticalS,
    marginBottom: "2px",
  },
});

// ── Helpers ──────────────────────────────────────────────────────────

function formatMailingAddress(
  addr: NonNullable<EnterpriseOrgContext["tenantMailingAddress"]>,
): string {
  const street = [addr.number, addr.street].filter(Boolean).join(" ").trim();
  const locality = [
    addr.city,
    [addr.stateProvince, addr.postalCode].filter(Boolean).join(" ").trim(),
  ]
    .filter((part) => part && part.length > 0)
    .join(", ");
  return [street, locality, addr.country].filter(Boolean).join("\n");
}

function formatTenantCreatedAt(d: Date): string {
  // "Aug 4, 2018 · 2:45 PM UTC" — fixed UTC rendering so demos read the
  // same regardless of the tester's local timezone. Production can swap
  // to the tenant's home timezone once that field is plumbed.
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
  return `${date} · ${time} UTC`;
}

function DomainList({
  domains,
}: {
  domains: NonNullable<EnterpriseOrgContext["domains"]>;
}) {
  const styles = useStyles();
  return (
    <div className={styles.domainList}>
      {domains.map((d) => {
        // Primary domain → brand-tinted chip. onmicrosoft.com is the
        // auto-provisioned default → muted/subtle styling so eyes go
        // to verified custom domains first. Unverified domains → warning
        // styling to flag pending DNS / DMARC setup.
        const color: React.ComponentProps<typeof Badge>["color"] = d.isPrimary
          ? "brand"
          : !d.verified
            ? "warning"
            : d.domainType === "onmicrosoft"
              ? "subtle"
              : "informative";
        const title = !d.verified
          ? `${d.name} — unverified (DNS TXT or MX record not confirmed)`
          : d.isPrimary
            ? `${d.name} — primary domain (default reply-to)`
            : d.domainType === "onmicrosoft"
              ? `${d.name} — Microsoft-issued tenant domain (always present)`
              : `${d.name} — verified custom domain`;
        return (
          <Badge
            key={d.name}
            color={color}
            appearance="tint"
            title={title}
            aria-label={title}
          >
            {d.name}
            {d.isPrimary && " (Primary)"}
            {!d.verified && " (Unverified)"}
          </Badge>
        );
      })}
    </div>
  );
}

interface Props {
  org: EnterpriseOrgContext;
  /** When passed, the panel surfaces an Org Home Location vs Issuing
   *  Authority cross-border comparison chip alongside the location
   *  field. Without it, the chip is hidden. */
  case?: FormData;
  /** Phase 4 — placeholder for the inline "Prior LNS history" button
   *  the EnterpriseContextSection passes in (a `ViewPriorHistoryButton`).
   *  When undefined, the row hides. */
  priorHistorySlot?: React.ReactNode;
  /** Compatibility alias for the slot prop. Both keep older callers
   *  working while the merge stabilises; either populates the same
   *  inline "Prior LNS history" row. */
  ctaSlot?: React.ReactNode;
  /** Phase 4 — fired when the attorney clicks the inline button on the
   *  "Prior LNS history" row. Mirrors the spec §6.2 placement. The
   *  parent typically opens the PriorTenantHistoryPanel drawer. */
  onViewPriorHistory?: () => void;
  /** Multi-tenant disambiguation — when the case spans multiple
   *  tenants, the EnterpriseContextSection stacks one panel per
   *  tenant and passes the 1-based index + total count so the title
   *  reads "Organization — Contoso Corp · Tenant 1 of 2". Single-
   *  tenant cases leave these undefined and the title stays unchanged. */
  tenantIndex?: number;
  tenantCount?: number;
}

export function OrgPanel({
  org,
  case: c,
  priorHistorySlot,
  ctaSlot,
  onViewPriorHistory,
  tenantIndex,
  tenantCount,
}: Props) {
  void onViewPriorHistory;
  const styles = useStyles();
  const seatBadge = (() => {
    const s = org.exchangeSeatCount ?? 0;
    if (s > 5000)
      return <Badge color="danger" appearance="tint">Exec review</Badge>;
    if (s > 50)
      return <Badge color="warning" appearance="tint">Policy review</Badge>;
    return null;
  })();

  // Audit P1 #8: derive provenance copy for the S500 / V100 badges
  // from the case's recorded tenantTierCheck (when present). Surfaced
  // via badge tooltip — the canonical place for "who recorded this,
  // when, in which role" now that the duplicate badges in the section
  // header are gone.
  const tierCheck = c?.enterpriseContext?.tenantTierCheck;
  const tierCheckProvenance = tierCheck
    ? {
        isS500: tierCheck.isS500
          ? `On S500 list — recorded by ${tierCheck.checkedBy} (${tierCheck.checkedRole}) on ${new Date(tierCheck.checkedAt).toLocaleString()}`
          : undefined,
        isV100: tierCheck.isV100
          ? `On V100 list — recorded by ${tierCheck.checkedBy} (${tierCheck.checkedRole}) on ${new Date(tierCheck.checkedAt).toLocaleString()}`
          : undefined,
      }
    : null;

  // Phase 3 cross-border merge — the Enterprise cross-border signal is
  // a direct comparison of the Tenant Registered Home Location (Org
  // Home Location) against the issuing authority's country. Only
  // surfaces when both values are known.
  const orgHomeCountry = org.hqCountry ?? "";
  const issuingCountry = c?.country ?? "";
  const showCrossBorder = Boolean(orgHomeCountry && issuingCountry);
  const isCrossBorder =
    showCrossBorder &&
    orgHomeCountry.trim().toLowerCase() !==
      issuingCountry.trim().toLowerCase();

  return (
    <div className={styles.root}>
      <div className={styles.title}>
        <BuildingRegular fontSize={22} />
        <Text as="h3" weight="semibold" size={400}>
          Organization — {org.tenantDisplayName}
          {tenantIndex !== undefined && tenantCount !== undefined && (
            <Text as="span" size={200} style={{ marginLeft: 8, opacity: 0.7 }}>
              · Tenant {tenantIndex} of {tenantCount}
            </Text>
          )}
        </Text>
      </div>

      <div className={styles.grid}>
        <Text className={styles.label}>Tenant</Text>
        <Text className={styles.value}>{org.tenantPrimaryDomain}</Text>

        {org.parentTpid && (
          <>
            <Text className={styles.label}>Parent TPID</Text>
            <Text className={styles.value}>
              {org.parentTpidDisplayName ?? org.parentTpid}
              {org.parentTpidDisplayName && (
                <Text as="span" size={200} style={{ marginLeft: 6, opacity: 0.7 }}>
                  ({org.parentTpid})
                </Text>
              )}
            </Text>
          </>
        )}

        <Text className={styles.label}>Org Home Location</Text>
        <Text className={styles.value}>
          {org.hqCountry ?? "—"}
          {showCrossBorder && (
            <>
              {" "}
              {isCrossBorder ? (
                <Tooltip
                  content={`Cross-border: Tenant home (${orgHomeCountry}) differs from issuing authority (${issuingCountry}).`}
                  relationship="description"
                >
                  <Badge
                    color="warning"
                    appearance="filled"
                    icon={<GlobeProhibitedRegular />}
                  >
                    Cross-border vs {issuingCountry}
                  </Badge>
                </Tooltip>
              ) : (
                <Tooltip
                  content={`In-jurisdiction: Tenant home matches issuing authority (${issuingCountry}).`}
                  relationship="description"
                >
                  <Badge
                    color="success"
                    appearance="tint"
                    icon={<CheckmarkCircleRegular />}
                  >
                    In-jurisdiction
                  </Badge>
                </Tooltip>
              )}
            </>
          )}
        </Text>

        <Text className={styles.label}>Exchange seats</Text>
        <Text className={styles.value}>
          {org.exchangeSeatCount?.toLocaleString() ?? "—"} {seatBadge}
        </Text>

        <Text className={styles.label}>SharePoint region</Text>
        <Text className={styles.value}>{org.sharePointRegion ?? "—"}</Text>

        <Text className={styles.label}>Default storage region</Text>
        <Text className={styles.value}>{org.defaultStorageRegion ?? "—"}</Text>

        <Text className={styles.label}>Account manager</Text>
        <Text className={styles.value}>
          {org.accountManager ? (
            <>
              <PersonChatRegular fontSize={14} /> {org.accountManager.name}{" "}
              {org.accountManager.raveLink && (
                <Link href={org.accountManager.raveLink} target="_blank">
                  (RAVE ↗)
                </Link>
              )}
            </>
          ) : (
            "—"
          )}
        </Text>

        <Text className={styles.label}>Admin contact</Text>
        <Text className={styles.value}>
          {org.adminContact
            ? `${org.adminContact.name} · ${org.adminContact.email} · ${org.adminContact.phone}`
            : "—"}
        </Text>

        {/* Tenant phone — distinct from the named-admin contact phone. */}
        {org.tenantPhone && (
          <>
            <Text className={styles.label}>Tenant phone</Text>
            <Text className={styles.value}>{org.tenantPhone}</Text>
          </>
        )}

        {/* Mailing address — multi-line rendering so the formatted street /
            locality / country block sits naturally. */}
        {org.tenantMailingAddress && (
          <>
            <Text className={styles.label}>Mailing address</Text>
            <Text className={styles.addressValue}>
              {formatMailingAddress(org.tenantMailingAddress)}
            </Text>
          </>
        )}

        {/* Tenant creation date — UTC-fixed rendering for demo consistency. */}
        {org.tenantCreatedAt && (
          <>
            <Text className={styles.label}>Tenant created</Text>
            <Text className={styles.value}>
              {formatTenantCreatedAt(org.tenantCreatedAt)}
            </Text>
          </>
        )}

        {/* Domains — chip list for the child tenant. When the child
            rolls up to a TPID with a holding-company tenant, also
            surface the parent tenant's registered domains as a
            separately-headlined group so the attorney can see both
            domain sets at a glance. */}
        {(() => {
          const childDomains = org.domains ?? [];
          const parentOrg = org.parentTpid
            ? getParentTenantOrg(org.parentTpid)
            : undefined;
          const parentDomains = parentOrg?.domains ?? [];
          if (childDomains.length === 0 && parentDomains.length === 0) {
            return null;
          }
          return (
            <>
              <Text className={styles.label}>Domains</Text>
              <div>
                {childDomains.length > 0 && (
                  <>
                    {parentDomains.length > 0 && (
                      <Text className={styles.domainGroupHeading}>
                        {org.tenantDisplayName}
                      </Text>
                    )}
                    <DomainList domains={childDomains} />
                  </>
                )}
                {parentDomains.length > 0 && parentOrg && (
                  <>
                    <Text className={styles.domainGroupHeading}>
                      {parentOrg.tenantDisplayName} (Parent · TPID {org.parentTpid})
                    </Text>
                    <DomainList domains={parentDomains} />
                  </>
                )}
              </div>
            </>
          );
        })()}

        {/* Phase 4 — "Prior LNS history" row hosts the inline
            ViewPriorHistoryButton when the parent passes a slot. */}
        {(priorHistorySlot ?? ctaSlot) && (
          <>
            <Text className={styles.label}>Prior LNS history</Text>
            <Text className={styles.value}>
              {priorHistorySlot ?? ctaSlot}
            </Text>
          </>
        )}
      </div>

      <div className={styles.badgeRow}>
        {org.isS500 && (
          // Audit P1 #8: S500/V100 badges live ONLY in the OrgPanel
          // (tenant-scoped) — the duplicate that lived in the
          // EnterpriseContextSection header was removed. Provenance
          // (who recorded the check, when, in which role) surfaces
          // via the tooltip when the case has a recorded tier check;
          // when the flag came from CLASS org seed (no recorded
          // check), the tooltip notes the source so users can tell.
          <Badge
            color="important"
            appearance="filled"
            icon={<StarFilled />}
            title={
              tierCheckProvenance?.isS500
                ? tierCheckProvenance.isS500
                : "S500 — strategic top-500 list (from CLASS org profile)"
            }
          >
            S500
          </Badge>
        )}
        {org.isV100 && (
          <Badge
            color="important"
            appearance="filled"
            icon={<StarFilled />}
            title={
              tierCheckProvenance?.isV100
                ? tierCheckProvenance.isV100
                : "V100 — high-value top-100 list (from CLASS org profile)"
            }
          >
            V100
          </Badge>
        )}
        {org.hasDerogation && (
          <Badge color="warning" appearance="filled" icon={<WarningRegular />}>
            Derogation present
          </Badge>
        )}
        {org.customContractLanguage && (
          <Badge color="warning" appearance="tint">
            Custom contract language
          </Badge>
        )}
      </div>
    </div>
  );
}
