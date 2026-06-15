/**
 * LegalDemandFormView — renders the inbound IA legal-demand form (EPOC
 * Form 1 for production / EPOC Form 2 for preservation) for an eEvidence
 * case, read-only, via <FormPreviewPanel>.
 *
 * Shared surface: mounted in both the RS open-docs DocumentViewerPanel and
 * the attorney LegalDemandSnapshot pane. Returns an empty-state for
 * non-eEvidence cases so the host can fall back to the static legal docs
 * (warrant / subpoena / NDO).
 *
 * Fluent v9 + Griffel.
 */

import { makeStyles, tokens, Text } from "@fluentui/react-components";
import { DocumentRegular } from "@fluentui/react-icons";
import type { FormData } from "../../types/caseTypes";
import { buildLegalDemandInstance } from "../../utils/legalDemandForm";
import { FormPreviewPanel } from "./FormPreviewPanel";

const useStyles = makeStyles({
  scroll: {
    height: "100%",
    overflowY: "auto",
    backgroundColor: tokens.colorNeutralBackground2,
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

  return (
    <div className={styles.scroll}>
      <FormPreviewPanel
        template={demand.template}
        instance={demand.instance}
        variant="legalDemand"
      />
    </div>
  );
}
