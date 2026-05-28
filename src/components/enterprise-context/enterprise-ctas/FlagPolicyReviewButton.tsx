/**
 * FlagPolicyReviewButton — toggle the case's `enterpriseContext.
 * policyReviewRequired` flag and append the matching audit event.
 *
 * Phase 4 of the prototype-to-prod merge.
 */

import { Button } from "@fluentui/react-components";
import {
  FlagRegular,
  FlagFilled,
  DismissRegular,
} from "@fluentui/react-icons";
import { CURRENT_USER } from "../../../constants/caseConstants";
import type { FormData } from "../../../types/caseTypes";
import type { EnterpriseCtaAction } from "../enterpriseCtaTypes";

interface Props {
  case: FormData;
  onAction: (a: EnterpriseCtaAction) => void;
}

export function FlagPolicyReviewButton({ case: c, onAction }: Props) {
  const flagged = c.enterpriseContext?.policyReviewRequired === true;

  const toggle = () => {
    const now = new Date();
    if (!flagged) {
      onAction({
        kind: "flagPolicyReview",
        audit: {
          id: `audit-policy-flag-${Date.now().toString(36)}`,
          kind: "PolicyReviewFlagged",
          actor: CURRENT_USER,
          actorRole: "Attorney",
          performedAt: now,
          note: "Flagged via Enterprise Context CTA.",
        },
      });
    } else {
      onAction({
        kind: "clearPolicyReview",
        audit: {
          id: `audit-policy-clear-${Date.now().toString(36)}`,
          kind: "PolicyReviewCleared",
          actor: CURRENT_USER,
          actorRole: "Attorney",
          performedAt: now,
          note: "Policy review flag cleared.",
        },
      });
    }
  };

  return (
    <Button
      appearance="outline"
      icon={flagged ? <DismissRegular /> : <FlagRegular />}
      onClick={toggle}
      title={flagged ? "Clear the policy review flag" : undefined}
    >
      {flagged ? (
        <>
          <FlagFilled style={{ marginRight: 4 }} />
          Clear policy review flag
        </>
      ) : (
        "Flag for Policy Review"
      )}
    </Button>
  );
}
