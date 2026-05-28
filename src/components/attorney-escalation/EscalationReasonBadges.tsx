// Reason badges that categorize WHY a case is in the attorney queue.
// Mutually inclusive — a case can be Enterprise + Cross-Border + eEvidence
// at once. Drives the chip row on the AttorneyDashboard queue and the
// case header.
//
// Ported from prototype/src/components/dashboard/EscalationReasonBadges.tsx.
// Fluent v9 + Griffel.

import {
  Badge,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import type { FormData } from "../../types/caseTypes";
import { getEscalationReasons } from "../../utils/attorneyEscalationHelpers";

const useStyles = makeStyles({
  row: {
    display: "inline-flex",
    columnGap: tokens.spacingHorizontalXS,
    flexWrap: "wrap",
    alignItems: "center",
  },
});

interface Props {
  case: FormData;
  size?: "small" | "medium";
  appearance?: "filled" | "tint" | "outline";
}

export function EscalationReasonBadges({
  case: c,
  size = "small",
  appearance = "tint",
}: Props) {
  const styles = useStyles();
  const reasons = getEscalationReasons(c);
  return (
    <span className={styles.row}>
      {reasons.map((r) => (
        <Tooltip key={r.kind} content={r.rationale} relationship="description">
          <Badge size={size} appearance={appearance} color={r.color}>
            {r.label}
          </Badge>
        </Tooltip>
      ))}
    </span>
  );
}
