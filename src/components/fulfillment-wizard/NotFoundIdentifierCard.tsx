/**
 * NotFoundIdentifierCard — replaces the LE Review | RS Workspace split when
 * the account-existence check returned "no account found" (N/A) AND the RS
 * has acknowledged it (Phase 5c.1). Wraps the shared
 * `IdentifierStatusSummary` chrome (2A in UX-Polish).
 *
 * Pre-acknowledge state lives in the LEReviewPanel banner with the
 * `[Acknowledge & mark Not Found]` button. Once flipped, this card replaces
 * the entire expansion to communicate the terminal state.
 */

import * as React from "react";
import { CircleX } from "lucide-react";
import type { AccountIdentifier } from "../../types/caseTypes";
import { IdentifierStatusSummary } from "./IdentifierStatusSummary";

export interface NotFoundIdentifierCardProps {
  identifier: AccountIdentifier;
}

export function NotFoundIdentifierCard({
  identifier: _identifier,
}: NotFoundIdentifierCardProps) {
  return (
    <IdentifierStatusSummary
      tone="danger"
      icon={<CircleX size={20} aria-hidden="true" />}
      title="No Microsoft account exists for this identifier"
      body={
        <>
          Acknowledged. Task status set to <b>Not Found</b>. No service mapping
          or job submission will run for this identifier. The case continues
          normally for other identifiers.
        </>
      }
    />
  );
}
