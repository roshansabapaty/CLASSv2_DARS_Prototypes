/** Per-job delivery lifecycle. `"Complete"` means the package left
 *  Microsoft on the wire (WISP transmission successful). The IA's
 *  acknowledgement of receipt flips it to `"DeliveryAcknowledged"`
 *  (positive WISP `/eevidence/deliverystatus` "Received" callback).
 *  `"Failed"` is the error-callback terminal — the RS sees the
 *  per-job error message + a Retry Delivery CTA. */
export type DeliveryStatus =
  | "Not Started"
  | "Started"
  | "Complete"
  | "DeliveryAcknowledged"
  | "Failed"
  | "Cancelled"
  | "Blocked";

export interface AdditionalJob {
  jobId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  createdOn: Date;
  collectionStatus?: "Not Started" | "Started" | "Complete" | "No Data" | "Failed" | "Cancelled";
  publishStatus?: "Not Started" | "Started" | "Complete" | "Failed" | "Cancelled";
  deliveryStatus?: DeliveryStatus;
  publishJobId?: string;
  deliveryJobId?: string;
  collectionStatusUpdatedAt?: Date;
  publishStatusUpdatedAt?: Date;
  deliveryStatusUpdatedAt?: Date;
  /** WISP delivery-status callback timestamps + payload. Populated when
   *  the auto-sim flips deliveryStatus to DeliveryAcknowledged or Failed
   *  — separate from `deliveryStatusUpdatedAt` so the callback path is
   *  attributable to the WISP wire, not RS edits. */
  deliveryAcknowledgedAt?: Date;
  deliveryError?: string;
}

export interface SubCategory {
  enabled: boolean;
  taskId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  status: "Not started" | "In Progress" | "Completed" | "Cancelled";
  jobId?: string; // Internal generated unique job ID
  identifierId?: string; // ID of the identifier associated with this category
  createdOn?: Date; // When this job was created/submitted
  collectionStatus?: "Not Started" | "Started" | "Complete" | "No Data" | "Failed" | "Cancelled";
  publishStatus?: "Not Started" | "Started" | "Complete" | "Failed" | "Cancelled";
  /** eEvidence-only states: `DeliveryAcknowledged` + `Failed` (with
   *  retry) are emitted by the WISP `/eevidence/deliverystatus`
   *  callback. Other request types ignore them and treat `Complete`
   *  as terminal — see `isEEvidenceDelivery(formData)`. */
  deliveryStatus?: DeliveryStatus;
  publishJobId?: string; // Job ID for publish workflow step
  deliveryJobId?: string; // Job ID for delivery workflow step
  collectionStatusUpdatedAt?: Date;
  publishStatusUpdatedAt?: Date;
  deliveryStatusUpdatedAt?: Date;
  /** WISP delivery-status callback fields. eEvidence requests only. */
  deliveryAcknowledgedAt?: Date;
  deliveryError?: string;
  additionalJobs?: AdditionalJob[]; // Duplicate jobs with different date ranges
}

// ── New Category Group / Item model ───────────────────────────────────────────
// Items within a category group, keyed by camelCase item key
// e.g. { genericAttributes: SubCategory, dateOfBirth: SubCategory }
export type CategoryGroupItems = Record<string, SubCategory>;

// All groups for one service, keyed by camelCase group key
// e.g. { subscriberData: {...}, authenticationLogs: {...}, trafficData: {...}, contentData: {...} }
export type ServiceCategoryGroups = Record<string, CategoryGroupItems>;

// Per-service config on an identifier
export interface IdentifierServiceConfig {
  enabled: boolean;
  categoryGroups: ServiceCategoryGroups;
}

// Services map on an identifier — keyed by camelCase service key
export type IdentifierServices = Record<string, IdentifierServiceConfig>;

export interface AccountExistenceResult {
  taskId: string;
  categoryName: string;
  accountProvisioned: boolean;
  accountType: "Consumer" | "Enterprise" | "N/A";
  associatedAccounts: string[];
}

// Task Status types for identifiers
export type TaskStatus =
  | "New"
  | "InProgress"
  | "InReview"
  | "AttorneyReview" // Identifier flagged for attorney legal review (per-identifier escalation)
  | "AwaitingApproval"
  | "AwaitingDisclosure"
  | "Disclosed"
  | "DisclosureNotAvailable"
  | "Rejected"
  | "Cancelled"
  | "Error"
  | "Invalid"
  | "AwaitingPreservation"
  | "Preserved"
  | "PreservationNotAvailable"
  | "AwaitingProvisioning"
  | "Active"
  | "Suspended"
  | "Expired"
  | "Withdrawn"
  | "Not Found";

/** LE-driven authorization status at the case level. When set to a terminal
 *  value (Cancelled / Withdrawn), the entire case is locked: no submission,
 *  no service mapping, RS just acknowledges and cascades to all identifiers. */
export type AuthorizationDesiredStatus =
  | "Active"
  | "Cancelled"
  | "Withdrawn"
  | "Suspended"
  | "Expired";

/** LE-driven ETSI status at the per-identifier level. When set to a terminal
 *  value (Cancelled / Withdrawn), that single identifier is locked. */
export type ETSIDesiredStatus =
  | "Active"
  | "Cancelled"
  | "Withdrawn"
  | "Suspended"
  | "Expired";

/** Authorization Desired Task Status — per-task status the LE or IA can
 *  signal on UK COPO and eEvidence orders. Lets the requester ask LENS to
 *  start, pause, complete, or cancel an individual task without touching
 *  the rest of the case. Only meaningful for `requestType === "COPO Order"`
 *  and `requestType === "eEvidence"`; other request types ignore it. */
export type AuthorizationDesiredTaskStatus =
  | "Requested"
  | "Active"
  | "Suspended"
  | "Completed"
  | "Cancelled";

/** Per-identifier User Notification record. One per Consumer identifier
 *  so cases with multiple targets can track each LE-approval timeline +
 *  user-notification cadence independently. Mirrors the legacy
 *  case-level fields on `FormData` so downstream consumers that read a
 *  single set of dates still work; new code paths should read from
 *  `FormData.userNotifications[identifierId]`. */
export interface UserNotificationRecord {
  // ── LE phase: when LE was notified + when LE responded ──────────────
  dateOfLeNotification?: Date;
  leResponseDueDate?: Date;
  /** "Proceed with notification" | "Non-Disclosure Order" | "None" |
   *  "Withdrawn". Same enum the legacy `leResponseReceived` used. */
  leResponseReceived?: string;
  dateOfLeResponse?: Date;
  // ── User phase: when the user was notified + their response ─────────
  dateOfUserNotification?: Date;
  userResponseDueDate?: Date;
  /** "Proceed" | "None" | "Quashed". Same enum the legacy
   *  `userResponseReceived` used. */
  userResponseReceived?: string;
  dateOfUserResponse?: Date;
}

/** Structured closure reason captured when the RS resolves a case.
 *  Maps to a target `caseStage` via `RESOLUTION_REASON_META` in
 *  caseConstants.ts.
 *
 *  The 14 canonical reasons + 2 legacy outliers (PartialDelivery and
 *  CancelledByLE) which have no direct equivalent in the new list. The
 *  legacy keys are kept so existing prototype state and the collection-page
 *  bar's contextual defaults don't break. */
export type ResolutionReason =
  // ── New canonical 14 ────────────────────────────────────────────────
  | "InfoProvided"          // Data successfully disclosed
  | "NoData"                // No responsive data found
  | "RejectedMicrosoft"     // Request rejected by Microsoft
  | "EnterpriseRedirected"  // Redirected to Enterprise customer (data controller)
  | "PreservationExtension" // Preservation period extended
  | "Preserved"             // Data preserved (no disclosure yet)
  | "WithdrawnExternal"     // Request withdrawn by requester
  | "HandOffToAnotherTeam"  // Ownership transferred internally
  | "Duplicate"             // Duplicate request
  | "UserQuashed"           // Request invalidated by authority quashed after user notice
  | "Test"                  // Non-production / test request
  | "CsamPreservations"     // Special preservation category (PhotoDNA)
  | "NdoExtension"          // Non-disclosure extension scenario (new request)
  | "ProblemSolved"         // Used for "Not Valid" requests requiring manual effort
  // ── Legacy outliers preserved for back-compat ───────────────────────
  | "PartialDelivery"       // Some-but-not-all data delivered (no direct new equivalent)
  | "CancelledByLE";        // LE-initiated case cancellation (no direct new equivalent)

// ── Attorney Escalation ──────────────────────────────────────────────────

/** DARS roles a Specialist can escalate a case to. Only the `Attorney`
 *  role surfaces the full 4-action review panel; the other three get
 *  the simpler Acknowledge / Reassign panel. */
export type EscalationRole =
  | "Attorney"
  | "LensLeadOrManager"
  | "ResponseSpecialist"
  | "TriageSpecialist";

/** Current state of an attorney escalation. */
export type AttorneyEscalationStatus =
  | "Pending"
  | "ApprovedForDelivery"
  | "ApprovedWithConditions"
  | "InformationRequested"
  | "Blocked";

/** Scope a Specialist / authority signal carries — applies to attorney
 *  escalation, authorization-status updates (`authorizationDesiredStatus`
 *  / `authorizationDesiredTaskStatus`), and EA Grounds-for-Refusal
 *  decisions. Every authority / specialist write into the case state
 *  carries one scope and never produces competing case-level + per-task
 *  signals simultaneously.
 *
 *    - `"all"` — applies to every identifier (the case-wide path).
 *      Stored hybrid: case-level field + replicated to each identifier
 *      with the scope marker so readers and writers can tell it's a
 *      case-wide signal.
 *    - `"some"` — applies to specified identifiers only. Stored
 *      per-identifier; case-level field cleared so there's no
 *      ambiguity. The targeted list lives alongside the scope (in the
 *      mutator helper input, not on the signal record itself —
 *      identifier records carry the signal directly).
 *    - `"none"` — administrative / audit-only. No identifier carries
 *      the signal; the audit thread records that the authority sent it
 *      but no task is gated. Useful for case-level acknowledgements,
 *      No-GFR decisions, etc.
 *
 *  Back-compat: legacy `"case"` reads as `"all"` and `"identifier"` as
 *  `"some"` until existing seeds migrate. The
 *  `legacyEscalationScopeToSignalScope` helper in `utils/caseEscalation.ts`
 *  performs the translation. */
export type AttorneyEscalationScope =
  | "all"
  | "tenant"
  | "tpid"
  | "some"
  | "none"
  // Legacy values from the Phase 1 read migration — accepted as input
  // by helpers (mapped to "all" / "some") until the seeds rename.
  | "case"
  | "identifier";

/** Richer scope payload used by write helpers (`applyAttorneyAction`,
 *  `applyAuthorizationStatusUpdate`, `applyGfrDecision`, etc.). The
 *  `some` variant carries the target identifier ids alongside the
 *  discriminant so a single argument fully describes the write.
 *
 *  `tenant` and `tpid` variants exist for cases that contain Enterprise
 *  identifiers spanning multiple tenants — they resolve to the subset
 *  of identifiers belonging to the named tenant (or, for tpid, any
 *  child tenant under the parent TPID). They behave like `some` for
 *  storage (per-identifier writes; case-level field cleared) but
 *  preserve the user's intent in the audit thread so reviewers can
 *  tell whether a partial write was "all in tenant T1" vs an arbitrary
 *  identifier list. */
export type SignalScope =
  | { kind: "all" }
  | { kind: "tenant"; tenantId: string }
  | { kind: "tpid"; tpid: string }
  | { kind: "some"; identifierIds: string[] }
  | { kind: "none" };

/** A single attorney action recorded against an escalation. The full
 *  list is the audit trail surfaced in the AuditThread. */
export interface AttorneyAction {
  id: string;
  action:
    | "Release"
    | "ApproveWithConditions"
    | "RequestMoreInformation"
    | "Block";
  /** Free-text note authored by the attorney. Required for
   *  Approve-with-Conditions / Request-Info / Block; optional for
   *  Release. */
  note?: string;
  attorneyName: string;
  performedAt: Date;
}

/** Escalation state. Lives on FormData. Optional — only present once
 *  the Specialist has actually escalated. */
export interface AttorneyEscalation {
  /** DARS role the Specialist targeted. */
  role: EscalationRole;
  /** Specific assignee id (lookup against ESCALATION_DIRECTORY). When
   *  undefined, any user holding the role can pick up the case. */
  assignedAttorneyId?: string;
  /** The Specialist's reason for escalating — shown to the reviewer
   *  prominently in the review panel. */
  reason: string;
  escalatedAt: Date;
  escalatedBy: string;
  /** Drives the badge state. Computed from the most recent action. */
  status: AttorneyEscalationStatus;
  /** Whether the RS escalated the whole case at once (`"case"`) or only
   *  specific identifiers (`"identifier"`). Optional during the migration
   *  window — when undefined, treat as `"case"` for back-compat with
   *  existing seeded data. */
  scope?: AttorneyEscalationScope;
  /** Required when status === "ApprovedWithConditions". Conditions
   *  banner copy shown to the Specialist after reassignment. */
  conditionsNote?: string;
  /** Set after the Specialist clicks Acknowledge on the conditions
   *  banner — hides the banner without losing the audit entry. */
  conditionsAcknowledgedAt?: Date;
  conditionsAcknowledgedBy?: string;
  /** Required when status === "InformationRequested". Inline note from
   *  the attorney to the Specialist. */
  informationRequest?: string;
  /** Required when status === "Blocked". Reason rendered in the block
   *  warning banner + audit thread. */
  blockingNote?: string;
  /** Append-only history of attorney actions. */
  actions: AttorneyAction[];
  /** When the escalation was triggered by an outbound's "Attorney
   *  Escalation" toggle, the ids of the held outbounds.
   *  `Release` / `ApproveWithConditions` walks this list, flips each
   *  outbound's `transmission.status` from `Draft` to `Sent`, and clears
   *  `pendingAttorneyReview`. Empty / undefined when the escalation was
   *  triggered by other means (e.g. case-level escalate button). */
  relatedOutboundIds?: string[];
}

/** A single auditable event in an escalation's lifecycle. Stored
 *  separately from `attorneyEscalation` on FormData so the audit
 *  survives if the live escalation block is later reset. */
export interface EscalationAuditEvent {
  id: string;
  kind:
    | "Escalated"
    | "Released"
    | "ApprovedWithConditions"
    | "InformationRequested"
    | "Blocked"
    | "Resumed"
    | "Acknowledged"
    | "ReassignedToSpecialist"
    | "LeadNotified"
    | "SLAStopped"
    | "SLAResumed"
    | "RfiReplyOverdue"
    | "RfiReplied"
    | "PaiPromptDismissed"
    | "GfrReceived"
    | "EaWindowExpired"
    | "GfrCleared"
    | "GfrDeliveryResumedManually"
    | "Form3Retracted"
    // Form 3 (Non-Execution Response) — Microsoft's outbound to the IA
    // when the case cannot be executed. The send event is captured here
    // (the SLAStopped audit captures the SLA effect; Form3Submitted is
    // the workflow event itself). The retention clock starts on the
    // same send via `startRetentionClock(..., "Form3NonExecution", ...)`.
    | "Form3Submitted"
    // Preservation lifecycle (EPOC-PR specific) — driven by inbound
    // WISP callbacks against /eevidence/preservationextension and
    // /eevidence/endpreservation. Handlers in
    // `useInboundEventHandler` append these so the audit log captures
    // every IA-driven preservation event.
    | "PreservationOrderReceived"
    | "PreservationOrderAcknowledged"
    | "PreservationExtended"
    | "PreservationEnded"
    // Workflow 8 — IA withdraws the EPOC at any point in the lifecycle.
    // Fired by the Withdrawal inbound handler. Supersedes all other
    // workflows; SP must cancel pending delivery + start 45-day retention.
    | "EpocWithdrawn"
    // Phase 4 enterprise CTAs — attorney actions on enterprise cases
    // surface here so the AuditThread captures the full enterprise
    // workflow alongside the existing escalation lifecycle.
    | "RedirectedToEnterprise"
    | "DerogationChecked"
    | "PolicyReviewFlagged"
    | "PolicyReviewCleared"
    | "ExecReviewFlagged"
    | "ExecReviewCleared"
    | "PriorTenantHistoryViewed";
  /** Performer's display name. CURRENT_USER for the prototype. */
  actor: string;
  actorRole?: EscalationRole;
  performedAt: Date;
  /** Free-text note attached to the event. */
  note?: string;
  /** Identifier this event acted on. Present on per-identifier actions
   *  (Escalated / Released / ApprovedWithConditions / InformationRequested /
   *  Blocked when `scope === "identifier"`); absent for case-level events
   *  (LeadNotified, GfrReceived, RFI cadence events, etc.). Drives the
   *  per-identifier filter dropdown in the AuditThread. */
  identifierId?: string;
  /** Source document this audit event was derived from (e.g. the
   *  `documentId` of an inbound correspondence item that triggered a
   *  preservation extension). Used by the inbound-event-handler seam
   *  to enforce idempotency — a handler that has already run for a
   *  given documentId is not re-applied on subsequent store changes. */
  documentId?: string;
}

// ── EU eEvidence — Grounds for Refusal (Reg. 2023/1543 Art. 8 + 10(2)) ──
//
// GFR is the Enforcing Authority's (EA) legal veto signal about an EPOC.
// Distinct from — but coupled with — EPOC Form 3 (Microsoft's own
// non-execution response). Per ETSI TS 104 144 clause 5.5.1, GFR has
// TWO trigger paths:
//   1. EA reviews the original Form 1 (with Section M completed) and
//      issues a decision before SP execution.
//   2. SP submitted a Form 3 (Non-Execution endpoint, ETSI 6.4) and
//      the EA replied with a GFR message confirming or rejecting the
//      SP's non-execution claim.
//
// The decision payload mirrors ETSI 5.5.4 / 5.5.5 / 5.5.6 — three
// mutually-exclusive object types (no Conditional). A Partial decision
// scopes to LDTask Objects (ETSI 5.5.7) which in DARS map to
// `AccountIdentifier.taskId` — the block cascades through every
// service + data-category job under each blocked task.

/** ETSI TS 104 144 clause 5.5.4 / 5.5.5 / 5.5.6 — three mutually
 *  exclusive payload objects. `undefined` decision on the parent
 *  block = EA still reviewing. */
export type GfrDecisionKind = "None" | "Full" | "Partial";

/** Reg 2023/1543 Art. 12 grounds. Transported inside the 5.5.5 (Full)
 *  and 5.5.6 (Partial) payload objects as coded values. Microsoft
 *  consumes them; we never author them. (Form 3's richer SP-side
 *  D-reasons live separately on `nonExecutionReason`.) */
export type RefusalReason =
  | "ImmunitiesOrPrivileges"            // Art. 12(1)(a)
  | "ConflictWithThirdCountryLaw"       // Art. 12(1)(b)
  | "ManifestBreachOfFundamentalRights" // Art. 12(1)(c)
  | "ManifestlyDisproportionate";       // Art. 12(1)(d)

/** Discriminated union per ETSI 5.5.4/5/6. Exactly one of these
 *  variants is present once the EA decides. */
export type GfrDecisionPayload =
  | {
      // ETSI 5.5.4 EPOCNoGroundsForRefusalInformation
      kind: "None";
      decidedAt: Date;
      decidedBy?: string;
      note?: string;
    }
  | {
      // ETSI 5.5.5 EPOCFullRefusalInformation
      kind: "Full";
      decidedAt: Date;
      decidedBy?: string;
      reasons: RefusalReason[];
      reasonSummary?: string;
    }
  | {
      // ETSI 5.5.6 EPOCPartialRefusalInformation
      kind: "Partial";
      decidedAt: Date;
      decidedBy?: string;
      reasons: RefusalReason[];
      reasonSummary?: string;
      /** LDTask Object IDs (ETSI 5.5.7) whose entire production the
       *  EA blocks. Matched against `AccountIdentifier.taskId`
       *  (format LDID/LIID/LPID-xxxxxx). The block CASCADES through
       *  every service + data-category job under each named task —
       *  no category-level or service-level partial within a task.
       *  Non-listed identifiers remain actionable. */
      blockedTaskObjectIds: string[];
    };

/** The Enforcing Authority's Grounds-for-Refusal block. Optional on
 *  FormData — only present on eEvidence cases with EA involvement
 *  (Workflows 2, 5-international, 6 per Appendix F). Drives the GFR
 *  Panel on Case Overview, the queue-card badges, the SLA pause on
 *  `Full` decisions, and delivery gates in CollectionTracker. */
export interface EEvidenceGroundsForRefusal {
  /** Per ETSI 5.5.1, GFR has two trigger paths:
   *   - "Form1Review"   — EA reviewed the original EPOC (Form 1, Section M)
   *                       and issued a decision before SP execution.
   *   - "Form3Response" — SP submitted a Form 3 via the Non-Execution
   *                       endpoint (clause 6.4); EA replied via GFR.
   *  Trigger affects panel copy AND the operational meaning of each
   *  decision (e.g., `None` after Form 3 ⇒ EA rejected SP's refusal). */
  trigger: "Form1Review" | "Form3Response";
  /** When trigger === "Form3Response", references the SP's originating
   *  Form 3 (carried via the GFR's 5.5.3 Document Object). The Form 3
   *  surface in CollectionTracker reads from this to reflect the EA's
   *  downstream verdict. */
  referencedForm3Id?: string;

  /** When trigger === "Form3Response" AND decision.kind === "None"
   *  (EA rejected the SP's Form 3) AND the Specialist has retracted
   *  the Form 3 via the Phase D confirm dialog, these capture the
   *  retract event. The GFR Panel checks `form3RetractedAt` to flip
   *  from the "EA rejected — Retract Form 3" CTA state into the
   *  "Form 3 retracted — production proceeding" confirmation state. */
  form3RetractedAt?: Date;
  form3RetractedBy?: string;

  /** When the EA was first notified. Art. 8 clock starts here. For
   *  Form3Response trigger, this is the EA's notification of the
   *  Form 3 (which starts a fresh 10-day review window). */
  notifiedAt: Date;
  /** notifiedAt + 10 calendar days. OPERATIONAL TIMER ONLY — does
   *  NOT pause the case SLA while the EA is reviewing. SLA pause
   *  occurs only after a Full decision lands. */
  eaReviewWindowExpiresAt: Date;

  /** EA-provided reference info. */
  ea: {
    name: string;
    referenceNumber?: string;
  };

  /** Undefined while EA reviewing; populated when 5.5.4/5/6 arrives.
   *  Render branches by `(trigger, decision.kind)` — see
   *  GroundsForRefusalPanel. */
  decision?: GfrDecisionPayload;

  // ── Day-10 lapse handling ─────────────────────────────────────────
  // Per Reg 2023/1543 Art. 10(2): if no EA decision by
  // `eaReviewWindowExpiresAt`, the hold lapses by operation of law.
  // System auto-fires `EaWindowExpired` audit; lapse is NOT approval.
  // RS must click "Resume delivery (window lapsed)" before any
  // delivery action is re-enabled. SLA continues ticking throughout
  // — no auto-pause on lapse.

  /** Auto-set when the 10-day window passes without a final decision. */
  windowLapsed?: boolean;
  windowLapsedAt?: Date;
  /** Set when the RS explicitly resumes delivery after the lapse. */
  manualDeliveryResumed?: boolean;
  manualDeliveryResumedAt?: Date;
  manualDeliveryResumedBy?: string;
}

/** DARS Phase 2 Appendix F — the 8 SP-relevant EPOC workflows. Drives
 *  the GFR Panel render gate (only Workflows 2, 5-international, 6
 *  show the panel) and several other workflow-specific behaviours
 *  (8h SLA, preservation semantics, withdrawal handling). */
export type EEvidenceWorkflow = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Human-readable names for the 8 SP workflows. Used in panel tooltips
 *  + audit-event notes. */
export const WORKFLOW_NAMES: Record<EEvidenceWorkflow, string> = {
  1: "Standard Production — National",
  2: "Standard Production — International (EA review)",
  3: "Emergency Production (8h)",
  4: "Preservation Order (Form 2 / EPOC-PR)",
  5: "Subsequent Production (Form 5)",
  6: "Grounds for Refusal (EA Objects)",
  7: "Non-Execution (Form 3)",
  8: "Withdrawal",
};

// ── Retention clock (Reg 2023/1543) ──────────────────────────────────────

/** Why a retention clock was started. Drives the chip label + tooltip and
 *  is captured in the audit trail so closure rationale is reconstructible.
 *  The 45-day window itself is the same across all reasons — only the
 *  trigger and source attribution differ. */
export type RetentionClockReason =
  | "PreservationEnded"      // IA's POST /eevidence/endpreservation landed
  | "GfrFullRejection"       // EA returned a Full GFR — delivery cancelled
  | "Form3NonExecution"      // SP submitted Form 3 (cannot preserve / produce)
  | "Withdrawal"             // IA withdrew the EPOC (Workflow 8)
  | "Delivered"              // production complete; retention starts at close
  | "Other";

export interface RetentionClock {
  /** When the 45-day window opened. ISO-8601. */
  startedAt: Date;
  /** Computed: startedAt + 45 days. ISO-8601. Stored explicitly so the
   *  chip can render the absolute date without recomputing per render. */
  expiresAt: Date;
  /** Categorical reason — drives the chip label. */
  reason: RetentionClockReason;
  /** Free-text attribution (e.g. "Form 6 doc IA-LNS-2026-00255-IN-04",
   *  "GFR Full from BE EA on 2026-05-19"). Surfaced in the tooltip
   *  so the RS can trace why retention started. */
  source?: string;
}

// ── EU eEvidence — Authority blocks (Reg. 2023/1543) ─────────────────────

/** Approval Role enum for the Issuing + Validating Authority on an
 *  eEvidence case. The Validating Authority can only be a Judge or
 *  Prosecutor — never "OtherCompetentAuthority" (which by definition
 *  triggers the need for a VA in the first place). */
export type EEvidenceApprovalRole =
  | "JudgeCourtOrInvestigatingJudge"
  | "PublicProsecutor"
  /** Issuing Authority only — never applies to a Validating Authority. */
  | "OtherCompetentAuthority";

/** Approver Type — discriminator that identifies which kind of authority
 *  an approver block represents on an eEvidence case. The IA, VA, and CA
 *  blocks share the same field shape; this tag tells the UI which role
 *  badge / card title to render. The Enforcing Authority is intentionally
 *  excluded — it has a different field shape and is always the same
 *  Microsoft-side default rather than a case-specific approver. */
export type EEvidenceApproverType =
  | "IssuingAuthority"
  | "ValidatingAuthority"
  | "CompetentAuthority";

/** Friendly labels for the Approver Type discriminator — surfaced as the
 *  read-only "Approver Type" field value on each authority card. */
export const EEVIDENCE_APPROVER_TYPE_LABELS: Record<
  EEvidenceApproverType,
  string
> = {
  IssuingAuthority: "Issuing Authority",
  ValidatingAuthority: "Validating Authority",
  CompetentAuthority: "Competent Authority",
};

/** One-line role descriptions surfaced as hover tooltips next to each
 *  approver card / section header. Helps the RS quickly distinguish the
 *  three roles without leaving the form. */
export const EEVIDENCE_APPROVER_TYPE_DESCRIPTIONS: Record<
  EEvidenceApproverType,
  string
> = {
  IssuingAuthority: "Creates and sends the legal order.",
  CompetentAuthority:
    "Any authority legally allowed to act in this process.",
  ValidatingAuthority:
    "Reviews and confirms the order is legally valid.",
};

/** Per-case approver block shared by Issuing + Validating Authority.
 *  Each authority captures its own approver — the regulator + the validator
 *  are typically different officials, sometimes in different jurisdictions. */
export interface EEvidenceAuthorityApprover {
  name: string;
  /** Where the approver is reached — typically a court / prosecutor's
   *  office street address. Multi-line; \n preserved in rendering. */
  address?: string;
  /** Phone as a single canonical string, e.g. "+49 69 1367-2424". Parsed
   *  into { countryCode, areaCode, number } only at render time (e.g. when
   *  populating the EPOC PDF's country/area/number columns). */
  tel?: string;
  /** Fax as a single canonical string. Same shape + parser as `tel`. */
  fax?: string;
  email?: string;
  /** Free-form languages list, e.g. "de - German, en - English". */
  languagesSpoken?: string;
}

/** Issuing Authority block on an eEvidence case — issuer of the EPOC. */
export interface EEvidenceIssuingAuthority {
  /** Discriminator — always `"IssuingAuthority"` for this block.
   *  Optional for backwards compatibility with mocks that pre-date the
   *  tag; the UI defaults to `"IssuingAuthority"` when this field is
   *  read off `formData.eevidenceIssuingAuthority`. */
  approverType?: "IssuingAuthority";
  /** Issuing-authority identifier number from the eEvidence envelope. */
  idNumber?: string;
  /** Canonical name (free text — distinct from the Agency registry name). */
  name: string;
  /** "Court" | "Prosecutor's Office" | "Police" | ... — free string for
   *  the prototype; constrained to enum if downstream consumers need it. */
  issuingAuthorityRole?: string;
  /** Country the Issuing Authority sits in. */
  country: CaseCountry;
  approvalRole: EEvidenceApprovalRole;
  /** One or more reference numbers — the EPOC can carry multiple. */
  approvalReferenceNumbers: string[];
  approver?: EEvidenceAuthorityApprover;
  /** Optional Central Authority contact block, used when the Member State
   *  routes through a Central Authority distinct from the IA itself. Same
   *  shape as the approver block so the UI can render with one component. */
  centralAuthorityContact?: EEvidenceAuthorityApprover;
}

/** Validating Authority block — present when IA is "OtherCompetentAuthority"
 *  and an external Judge / Prosecutor validated the order. */
export interface EEvidenceValidatingAuthority {
  /** Discriminator — always `"ValidatingAuthority"`. Optional per the
   *  backwards-compatibility rule documented on
   *  `EEvidenceIssuingAuthority.approverType`. */
  approverType?: "ValidatingAuthority";
  idNumber?: string;
  /** Name of the Validating Authority (the institution — e.g. "Juzgado
   *  Central de Instrucción nº 6, Audiencia Nacional"). Separate from the
   *  approver's personal name inside `approver`. */
  name?: string;
  /** Free-text type of body — matches `issuingAuthorityRole` on IA so the
   *  three approver blocks render symmetrically. */
  authorityRole?: string;
  /** VA can be in a different country from the IA (e.g. IA = regional
   *  police, VA = federal court). */
  country: CaseCountry;
  approvalRole: Exclude<EEvidenceApprovalRole, "OtherCompetentAuthority">;
  approvalReferenceNumbers: string[];
  approver?: EEvidenceAuthorityApprover;
}

/** Competent Authority block — a third per-case approver that can sit
 *  alongside the IA and (optionally) the VA on an eEvidence case. Same
 *  field shape as IA / VA so the UI renders all three symmetrically.
 *  Captures, e.g., an appellate court or ministry-level authority with
 *  competence over the order in addition to the IA. */
export interface EEvidenceCompetentAuthority {
  /** Discriminator — always `"CompetentAuthority"`. */
  approverType?: "CompetentAuthority";
  idNumber?: string;
  name: string;
  /** Free-text type of body — symmetric to `issuingAuthorityRole` on IA. */
  authorityRole?: string;
  country: CaseCountry;
  approvalRole: EEvidenceApprovalRole;
  approvalReferenceNumbers: string[];
  approver?: EEvidenceAuthorityApprover;
}

/** Enforcing Authority — Member State agency that transmits / enforces the
 *  order. Lighter shape than IA/VA: a single contact (no approver, no
 *  languages — per Reg. 2023/1543 Annex schema). */
export interface EEvidenceEnforcingAuthority {
  /** Name of the Authority (the institution). */
  name: string;
  /** Optional contact person at the EA. Separate from the authority name
   *  so the UI can render a "Contact" sub-block parallel to IA/VA's
   *  Approver sub-block. */
  contactName?: string;
  address?: string;
  tel?: string;
  fax?: string;
  email?: string;
}

/** eEvidence Enterprise Request — captures the IA's path through the ETSI
 *  UnderlyingConditions dictionary (Table 5.3.3-11/12). All fields are
 *  optional / undefined until the IA's response cascades down the tree;
 *  validation rules gate "required" status based on the path. */
export interface EEvidenceEnterpriseRequest {
  /** Q1 — IA-provided. Is the EPOC addressed to the service provider
   *  (Microsoft) acting as the controller? Read-only in the UI. */
  addressedToController?: boolean;
  /** Q2 — IA-provided. Is the EPOC addressed to the service provider
   *  who is — or, where the controller cannot be identified, is
   *  possibly — processing the data on behalf of the controller?
   *  Read-only in the UI. When true, the IA must answer one or both of
   *  the AddressedToProcessor* fields below. */
  addressedToProcessor?: boolean;
  /** Reason 1 to also address the processor (Microsoft): the controller
   *  cannot be identified from the available information. */
  addressedToProcessorControllerUnidentified?: boolean;
  /** Reason 2 to also address the processor: contacting the controller
   *  would be detrimental to the investigation. */
  addressedToProcessorDetrimentalToInvestigation?: boolean;
  /** Microsoft (as processor) shall inform the controller after disclosure. */
  processorShallInformController?: boolean;
  /** Microsoft shall NOT inform the controller after disclosure.
   *  (Mutually exclusive with the above in practice; ETSI models them as
   *  two independent flags so the schema does too.) Surfaced read-only in
   *  the Enterprise Request card whenever the IA submitted a value —
   *  independent of the Q1/Q2 cascade. */
  processorShallNotInformController?: boolean;
  /** IA-granted permission to notify the data subject (end user) about
   *  the disclosure. Distinct from the controller-notification leg
   *  above. Surfaced read-only in the Enterprise Request card whenever
   *  the IA submitted a value, even when both Q1 and Q2 are NO. */
  permissionToNotifyUser?: boolean;
  /** Short rationale for the IA's notification choice. Required when the
   *  notification leg is reached. */
  justification?: string;
  /** Additional relevant information — maps to ETSI's
   *  `AdditionalUnderlyingConditionsInformation` (Table 5.3.3-11 row 3).
   *  Required when the notification leg is reached. */
  relevantInformation?: string;
}

/** Summary of an existing DARS case the Issuing Authority cross-referenced
 *  in the eEvidence envelope. Read-only in the form — populated either from
 *  the envelope itself or, in the prototype, from a mock fetch keyed by the
 *  DARS case number. */
export interface EEvidenceRelatedCase {
  /** Canonical DARS / LENS case number (e.g. "LNS-2025-00280"). */
  darsCaseNumber: string;
  /** Echoes the related case's request type — expected to be "eEvidence". */
  requestType: string;
  /** eEvidence subtype on the related case. Supports cross-references
   *  in both directions of the preservation → production handoff:
   *    - "EPOC-PR"      — preservation order (parent of a future ER)
   *    - "EPOC-ER"      — production order (child of an earlier PR)
   *    - "EPOC-PR-EXT"  — preservation extension (renews a PR window)
   *    - "None"         — generic / unspecified */
  requestSubType?: "None" | "EPOC-PR" | "EPOC-ER" | "EPOC-PR-EXT";
  /** Issuing Authority's display name on the related case. */
  issuingAuthorityName: string;
  /** One or more IA reference numbers (multiple is allowed). */
  issuingAuthorityReferenceNumbers: string[];
  /** When the related case was transmitted. ISO-8601 string; same semantic
   *  + shape as `FormData.dateOfTransmission` on the current case. */
  dateOfTransmission?: string;
  /** Service provider responsible for fulfilling the related case. */
  serviceProviderName?: string;
  /** Free-text rationale or context provided by the IA. */
  additionalInformation?: string;
  // ── EPOC-PR-only fields ─────────────────────────────────────────────
  /** When the preservation order's preserved-data window ends. ISO-8601 date. */
  preservationEndDate?: string;
  /** Scheduled date for destruction of the preserved data. ISO-8601 date. */
  dataDestructionDate?: string;
  /** Case stage of the related case (free string, same convention as
   *  `FormData.caseStage`). */
  requestStatus?: string;
  /** Resolution reason when the related case is closed. */
  resolutionReason?: ResolutionReason;
}

/** ETSI Authorisation → AuthorisationFlags block on an eEvidence case.
 *  These are IA-provided boolean flags on the top-level Authorisation
 *  object — distinct from the UnderlyingConditions flags inside
 *  `EEvidenceEnterpriseRequest`. Each flag here is read-only in the UI
 *  and drives one or more downstream behaviours. */
export interface EEvidenceAuthorisationFlags {
  /** IA instructed Microsoft to delay informing the data subject (end
   *  user) about the disclosure. When true, an NDO with status "Delay
   *  Inform" should be reflected on the case so the Response Specialist
   *  treats the user-notification leg as paused. */
  delayInformingUser?: boolean;
  /** Reg 2023/1543 Art. 9(2) emergency justification. Required for
   *  Workflow 3 (Emergency Production) cases — the IA must declare which
   *  imminent-danger category triggers the 8h SLA, and may attach a
   *  free-text note for context. Surfaced on the EmergencyEEvidenceBanner
   *  + the case header so the Specialist sees why the case is on the
   *  accelerated clock. */
  emergencyJustification?: {
    category:
      | "DangerToLife"
      | "DangerOfInjury"
      | "CriticalInfrastructure";
    note?: string;
  };
}

/** A snapshot of a prior resolution captured before it was edited or the
 *  case was re-opened. Lives on `FormData.resolutionHistory` so the case
 *  retains memory of every closure decision. */
export interface ResolutionHistoryEntry {
  reason: ResolutionReason;
  notes?: string;
  /** `caseStage` immediately before this resolution was applied — used by
   *  the Re-open flow as a hint for the restored stage. */
  caseStageBefore?: string;
  resolvedAt: Date;
  resolvedBy: string;
  /** When this entry was superseded (either edited or re-opened). */
  supersededAt: Date;
  supersededBy: string;
  supersededReason: "Edit" | "Reopen";
}

export interface ServiceTaskInfo {
  taskId: string; // Format: LDID-xxx, LIID-xxx, or LPID-xxx
  taskIdType: "LDID" | "LIID" | "LPID";
  provisioned: boolean;
}

export interface ServiceBackgroundData {
  volumeData: {
    fileSize?: string; // e.g., "2.5 GB" - for OneDrive
    fileCount?: number; // for OneDrive
    mailboxSize?: string; // e.g., "3.8 GB" - for Outlook
    mailboxCount?: number; // for Outlook
    accountSizeUsed?: string; // e.g., "45%" - for OneDrive only
    accountSizeRemaining?: string; // e.g., "55%" - for OneDrive only
  };
  consumerAliases?: string[];
  enterpriseAliases?: string[];
  accountStatus: "Active" | "Soft-Deleted" | "Deleted";
  creationDate?: Date;
  geoLocation?: string; // e.g., "North America - East US 2"
  archiveEnabled?: boolean; // for Outlook only
  lockboxEnabled?: boolean; // for Outlook only
}

export interface ServiceAccountExistence {
  consumerExists: boolean;
  consumerAccounts?: string[];
  consumerStorageLocation?: string;
  consumerCheckData?: {
    provisioned: boolean;
    lastLogonLocation?: string;
    provisionedDataLocation?: string;
  };
  enterpriseExists: boolean;
  enterpriseAccounts?: string[];
  enterpriseStorageLocation?: string;
  enterpriseCheckData?: {
    provisioned: boolean;
    lastLogonLocation?: string;
    provisionedDataLocation?: string;
  };
}

export interface ServiceWithResults {
  enabled: boolean;
  startDate?: Date;
  endDate?: Date;
  timeZone?: string;
  categoryGroups: ServiceCategoryGroups;
  existenceResults?: AccountExistenceResult[];
  accountExistence?: ServiceAccountExistence;
  taskInfo?: ServiceTaskInfo;
  backgroundData?: ServiceBackgroundData;
  collectionMethod?: "automated" | "manual";
  dataLocation?: string;
  collectionNotes?: string;
  manualStatusLastUpdatedBy?: string;
  manualStatusLastUpdatedAt?: Date;
  includeConsumerAccount?: boolean;
  includeEnterpriseAccount?: boolean;
}

/**
 * Per-identifier rejection state. Set when the RS rejects the legal demand
 * document for this identifier during Step 2 review. A rejected identifier
 * is excluded from the bulk routing scope, replaces its accordion split-pane
 * with a RejectedIdentifierCard, and is skipped from Step 3 submission.
 */
export interface IdentifierRejection {
  rejected: true;
  rejectedAt: Date;
  rejectedBy: string;
  reason: string;
  documentRef?: string;
}

export interface AccountIdentifier {
  id: string;
  value: string;
  type: string;
  taskId: string; // Unique task ID for this identifier
  taskStatus: TaskStatus; // Current status of the task
  accountExistenceStatus?: "not-checked" | "checking" | "success" | "error";
  accountExistenceError?: string;
  geoLocation?: string;
  createdBy?: string; // Who created this identifier: "LE Agency" or "Supplemental <User Name>"
  /** When this identifier was added as a Supplemental (createdBy starts
   *  with "Supplemental"), this references the LE-provided identifier it
   *  was linked to in the Add Identifier dialog. Drives the IdentifierTable
   *  grouping — supplemental rows sort immediately under their parent and
   *  surface a "Linked to LE: <parent value>" caption. Undefined for
   *  LE-provided identifiers. */
  linkedIdentifierId?: string;
  checkAccounts?: {
    dataLocation?: string;
    accountType?: string;
    primaryIdentifier?: string;
    relatedIdentifiers?: string[];
    /** Populated when the target identifier is a member user of an
     *  EntraId tenant. Captured from the Enterprise Tenant Profile
     *  retrieved alongside account existence. Drives the
     *  "notify the Controller" banner when the IA's envelope set
     *  `processorShallInformController === true`. */
    tenantId?: string;
    /** Parent TPID this identifier's tenant rolls up to. Lets the
     *  attorney dialog's scope picker offer "All identifiers in TPID Y"
     *  which resolves to every identifier whose tenant shares the
     *  same `parentTpid` — useful when a single case targets multiple
     *  child tenants of the same Microsoft customer. Mirrors
     *  `EnterpriseOrgContext.parentTpid` so per-identifier writes can
     *  resolve the parent without crossing to the case-level org. */
    parentTpid?: string;
    tenantPrimaryDomain?: string;
    tenantAdminName?: string;
    tenantAdminEmail?: string;
    tenantAdminPhone?: string;
  };
  services: IdentifierServices;
  /** Present when RS rejected the legal demand for this identifier. */
  rejection?: IdentifierRejection;

  // ── External LE service mapping (Phase 1) ───────────────────────────────
  /** Service names as supplied by the external LE submission (UK COPO etc.).
   *  Resolution to internal LENS service keys happens via
   *  `resolveExternalServices`. Optional; existing mocks pre-load
   *  `services[*].enabled` directly and don't set this. */
  leExternalServices?: string[];
  /** Optional per-external-service date range supplied by LE. Resolution
   *  writes the same range onto every internal service derived from that
   *  external name. Keyed by the external name. */
  leExternalServiceDates?: Record<string, { start: string; end: string }>;
  /** Audit trail of RS substitutions for unresolved external services
   *  (when the resolver returns wrong-account-type or unmapped-name and
   *  the RS picks an alternative internal service via the Replace flow).
   *  Append-only. */
  externalSubstitutions?: Array<{
    externalName: string;
    substitutedInternalKey: string;
    reason: string;
    substitutedAt: Date;
    substitutedBy: string;
  }>;

  // ── RS-marked invalid (Phase 5c.2) ──────────────────────────────────────
  /** Free-text reason captured when RS marked the identifier as Invalid. */
  invalidReason?: string;
  invalidatedAt?: Date;
  invalidatedBy?: string;

  // ── LE-driven ETSI status (Phase 5c.4) ──────────────────────────────────
  /** When LE submits a per-identifier ETSI status update. When set to a
   *  terminal value (Cancelled / Withdrawn), the identifier short-circuits
   *  the wizard: no mapping, no submission. RS acknowledges to flip
   *  `taskStatus` to match. */
  etsiDesiredStatus?: ETSIDesiredStatus;
  etsiStatusUpdatedAt?: Date;
  etsiStatusUpdatedBy?: string;

  // ── LE/IA-driven Authorization Desired Task Status ──────────────────────
  /** Per-task status the LE or IA can signal on UK COPO and eEvidence
   *  orders. Lets the requester ask LENS to start, pause, complete, or
   *  cancel an individual task without touching the rest of the case.
   *  Only meaningful when the case `requestType === "COPO Order"` or
   *  `requestType === "eEvidence"`; the UI gates display on those types. */
  authorizationDesiredTaskStatus?: AuthorizationDesiredTaskStatus;
  authorizationDesiredTaskStatusUpdatedAt?: Date;
  authorizationDesiredTaskStatusUpdatedBy?: string;

  // ── Per-identifier attorney escalation ──────────────────────────────────
  /** Per-identifier attorney escalation. Present when the RS flagged this
   *  specific identifier (task) for attorney review. Coexists with the
   *  legacy `FormData.attorneyEscalation` during the migration window —
   *  new attorney surfaces read from this field; legacy code paths
   *  continue reading from the case-level field. When scope === "case",
   *  every identifier on the case carries an identical escalation block
   *  with the same reason + timestamp. When scope === "identifier", only
   *  the targeted identifiers carry one. */
  attorneyEscalation?: AttorneyEscalation;

  // ── eEvidence-only metadata supplied by the Issuing Authority ───────────
  /** Free-form notes the Issuing Authority attached to this specific target
   *  identifier in the eEvidence submission envelope. Surfaced read-only on
   *  the identifier card / row in the case form. Only meaningful when the
   *  case's `requestType === "eEvidence"`. */
  issuingAuthorityNotes?: string;

  // ── eEvidence EPOC-PR (preservation request) ────────────────────────────
  /** Per-identifier preservation expiration date. IA-provided in the
   *  EPOC-PR envelope, read-only in the UI. ISO-8601 (date-only). Only
   *  meaningful when the case is an eEvidence EPOC-PR — other request
   *  types ignore it. Surfaced on the Collection page identifier row. */
  desiredPreservationExpiration?: string;
}

export interface Agent {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  role: string;
  languages?: string;
  source?: "agency" | "user";
  escalatedToLE?: boolean;
  escalationNotes?: string;
  escalationDate?: string;
}

// ── Country → Jurisdiction → Agency Hierarchy ─────────────────────────────────

export type CaseRegion = "US" | "EU" | "EEA" | "APAC" | "LATAM" | "ROW";

/** Top-level country entity. countryCode is ISO 3166-1 alpha-2. */
export interface CaseCountry {
  countryCode: string;     // e.g. "US", "IN", "GB", "DE"
  countryName: string;     // e.g. "United States", "India", "United Kingdom"
  region: CaseRegion;      // Derived grouping for CHI scoring and routing
}

/** Jurisdiction scoped to a specific country. Valid levels differ per country. */
export interface CaseJurisdiction {
  country: CaseCountry;
  /** Country-specific level: "Federal" | "State" | "Local" | "Tribal" (US);
   *  "Central" | "State" (India); "National" | "Regional" (EU/UK); etc. */
  jurisdictionLevel: string;
  /** Optional specific name, e.g. "Southern District of New York" */
  jurisdictionName?: string;
}

export type AgencyType =
  | "LawEnforcement"          // Police, sheriffs, federal investigators
  | "IntelligenceAgency"      // National intelligence services
  | "RegulatoryBody"          // Ofcom, FTC, data protection authorities
  | "Court"                   // Courts that issue orders directly
  | "Prosecutor"              // State/federal prosecutors, district attorneys
  | "MilitaryLawEnforcement"  // Military police, JAG
  | "InternationalBody"       // Interpol, Europol, MLAT treaty bodies
  | "Other";

/** Structured agency entity from the agency registry. */
export interface Agency {
  id: string;
  name: string;                   // Canonical: "Federal Bureau of Investigation"
  shortName?: string;             // "FBI"
  aliases: string[];              // For deduplication and typeahead search
  country: CaseCountry;
  agencyType: AgencyType;
  jurisdiction?: CaseJurisdiction;
  verificationStatus: "Verified" | "Unverified" | "Flagged";
  contactDomain?: string;         // "@fbi.gov" — for requestor verification
}

export type AuthorityRole =
  | "IssuingAuthority"    // The court/body that authorized the legal demand
  | "EnforcingAuthority"  // The agency executing/serving the demand
  | "RequestingAgency"    // The agency that submitted the request to Microsoft
  | "CooperatingAgency"   // Additional agency (e.g., Interpol coordination)
  | "OutsideCounsel";     // External legal representation (India scenario)

/** Links an agency to a specific case with a defined authority role. */
export interface CaseAgencyRole {
  agency: Agency;
  role: AuthorityRole;
  primaryContact?: Agent;  // Point of contact at this agency for this case
  notes?: string;
}

/** Replaces the flat country/jurisdiction/agency fields on a case. */
export interface CaseLegalContext {
  country: CaseCountry;
  jurisdiction: CaseJurisdiction;

  /** At least one agency required. A single agency may hold multiple roles. */
  agencies: CaseAgencyRole[];

  // Derived convenience accessors (computed, not stored)
  primaryIssuingAuthority?: Agency;
  primaryEnforcingAuthority?: Agency;
  primaryRequestingAgency?: Agency;

  // Validation signals
  /** True if all agency countries match the case country. */
  agencyCountryMatch: boolean;
  /** True if agencies from different countries are involved — adds +1.0 CHI complexity. */
  crossBorderFlag: boolean;
}

export interface NonDisclosureOrder {
  id: string;
  /** Display label for the NDO. In the form this is now driven by the
   *  selected `linkedTaskId` (it shows "{taskId} — {identifier value}"),
   *  so free-text entry has been replaced with a target picker. The field
   *  remains a plain string so legacy NDOs that pre-date the picker keep
   *  rendering. */
  name: string;
  /** TaskID of the identifier this NDO is scoped to. Populated by the
   *  target picker on the NDO form — references
   *  `AccountIdentifier.taskId`. */
  linkedTaskId?: string;
  status: string;
  statusReason: string;
  exclusionReason: string;
  temporaryNDO: boolean;
  /** When `temporaryNDO === true`, the RS can schedule a reminder. The
   *  app fires a notification to the case's assignee at this time so they
   *  re-check the NDO's status. */
  reminderDateTime?: Date | undefined;
  startDate: Date | undefined;
  durationDays: number | undefined;
  expirationDate: Date | undefined;
  createdBy: string;
  createdOn: Date | undefined;
  relatedCases: string[];
  /** Rich-text notes captured on the NDO form. Stored as HTML so the
   *  NoteFieldEditor can round-trip formatting (bold, lists, links).
   *  Pair with `notesAttachments` below. */
  notes?: string;
  /** Files attached alongside the NDO notes via the NoteFieldEditor's
   *  paperclip / image affordances. */
  notesAttachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  isImage: boolean;
}

/** Where a CaseNote was authored. Drives the badge / filter label in the
 *  NotesTimeline (when one is rendered) and lets downstream queries
 *  filter notes by origin without parsing the content. Open string union
 *  rather than a closed enum so new note surfaces can be added without
 *  forcing a type change every time. */
export type CaseNoteSubType =
  | "general"               // Free-form case note on the Case Notes timeline
  | "ndo"                   // Authored against a Non-Disclosure Order
  | "controller-response"   // Controller (Enterprise admin) response notes
  | "user-notification"     // Per-Consumer user-notification follow-ups
  | "escalation"            // Attorney / peer escalation notes
  | "resolution"            // Captured when the RS resolves a case
  | "approval"              // Authorization / approval reason notes
  | "manual-collection"     // Manual data-collection notes
  | "manual-service"        // Per-service manual collection notes
  | "document-verification" // Reasons captured when verifying / rejecting a legal document
  | "processing-job"        // Special instructions on a processing job
  | (string & {});          // Allow extension without re-typing

export interface CaseNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: Date;
  attachments?: Attachment[];
  /** The surface that authored this note. Notes that live in
   *  `formData.notes` carry this on the record itself; notes that live
   *  in a different field (e.g., `controllerResponseNotes`) carry it
   *  implicitly via the field they're stored in, but the helper
   *  `NoteFieldEditor` passes it down to surface in tooltips / aria
   *  labels for consistency. */
  subType?: CaseNoteSubType;
}

// ── Enterprise Context (attorney review surface — ported from the
//    Enterprise Attorney Escalation prototype, spec §8.1) ─────────────────

/** What flagged this case as enterprise — drives the Enterprise Context
 *  section visibility and the rationale chips on the escalation banner. */
export type EnterpriseTrigger =
  | "class_account_check"
  | "eevidence_ia_flag"
  | "domain_registry"
  | "manual_attorney_flag";

/** Tier 3 (org-level) context block. Populated when the case is
 *  detected as enterprise — pulled from CLASS / Lynx / concession-tracker
 *  / RAVE in production; mocked in the prototype. */
export interface EnterpriseOrgContext {
  tenantId: string;
  /** Parent TPID (Top-level Parent Identifier) the tenant rolls up to.
   *  Many M365 customers create a top-level org used to associate
   *  revenue, subscriptions, tenants, and reporting — the TPID — with
   *  multiple tenant ids mapped to it. Attorney scope=tpid uses this
   *  to address every identifier under any child tenant of the same
   *  parent. Optional during the multi-tenant rollout window; treated
   *  as "this tenant has no parent grouping" when absent. */
  parentTpid?: string;
  /** Human-readable parent-org name (e.g. "Contoso Holdings"). Surfaced
   *  alongside `tenantDisplayName` in the OrgPanel / tri-pane so the
   *  attorney can see both child and parent identities at a glance. */
  parentTpidDisplayName?: string;
  tenantPrimaryDomain: string;
  tenantDisplayName: string;
  hqCountry?: string;
  exchangeSeatCount?: number;
  isS500?: boolean;
  hasDerogation?: boolean;
  customContractLanguage?: boolean;
  accountManager?: { name: string; email: string; raveLink?: string };
  adminContact?: { name: string; email: string; phone: string };
  sharePointRegion?: string;
  defaultStorageRegion?: string;
  /** Which external system each field came from (free-form audit hint). */
  provenance?: Partial<Record<keyof EnterpriseOrgContext, string>>;
}

/** Tier 2 (target-user) context block, one entry per identifier on the
 *  case that resolves to this tenant. */
export interface EnterpriseUserContext {
  identifierId: string;
  identifierValue: string;
  lastLogonLocation?: string;
  geoResolutions30d: string[];
  mailboxRegion?: string;
  oneDriveRegion?: string;
  conflictOfLawJurisdictions: string[];
}

/** Result of the attorney clicking "Check Concession Tracker". */
export interface DerogationCheckResult {
  checkedAt: Date;
  checkedBy: string;
  result: "present" | "absent" | "unclear";
  trackerLink?: string;
  notes?: string;
}

/** Prior LNS case in this tenant's history. Surfaced in the
 *  PriorTenantHistoryPanel + PriorCaseDetailPanel. Production wires
 *  this from CLASS / LERS prior-case lookup; the prototype reads from
 *  `data/mockPriorHistory.ts`. */
export interface PriorCase {
  caseId: string;
  dateServed: string;
  submitter: { agency: string; person?: string };
  resolutionStatus:
    | "info_provided"
    | "redirected"
    | "blocked"
    | "withdrawn"
    | "in_progress";
  attorneyId?: string;
  attorneyName?: string;
  agencyCountry?: string;
  jurisdiction?: string;
  legalDemandType?: string;
  issuingAuthority?: string;
  natureOfCrime?: string;
  identifierTargeted?: string;
  dateResolved?: string;
  resolutionNote?: string;
  requestType?: "Standard" | "eEvidence";
}

/** Enterprise context block attached to FormData. Drives the
 *  EnterpriseContextSection card, the Enterprise Org stripe in the
 *  Attorney Tri-Pane Summary, and the 5 enterprise-only CTAs (Redirect,
 *  Concession, Policy / Exec Review, Prior History). */
export interface EnterpriseContext {
  triggers: EnterpriseTrigger[];
  manifestErrorPresent: boolean;
  /**
   * Primary tenant on the case. Single-tenant cases set this and leave
   * `orgs` undefined. Multi-tenant cases set BOTH: `org` carries the
   * tenant the case-form / tri-pane surface treats as primary (typically
   * matched to the issuing authority's jurisdiction), and `orgs` carries
   * the full list including the primary.
   *
   * @deprecated For new code, prefer reading `orgs` and picking the
   *   primary via `getPrimaryOrg(c)`. Kept as a back-compat handle so
   *   single-tenant seeds and existing read sites don't need to change
   *   in lockstep.
   */
  org: EnterpriseOrgContext;
  /**
   * Every tenant the case touches. Multi-tenant cases populate this
   * with one entry per distinct `AccountIdentifier.checkAccounts.tenantId`
   * + the case-form's primary org. Single-tenant cases can either omit
   * this (helpers fall back to `[org]`) or include `[org]` for explicit
   * symmetry — readers handle both. */
  orgs?: EnterpriseOrgContext[];
  users: EnterpriseUserContext[];
  policyReviewRequired: boolean;
  execReviewRequired: boolean;
  derogationCheck?: DerogationCheckResult;
  redirectedToEnterprise?: { at: Date; by: string; correspondenceId: string };
}

/** Aggregate conflict-of-law heat. Computed from the distinct jurisdictions
 *  touched across LE country, target user geo, tenant HQ, mailbox region,
 *  and OneDrive region. */
export type ConflictOfLawHeat = "LOW" | "MEDIUM" | "HIGH";

// ── Notification & Disclosure constraints (attorney review surface) ──────

/** Permission state for notifying one party (controller or user) about
 *  the legal demand. */
export type NotificationPermission =
  | "Permitted"
  | "Required"
  | "Prohibited"
  | "Delayed";

/** What governs the disclosure constraint — drives the source chip in
 *  DisclosureSection and lets the attorney distinguish "NDO in the order"
 *  from "exempt by case-category policy".
 *  - `Order`:               NDO clause in the legal demand itself.
 *  - `Jurisdiction default`: Statute / regulation override (e.g. ECPA delayed notice).
 *  - `Exempt category`:     Microsoft policy exempts this case/identifier
 *                           class from notification regardless of order
 *                           language (e.g. CSE / CSAM, imminent threat to
 *                           life, national security). Common — child
 *                           exploitation cases routinely fall here.
 *  - `Attorney decision`:   Attorney overrode the default at review time. */
export type DisclosureSource =
  | "Order"
  | "Jurisdiction default"
  | "Exempt category"
  | "Attorney decision";

/** Case-level disclosure / non-disclosure posture. Surfaced in the
 *  Attorney Review panel's DisclosureSection — the attorney sees, per
 *  identifier:
 *    - Enterprise identifier → controller-notification permission
 *    - Consumer identifier  → user-notification permission
 *  When `source === "Exempt category"`, `exemptCategory` names the
 *  policy class so the UI can render a distinctive chip. */
export interface DisclosureConstraints {
  controllerNotification: NotificationPermission;
  controllerNotificationNote?: string;
  userNotification: NotificationPermission;
  userNotificationNote?: string;
  /** ISO date when notification becomes permitted (used with "Delayed"). */
  notificationDelayedUntil?: string;
  source: DisclosureSource;
  /** Names the exempt policy class when `source === "Exempt category"`,
   *  e.g. "Child Sexual Exploitation". Free-form string for now; can be
   *  tightened to an enum later. */
  exemptCategory?: string;
  setBy?: string;
  setAt?: Date;
}

export interface FormData {
  // Case Details
  caseId: string;
  createDate: Date | undefined;
  assigneeName: string;
  requestType: string;
  requestSubType: string;
  requestOrigin: string;
  requestOriginOther: string;
  otherRequestTypeDescription: string;
  caseStage: string;
  rejectionReason: string;
  caseEscalated: boolean;
  escalationNotes: string;
  escalatedToInternal?: string; // ID of internal contact assigned

  // ── Legacy flat fields (kept for backward compatibility; prefer legalContext) ──
  country: string;
  /** ISO 3166-1 alpha-2 country code of the issuing authority.
   *  Phase 3 of the attorney-escalation merge — added so the cross-border
   *  login query can decide in-jurisdiction vs. cross-border without
   *  inferring from the human-readable `country` string. Optional during
   *  migration; cases missing this field can't fire the consumer
   *  `Cross-Border` reason badge until seeded. */
  agencyCountryCode?: string;
  jurisdiction: string;
  agency: string;
  agencyPhone: string;
  agencyAddress: {
    number: string;
    city: string;
    stateProvince: string;
    postalCode: string;
  };

  // ── Structured legal context (Country → Jurisdiction → Agency hierarchy) ──
  legalContext?: CaseLegalContext;

  natureOfCrimes: string[];
  mlat: boolean;
  additionalCaseInformation: string;
  caseNumber: string;
  agencyCaseNumber: string;
  relatedCaseNumbers: string;
  casePriority: "Emergency" | "Urgent" | "Expedite" | "Routine" | "Standard";
  agents: Agent[];
  dueDate: Date | undefined;
  dueDateManuallySetBy?: string;
  /** Timestamp when the case's SLA countdown was paused. Set by the
   *  Form 3 — Non-Execution Response submission flow. When set, the SLA
   *  chip renders an "SLA paused" pill alongside the normal countdown so
   *  the RS can see what the impending deadline would be if the timer
   *  restarted. `dueDate` is preserved (NOT overwritten) so the intended
   *  deadline survives the pause. */
  slaPausedAt?: Date;

  // ── CHI / Scoring fields (Phase 1 additions) ──
  chi?: 1 | 2 | 3 | 4 | 5;
  complexityScore?: number;
  complexityTier?: "Low" | "Medium" | "High" | "Very High";
  dateServed?: string;       // ISO 8601 — date the demand was served on Microsoft
  dateReceived?: string;     // ISO 8601 — date received by the response team
  /** eEvidence-only: date the Issuing Authority recorded as the issuance of
   *  the EPOC / EPOC-PR. ISO 8601. Only displayed on the Request Type card
   *  when `requestType === "eEvidence"`. */
  dateOfIssuance?: string;
  /** eEvidence-only: date the Issuing Authority transmitted the request via
   *  the Decentralised IT System. ISO-8601 string — accepts either a
   *  date-only value (`"2026-04-22"`) or a full datetime
   *  (`"2026-04-22T10:42:00"`). Renderer formats based on whether a `T`
   *  component is present. Only displayed on the Request Type card when
   *  `requestType === "eEvidence"`. */
  dateOfTransmission?: string;

  // ── eEvidence-only structured blocks ─────────────────────────────────
  /** Issuing Authority block from the eEvidence envelope. Drives the
   *  Authorization Details → Issuing Authority subsection and the Request
   *  Type card's "Issuing Authority Country" relabel. */
  eevidenceIssuingAuthority?: EEvidenceIssuingAuthority;
  /** Validating Authority block. Present only when IA's approvalRole is
   *  "OtherCompetentAuthority". */
  eevidenceValidatingAuthority?: EEvidenceValidatingAuthority;
  /** Competent Authority block — third per-case approver that can sit
   *  alongside the IA and (optionally) the VA. Independent of the VA's
   *  "IA is OtherCompetentAuthority" gating; surfaces whenever the
   *  envelope (or seed) carries a CompetentAuthority block. */
  eevidenceCompetentAuthority?: EEvidenceCompetentAuthority;
  /** Enforcing Authority block — Microsoft-side default for all
   *  eEvidence cases. NOT transmitted in Form 1; instead supplied by
   *  `DEFAULT_EEVIDENCE_ENFORCING_AUTHORITY` from
   *  `config/eevidenceEnforcingAuthority.ts`. Override only when a case
   *  needs to demonstrate a non-default EA. */
  eevidenceEnforcingAuthority?: EEvidenceEnforcingAuthority;
  /** Enterprise Request — captures the IA's path through the ETSI
   *  UnderlyingConditions decision tree. */
  eevidenceEnterpriseRequest?: EEvidenceEnterpriseRequest;
  /** Tier 3 (org) + Tier 2 (target user) context, surfaced in the Attorney
   *  Review surfaces. Optional — present once the case is detected as
   *  enterprise (see `enterpriseContext.triggers` for the detection path).
   *  Distinct from `eevidenceEnterpriseRequest` (which is IA-supplied
   *  envelope data for eEvidence cases only). */
  enterpriseContext?: EnterpriseContext;
  /** Disclosure / non-disclosure posture surfaced in the Attorney Review
   *  panel's DisclosureSection. Per-side (controller / user) permission
   *  + source attribution (Order / Jurisdiction default / Exempt category /
   *  Attorney decision). Authoritative when present; in its absence the UI
   *  falls back to the legacy `ndoAttached` / `notificationAllowed` fields. */
  disclosureConstraints?: DisclosureConstraints;
  /** Top-level Authorisation flags submitted by the IA on the eEvidence
   *  envelope. Today only `delayInformingUser` is modelled, but the
   *  block exists so future ETSI AuthorisationFlags can be added without
   *  re-shaping FormData. */
  eevidenceAuthorisationFlags?: EEvidenceAuthorisationFlags;
  /** Related DARS cases the IA cross-referenced. Read-only summary cards
   *  rendered below the Case Identification card's flat
   *  `relatedCaseNumbers` text input. */
  eevidenceRelatedCases?: EEvidenceRelatedCase[];
  /** Free-text rationale required when `natureOfCrimes` includes the ETSI
   *  "Other" value on an eEvidence case. Renders inline below the chip
   *  picker when applicable. */
  eevidenceAuthorisationTypeOfCaseOtherDescription?: string;
  /** EU eEvidence Grounds for Refusal — the Enforcing Authority's legal
   *  veto block under Reg 2023/1543 Art. 8 + 10(2). Drives the GFR
   *  Panel at the top of Case Overview, queue-card badges, the SLA
   *  pause when active, and delivery gates in CollectionTracker.
   *  Distinct from EPOC Form 3 (Microsoft's own non-execution
   *  response) — GFR is an EA decision; Microsoft is a passive
   *  recipient. Optional — only present on eEvidence cases that have
   *  been notified to an EA. */
  eevidenceGroundsForRefusal?: EEvidenceGroundsForRefusal;

  /** 45-day post-resolution retention clock (Reg 2023/1543). Started by:
   *  IA EndPreservation callback, Full GFR rejection, Form 3 non-execution
   *  submission, IA withdrawal, or delivery + case close — any path that
   *  finalises the case and opens the data-deletion window. Drives the
   *  RetentionClockChip in the sticky header and the auto-close affordance
   *  once the window expires. Absent on cases that have not yet reached a
   *  terminal state. */
  retentionClock?: RetentionClock;

  /** DARS Phase 2 Appendix F workflow type. Determines whether the
   *  GFR Panel renders (only Workflows 2, 5-international, 6) and
   *  drives several other workflow-specific behaviours. Optional —
   *  legacy seeds may not carry this; treated as "unknown / no panel"
   *  when absent. */
  eevidenceWorkflow?: EEvidenceWorkflow;
  /** True when the issuing and executing authorities are in different
   *  EU member states (triggers the EA-review leg for Workflow 2 / 5). */
  isInternational?: boolean;

  dateDue?: string;          // ISO 8601 — computed or manually set due date
  deadlineType?: "Statutory" | "Internal" | "Court-Ordered" | "None";
  hasFinancialPenalty?: boolean;
  penaltyAmount?: number;
  currentBlockers?: string[];
  triageCompletedDate?: string;
  triageCompletedBy?: string;

  shieldLawConfirmation: string;
  eu27DsaHarms: string[];
  eu27DsaHarmsSubCategories: string[];
  
  // Authorization Details
  authorizationStartDate: Date | undefined;
  authorizationExpirationDate: Date | undefined;
  authorizationDesiredStatus: string;
  // ── LE-driven authorization status updates (Phase 5c.3) ──────────────
  /** Timestamp + actor of the latest LE-driven update to
   *  `authorizationDesiredStatus`. When the status is "Cancelled" /
   *  "Withdrawn" and these fields are set, the wizard surfaces the
   *  case-level banner. */
  authorizationStatusUpdatedAt?: Date;
  authorizationStatusUpdatedBy?: string;
  /** Set once the RS has acknowledged a Cancelled / Withdrawn case-level
   *  authorization. Flips the wizard into read-only mode and cascades
   *  taskStatus to every identifier. */
  authorizationStatusAcknowledgedAt?: Date;
  authorizationStatusAcknowledgedBy?: string;

  // ── Account-existence check audit trail ─────────────────────────────
  /** When the most recent case-level Check Accounts run completed.
   *  Stamped by `checkAccountsForIdentifiers` so the Account Identifiers
   *  section can show a "Checked … by …" line and flip the button label
   *  from `Check accounts` → `Re-check accounts`. Per-identifier status
   *  still lives on `AccountIdentifier.accountExistenceStatus`; this is
   *  the case-wide audit line. */
  accountsCheckedAt?: Date;
  accountsCheckedBy?: string;

  // ── Case Resolution (Phase 5c.5) ─────────────────────────────────────
  /** Structured reason captured when the RS resolves a case. Drives the
   *  target `caseStage` via RESOLUTION_REASON_META. */
  resolutionReason?: ResolutionReason;
  /** Free-text notes accompanying resolution. */
  resolutionNotes?: string;
  caseResolvedAt?: Date;
  caseResolvedBy?: string;
  /** Audit trail of prior resolutions on this case. Populated when the RS
   *  edits the resolution or re-opens a closed case. Newest entries first. */
  resolutionHistory?: ResolutionHistoryEntry[];

  // ── Attorney Escalation (May 2026) ───────────────────────────────────
  /**
   * @deprecated Prefer `AccountIdentifier.attorneyEscalation` for new
   *   reads / writes via `getActiveAttorneyEscalation(c)` and the
   *   unified `applyAttorneyAction` / `createAttorneyEscalation` helpers
   *   in `utils/caseEscalation.ts`. The case-level field is kept as a
   *   back-compat mirror for scope=all writes (hybrid storage rule)
   *   and as a read fallback for seeds that haven't migrated. Will be
   *   removed in a follow-up cleanup once per-identifier seeds are the
   *   single source of truth.
   *
   *   Live escalation state. Present from the moment a Specialist
   *   escalates until any terminal action that clears it (only Release +
   *   Approve-With-Conditions terminate the escalation; the others keep
   *   it live so the audit chip stays visible).
   */
  attorneyEscalation?: AttorneyEscalation;
  /** Append-only audit log of escalation events for this case. Survives
   *  even when `attorneyEscalation` is later reset by a new escalation. */
  escalationAuditEvents?: EscalationAuditEvent[];

  // Approval Details
  approvalType: string;
  approvalDescription: string;
  approvalReferenceNumber: string;
  approverName: string;
  approverRole: string;
  approvalTimestamp: Date | undefined;
  approvalIsEmergency: boolean;
  approverAlternateName?: string;
  approverEmail?: string;
  approverPhoneNumber?: string;
  
  // User Notification
  ndoAttached: string;
  notificationAllowed: string;
  // ── Legacy single-record fields (pre-multi-identifier) ────────────────
  // Kept on the type so demo seed data and any downstream consumers that
  // expect a single record still work. The NotificationWorkflowTab now
  // renders one card per Consumer identifier and persists into
  // `userNotifications` keyed by identifier ID; when that map is empty
  // and exactly one Consumer identifier exists, the tab seeds the new
  // record from these legacy fields so no demo data is lost on first
  // render. New cases (or cases with >1 Consumer identifier) should
  // write through `userNotifications` exclusively.
  dateOfLeNotification: Date | undefined;
  leResponseDueDate: Date | undefined;
  leResponseReceived: string;
  dateOfLeResponse: Date | undefined;
  dateOfUserNotification: Date | undefined;
  userResponseDueDate: Date | undefined;
  userResponseReceived: string;
  dateOfUserResponse: Date | undefined;
  // ── Per-identifier User Notification records ──────────────────────────
  /** Each Consumer identifier gets its own notification record so cases
   *  with multiple targets can track distinct LE + User notification
   *  cadences. Keyed by `AccountIdentifier.id`. */
  userNotifications?: Record<string, UserNotificationRecord>;

  // ── Controller Notification (Enterprise) ─────────────────────────────
  /** Date the Response Specialist sent the controller notification
   *  email to the tenant admin captured during Check Accounts. */
  dateOfControllerNotification?: Date | undefined;
  /** Deadline by which the controller is expected to respond. */
  controllerResponseDueDate?: Date | undefined;
  /** Controller's response disposition. Mirrors the LE / User response
   *  fields but with Enterprise-controller-specific options. */
  controllerResponseReceived?: string;
  /** Date the controller's response was received. */
  dateOfControllerResponse?: Date | undefined;
  /** Rich-text notes captured about the controller's response. Stored
   *  as HTML so the shared NoteFieldEditor can round-trip formatting. */
  controllerResponseNotes?: string;
  /** Files attached alongside the controller-response notes via the
   *  NoteFieldEditor. */
  controllerResponseNotesAttachments?: Attachment[];
  
  // Data Specification
  identifiers: AccountIdentifier[];
  nonDisclosureOrders: NonDisclosureOrder[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  timeZone: string;
  
  // Case Notes
  notes: CaseNote[];

  // ── Phase 1: Production Letters & Forms ──
  /** Per-case authored form instances (Draft / Signed). Templates and engine
   *  live in `src/config/formTemplates.ts` + `src/components/forms-library/`. */
  formInstances?: import("./formTemplate").CaseFormInstance[];

  // ── Correspondence (Phase 2) ────────────────────────────────────────
  /** Bidirectional communication log for this case. Outbound items are
   *  letters/forms the RS sends to the issuing/enforcing authority;
   *  inbound items are responses, acknowledgements, withdrawal/amendment
   *  notices, and structured forms received from the authority. */
  correspondence?: import("./correspondence").CorrespondenceItem[];
}