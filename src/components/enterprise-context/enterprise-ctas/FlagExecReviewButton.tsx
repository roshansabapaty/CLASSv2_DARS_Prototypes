/**
 * FlagExecReviewButton — toggle the case's `enterpriseContext.
 * execReviewRequired` flag. The prototype gated this on a persona
 * capability (`canFlagExecReview`); DARS_eEvidence's persona system
 * isn't in scope of the merge, so the button is universally available
 * for now per the merge plan.
 *
 * Phase 4 of the prototype-to-prod merge.
 */

import { Button } from "@fluentui/react-components";
import {
  StarRegular,
  StarFilled,
  DismissRegular,
} from "@fluentui/react-icons";
import { CURRENT_USER } from "../../../constants/caseConstants";
import type { FormData } from "../../../types/caseTypes";
import type { EnterpriseCtaAction } from "../enterpriseCtaTypes";

interface Props {
  case: FormData;
  onAction: (a: EnterpriseCtaAction) => void;
}

export function FlagExecReviewButton({ case: c, onAction }: Props) {
  const flagged = c.enterpriseContext?.execReviewRequired === true;

  const toggle = () => {
    const now = new Date();
    if (!flagged) {
      onAction({
        kind: "flagExecReview",
        audit: {
          id: `audit-exec-flag-${Date.now().toString(36)}`,
          kind: "ExecReviewFlagged",
          actor: CURRENT_USER,
          actorRole: "Attorney",
          performedAt: now,
          note: "Flagged via Enterprise Context CTA.",
        },
      });
    } else {
      onAction({
        kind: "clearExecReview",
        audit: {
          id: `audit-exec-clear-${Date.now().toString(36)}`,
          kind: "ExecReviewCleared",
          actor: CURRENT_USER,
          actorRole: "Attorney",
          performedAt: now,
          note: "Exec review flag cleared.",
        },
      });
    }
  };

  return (
    <Button
      appearance="outline"
      icon={flagged ? <DismissRegular /> : <StarRegular />}
      onClick={toggle}
      title={flagged ? "Clear the exec review flag" : undefined}
    >
      {flagged ? (
        <>
          <StarFilled style={{ marginRight: 4 }} />
          Clear exec review flag
        </>
      ) : (
        "Flag for Exec Review"
      )}
    </Button>
  );
}
