/**
 * Shared types for the Phase 4 enterprise CTAs (Redirect to Enterprise,
 * Check Concession Tracker, Flag Policy/Exec Review, View Prior Tenant
 * History).
 *
 * Each CTA produces an `EnterpriseCtaAction` payload that the parent
 * applies to FormData. Keeps the CTA components stateless aside from
 * their own dialog UI; the workspace owns the actual mutation.
 */

import type {
  DerogationCheckResult,
  EscalationAuditEvent,
} from "../../types/caseTypes";

export type EnterpriseCtaAction =
  | {
      kind: "redirectToEnterprise";
      /** Outbound correspondence draft body the dialog composed. */
      correspondenceBody: string;
      audit: EscalationAuditEvent;
    }
  | {
      kind: "recordDerogationCheck";
      result: DerogationCheckResult;
      audit: EscalationAuditEvent;
    }
  | {
      kind: "flagPolicyReview";
      audit: EscalationAuditEvent;
    }
  | {
      kind: "clearPolicyReview";
      audit: EscalationAuditEvent;
    }
  | {
      kind: "flagExecReview";
      audit: EscalationAuditEvent;
    }
  | {
      kind: "clearExecReview";
      audit: EscalationAuditEvent;
    }
  | {
      kind: "viewPriorTenantHistory";
      tenantId: string;
      /** Optional parent-TPID identifier — when set, the workspace
       *  opens the drawer in TPID-rollup mode and aggregates prior
       *  cases across every child tenant under this TPID. */
      tpid?: string;
      tpidDisplayName?: string;
      tenantDisplayName?: string;
      audit: EscalationAuditEvent;
    };
