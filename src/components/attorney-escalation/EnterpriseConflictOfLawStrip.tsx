// One-line conflict-of-law summary at the top of the AttorneyReviewPanel.
// Replaces ControllerNotificationStrip on non-eEvidence enterprise cases
// per spec §5.5.
//
// Fluent v9 + Griffel; long-form `border*` / `padding*` properties per
// docs/UI_LIBRARY_POLICY.md (Griffel rejects shorthand).

import { Badge, Text, makeStyles, tokens } from "@fluentui/react-components";
import { GlobeRegular } from "@fluentui/react-icons";
import type { FormData } from "../../types/caseTypes";
import {
  conflictOfLawHeat,
  jurisdictionsTouched,
} from "../../utils/attorneyEscalationHelpers";

const useStyles = makeStyles({
  strip: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
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
  },
});

function heatColor(
  h: ReturnType<typeof conflictOfLawHeat>,
): "danger" | "warning" | "success" {
  if (h === "HIGH") return "danger";
  if (h === "MEDIUM") return "warning";
  return "success";
}

export function EnterpriseConflictOfLawStrip({
  case: c,
}: {
  case: FormData;
}) {
  const styles = useStyles();
  const heat = conflictOfLawHeat(c);
  const j = jurisdictionsTouched(c);
  return (
    <div className={styles.strip}>
      <GlobeRegular fontSize={20} />
      <Text weight="semibold">Conflict-of-law:</Text>
      <Badge color={heatColor(heat)} appearance="tint">
        {heat}
      </Badge>
      <Text>· Jurisdictions touched: {j.join(", ") || "—"}</Text>
    </div>
  );
}
