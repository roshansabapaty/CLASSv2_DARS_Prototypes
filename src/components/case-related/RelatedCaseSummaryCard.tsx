/**
 * RelatedCaseSummaryCard — read-only summary card for an existing DARS case
 * cross-referenced in the eEvidence envelope.
 *
 * Renders the metadata captured from a (mocked) envelope fetch: DARS case
 * number + request type/subtype chips, IA name, stacked reference numbers,
 * transmitted date/time, service provider name, and the
 * "Any other relevant information" footer. When the related case has
 * `requestSubType === "EPOC-PR"`, an additional sub-block surfaces the
 * EPOC-PR-only metadata (preservation end, data destruction, request status,
 * resolution reason).
 */

import * as React from "react";
import {
  Card,
  Subtitle2,
  Caption1,
  Body1,
  Badge,
  Divider,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import type { EEvidenceRelatedCase } from "../../types/caseTypes";
import { RESOLUTION_REASON_META } from "../../constants/caseConstants";

const useStyles = makeStyles({
  card: {
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
  },
  header: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
    marginBottom: tokens.spacingVerticalS,
  },
  caseNumber: {
    fontWeight: tokens.fontWeightSemibold,
  },
  dl: {
    display: "grid",
    gridTemplateColumns: "minmax(160px, auto) 1fr",
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalS,
    alignItems: "baseline",
  },
  dt: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  dd: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase300,
  },
  refList: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXXS,
  },
  subBlockHeader: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginTop: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalXS,
  },
  footer: {
    marginTop: tokens.spacingVerticalS,
    whiteSpace: "pre-wrap",
    color: tokens.colorNeutralForeground2,
  },
  divider: {
    marginTop: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalS,
  },
});

function formatTransmittedAt(iso: string | undefined): string {
  if (!iso) return "—";
  const hasTime = iso.includes("T");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (!hasTime) {
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function RelatedCaseSummaryCard({ data }: { data: EEvidenceRelatedCase }) {
  const styles = useStyles();
  const isPR = data.requestSubType === "EPOC-PR";
  const resolutionLabel = data.resolutionReason
    ? RESOLUTION_REASON_META[data.resolutionReason]?.label ??
      data.resolutionReason
    : undefined;

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Subtitle2 className={styles.caseNumber}>{data.darsCaseNumber}</Subtitle2>
        {data.requestType && (
          <Badge appearance="tint" color="brand">
            {data.requestType}
          </Badge>
        )}
        {data.requestSubType && (
          <Badge appearance="outline" color="informative">
            Subtype: {data.requestSubType}
          </Badge>
        )}
      </div>

      <Divider className={styles.divider} />

      <div className={styles.dl}>
        <div className={styles.dt}>Issuing Authority</div>
        <div className={styles.dd}>{data.issuingAuthorityName}</div>

        <div className={styles.dt}>
          Reference #{data.issuingAuthorityReferenceNumbers.length === 1 ? "" : "(s)"}
        </div>
        <div className={styles.dd}>
          {data.issuingAuthorityReferenceNumbers.length > 0 ? (
            <div className={styles.refList}>
              {data.issuingAuthorityReferenceNumbers.map((ref) => (
                <span key={ref}>{ref}</span>
              ))}
            </div>
          ) : (
            "—"
          )}
        </div>

        <div className={styles.dt}>Transmitted</div>
        <div className={styles.dd}>{formatTransmittedAt(data.dateOfTransmission)}</div>

        <div className={styles.dt}>Service Provider</div>
        <div className={styles.dd}>{data.serviceProviderName ?? "—"}</div>
      </div>

      {isPR && (
        <>
          <div className={styles.subBlockHeader}>EPOC-PR</div>
          <div className={styles.dl}>
            <div className={styles.dt}>Preservation End</div>
            <div className={styles.dd}>{formatDateOnly(data.preservationEndDate)}</div>

            <div className={styles.dt}>Data Destruction</div>
            <div className={styles.dd}>{formatDateOnly(data.dataDestructionDate)}</div>

            <div className={styles.dt}>Request Status</div>
            <div className={styles.dd}>{data.requestStatus ?? "—"}</div>

            <div className={styles.dt}>Resolution Reason</div>
            <div className={styles.dd}>{resolutionLabel ?? "—"}</div>
          </div>
        </>
      )}

      {data.additionalInformation && data.additionalInformation.trim().length > 0 && (
        <>
          <Divider className={styles.divider} />
          <Caption1 className={styles.dt}>Any other relevant information:</Caption1>
          <Body1 className={styles.footer}>{data.additionalInformation}</Body1>
        </>
      )}
    </Card>
  );
}

export function RelatedCasesBlock({
  items,
}: {
  items: EEvidenceRelatedCase[] | undefined;
}) {
  if (!items || items.length === 0) {
    return (
      <Caption1 style={{ color: "var(--colorNeutralForeground3)" }}>
        No related cases referenced in the eEvidence envelope.
      </Caption1>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        rowGap: "12px",
      }}
    >
      {items.map((c) => (
        <RelatedCaseSummaryCard key={c.darsCaseNumber} data={c} />
      ))}
    </div>
  );
}
