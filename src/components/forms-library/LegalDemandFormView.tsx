/**
 * LegalDemandFormView — renders the inbound IA legal-demand form (EPOC
 * Form 1 for production / EPOC Form 2 for preservation) for an eEvidence
 * case, read-only, via <FormPreviewPanel>.
 *
 * Two artifacts are surfaced together (the IA submits both):
 *   1. A "PDF attachment" strip at the top — the IA's submitted PDF copy
 *      of the form, with a Download action.
 *   2. The raw input below — the form rebuilt from the ETSI API fields.
 *
 * PROTOTYPE NOTE: there is no real IA-submitted PDF binary on the case, so
 * the Download action generates a faithful copy from the same form
 * instance (generateFormPdf → browser Save-as-PDF). In production the real
 * IA PDF would be retrieved from LENS-CMS alongside the raw fields — see
 * docs/plans/inbound-eevidence-form-views.md.
 *
 * Shared surface: mounted in both the RS open-docs DocumentViewerPanel and
 * the attorney LegalDemandSnapshot pane. Returns an empty-state for
 * non-eEvidence cases so the host can fall back to the static legal docs.
 *
 * Fluent v9 + Griffel.
 */

import { Button, makeStyles, tokens, Text } from "@fluentui/react-components";
import {
  DocumentRegular,
  DocumentPdfRegular,
  ArrowDownloadRegular,
} from "@fluentui/react-icons";
import type { FormData } from "../../types/caseTypes";
import { buildLegalDemandInstance } from "../../utils/legalDemandForm";
import { FormPreviewPanel } from "./FormPreviewPanel";
import { generateFormPdf } from "./pdfGenerator";

const useStyles = makeStyles({
  scroll: {
    height: "100%",
    overflowY: "auto",
    backgroundColor: tokens.colorNeutralBackground2,
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
    position: "sticky",
    top: 0,
    zIndex: 1,
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
}

export function LegalDemandFormView({ formData }: LegalDemandFormViewProps) {
  const styles = useStyles();
  const demand = buildLegalDemandInstance(formData);

  if (!demand) {
    return (
      <div className={styles.empty}>
        <DocumentRegular fontSize={32} />
        <Text size={300}>
          No inbound eEvidence form to render for this case.
        </Text>
      </div>
    );
  }

  const fileName = pdfFileName(demand.template.name, demand.instance.caseId);

  return (
    <div className={styles.scroll}>
      {/* IA PDF attachment — the issuing authority's submitted PDF copy of
          the same form. Download generates a faithful copy from the form
          instance (prototype stand-in for the real IA PDF). */}
      <div className={styles.pdfStrip}>
        <DocumentPdfRegular className={styles.pdfIcon} aria-hidden="true" />
        <div className={styles.pdfMeta}>
          <Text weight="semibold">Issuing authority PDF attachment</Text>
          <Text className={styles.pdfFile}>{fileName}</Text>
        </div>
        <Button
          appearance="primary"
          size="small"
          icon={<ArrowDownloadRegular />}
          onClick={() => generateFormPdf(demand.template, demand.instance)}
        >
          Download PDF
        </Button>
      </div>

      {/* Raw input — the form rebuilt from the ETSI API fields the IA
          transmitted. */}
      <div className={styles.rawLabel}>
        Raw input — rebuilt from the issuing authority's ETSI fields
      </div>
      <FormPreviewPanel
        template={demand.template}
        instance={demand.instance}
        variant="legalDemand"
      />
    </div>
  );
}
