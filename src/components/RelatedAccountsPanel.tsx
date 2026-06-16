/**
 * RelatedAccountsPanel — v2.1 per-account display of discovered accounts
 * returned by CLASSv2 Account Identifiers API.
 *
 * Replaces the flat alias list with structured per-account entries:
 *   - PRIMARY accounts shown first with relevance badges and category
 *   - Each account shows its own aliases (identifiers[]) with primary flag
 *   - RELATED accounts shown below with "See more" pagination (top 2 visible)
 *   - Enterprise-and-Consumer identifier-level accountType badge
 *
 * Falls back to the legacy flat string display when `discoveredAccounts`
 * is not populated (v2.0 responses).
 */

import * as React from "react";
import {
  Badge,
  Button,
  Tag,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ChevronDownRegular,
  ChevronUpRegular,
  StarRegular,
  ShieldCheckmarkRegular,
  InfoRegular,
} from "@fluentui/react-icons";
import type { AccountIdentifier, RelatedIdentifierAccount } from "../types/caseTypes";
import { CopyableIdentifier } from "./CopyableIdentifier";
import { inferIdentifierType } from "./IdentifierAliasesPanel";

const RELATED_VISIBLE_DEFAULT = 2;

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalS,
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
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
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "2px",
  },
  headerTitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    fontWeight: tokens.fontWeightSemibold,
  },
  identifierLevelBadge: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },
  sectionLabel: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: "2px",
  },
  accountCard: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    paddingTop: tokens.spacingVerticalXS,
    paddingRight: tokens.spacingHorizontalS,
    paddingBottom: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalS,
    backgroundColor: tokens.colorNeutralBackground1,
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
    borderTopLeftRadius: tokens.borderRadiusSmall,
    borderTopRightRadius: tokens.borderRadiusSmall,
    borderBottomLeftRadius: tokens.borderRadiusSmall,
    borderBottomRightRadius: tokens.borderRadiusSmall,
  },
  accountHeader: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap" as const,
  },
  accountType: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
  },
  categoryText: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
  },
  identifierRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase200,
    paddingTop: "1px",
    paddingBottom: "1px",
  },
  primaryIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  aliasLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  seeMoreRow: {
    display: "flex",
    justifyContent: "center",
    paddingTop: "4px",
  },
  toggleButton: {
    minWidth: "auto",
    height: "24px",
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  leRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr auto",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase200,
    paddingTop: "2px",
    paddingBottom: "2px",
  },
  leLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    fontWeight: tokens.fontWeightSemibold,
  },
  metadataRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    flexWrap: "wrap" as const,
  },
});

function RelevanceBadge({ relevance }: { relevance: string }) {
  if (relevance === "RELEVANT") {
    return (
      <Badge appearance="filled" color="success" size="small" icon={<ShieldCheckmarkRegular />}>
        Relevant
      </Badge>
    );
  }
  if (relevance === "NOT_RELEVANT") {
    return (
      <Badge appearance="tint" color="subtle" size="small">
        Not Relevant
      </Badge>
    );
  }
  return (
    <Badge appearance="tint" color="warning" size="small">
      Pending
    </Badge>
  );
}

function AccountTypeTag({ accountType }: { accountType: string }) {
  const color = accountType === "Consumer" ? "informative" : "severe";
  const label = accountType === "EnterpriseUser" ? "Enterprise" : accountType;
  return (
    <Tag size="extra-small" appearance="outline" shape="circular"
      style={{ color: color === "severe" ? tokens.colorPaletteRedForeground1 : tokens.colorBrandForeground1 }}>
      {label}
    </Tag>
  );
}

function AccountCard({ account, showCategory }: { account: RelatedIdentifierAccount; showCategory?: boolean }) {
  const styles = useStyles();
  const primaryId = account.identifiers.find((id) => id.primary);
  const aliases = account.identifiers.filter((id) => !id.primary);

  return (
    <div className={styles.accountCard}>
      <div className={styles.accountHeader}>
        <AccountTypeTag accountType={account.accountType} />
        <RelevanceBadge relevance={account.disclosureRelevance} />
        {showCategory && (
          <span className={styles.categoryText}>{account.category}</span>
        )}
        {account.mailboxStatus && (
          <Tooltip content={`Mailbox: ${account.mailboxStatus}`} relationship="description">
            <Tag size="extra-small" appearance="outline">
              {account.mailboxStatus}
            </Tag>
          </Tooltip>
        )}
      </div>

      {/* Primary identifier for this account */}
      {primaryId && (
        <div className={styles.identifierRow}>
          <CopyableIdentifier value={primaryId.identifier} copyLabel="Copy primary" variant="inline" />
          <Tag size="extra-small" appearance="outline">{primaryId.identifierType}</Tag>
          <span className={styles.primaryIndicator}>
            <StarRegular fontSize={12} /> Primary
          </span>
        </div>
      )}

      {/* Other identifiers (aliases within this account) */}
      {aliases.map((alias, i) => (
        <div key={`${alias.identifier}-${i}`} className={styles.identifierRow}>
          <CopyableIdentifier value={alias.identifier} copyLabel="Copy alias" variant="inline" />
          <Tag size="extra-small" appearance="outline">{alias.identifierType}</Tag>
          <span className={styles.aliasLabel}>Alias</span>
        </div>
      ))}

      {/* Account metadata line */}
      <div className={styles.metadataRow}>
        {account.tenantId && (
          <Tooltip content={`Tenant: ${account.tenantId}`} relationship="description">
            <span style={{ cursor: "help" }}>
              <InfoRegular fontSize={12} /> Tenant
            </span>
          </Tooltip>
        )}
        {account.puid && <span>PUID: {account.puid}</span>}
        {account.upn && <span>UPN: {account.upn}</span>}
        {account.msaIdentityExists !== undefined && (
          <span>MSA: {account.msaIdentityExists ? "✓" : "✗"}</span>
        )}
        {account.hasMailboxStore !== undefined && (
          <span>Mailbox: {account.hasMailboxStore ? "✓" : "✗"}</span>
        )}
      </div>
    </div>
  );
}

export interface RelatedAccountsPanelProps {
  identifier: AccountIdentifier;
}

export function RelatedAccountsPanel({ identifier }: RelatedAccountsPanelProps) {
  const styles = useStyles();
  const ca = identifier.checkAccounts;
  const accounts = ca?.discoveredAccounts;

  // v2.0 fallback: no structured accounts, render nothing (legacy panel handles it)
  if (!accounts || accounts.length === 0) return null;

  const [showAllRelated, setShowAllRelated] = React.useState(false);

  // Split into PRIMARY and RELATED accounts
  const primaryAccounts = accounts.filter((a) => a.category.startsWith("Primary"));
  const relatedAccounts = accounts.filter((a) => !a.category.startsWith("Primary"));

  const visibleRelated = showAllRelated
    ? relatedAccounts
    : relatedAccounts.slice(0, RELATED_VISIBLE_DEFAULT);
  const hiddenRelatedCount = relatedAccounts.length - RELATED_VISIBLE_DEFAULT;

  const leType = inferIdentifierType(identifier.value);

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          Discovered Accounts · CLASSv2 v2.1
        </span>
        <div className={styles.identifierLevelBadge}>
          {ca?.accountType === "Enterprise-and-Consumer" && (
            <Tag size="extra-small" appearance="brand" shape="circular">
              Enterprise & Consumer
            </Tag>
          )}
          {ca?.disclosureRelevance && (
            <RelevanceBadge relevance={ca.disclosureRelevance} />
          )}
        </div>
      </div>

      {/* LE-submitted identifier */}
      <div className={styles.leRow}>
        <span className={styles.leLabel}>Submitted by LE</span>
        <CopyableIdentifier value={identifier.value} copyLabel="Copy LE identifier" variant="inline" />
        <Tag size="extra-small" appearance="outline">{leType}</Tag>
      </div>

      {/* PRIMARY accounts section */}
      {primaryAccounts.length > 0 && (
        <>
          <div className={styles.sectionLabel}>
            Primary Accounts ({primaryAccounts.length})
          </div>
          {primaryAccounts.map((account, i) => (
            <AccountCard key={`primary-${i}`} account={account} showCategory />
          ))}
        </>
      )}

      {/* RELATED accounts section with see-more */}
      {relatedAccounts.length > 0 && (
        <>
          <div className={styles.sectionLabel}>
            Related Accounts ({relatedAccounts.length})
          </div>
          {visibleRelated.map((account, i) => (
            <AccountCard key={`related-${i}`} account={account} showCategory />
          ))}
          {hiddenRelatedCount > 0 && (
            <div className={styles.seeMoreRow}>
              <Button
                appearance="subtle"
                size="small"
                className={styles.toggleButton}
                icon={showAllRelated ? <ChevronUpRegular fontSize={14} /> : <ChevronDownRegular fontSize={14} />}
                iconPosition="after"
                onClick={() => setShowAllRelated((v) => !v)}
                aria-expanded={showAllRelated}
                aria-label={
                  showAllRelated
                    ? "Show fewer related accounts"
                    : `Show ${hiddenRelatedCount} more related account${hiddenRelatedCount === 1 ? "" : "s"}`
                }
              >
                {showAllRelated
                  ? "Show less"
                  : `See ${hiddenRelatedCount} more related account${hiddenRelatedCount === 1 ? "" : "s"}`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
