/**
 * LegalDemandFormView — the per-case "Documents received" register for the
 * Legal Document Review Panel. Lists every inbound formal document on an
 * eEvidence case (Form 1/2 legal demand + Form 5/6/End/Withdrawal as they
 * arrive via correspondence) and renders the selected one read-only via
 * <FormPreviewPanel variant="legalDemand">.
 *
 * Each document surfaces two artifacts the IA submits together:
 *   1. A "PDF attachment" strip with a Download action (generateFormPdf →
 *      browser Save-as-PDF; prototype stand-in for the real IA PDF, which
 *      production retrieves from LENS-CMS).
 *   2. The raw input below — the form rebuilt from the ETSI API fields.
 *
 * Shared surface: mounted in both the RS open-docs DocumentViewerPanel and
 * the attorney LegalDemandSnapshot pane. Returns an empty-state for
 * non-eEvidence cases so the host can fall back to the static legal docs.
 *
 * Fluent v9 + Griffel.
 */

import { useState, useSyncExternalStore } from "react";
import { format, isValid } from "date-fns";
import {
  Button,
  Link,
  makeStyles,
  mergeClasses,
  tokens,
  Text,
} from "@fluentui/react-components";
import {
  DocumentRegular,
  DocumentPdfRegular,
  ArrowDownloadRegular,
  LinkRegular,
} from "@fluentui/react-icons";
import type { FormData } from "../../types/caseTypes";
import { buildCaseLegalDocuments } from "../../utils/legalDemandForm";
import * as correspondenceStore from "../../state/correspondenceStore";
import { FormPreviewPanel } from "./FormPreviewPanel";
import { generateFormPdf } from "./pdfGenerator";

const useStyles = makeStyles({
  scroll: {
    height: "100%",
    overflowY: "auto",
    backgroundColor: tokens.colorNeutralBackground2,
  },
  docTabs: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: "2px",
    rowGap: "2px",
    paddingTop: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
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
    fontSize: tokens.fontSizeBase200,
    fontFamily: "inherit",
    borderTopStyle: "none",
    borderRightStyle: "none",
    borderBottomStyle: "none",
    borderLeftStyle: "none",
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    whiteSpace: "nowrap",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  docTabActive: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
    borderBottomStyle: "solid",
    borderBottomWidth: "2px",
    borderBottomColor: tokens.colorBrandStroke1,
  },
  pdfStrip: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  pdfIcon: {
    fontSize: "28px",
    color: tokens.colorPaletteRedForeground1,
    flexShrink: 0,
  },
  pdfMeta: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minWidth: 0,
  },
  pdfFile: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    wordBreak: "break-all",
  },
  rawLabel: {
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: tokens.colorNeutralForeground3,
  },
  linkStrip: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
    paddingTop: tokens.spacingVerticalSNudge,
    paddingBottom: tokens.spacingVerticalSNudge,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground3,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: tokens.colorNeutralStroke2,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  linkIcon: {
    fontSize: "16px",
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacingVerticalS,
    height: "100%",
    paddingLeft: tokens.spacingHorizontalXXL,
    paddingRight: tokens.spacingHorizontalXXL,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
});

/** Filesystem-safe filename for the IA's PDF copy, e.g.
 *  "EPOC-Form-1-Production-Order_LNS-2026-00150.pdf". */
function pdfFileName(templateName: string, caseId: string): string {
  const slug = templateName
    .replace(/[—–]/g, "-")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug}_${caseId}.pdf`;
}

export interface LegalDemandFormViewProps {
  formData: FormData | null | undefined;
  /** Navigate to a related case (e.g. the prior EPOC-PR a subsequent
   *  production follows). When omitted, the related-order link renders as
   *  read-only text. */
  onOpenCase?: (caseId: string) => void;
}

/** Format an ISO date string for the related-order strip. */
function fmtIsoDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isValid(d) ? format(d, "MMM d, yyyy") : "";
}

export function LegalDemandFormView({ formData, onOpenCase }: LegalDemandFormViewProps) {
  const styles = useStyles();
  const caseId = formData?.caseId ?? "";

  // Prior EPOC-PR this production order follows (subsequent production). The
  // preserved snapshot from that case feeds package + delivery here.
  const relatedPreservation = (formData?.eevidenceRelatedCases ?? []).find(
    (rc) => (rc.requestSubType ?? "").toUpperCase().includes("PR"),
  );

  // Subscribe to the case's correspondence so newly-arrived inbound
  // documents (Form 5/6/End/Withdrawal) appear in the register live.
  const items = useSyncExternalStore(
    correspondenceStore.subscribe,
    () => correspondenceStore.get(caseId),
  );
  const docs = buildCaseLegalDocuments(formData, items);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeDoc = docs.find((d) => d.id === selectedId) ?? docs[0];

  if (!activeDoc) {
    return (
      <div className={styles.empty}>
        <DocumentRegular fontSize={32} />
        <Text size={300}>
          No inbound eEvidence document to render for this case.
        </Text>
      </div>
    );
  }

  const fileName = pdfFileName(activeDoc.template.name, activeDoc.instance.caseId);

  return (
    <div className={styles.scroll}>
      {/* Document register — one tab per inbound formal document on the
          case. Hidden when there's only the single legal demand. */}
      {docs.length > 1 && (
        <div className={styles.docTabs} role="tablist" aria-label="Documents received">
          {docs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              role="tab"
              aria-selected={doc.id === activeDoc.id}
              className={mergeClasses(
                styles.docTab,
                doc.id === activeDoc.id && styles.docTabActive,
              )}
              onClick={() => setSelectedId(doc.id)}
              title={`${doc.label} — ${doc.sublabel}`}
            >
              {doc.shortLabel}
            </button>
          ))}
        </div>
      )}

      {/* Related preservation order — when this is a subsequent production
          (EPOC-ER following an earlier EPOC-PR), surface the link so the RS
          sees the two cases are connected and the preserved data feeds
          package + delivery here. Case-level context, shown once. */}
      {relatedPreservation && (
        <div className={styles.linkStrip}>
          <LinkRegular className={styles.linkIcon} aria-hidden="true" />
          <span>
            Follows preservation order{" "}
            {onOpenCase ? (
              <Link as="button" onClick={() => onOpenCase(relatedPreservation.darsCaseNumber)}>
                {relatedPreservation.darsCaseNumber}
              </Link>
            ) : (
              <Text weight="semibold">{relatedPreservation.darsCaseNumber}</Text>
            )}
            {relatedPreservation.preservationEndDate &&
              ` · preserved until ${fmtIsoDate(relatedPreservation.preservationEndDate)}`}
            {relatedPreservation.dataDestructionDate &&
              ` · delete by ${fmtIsoDate(relatedPreservation.dataDestructionDate)}`}
          </span>
        </div>
      )}

      {/* IA PDF attachment — the issuing authority's submitted PDF copy of
          the selected document. Download generates a faithful copy from the
          form instance (prototype stand-in for the real IA PDF). */}
      <div className={styles.pdfStrip}>
        <DocumentPdfRegular className={styles.pdfIcon} aria-hidden="true" />
        <div className={styles.pdfMeta}>
          <Text weight="semibold">{activeDoc.source} PDF attachment</Text>
          <Text className={styles.pdfFile}>{fileName}</Text>
        </div>
        <Button
          appearance="primary"
          size="small"
          icon={<ArrowDownloadRegular />}
          onClick={() => generateFormPdf(activeDoc.template, activeDoc.instance)}
        >
          Download PDF
        </Button>
      </div>

      {/* Raw input — the document rebuilt from the ETSI API fields. */}
      <div className={styles.rawLabel}>
        Raw input — rebuilt from the {activeDoc.source.toLowerCase()}'s ETSI fields
      </div>
      <FormPreviewPanel
        template={activeDoc.template}
        instance={activeDoc.instance}
        variant="legalDemand"
      />
    </div>
  );
}
