/**
 * IdentifierAliasesPanel — read-only display of the identifier values returned
 * by the Check Accounts (CLASS) lookup, with click-to-copy on every value.
 *
 * Used on:
 *   - Step 2 LE Review pane (display-only context as the RS configures the plan).
 *   - Collection page by-identifier expanded body (RS copies an alias and pastes
 *     into an external manual-collection tool).
 *
 * Three row types:
 *   - Submitted by LE — the original identifier value submitted on the demand.
 *   - Primary        — canonical Microsoft account identifier from CLASS.
 *   - Related (N)    — alias accounts returned by CLASS.
 *
 * Type chips use the canonical IdentifierType enum value names from LENS-Common
 * (PUID, IPAddress, PhoneNumber, UPN, TenantId, CID, Email, SkypeID,
 * XboxGamertag, Domain, SkypeNumber, SMTPAddress). When per-alias type metadata
 * is unavailable, `inferIdentifierType` derives the chip from the value string.
 *
 * Renders null when neither primaryIdentifier nor relatedIdentifiers is set.
 */

import * as React from "react";
import {
  Tag,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import type { AccountIdentifier } from "../types/caseTypes";
import { CopyableIdentifier } from "./CopyableIdentifier";

export type IdentifierType =
  | "PUID"
  | "IPAddress"
  | "PhoneNumber"
  | "UPN"
  | "TenantId"
  | "CID"
  | "Email"
  | "SkypeID"
  | "XboxGamertag"
  | "Domain"
  | "SkypeNumber"
  | "SMTPAddress"
  | "Other";

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOMAIN_ONLY_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const PHONE_RE = /^\+?[\d\s().-]{6,}$/;
const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^([0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}$/i;

export function inferIdentifierType(value: string): IdentifierType {
  const v = value.trim();
  if (!v) return "Other";
  if (v.includes("@")) return "Email";
  if (GUID_RE.test(v)) return "PUID";
  if (IPV4_RE.test(v) || IPV6_RE.test(v)) return "IPAddress";
  if (PHONE_RE.test(v) && /\d/.test(v)) return "PhoneNumber";
  if (DOMAIN_ONLY_RE.test(v)) return "Domain";
  return "Other";
}

/**
 * Map a free-text identifier-type string (e.g. the prototype's
 * `identifier.type` of "Email Address" / "Phone Number") to a canonical
 * IdentifierType value name. Falls back to value-based inference when the
 * label is unrecognized.
 */
function normalizeTypeLabel(label: string | undefined, value: string): IdentifierType {
  if (!label) return inferIdentifierType(value);
  const l = label.trim().toLowerCase();
  if (l === "email" || l === "email address") return "Email";
  if (l === "phone" || l === "phone number") return "PhoneNumber";
  if (l === "puid") return "PUID";
  if (l === "ipaddress" || l === "ip address" || l === "ip") return "IPAddress";
  if (l === "upn") return "UPN";
  if (l === "tenantid" || l === "tenant id") return "TenantId";
  if (l === "cid") return "CID";
  if (l === "skypeid" || l === "skype id") return "SkypeID";
  if (l === "xboxgamertag" || l === "xbox gamertag" || l === "gamertag") return "XboxGamertag";
  if (l === "domain") return "Domain";
  if (l === "skypenumber" || l === "skype number") return "SkypeNumber";
  if (l === "smtpaddress" || l === "smtp address") return "SMTPAddress";
  return inferIdentifierType(value);
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
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
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: tokens.fontWeightSemibold,
    paddingBottom: "2px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "120px 1fr auto auto",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    rowGap: "2px",
    fontSize: tokens.fontSizeBase200,
    paddingTop: "2px",
    paddingBottom: "2px",
  },
  rowLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: tokens.fontWeightSemibold,
  },
  rowValue: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  accountTypeText: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
  },
  relatedGroup: {
    display: "flex",
    flexDirection: "column",
  },
});

interface AliasRowProps {
  label: string;
  value: string;
  type: IdentifierType;
  copyLabel: string;
  accountTypeText?: string;
}

function AliasRow({ label, value, type, copyLabel, accountTypeText }: AliasRowProps) {
  const styles = useStyles();
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>
        <CopyableIdentifier value={value} copyLabel={copyLabel} variant="inline" />
      </span>
      <Tag size="extra-small" appearance="outline">
        {type}
      </Tag>
      {accountTypeText ? (
        <span className={styles.accountTypeText}>{accountTypeText}</span>
      ) : (
        <span aria-hidden />
      )}
    </div>
  );
}

export interface IdentifierAliasesPanelProps {
  identifier: AccountIdentifier;
}

export function IdentifierAliasesPanel({ identifier }: IdentifierAliasesPanelProps) {
  const styles = useStyles();
  const ca = identifier.checkAccounts;
  const primary = ca?.primaryIdentifier;
  const related = ca?.relatedIdentifiers ?? [];

  if (!primary && related.length === 0) return null;

  const accountType = ca?.accountType;
  const accountTypeText =
    accountType && accountType !== "N/A" ? accountType : undefined;

  const leType = normalizeTypeLabel(identifier.type, identifier.value);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        Account aliases · from Check Accounts (CLASS lookup)
      </div>

      <AliasRow
        label="Submitted by LE"
        value={identifier.value}
        type={leType}
        copyLabel="Copy LE-submitted identifier"
      />

      {primary && (
        <AliasRow
          label="Primary"
          value={primary}
          type={inferIdentifierType(primary)}
          copyLabel="Copy primary identifier"
          accountTypeText={accountTypeText}
        />
      )}

      {related.length > 0 && (
        <div className={styles.relatedGroup}>
          {related.map((alias, i) => (
            <AliasRow
              key={`${alias}-${i}`}
              label={i === 0 ? `Related (${related.length})` : ""}
              value={alias}
              type={inferIdentifierType(alias)}
              copyLabel="Copy related identifier"
              accountTypeText={accountTypeText}
            />
          ))}
        </div>
      )}
    </div>
  );
}
