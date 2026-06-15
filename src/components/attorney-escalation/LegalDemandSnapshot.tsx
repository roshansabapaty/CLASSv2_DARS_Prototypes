/**
 * LegalDemandSnapshot — read-only view of the legal demand document(s)
 * attached to the case (warrant, subpoena, NDO, etc.), rendered in the
 * right pane of the AttorneyReviewWorkspace when the attorney toggles
 * "Show Legal Demand Preview".
 *
 * Same read-only pattern as CaseRequestSnapshot + CorrespondenceHubSnapshot.
 * Surfaces the document metadata (type, status, approver, validity dates,
 * approval reason) and the first-page image preview when one exists.
 * Verification / rejection workflows live in the full DocumentViewerPanel
 * (DataEntryForm). "Open in full editor" routes there.
 *
 * Fluent v9 + Griffel.
 */

import { useState } from "react";
import {
  Badge,
  Button,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  DocumentRegular,
  OpenRegular,
  PersonRegular,
  CalendarRegular,
  CheckmarkCircleRegular,
} from "@fluentui/react-icons";
import warrantPage1 from "figma:asset/50d813e5f37746f1ef3e42d999b8ed8fffbea835.png";
import warrantPage2 from "figma:asset/a5fd7a3dff0a4ab9df9e009981241eee452a1664.png";
import { DEFAULT_AVAILABLE_DOCUMENTS } from "../../data/documentViewerData";
import type { FormData } from "../../types/caseTypes";
import { LegalDemandFormView } from "../forms-library/LegalDemandFormView";
import { hasLegalDemandForm } from "../../utils/legalDemandForm";

/** Image URLs keyed by document id — mirrors the same table in
 *  DocumentViewerPanel so document → page mapping stays consistent. */
const DOCUMENT_IMAGES: Record<string, string[]> = {
  "warrant-1": [warrantPage1, warrantPage2],
  "subpoena-1": [],
  "ndo-1": [],
};

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: tokens.colorNeutralBackground1,
    borderLeftStyle: "solid",
    borderLeftWidth: "1px",
    borderLeftColor: tokens.colorNeutralStroke2,
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  topBarTitle: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
  },
  docTabs: {
    display: "flex",
    columnGap: "2px",
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  docTab: {
    cursor: "pointer",
    paddingTop: "6px",
    paddingBottom: "6px",
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderLeftStyle: "solid",
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderLeftWidth: "1px",
    borderBottomWidth: "0",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    fontFamily: "inherit",
    fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    whiteSpace: "nowrap",
  },
  docTabActive: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
    borderTopWidth: "2px",
    borderTopColor: tokens.colorBrandStroke1,
    paddingTop: "5px",
  },
  scroll: {
    flex: 1,
    overflowY: "auto",
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalL,
  },
  metaSection: {
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
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
  metaHeader: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalM,
    flexWrap: "wrap",
    rowGap: tokens.spacingVerticalXS,
  },
  metaTitle: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalXS,
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  reasonBlock: {
    marginTop: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
  },
  reasonLabel: {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    marginBottom: "4px",
    display: "block",
  },
  pages: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalM,
  },
  pageImageWrap: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
  },
  pageLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
  },
  pageImage: {
    width: "100%",
    height: "auto",
    display: "block",
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
  noPreview: {
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    textAlign: "center",
    fontStyle: "italic",
    color: tokens.colorNeutralForeground3,
  },
  empty: {
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
  },
});

function formatDate(d: Date): string {
  return d.toLocaleString();
}

function statusColor(
  status: string,
): "success" | "warning" | "danger" | "subtle" {
  const s = status.toLowerCase();
  if (s.includes("valid") || s === "approved") return "success";
  if (s.includes("pending") || s.includes("expir")) return "warning";
  if (s.includes("invalid") || s.includes("reject")) return "danger";
  return "subtle";
}

interface Props {
  /** Optional — passed for parity with the other right-pane snapshots.
   *  Not currently read since the document set is a static seed in this
   *  prototype, but lets future per-case document linkage slot in. */
  case?: FormData;
  /** Routes the attorney to the full editable case form where the
   *  DocumentViewerPanel verification flow lives. */
  onOpenInFullEditor: () => void;
}

export function LegalDemandSnapshot({ case: caseData, onOpenInFullEditor }: Props) {
  const styles = useStyles();
  const documents = DEFAULT_AVAILABLE_DOCUMENTS;
  const [activeDocId, setActiveDocId] = useState<string>(
    documents[0]?.id ?? "",
  );

  // eEvidence cases: the inbound EPOC form (Form 1 production / Form 2
  // preservation) IS the legal demand — render it read-only from the ETSI
  // envelope via the shared LegalDemandFormView instead of the static
  // warrant / subpoena / NDO seed documents.
  if (hasLegalDemandForm(caseData)) {
    return (
      <div className={styles.root}>
        <div className={styles.topBar}>
          <div className={styles.topBarTitle}>
            <DocumentRegular fontSize={18} />
            <Text weight="semibold">Legal Demand Preview</Text>
            <Badge color="subtle" appearance="tint" size="small">
              Read-only
            </Badge>
          </div>
          <Button
            appearance="primary"
            size="small"
            icon={<OpenRegular />}
            onClick={onOpenInFullEditor}
          >
            Open in full editor
          </Button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <LegalDemandFormView formData={caseData} />
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={styles.root}>
        <div className={styles.topBar}>
          <div className={styles.topBarTitle}>
            <DocumentRegular fontSize={18} />
            <Text weight="semibold">Legal Demand Preview</Text>
          </div>
          <Button
            appearance="primary"
            size="small"
            icon={<OpenRegular />}
            onClick={onOpenInFullEditor}
          >
            Open in full editor
          </Button>
        </div>
        <div className={styles.empty}>
          <Text>No legal demand documents attached to this case.</Text>
        </div>
      </div>
    );
  }

  const active = documents.find((d) => d.id === activeDocId) ?? documents[0];
  const pages = DOCUMENT_IMAGES[active.id] ?? [];

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <div className={styles.topBarTitle}>
          <DocumentRegular fontSize={18} />
          <Text weight="semibold">Legal Demand Preview</Text>
          <Badge color="subtle" appearance="tint" size="small">
            Read-only
          </Badge>
        </div>
        <Button
          appearance="primary"
          size="small"
          icon={<OpenRegular />}
          onClick={onOpenInFullEditor}
        >
          Open in full editor
        </Button>
      </div>

      {documents.length > 1 && (
        <div className={styles.docTabs} role="tablist" aria-label="Documents">
          {documents.map((doc) => {
            const isActive = doc.id === active.id;
            const className = isActive
              ? `${styles.docTab} ${styles.docTabActive}`
              : styles.docTab;
            return (
              <button
                key={doc.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={className}
                onClick={() => setActiveDocId(doc.id)}
              >
                {doc.name}
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.scroll}>
        <div className={styles.content}>
          {/* Document metadata */}
          <div className={styles.metaSection}>
            <div className={styles.metaHeader}>
              <Text className={styles.metaTitle}>{active.documentName}</Text>
              <Badge
                color={statusColor(active.documentStatus)}
                appearance="filled"
                size="small"
              >
                {active.documentStatus}
              </Badge>
              <Badge appearance="outline" size="small">
                {active.documentType}
              </Badge>
            </div>
            <div className={styles.fieldGrid}>
              <Text className={styles.label}>Document ID</Text>
              <Text>{active.documentId}</Text>
              <Text className={styles.label}>Pages</Text>
              <Text>{active.pages}</Text>
              <Text className={styles.label}>
                <CalendarRegular fontSize={14} /> Start date
              </Text>
              <Text>{formatDate(active.startDate)}</Text>
              <Text className={styles.label}>
                <CalendarRegular fontSize={14} /> Expires
              </Text>
              <Text>{formatDate(active.expirationDate)}</Text>
              <Text className={styles.label}>
                <PersonRegular fontSize={14} /> Approver
              </Text>
              <Text>{active.approverName}</Text>
              <Text className={styles.label}>
                <CheckmarkCircleRegular fontSize={14} /> Approved at
              </Text>
              <Text>{formatDate(active.approvalDateTime)}</Text>
              <Text className={styles.label}>Desired status</Text>
              <Text>{active.documentDesiredStatus}</Text>
            </div>
            <div className={styles.reasonBlock}>
              <span className={styles.reasonLabel}>Approval reason</span>
              <Text>{active.approvalReason}</Text>
            </div>
          </div>

          {/* Pages — image preview if available, else a "no preview" note */}
          <div className={styles.pages}>
            {pages.length === 0 ? (
              <Text className={styles.noPreview}>
                No image preview available — open in the full editor to view
                the document.
              </Text>
            ) : (
              pages.map((src, i) => (
                <div key={i} className={styles.pageImageWrap}>
                  <Text className={styles.pageLabel}>
                    Page {i + 1} of {pages.length}
                  </Text>
                  <img
                    src={src}
                    alt={`${active.documentName} — page ${i + 1}`}
                    className={styles.pageImage}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
