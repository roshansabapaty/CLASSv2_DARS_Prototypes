import * as React from "react";
import { Badge, Tag, Tooltip, makeStyles, tokens } from "@fluentui/react-components";
import {
  CheckmarkCircleRegular,
  DismissCircleRegular,
  QuestionCircleRegular,
  GlobeRegular,
} from "@fluentui/react-icons";
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
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  name: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  storageRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  storageLabel: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXS,
    width: "100%",
    marginTop: "2px",
  },
  serviceCard: {
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
  serviceCardNotFound: {
    opacity: 0.6,
  },
  serviceHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  serviceName: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  serviceStatus: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  statusFound: {
    color: tokens.colorPaletteGreenForeground1,
  },
  statusNotFound: {
    color: tokens.colorNeutralForeground4,
  },
  statusUnavailable: {
    color: tokens.colorPaletteYellowForeground1,
  },
  serviceMeta: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  tenantNote: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorPaletteYellowForeground1,
    fontStyle: "italic",
  },
});

function formatStorageSize(sizeMb: number): string {
  if (sizeMb >= 1024) {
    return `${(sizeMb / 1024).toFixed(1)} GB`;
  }
  return `${sizeMb} MB`;
}

function formatDisplayDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export interface ServiceProfilePanelProps {
  profile?: ServiceProfileData;
  accountType: RelatedIdentifierAccount["accountType"];
}

export function ServiceProfilePanel({ profile, accountType }: ServiceProfilePanelProps) {
  const styles = useStyles();

  if (!profile) return null;

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  const storageRegion = profile.storageLocation?.join(", ") ?? "—";

  // Build per-service status map from servicesChecked
  const serviceStatusMap = new Map<string, "found" | "not_found" | "unavailable">();
  profile.servicesChecked?.forEach(({ service, status }) => {
    serviceStatusMap.set(service, status);
  });

  const exchangeStatus = serviceStatusMap.get("Exchange") ?? "not_found";
  const oneDriveStatus = serviceStatusMap.get("OneDrive") ?? "not_found";

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
      <span className={styles.sectionTitle}>Service Profile · Scenario 2</span>

      {/* Name + Storage Location row */}
      <div className={styles.nameRow}>
        {fullName && <span className={styles.name}>{fullName}</span>}
        {accountType === "EnterpriseUser" && profile.tenantRegisteredLocation && (
          <Tooltip content={`Tenant registered in ${profile.tenantRegisteredLocation}`} relationship="description">
            <Tag size="extra-small" appearance="brand" shape="circular">
              Tenant: {profile.tenantRegisteredLocation}
            </Tag>
          </Tooltip>
        )}
      </div>

      {/* Storage Location — single location per account */}
      <div className={styles.storageRow}>
        <GlobeRegular fontSize={14} />
        <span className={styles.storageLabel}>Data Storage Location</span>
        <Tag size="small" appearance="outline">
          {storageRegion}
        </Tag>
        {hasTenantLocationMismatch && (
          <span className={styles.tenantNote}>
            ⚠ Storage region differs from tenant registration
          </span>
        )}
      </div>

      {/* Per-service existence cards */}
      <div className={styles.servicesGrid}>
        {/* Exchange card */}
        <div className={`${styles.serviceCard} ${exchangeStatus !== "found" ? styles.serviceCardNotFound : ""}`}>
          <div className={styles.serviceHeader}>
            <span className={styles.serviceName}>Exchange</span>
            <ServiceStatusIndicator status={exchangeStatus} />
          </div>
          {exchangeStatus === "found" && profile.volumeOfData?.exchange ? (
            <>
              <span className={styles.serviceMeta}>
                Mailbox: {formatStorageSize(profile.volumeOfData.exchange.mailboxSizeMB)} · {profile.volumeOfData.exchange.itemCount.toLocaleString()} items
              </span>
              <span className={styles.serviceMeta}>
                Created: {formatDisplayDate(profile.whenMailboxCreated)}
              </span>
            </>
          ) : exchangeStatus === "found" ? (
            <span className={styles.serviceMeta}>Provisioned (no volume data)</span>
          ) : (
            <span className={styles.serviceMeta}>Not provisioned for this account</span>
          )}
        </div>

        {/* OneDrive card */}
        <div className={`${styles.serviceCard} ${oneDriveStatus !== "found" ? styles.serviceCardNotFound : ""}`}>
          <div className={styles.serviceHeader}>
            <span className={styles.serviceName}>OneDrive</span>
            <ServiceStatusIndicator status={oneDriveStatus} />
          </div>
          {oneDriveStatus === "found" && profile.volumeOfData?.oneDrive ? (
            <span className={styles.serviceMeta}>
              Storage: {formatStorageSize(profile.volumeOfData.oneDrive.storageSizeMB)} · {profile.volumeOfData.oneDrive.fileCount.toLocaleString()} files
            </span>
          ) : oneDriveStatus === "found" ? (
            <span className={styles.serviceMeta}>Provisioned (no volume data)</span>
          ) : (
            <span className={styles.serviceMeta}>Not provisioned for this account</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceStatusIndicator({ status }: { status: "found" | "not_found" | "unavailable" }) {
  const styles = useStyles();
  if (status === "found") {
    return (
      <span className={`${styles.serviceStatus} ${styles.statusFound}`}>
        <CheckmarkCircleRegular fontSize={16} /> Yes
      </span>
    );
  }
  if (status === "not_found") {
    return (
      <span className={`${styles.serviceStatus} ${styles.statusNotFound}`}>
        <DismissCircleRegular fontSize={16} /> No
      </span>
    );
  }
  return (
    <span className={`${styles.serviceStatus} ${styles.statusUnavailable}`}>
      <QuestionCircleRegular fontSize={16} /> Unavailable
    </span>
  );
}
