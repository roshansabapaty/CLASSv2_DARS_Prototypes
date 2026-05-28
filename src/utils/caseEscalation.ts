// Per-identifier attorney escalation helpers. Reads from the new
// `AccountIdentifier.attorneyEscalation` field added during the
// prototype-to-production merge. Coexists with the legacy
// case-level `FormData.attorneyEscalation` — callers that need the
// "anything escalated" semantics should prefer these helpers over
// reading either field directly, so the per-identifier migration
// can proceed incrementally.
//
// See escalationHelpers.ts for the case-level (legacy) variants
// and the higher-level Dashboard / queue derivations.

import type {
  AccountIdentifier,
  AttorneyAction,
  AttorneyEscalation,
  AttorneyEscalationScope,
  EEvidenceGroundsForRefusal,
  EnterpriseOrgContext,
  EscalationAuditEvent,
  FormData,
  SignalScope,
} from "../types/caseTypes";

/** Identifiers on the case currently flagged for attorney review (any
 *  non-terminal escalation status). Includes ApprovedWithConditions
 *  until the RS acknowledges, so the queue / dashboard surfaces still
 *  show the case while the post-decision banner is up. */
export function getEscalatedIdentifiers(c: FormData): AccountIdentifier[] {
  return c.identifiers.filter(
    (id) =>
      id.taskStatus === "AttorneyReview" ||
      id.attorneyEscalation?.status === "Pending" ||
      id.attorneyEscalation?.status === "InformationRequested" ||
      id.attorneyEscalation?.status === "ApprovedWithConditions",
  );
}

/** True when ANY identifier on the case is awaiting attorney action.
 *  Use this as the predicate for the AttorneyDashboard queue filter
 *  (OR'd with the existing case-level signals so neither system
 *  regresses during the migration window). */
export function isCaseInAttorneyQueue(c: FormData): boolean {
  return c.identifiers.some(
    (id) =>
      id.attorneyEscalation?.status === "Pending" ||
      id.attorneyEscalation?.status === "InformationRequested",
  );
}

export interface PerIdentifierEscalationSummary {
  totalIdentifiers: number;
  escalatedCount: number;
  pendingCount: number;
  /** The first identifier with an active escalation — used by single-panel
   *  legacy UI until per-row tables ship. */
  primaryIdentifierId?: string;
  primaryEscalation?: AttorneyEscalation;
}

/** Cheap snapshot of per-identifier escalation state across the case.
 *  Distinct name from the case-level `getEscalationSummaryForCase` in
 *  escalationHelpers.ts so callers explicitly pick which model they want. */
export function getPerIdentifierEscalationSummary(
  c: FormData,
): PerIdentifierEscalationSummary {
  const escalated = getEscalatedIdentifiers(c);
  const pending = c.identifiers.filter(
    (id) =>
      id.attorneyEscalation?.status === "Pending" ||
      id.attorneyEscalation?.status === "InformationRequested",
  );
  const primary = escalated[0];
  return {
    totalIdentifiers: c.identifiers.length,
    escalatedCount: escalated.length,
    pendingCount: pending.length,
    primaryIdentifierId: primary?.id,
    primaryEscalation: primary?.attorneyEscalation,
  };
}

/** Lookup an identifier by id within a case. */
export function findIdentifier(
  c: FormData,
  identifierId: string,
): AccountIdentifier | undefined {
  return c.identifiers.find((id) => id.id === identifierId);
}

/**
 * Canonical accessor for "the active attorney escalation on this case".
 *
 * Resolution order:
 *   1. First identifier with a per-identifier `attorneyEscalation` block.
 *   2. Legacy case-level `FormData.attorneyEscalation` (back-compat
 *      during the per-identifier migration window).
 *   3. `undefined` when neither is set.
 *
 * Read-side callers should prefer this over `formData.attorneyEscalation`
 * directly — that lets the case-level field be retired without revisiting
 * every banner / panel / predicate. Write-side callers (setFormData
 * mutators that update the escalation lifecycle) continue to read+write
 * the case-level field until per-identifier mutations land in a follow-up.
 */
export function getActiveAttorneyEscalation(
  c: FormData,
): AttorneyEscalation | undefined {
  for (const id of c.identifiers ?? []) {
    if (id.attorneyEscalation) return id.attorneyEscalation;
  }
  return c.attorneyEscalation;
}

// ── EnterpriseContext multi-org helpers ─────────────────────────────
//
// `EnterpriseContext` historically carried a single `org`. Multi-tenant
// cases now populate `orgs[]`. These helpers shield read-side callers
// from the dual shape: every caller goes through them and gets a
// consistent list (single-tenant cases yield a 1-element list).

/** All tenants the case touches. Falls back to `[org]` when the seed
 *  doesn't (yet) populate `orgs[]`. Returns `[]` when the case has no
 *  enterprise context at all. */
export function getEnterpriseOrgs(c: FormData): EnterpriseOrgContext[] {
  const ec = c.enterpriseContext;
  if (!ec) return [];
  if (ec.orgs && ec.orgs.length > 0) {
    // De-dupe by tenantId in case `org` appears in both fields.
    const seen = new Set<string>();
    const out: EnterpriseOrgContext[] = [];
    for (const o of ec.orgs) {
      if (seen.has(o.tenantId)) continue;
      seen.add(o.tenantId);
      out.push(o);
    }
    if (!seen.has(ec.org.tenantId)) {
      out.unshift(ec.org);
    }
    return out;
  }
  return [ec.org];
}

/** Primary tenant on the case — by convention, the org tagged as
 *  `enterpriseContext.org` (matched to the issuing authority's
 *  jurisdiction by the case-form). When `orgs[]` is populated, the
 *  primary is still `org` unless the seed deliberately omitted it. */
export function getPrimaryOrg(
  c: FormData,
): EnterpriseOrgContext | undefined {
  return c.enterpriseContext?.org;
}

/** True when the case spans more than one tenant. Drives the
 *  multi-org UI affordances (stacked OrgPanels, "All under TPID Y"
 *  scope picker variant, etc.). */
export function isMultiTenantCase(c: FormData): boolean {
  return getEnterpriseOrgs(c).length > 1;
}

// ── Phase 1 write migration — unified-scope helpers ─────────────────
//
// Every authority / specialist write into FormData should flow through
// one of these helpers. They enforce:
//   1. Hybrid storage for scope=all (case-level field + replicate to
//      every identifier with a scope marker).
//   2. Per-identifier-only storage for scope=some, with the case-level
//      field cleared so there's no ambiguous case + task state.
//   3. Audit-only storage for scope=none.
//   4. Overwrite semantics — a new scope-all write clears any prior
//      scope=some entries (and vice versa) so contradictory signals
//      can't coexist.

/** Translate the legacy `AttorneyEscalationScope` string into the
 *  richer `SignalScope` payload. Seeds and dialog inputs that still
 *  use `"case" / "identifier" / "all" / "some" / "none" / "tenant" /
 *  "tpid"` flow through here so the helpers below only see the
 *  canonical discriminated-union form.
 *
 *  `tenant` / `tpid` legacy inputs require the caller to supply the
 *  matching `tenantId` / `tpid` (otherwise we have no way to populate
 *  the discriminated-union payload). When absent we fall back to
 *  `"all"` rather than guess. */
export function legacyEscalationScopeToSignalScope(
  scope: AttorneyEscalationScope | undefined,
  identifierIds: string[],
  opts?: { tenantId?: string; tpid?: string },
): SignalScope {
  switch (scope) {
    case "all":
    case "case":
    case undefined:
      // Undefined defaults to "all" — preserves Phase 1 back-compat
      // where seeds without a `scope` field were treated as case-wide.
      return { kind: "all" };
    case "some":
    case "identifier":
      return { kind: "some", identifierIds };
    case "tenant":
      return opts?.tenantId
        ? { kind: "tenant", tenantId: opts.tenantId }
        : { kind: "all" };
    case "tpid":
      return opts?.tpid ? { kind: "tpid", tpid: opts.tpid } : { kind: "all" };
    case "none":
      return { kind: "none" };
  }
}

/** Resolve the identifier ids a scope targets, given the current case.
 *
 *    - `all`     → every identifier on the case.
 *    - `some`    → the explicit identifierIds list.
 *    - `tenant`  → every identifier whose `checkAccounts.tenantId` matches.
 *    - `tpid`    → every identifier whose `checkAccounts.parentTpid`
 *                  matches. Falls back to the case-level
 *                  `enterpriseContext.org.parentTpid` if the per-identifier
 *                  field is missing AND the case-level matches — covers the
 *                  single-tenant case during the rollout window.
 *    - `none`    → empty (audit-only). */
export function resolveTargetIdentifiers(
  c: FormData,
  scope: SignalScope,
): string[] {
  if (scope.kind === "all") return (c.identifiers ?? []).map((id) => id.id);
  if (scope.kind === "some") return scope.identifierIds;
  if (scope.kind === "none") return [];
  if (scope.kind === "tenant") {
    return (c.identifiers ?? [])
      .filter((id) => id.checkAccounts?.tenantId === scope.tenantId)
      .map((id) => id.id);
  }
  // scope.kind === "tpid"
  const caseOrgTpid = c.enterpriseContext?.org.parentTpid;
  return (c.identifiers ?? [])
    .filter((id) => {
      const idTpid = id.checkAccounts?.parentTpid;
      if (idTpid) return idTpid === scope.tpid;
      // Identifier missing per-identifier parentTpid — fall back to the
      // case-level org's parentTpid (covers single-tenant rollout cases
      // before per-identifier tenant metadata lands on the seeds).
      return caseOrgTpid === scope.tpid;
    })
    .map((id) => id.id);
}

/** Normalize the persisted-scope-string equivalent of a SignalScope.
 *  Stamped on each per-identifier `AttorneyEscalation.scope` so the
 *  attorney UI and audit thread can show the original intent (e.g.
 *  "all in tenant T1") even though storage is identifier-level. */
function signalScopeToAttorneyScopeString(
  scope: SignalScope,
): AttorneyEscalationScope {
  switch (scope.kind) {
    case "all":
      return "all";
    case "tenant":
      return "tenant";
    case "tpid":
      return "tpid";
    case "some":
      return "some";
    case "none":
      return "none";
  }
}

/** Append an audit event without other state changes. Useful for the
 *  scope=none path where the signal lives only in the audit thread. */
function withAuditEvent(c: FormData, event: EscalationAuditEvent): FormData {
  return {
    ...c,
    escalationAuditEvents: [...(c.escalationAuditEvents ?? []), event],
  };
}

/** Internal — apply a mutation function to an identifier id, returning
 *  the rewritten identifiers array. */
function mapIdentifier(
  c: FormData,
  identifierId: string,
  fn: (id: AccountIdentifier) => AccountIdentifier,
): AccountIdentifier[] {
  return (c.identifiers ?? []).map((id) =>
    id.id === identifierId ? fn(id) : id,
  );
}

/** Create (or replace) the case's attorney escalation per the supplied
 *  scope.
 *
 *    - scope.kind === "all": writes the escalation to
 *      `FormData.attorneyEscalation` (case-level) AND replicates onto
 *      every `AccountIdentifier.attorneyEscalation`. Sets each
 *      identifier's `taskStatus` to `"AttorneyReview"`. Clears any
 *      prior per-identifier escalation that wasn't already case-scoped.
 *    - scope.kind === "some": writes only to the listed identifiers.
 *      Sets their `taskStatus` to `"AttorneyReview"`. Clears the
 *      case-level field so there's no competing scope=all record.
 *    - scope.kind === "none": appends the audit event only; no signal
 *      storage. */
export function createAttorneyEscalation(
  c: FormData,
  scope: SignalScope,
  escalation: AttorneyEscalation,
  auditEvent: EscalationAuditEvent,
): FormData {
  if (scope.kind === "none") return withAuditEvent(c, auditEvent);

  const scopeString = signalScopeToAttorneyScopeString(scope);
  const escWithScope: AttorneyEscalation = { ...escalation, scope: scopeString };
  const targetIds = resolveTargetIdentifiers(c, scope);
  const targetSet = new Set(targetIds);

  const nextIdentifiers: AccountIdentifier[] = (c.identifiers ?? []).map(
    (id) => {
      if (targetSet.has(id.id)) {
        return {
          ...id,
          taskStatus: "AttorneyReview",
          attorneyEscalation: escWithScope,
        };
      }
      // scope=some leaves other identifiers untouched. scope=all is
      // unreachable here because every id is in the target set.
      return id;
    },
  );

  return {
    ...c,
    identifiers: nextIdentifiers,
    // Hybrid storage rule:
    //   - scope=all → mirror to FormData.attorneyEscalation (case-level)
    //   - scope=some → clear FormData.attorneyEscalation so reads don't
    //     show a competing case-wide signal.
    attorneyEscalation: scope.kind === "all" ? escWithScope : undefined,
    escalationAuditEvents: [
      ...(c.escalationAuditEvents ?? []),
      auditEvent,
    ],
  };
}

/** Append an attorney `AttorneyAction` + patch the escalation's status
 *  on each identifier the scope resolves to. Mirrors the case-level
 *  patch when scope=all (hybrid storage rule). */
export function applyAttorneyAction(
  c: FormData,
  scope: SignalScope,
  payload: {
    action: AttorneyAction;
    statusPatch?: Partial<AttorneyEscalation>;
    auditEvent: EscalationAuditEvent;
  },
): FormData {
  if (scope.kind === "none") return withAuditEvent(c, payload.auditEvent);

  const targetIds = new Set(resolveTargetIdentifiers(c, scope));

  const nextIdentifiers = (c.identifiers ?? []).map((id) => {
    if (!targetIds.has(id.id)) return id;
    if (!id.attorneyEscalation) return id;
    const next: AttorneyEscalation = {
      ...id.attorneyEscalation,
      ...payload.statusPatch,
      actions: [...id.attorneyEscalation.actions, payload.action],
    };
    return { ...id, attorneyEscalation: next };
  });

  const caseLevel = c.attorneyEscalation
    ? scope.kind === "all"
      ? {
          ...c.attorneyEscalation,
          ...payload.statusPatch,
          actions: [...c.attorneyEscalation.actions, payload.action],
        }
      : // scope=some — clear the case-level signal (no competing record).
        undefined
    : undefined;

  return {
    ...c,
    identifiers: nextIdentifiers,
    attorneyEscalation: caseLevel,
    escalationAuditEvents: [
      ...(c.escalationAuditEvents ?? []),
      payload.auditEvent,
    ],
  };
}

/** Stamp `conditionsAcknowledgedAt` + `conditionsAcknowledgedBy` on
 *  each escalation in scope. Audit event optional — when supplied,
 *  appended alongside the patch. */
export function acknowledgeConditions(
  c: FormData,
  scope: SignalScope,
  payload: {
    at: Date;
    by: string;
    auditEvent?: EscalationAuditEvent;
  },
): FormData {
  if (scope.kind === "none") {
    return payload.auditEvent ? withAuditEvent(c, payload.auditEvent) : c;
  }

  const targetIds = new Set(resolveTargetIdentifiers(c, scope));
  const stamp = {
    conditionsAcknowledgedAt: payload.at,
    conditionsAcknowledgedBy: payload.by,
  };

  const nextIdentifiers = (c.identifiers ?? []).map((id) => {
    if (!targetIds.has(id.id)) return id;
    if (!id.attorneyEscalation) return id;
    return {
      ...id,
      attorneyEscalation: { ...id.attorneyEscalation, ...stamp },
    };
  });

  const caseLevel =
    c.attorneyEscalation && scope.kind === "all"
      ? { ...c.attorneyEscalation, ...stamp }
      : c.attorneyEscalation;

  return {
    ...c,
    identifiers: nextIdentifiers,
    attorneyEscalation: caseLevel,
    escalationAuditEvents: payload.auditEvent
      ? [...(c.escalationAuditEvents ?? []), payload.auditEvent]
      : c.escalationAuditEvents,
  };
}

/** Append an outbound id to `relatedOutboundIds` on each escalation in
 *  scope. Used when the RS sends correspondence while attorney-escalated
 *  and the outbound needs to be released on the attorney's Release
 *  action. */
export function linkHeldOutboundToEscalation(
  c: FormData,
  scope: SignalScope,
  outboundId: string,
): FormData {
  if (scope.kind === "none") return c;
  const targetIds = new Set(resolveTargetIdentifiers(c, scope));

  const nextIdentifiers = (c.identifiers ?? []).map((id) => {
    if (!targetIds.has(id.id)) return id;
    if (!id.attorneyEscalation) return id;
    return {
      ...id,
      attorneyEscalation: {
        ...id.attorneyEscalation,
        relatedOutboundIds: [
          ...(id.attorneyEscalation.relatedOutboundIds ?? []),
          outboundId,
        ],
      },
    };
  });

  const caseLevel =
    c.attorneyEscalation && scope.kind === "all"
      ? {
          ...c.attorneyEscalation,
          relatedOutboundIds: [
            ...(c.attorneyEscalation.relatedOutboundIds ?? []),
            outboundId,
          ],
        }
      : c.attorneyEscalation;

  return {
    ...c,
    identifiers: nextIdentifiers,
    attorneyEscalation: caseLevel,
  };
}

/** Aggregate held outbound ids across per-identifier escalations and the
 *  legacy case-level field. Replaces the old `formData.attorneyEscalation
 *  .relatedOutboundIds` direct read. */
export function getHeldOutboundIds(c: FormData): string[] {
  const set = new Set<string>();
  for (const id of c.identifiers ?? []) {
    for (const out of id.attorneyEscalation?.relatedOutboundIds ?? []) {
      set.add(out);
    }
  }
  for (const out of c.attorneyEscalation?.relatedOutboundIds ?? []) {
    set.add(out);
  }
  return Array.from(set);
}

// ── Authorization status (IA / CA / VA / EA signal) writes ──────────

/** Apply an authorization-status update from the IA / CA / VA / EA.
 *  Routes per scope:
 *    - scope=all → write FormData.authorizationDesiredStatus AND mirror
 *      `authorizationDesiredTaskStatus` onto every identifier.
 *    - scope=some → write per-identifier task status only on the
 *      listed identifiers. Clears the case-level field so we don't
 *      carry a stale case-wide value alongside the partial update.
 *    - scope=none → audit only.
 *  `updatedBy` is the human-readable authority name (e.g. the IA
 *  display string); recorded on each identifier's
 *  `authorizationDesiredTaskStatusUpdatedBy` for traceability. */
export function applyAuthorizationStatusUpdate(
  c: FormData,
  scope: SignalScope,
  payload: {
    status: string;
    updatedAt: Date;
    updatedBy: string;
    auditEvent?: EscalationAuditEvent;
  },
): FormData {
  if (scope.kind === "none") {
    return payload.auditEvent ? withAuditEvent(c, payload.auditEvent) : c;
  }

  const targetIds = new Set(resolveTargetIdentifiers(c, scope));
  const taskPatch = {
    authorizationDesiredTaskStatus: payload.status,
    authorizationDesiredTaskStatusUpdatedAt: payload.updatedAt,
    authorizationDesiredTaskStatusUpdatedBy: payload.updatedBy,
  };

  const nextIdentifiers = (c.identifiers ?? []).map((id) => {
    if (!targetIds.has(id.id)) return id;
    return { ...id, ...taskPatch };
  });

  return {
    ...c,
    identifiers: nextIdentifiers,
    // Hybrid storage rule for case-level field:
    //   - scope=all → mirror the latest case-wide status
    //   - scope=some → clear (per-task partial; no case-wide claim)
    authorizationDesiredStatus:
      scope.kind === "all" ? payload.status : "",
    authorizationStatusUpdatedAt:
      scope.kind === "all" ? payload.updatedAt : undefined,
    authorizationStatusUpdatedBy:
      scope.kind === "all" ? payload.updatedBy : undefined,
    escalationAuditEvents: payload.auditEvent
      ? [...(c.escalationAuditEvents ?? []), payload.auditEvent]
      : c.escalationAuditEvents,
  };
}

// ── EU eEvidence — Grounds for Refusal writes ───────────────────────

/** Derive the SignalScope from an EA Grounds-for-Refusal decision.
 *  - `Full` → scope=all (block every task on the case)
 *  - `Partial` → scope=some, identifierIds = `decision.blockedTaskObjectIds`
 *  - `None` → scope=none (audit only; no task block) */
export function gfrSignalScope(
  decision: EEvidenceGroundsForRefusal["decision"],
  identifiers: AccountIdentifier[],
): SignalScope {
  if (decision.kind === "Full") return { kind: "all" };
  if (decision.kind === "None") return { kind: "none" };
  // Partial — translate blocked task-object ids to internal identifier
  // ids. taskObject ids are the LD-task ids stored on
  // `AccountIdentifier.taskId`, not the internal `id` field.
  const blocked = new Set(decision.blockedTaskObjectIds ?? []);
  const identifierIds = identifiers
    .filter((id) => id.taskId && blocked.has(id.taskId))
    .map((id) => id.id);
  return { kind: "some", identifierIds };
}

/** Apply an EA Grounds-for-Refusal decision. Writes the GFR record at
 *  case level (it's an EA artifact; the GFR Panel reads it from there)
 *  and uses the unified scope model to gate downstream task
 *  collection / production through the audit event + the derived
 *  scope. The actual task-blocking enforcement lives in
 *  `groundsForRefusal.ts` consumers — this helper just records the
 *  decision + audit. */
export function applyGfrDecision(
  c: FormData,
  gfr: EEvidenceGroundsForRefusal,
  auditEvent: EscalationAuditEvent,
): FormData {
  return {
    ...c,
    eevidenceGroundsForRefusal: gfr,
    escalationAuditEvents: [
      ...(c.escalationAuditEvents ?? []),
      auditEvent,
    ],
  };
}
