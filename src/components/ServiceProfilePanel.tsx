import * as React from "react";
import { Badge, Tag, Tooltip, makeStyles, tokens } from "@fluentui/react-components";
import type { RelatedIdentifierAccount, ServiceProfileData } from "../types/caseTypes";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalXS,
    paddingRight: tokens.spacingHorizontalS,
    paddingBottom: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalS,
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
    borderTopLeftRadius: tokens.borderRadiusSmall,
    borderTopRightRadius: tokens.borderRadiusSmall,
    borderBottomLeftRadius: tokens.borderRadiusSmall,
    borderBottomRightRadius: tokens.borderRadiusSmall,
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: tokens.colorNeutralForeground3,
  },
  name: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    columnGap: tokens.spacingHorizontalS,
    flexWrap: "wrap" as const,
  },
  label: {
    minWidth: "150px",
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  value: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    rowGap: tokens.spacingVerticalXS,
    flexWrap: "wrap" as const,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  note: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorPaletteYellowForeground1,
  },
  volumeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXS,
    width: "100%",
  },
  volumeCard: {
    display: "flex",
    flexDirection: "column",
    rowGap: "2px",
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
  volumeTitle: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  volumeMeta: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
});

function formatStorageSize(sizeMb: number): string {
  if (sizeMb >= 1024) {
    return `${(sizeMb / 1024).toFixed(1)} GB`;
  }

  return `${sizeMb} MB`;
}

function formatDisplayDate(iso?: string): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getStatusBadgeAppearance(status: "found" | "not_found" | "unavailable") {
  if (status === "found") {
    return { appearance: "filled" as const, color: "success" as const, label: "Found" };
  }

  if (status === "not_found") {
    return { appearance: "tint" as const, color: "warning" as const, label: "Not found" };
  }

  return { appearance: "outline" as const, color: "subtle" as const, label: "Unavailable" };
}

export interface ServiceProfilePanelProps {
  profile?: ServiceProfileData;
  accountType: RelatedIdentifierAccount["accountType"];
}

export function ServiceProfilePanel({ profile, accountType }: ServiceProfilePanelProps) {
  const styles = useStyles();

  if (!profile) {
    return null;
  }

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  const hasTenantLocationMismatch =
    accountType === "EnterpriseUser" &&
    Boolean(
      profile.tenantRegisteredLocation &&
        profile.storageLocation &&
        profile.storageLocation.length > 0 &&
        !profile.storageLocation.includes(profile.tenantRegisteredLocation),
    );

  return (
    <div className={styles.root}>
      <span className={styles.sectionTitle}>Service Profile</span>
      {fullName && <span className={styles.name}>{fullName}</span>}

      {profile.storageLocation && profile.storageLocation.length > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>Storage Location</span>
          <div className={styles.value}>
            {profile.storageLocation.map((region) => (
              <Tag key={region} size="extra-small" appearance="outline">
                {region}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {accountType === "EnterpriseUser" && profile.tenantRegisteredLocation && (
        <div className={styles.row}>
          <span className={styles.label}>Tenant Registered</span>
          <div className={styles.value}>
            <Tag size="extra-small" appearance="brand">
              {profile.tenantRegisteredLocation}
            </Tag>
            {hasTenantLocationMismatch && (
              <span className={styles.note}>
                Tenant registration differs from storage region.
              </span>
            )}
          </div>
        </div>
      )}

      {profile.servicesProvisioned && profile.servicesProvisioned.length > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>Services Provisioned</span>
          <div className={styles.value}>
            {profile.servicesProvisioned.map((service) => (
              <Badge key={service} appearance="tint" color="success" size="small">
                {service} ✓
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className={styles.row}>
        <span className={styles.label}>Mailbox Created</span>
        <div className={styles.value}>{formatDisplayDate(profile.whenMailboxCreated)}</div>
      </div>

      {profile.volumeOfData && (
        <div className={styles.row}>
          <span className={styles.label}>Volume of Data</span>
          <div className={styles.volumeGrid}>
            {profile.volumeOfData.exchange && (
              <div className={styles.volumeCard}>
                <span className={styles.volumeTitle}>Exchange</span>
                <span className={styles.volumeMeta}>
                  {formatStorageSize(profile.volumeOfData.exchange.mailboxSizeMB)}
                </span>
                <span className={styles.volumeMeta}>
                  {profile.volumeOfData.exchange.itemCount.toLocaleString()} items
                </span>
              </div>
            )}
            {profile.volumeOfData.oneDrive && (
              <div className={styles.volumeCard}>
                <span className={styles.volumeTitle}>OneDrive</span>
                <span className={styles.volumeMeta}>
                  {formatStorageSize(profile.volumeOfData.oneDrive.storageSizeMB)}
                </span>
                <span className={styles.volumeMeta}>
                  {profile.volumeOfData.oneDrive.fileCount.toLocaleString()} files
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {profile.servicesChecked && profile.servicesChecked.length > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>Services Checked</span>
          <div className={styles.value}>
            {profile.servicesChecked.map(({ service, status }) => {
              const badge = getStatusBadgeAppearance(status);
              return (
                <Tooltip
                  key={`${service}-${status}`}
                  content={`${service}: ${badge.label}`}
                  relationship="description"
                >
                  <Badge appearance={badge.appearance} color={badge.color} size="small">
                    {service} {badge.label}
                  </Badge>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
