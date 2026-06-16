/**
 * Case Queue — Shared types, constants, mock data, and helper functions.
 *
 * Extracted from CaseQueue.tsx to keep individual component files
 * well under Babel's parse-size limits.
 */

import {
  AlertTriangle,
  AlertCircle,
  FileText,
  Mail,
  MessageSquare,
  Cloud,
  HardDrive,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CURRENT_USER = "Nicole Garcia";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CaseQueueItem {
  caseId: string;
  createDate: string;
  caseType: string;
  assigneeName: string;
  requestType: string;
  /** Sub-type within the request type. For eEvidence cases this is the
   *  EPOC flavour (`"None"` | `"EPOC ER"` | `"EPOC PR"` | `"EPOC PR Extension"`).
   *  Surfaced on the case list as `requestType / requestSubType` so the
   *  RS can spot EPOC-PR preservation cases at a glance without opening
   *  them. Optional — cases without a meaningful sub-type omit it. */
  requestSubType?: string;
  requestOrigin?: string;
  caseStage: string;
  country: string;
  jurisdiction: string;
  natureOfCrime: string[];
  isThreatToLife: boolean;
  casePriority: "Emergency" | "Urgent" | "Expedite" | "Standard" | "Routine";
  dueDate: string;
  hasEnterpriseAccounts?: boolean;
  hasAzureAccounts?: boolean;
  accountExistenceChecked?: boolean;
  azureAddedBy?: "LE_CONTACT" | string;
  escalatedToLE?: boolean;
  /** Phase: M365 left-rail Attorney Dashboard. When true, the case has been
   *  flagged by the RS / TS for direct attorney review or action and shows
   *  up on the Attorney Dashboard. Independent of `escalatedToLE` which
   *  marks LE-side escalation. */
  assignedToLawyer?: boolean;
  identifierCount: number;
  identifierTypes: Record<string, number>;
  servicesRequested: string[];
  /** When set, indicates the sending authority has updated the authorization desired status (e.g., "Cancelled") */
  authorizationDesiredStatus?: string;
  /** Next upcoming NDO check-in reminder on this case. Sourced from
   *  `NonDisclosureOrder.reminderDateTime` on the case's temporary NDOs;
   *  surfaced as the dedicated **NDO Reminder** column + the
   *  `ndo-reminder` operational badge so the RS can see at a glance
   *  which cases need a re-check on a temporary NDO. ISO date string
   *  (`YYYY-MM-DD`) or omitted when no active reminder exists. */
  nextNdoReminderAt?: string;
}

export interface PriorityConfig {
  label: string;
  level: string;
  color: string;
  badge: string;
  icon: typeof AlertCircle | typeof AlertTriangle | typeof FileText;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

export const MOCK_CASES: CaseQueueItem[] = [
  // ── Multi-tenant TPID demo — USAO SDNY subpoena spanning Contoso US +
  //    Contoso France (both child tenants of TPID-CONTOSO / Contoso
  //    Holdings). Demonstrates the EscalateToAttorneyDialog scope picker
  //    surfacing tenant + tpid variants. See utils/mockCaseDataLENS202600300.ts.
  {
    caseId: "LNS-2026-00300",
    createDate: "May 18, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Nicole Garcia",
    requestType: "Subpoena",
    requestOrigin: "LE Portal",
    caseStage: "Waiting on Triage",
    country: "United States",
    jurisdiction: "Federal",
    natureOfCrime: ["OtherFinancialCrimeOrFraud"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "Jun 17, 2026",
    hasEnterpriseAccounts: true,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    assignedToLawyer: true,
    identifierCount: 2,
    identifierTypes: { email: 2 },
    servicesRequested: ["Email", "Microsoft Account Profile", "Teams"],
  },
  // ── Swedish eEvidence — Mixed Manual + Automated Job Categories demo ───
  // Single Consumer identifier across four Microsoft Consumer services
  // (MSA Profile, Exchange Consumer, OneDrive Consumer, Teams for Life).
  // Ten pre-seeded jobs: 5 automated + 5 manual, spanning Not Started →
  // In Progress → Complete → DeliveryAcknowledged. Drives the
  // CollectionTracker's Manual vs Automated breakdown demo. See
  // utils/mockCaseDataLENS202600270.ts.
  {
    caseId: "LNS-2026-00270",
    createDate: "May 15, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "Sweden",
    jurisdiction: "National",
    natureOfCrime: ["Cybercrime", "OtherFinancialCrimeOrFraud"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 25, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: [
      "Email",
      "Microsoft Account Profile",
      "OneDrive",
      "Teams",
    ],
  },
  // ── Portuguese eEvidence — Workflow 8 IA Withdrawal demo ──────────────
  // EPOC-ER withdrawn mid-collection. On case open, the Withdrawal
  // handler cancels pending delivery jobs, starts the 45-day retention
  // clock, flips caseStage to "Withdrawn", and appends EpocWithdrawn
  // audit. See utils/mockCaseDataLENS202600280.ts.
  {
    caseId: "LNS-2026-00280",
    createDate: "May 12, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    caseStage: "In Progress", // Handler flips to "Withdrawn" on case open.
    country: "Portugal",
    jurisdiction: "National",
    natureOfCrime: ["OtherFinancialCrimeOrFraud"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 22, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile"],
  },
  // ── Greek eEvidence — Form3Response-None-EaOverrulesSp (2 → 7 → 6) ────
  // SP submitted a Form 3 (ConflictWithThirdCountryLaw); EA reviewed it
  // and rejected the SP's claim via the second trigger path per ETSI
  // 5.5.1. Demonstrates the orange "EA rejected your Form 3" panel +
  // Retract-Form-3 CTA. See utils/mockCaseDataLENS202600265.ts.
  {
    caseId: "LNS-2026-00265",
    createDate: "May 5, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "Greece",
    jurisdiction: "National",
    natureOfCrime: ["OtherFinancialCrimeOrFraud", "Cybercrime"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 15, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile"],
  },
  // ── Italian eEvidence — Workflow 2 active EA review window ────────────
  // Cross-border production order; EA is actively reviewing Form 1 with
  // 5 days remaining in the 10-day window. Demonstrates the "EA REVIEW
  // WINDOW" chip + countdown panel + visibly disabled Submit-to-Delivery
  // button on the Collection page. See utils/mockCaseDataLENS202600245.ts.
  {
    caseId: "LNS-2026-00245",
    createDate: "May 22, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "Italy",
    jurisdiction: "National",
    natureOfCrime: ["Fraud"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "Jun 1, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile"],
  },
  // ── French eEvidence — Workflow 2 EA review window lapsed ─────────────
  // Cross-border production order; 10-day EA review window passed with no
  // EA decision. Auto-detection hook fires EaWindowExpired on case open;
  // GFR Panel shows the green "delivery is now permitted" card with the
  // Resume Delivery CTA. See utils/mockCaseDataLENS202600247.ts.
  {
    caseId: "LNS-2026-00247",
    createDate: "May 15, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "France",
    jurisdiction: "National",
    natureOfCrime: ["Cybercrime", "OtherFinancialCrimeOrFraud"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 25, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile"],
  },
  // ── Belgian eEvidence — Form1-None-EaClears (Workflow chain 2 → 6) ────
  // Cross-border production order; EA reviewed Form 1 and issued explicit
  // No Grounds for Refusal. Demonstrates the green "EA cleared" panel +
  // audit `GfrCleared`. See utils/mockCaseDataLENS202600255.ts.
  {
    caseId: "LNS-2026-00255",
    createDate: "May 8, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "Belgium",
    jurisdiction: "National",
    natureOfCrime: ["Cybercrime"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 18, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile"],
  },
  // ── Polish eEvidence — Form1-Partial-EaBlocksOneTask (2 → 6) ──────────
  // Cross-border production order; EA reviewed Form 1 and issued Partial
  // GFR scoped to one LDTask (a journalist identifier). Demonstrates the
  // amber Partial panel + per-identifier cascade in CollectionTracker
  // (Phase D). See utils/mockCaseDataLENS202600250.ts.
  {
    caseId: "LNS-2026-00250",
    createDate: "May 10, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "Poland",
    jurisdiction: "National",
    natureOfCrime: ["OtherFinancialCrimeOrFraud", "Cybercrime"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 20, 2026",
    hasEnterpriseAccounts: true,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 3,
    identifierTypes: { email: 2, phone: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile", "OneDrive"],
  },
  // ── Italian eEvidence — Form1-Full-EaBlocks (Workflow chain 2 → 6) ────
  // Cross-border production order; EA in receiving state has issued Full
  // Grounds for Refusal citing parliamentary immunity (Art. 12(1)(a)).
  // Demonstrates the GFR Panel red HOLD branch + case SLA pause + audit
  // `GfrReceived`. See utils/mockCaseDataLENS202600240.ts.
  {
    caseId: "LNS-2026-00240",
    createDate: "May 12, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "Italy",
    jurisdiction: "National",
    natureOfCrime: ["OtherFinancialCrimeOrFraud", "Corruption"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 22, 2026",
    hasEnterpriseAccounts: true,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile"],
  },
  // ── Dutch eEvidence production order — follow-on to EPOC-PR ───────────
  // Production order (EPOC-ER) issued against the data preserved under
  // LNS-2026-00220. Linked back via `eevidenceRelatedCases` on both
  // cases. The IA signalled intent via a Form 5 inbound on the parent.
  {
    caseId: "LNS-2026-00230",
    createDate: "May 14, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: CURRENT_USER,
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    // Subsequent Production (Workflow 5) — opens on Collection with the
    // preserved jobs from LNS-2026-00220 seeded (+ new jobs to collect).
    // Triage -> Fulfillment routing with wizard reuse-rows is pending Phase 4b.
    caseStage: "In Progress",
    country: "Netherlands",
    jurisdiction: "National",
    natureOfCrime: ["OtherFinancialCrimeOrFraud", "Cybercrime"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 24, 2026",
    hasEnterpriseAccounts: true,
    hasAzureAccounts: false,
    accountExistenceChecked: false,
    identifierCount: 2,
    identifierTypes: { email: 2 },
    servicesRequested: ["Email", "Microsoft Account Profile", "OneDrive"],
  },
  // ── Spanish eEvidence — Workflow 4 Preservation Order Active ──────────
  // EPOC-PR just received (2 days ago). Form 2 inbound seeded; the
  // PreservationOrderActiveBanner + "Acknowledge Receipt" CTA renders
  // at the top of the Collection page. No extensions or terminal events
  // yet. See utils/mockCaseDataLENS202600215.ts.
  {
    caseId: "LNS-2026-00215",
    createDate: "May 25, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC PR",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "Spain",
    jurisdiction: "National",
    natureOfCrime: ["OtherFinancialCrimeOrFraud"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "Jun 4, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile"],
  },
  // ── Dutch eEvidence preservation demo — EPOC-PR (Collection only) ─────
  // Full lifecycle: Form 2 receipt → Form 5 (production-incoming) →
  // Form 6 (extension) → EndPreservation (terminal). See
  // utils/mockCaseDataLENS202600220.ts.
  {
    caseId: "LNS-2026-00220",
    createDate: "May 14, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: CURRENT_USER,
    requestType: "eEvidence",
    requestSubType: "EPOC PR",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "Netherlands",
    jurisdiction: "National",
    natureOfCrime: ["OtherFinancialCrimeOrFraud", "Cybercrime"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 24, 2026",
    hasEnterpriseAccounts: true,
    hasAzureAccounts: false,
    accountExistenceChecked: false,
    identifierCount: 2,
    identifierTypes: { email: 2 },
    servicesRequested: ["Email", "Microsoft Account Profile", "OneDrive"],
  },
  // ── Italian eEvidence demo — inverse manifest-error path ──────────────
  // IA submitted the EPOC with BOTH Section g Sub-section D Enterprise
  // checkboxes unselected, but Check Accounts returns Enterprise.
  // Validates the new `enterprise-detected` direction of the
  // ManifestErrorWarningBanner. See utils/mockCaseDataLENS202600210.ts.
  {
    caseId: "LNS-2026-00210",
    createDate: "May 14, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: CURRENT_USER,
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    caseStage: "Waiting on Triage",
    country: "Italy",
    jurisdiction: "National",
    natureOfCrime: ["OtherFinancialCrimeOrFraud", "Cybercrime"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 24, 2026",
    hasEnterpriseAccounts: true,
    hasAzureAccounts: false,
    accountExistenceChecked: false,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile"],
  },
  // ── French eEvidence demo — controller-notification path ──────────────
  // IA marked Section g Sub-section D Q2 = YES with
  // processorShallInformController = YES. Check Accounts returns
  // Enterprise; the case form surfaces a "notify the Controller" banner
  // with the tenant admin email. See utils/mockCaseDataLENS202600200.ts.
  {
    caseId: "LNS-2026-00200",
    createDate: "May 13, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: CURRENT_USER,
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    // Post-triage so the held outbound Form 3 (Attorney Escalation demo)
    // makes narrative sense from the queue.
    caseStage: "In Progress",
    country: "France",
    jurisdiction: "National",
    natureOfCrime: ["Cybercrime", "OtherFinancialCrimeOrFraud"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 23, 2026",
    hasEnterpriseAccounts: true,
    hasAzureAccounts: false,
    accountExistenceChecked: false,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile", "Teams"],
    nextNdoReminderAt: "2026-06-03",
  },
  // ── German eEvidence demo — Enterprise/Consumer manifest-error path ────
  // IA marked Section g Sub-section D Q2 = YES (processor-route
  // Enterprise claim), but Check Accounts returns Consumer. The case
  // form surfaces a manifest-error warning pointing the RS at Form 3.
  // See utils/mockCaseDataLENS202600190.ts.
  {
    caseId: "LNS-2026-00190",
    createDate: "May 12, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: CURRENT_USER,
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "Germany",
    jurisdiction: "Federal",
    natureOfCrime: ["OtherFinancialCrimeOrFraud", "Cybercrime"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 22, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: false,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile"],
  },
  // ── Spanish eEvidence demo — IA = Other Competent Authority ───────────
  // Exercises the conditional Validating Authority subsection on the
  // Authorization Details card. See utils/mockCaseDataLENS202600180.ts.
  {
    caseId: "LNS-2026-00180",
    createDate: "May 10, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: CURRENT_USER,
    requestType: "eEvidence",
    requestSubType: "EPOC",
    requestOrigin: "LEAPI",
    caseStage: "Waiting on Triage",
    country: "Spain",
    jurisdiction: "National",
    natureOfCrime: ["Cybercrime"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 20, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: false,
    assignedToLawyer: true,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile"],
  },
  // ── Walkthrough test case — UK COPO end-to-end demo ───────────────────
  // Designed to rehearse Triage → Review → Collection without the special
  // edge-cases (emergency / EU eEvidence / LE-name resolver) baked into the
  // other "Waiting on Triage" mocks. See utils/mockCaseDataLENS202600170.ts.
  {
    caseId: "LNS-2026-00170",
    createDate: "May 12, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: CURRENT_USER,
    requestType: "COPO Order",
    requestOrigin: "LE Portal",
    caseStage: "Waiting on Triage",
    country: "United Kingdom",
    jurisdiction: "National",
    natureOfCrime: ["Fraud"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 22, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: false,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile"],
  },
  {
    caseId: "LNS-2025-00142",
    createDate: "Jan 19, 2025",
    caseType: "Law Enforcement Request",
    assigneeName: "",
    requestType: "Emergency Request",
    requestOrigin: "LE Portal",
    caseStage: "Waiting on Triage",
    country: "United States",
    jurisdiction: "Federal",
    natureOfCrime: ["Threat to Life", "Kidnapping"],
    isThreatToLife: true,
    casePriority: "Emergency",
    dueDate: "Jan 19, 2025 12:00 PM",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: false,
    identifierCount: 3,
    identifierTypes: {
      email: 1,
      phone: 1,
      address: 1,
    },
    servicesRequested: ["Outlook", "Teams", "Azure"],
  },
  {
    caseId: "LNS-2025-00125",
    createDate: "Jan 15, 2025",
    caseType: "Law Enforcement Request",
    assigneeName: "Michael Chen",
    requestType: "Preservation Request",
    requestOrigin: "Email forward",
    caseStage: "In Review",
    country: "United Kingdom",
    jurisdiction: "National",
    natureOfCrime: ["Fraud", "Identity Theft"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "Jan 25, 2025",
    hasEnterpriseAccounts: true,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    assignedToLawyer: true,
    identifierCount: 1,
    identifierTypes: {
      email: 1,
    },
    servicesRequested: ["Outlook"],
    nextNdoReminderAt: "2026-06-10",
  },
  {
    caseId: "LNS-2025-00103",
    createDate: "Jan 10, 2025",
    caseType: "Law Enforcement Request",
    assigneeName: CURRENT_USER,
    requestType: "Search Warrant",
    requestOrigin: "Mail/Letter",
    caseStage: "No Data Provided",
    country: "Australia",
    jurisdiction: "State",
    natureOfCrime: ["Drug Trafficking", "Organized Crime"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "Jan 20, 2025",
    hasEnterpriseAccounts: true,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 2,
    identifierTypes: {
      email: 1,
      phone: 1,
    },
    servicesRequested: ["Outlook", "Teams"],
  },
  {
    caseId: "LNS-2025-00095",
    createDate: "Jan 8, 2025",
    caseType: "Law Enforcement Request",
    assigneeName: "Sarah Johnson",
    requestType: "Subpoena",
    requestOrigin: "Email forward",
    caseStage: "Resolved",
    country: "United States",
    jurisdiction: "State",
    natureOfCrime: ["Cyberstalking", "Harassment"],
    isThreatToLife: false,
    casePriority: "Urgent",
    dueDate: "Jan 8, 2025 12:00 PM",
    hasEnterpriseAccounts: true,
    hasAzureAccounts: true,
    accountExistenceChecked: true,
    identifierCount: 4,
    identifierTypes: {
      email: 2,
      phone: 1,
      address: 1,
    },
    servicesRequested: ["Outlook", "Teams", "Azure"],
  },
  {
    caseId: "LNS-2026-984174",
    createDate: "Jan 5, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: CURRENT_USER,
    requestType: "Subpoena",
    requestOrigin: "Email forward",
    caseStage: "Rejected",
    country: "United States",
    jurisdiction: "State",
    natureOfCrime: ["Civil Matter"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "Jan 15, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 1,
    identifierTypes: {
      email: 1,
    },
    servicesRequested: ["Outlook"],
  },
  {
    caseId: "LNS-2025-00147",
    createDate: "Jan 20, 2025",
    caseType: "Law Enforcement Request",
    assigneeName: CURRENT_USER,
    requestType: "Subpoena",
    requestOrigin: "LE Portal",
    caseStage: "Cancelled",
    country: "France",
    jurisdiction: "National",
    natureOfCrime: ["Fraud", "Money Laundering"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "Jan 30, 2025",
    hasEnterpriseAccounts: true,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 3,
    identifierTypes: {
      email: 2,
      phone: 1,
    },
    servicesRequested: ["Outlook", "Teams"],
  },
  // UK COPO Order demo — single-identifier case to showcase LE-external →
  // internal LENS service mapping. Services arrive as LE-facing names
  // (Email, Microsoft Account Profile, Teams, OneDrive) which the RS
  // resolver maps to internal keys at Step 2.
  {
    caseId: "LNS-2026-00160",
    createDate: "Apr 28, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: CURRENT_USER,
    requestType: "COPO Order",
    requestOrigin: "LE Portal",
    caseStage: "Waiting on Triage",
    country: "United Kingdom",
    jurisdiction: "National",
    natureOfCrime: ["Fraud"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 8, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: false,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile", "Teams", "OneDrive"],
  },
  // ── Irish eEvidence — Workflow 1 Standard Production National ─────────
  // IA + SP both in Ireland; no EA review leg. Full Collection → Package
  // → Delivery pipeline, Routine 10-day SLA. The default eEvidence happy
  // path. See utils/mockCaseDataLENS202600130.ts.
  {
    caseId: "LNS-2026-00130",
    createDate: "May 26, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "Ireland",
    jurisdiction: "National",
    natureOfCrime: ["Cybercrime"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "Jun 5, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile"],
  },
  // ── German eEvidence — Workflow 3 Emergency Production (8h SLA) ───────
  // BKA-issued emergency EPOC-ER for an active kidnapping case. Triggers
  // Reg 2023/1543 Art. 9(2) 8-hour SLA window via the SlaContext shim.
  // EmergencyEEvidenceBanner renders at top of CollectionTracker. See
  // utils/mockCaseDataLENS202600140.ts.
  {
    caseId: "LNS-2026-00140",
    createDate: "Jun 1, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "Germany",
    jurisdiction: "Federal",
    natureOfCrime: ["Kidnapping", "Cybercrime"],
    isThreatToLife: true,
    casePriority: "Emergency",
    dueDate: "Jun 1, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email", "Microsoft Account Profile"],
  },
  // EU eEvidence demo case — exercises the Phase 1 Forms & Letters happy path
  // for EPOC Form 3 (Non-Execution Response). Defaults to requestSubType
  // "None" per the eEvidence allow-list.
  {
    caseId: "LNS-2026-00150",
    createDate: "Apr 22, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: CURRENT_USER,
    requestType: "eEvidence",
    requestSubType: "EPOC",
    requestOrigin: "LEAPI",
    caseStage: "Waiting on Triage",
    country: "Germany",
    jurisdiction: "National",
    natureOfCrime: ["Fraud", "Money Laundering"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "May 2, 2026",
    hasEnterpriseAccounts: true,
    hasAzureAccounts: false,
    accountExistenceChecked: false,
    assignedToLawyer: true,
    identifierCount: 2,
    identifierTypes: { email: 2 },
    servicesRequested: ["Email", "Microsoft Account Profile", "Outlook", "Teams"],
  },
  // ── Romanian eEvidence — LE service mapping failure demo ─────────────
  // Three identifiers exercise every resolver failure mode that an
  // EU eEvidence Form 1 free-text Services field can produce:
  //   • Consumer + FastFax + YammerLite + Email → 2× unmapped-name
  //   • Consumer + SharePoint + Email          → 1× wrong-account-type
  //   • Enterprise + XBOX/Minecraft + Email    → 1× wrong-account-type
  // See utils/mockCaseDataLENS202600310.ts. Surfaces in the LEReviewPanel
  // (red unmappedChip Tag) and Step 1 validateIdentifier chips.
  {
    caseId: "LNS-2026-00310",
    createDate: "Jun 3, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    caseStage: "Waiting on Triage",
    country: "Romania",
    jurisdiction: "National",
    natureOfCrime: ["Cybercrime", "OtherFinancialCrimeOrFraud"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "Jun 13, 2026",
    hasEnterpriseAccounts: true,
    hasAzureAccounts: false,
    accountExistenceChecked: true,
    identifierCount: 3,
    identifierTypes: { email: 3 },
    servicesRequested: [
      "Email",
      "FastFax",
      "YammerLite",
      "SharePoint",
      "XBOX/Minecraft",
    ],
  },
  // ── TS-recommended rejection — civil-matter subpoena outside DARS
  //    legal scope. Triaged by Elena Ruiz, waiting on LENS Lead approval
  //    to finalize the rejection. Surfaces in the LENS Lead's
  //    "Recommend Rejection" filter so the queue oversight workflow has
  //    a target on demo. No FormData builder needed — the queue card
  //    renders entirely from this entry; opening it falls through to
  //    the generic factory in mockCaseDataFactory.ts.
  {
    caseId: "LNS-2026-00320",
    createDate: "Jun 4, 2026",
    caseType: "Law Enforcement Request",
    assigneeName: "Elena Ruiz",
    requestType: "Subpoena",
    requestOrigin: "Email forward",
    caseStage: "Recommend Rejection",
    country: "United States",
    jurisdiction: "State",
    natureOfCrime: ["OtherFinancialCrimeOrFraud"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "Jul 4, 2026",
    hasEnterpriseAccounts: false,
    hasAzureAccounts: false,
    accountExistenceChecked: false,
    identifierCount: 1,
    identifierTypes: { email: 1 },
    servicesRequested: ["Email"],
  },
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

const HIGH_PRIORITY_CRIMES = [
  "Threat to Life",
  "Child Safety",
  "Terrorism",
  "Human Trafficking",
  "Kidnapping",
  // ETSI camelCase equivalents (eEvidence cases store these on
  // FormData.natureOfCrimes; the queue's `natureOfCrime` field can carry
  // either format depending on the case's source schema).
  "HumanTrafficking",
  "TerrorismOrThreatToPublicSafety",
];

export function isHighPriorityCrime(crime: string): boolean {
  return HIGH_PRIORITY_CRIMES.includes(crime);
}

export function getPriorityConfig(
  priority: "Emergency" | "Urgent" | "Expedite" | "Standard" | "Routine"
): PriorityConfig {
  switch (priority) {
    case "Emergency":
      return {
        label: "Emergency - No Legal Demand",
        level: "P0",
        color: "border-l-red-500",
        badge: "bg-red-50 text-red-700 border-red-200",
        icon: AlertCircle,
      };
    case "Urgent":
      return {
        label: "Emergency - Legal Demand Attached",
        level: "P1",
        color: "border-l-orange-500",
        badge: "bg-orange-50 text-orange-700 border-orange-200",
        icon: AlertTriangle,
      };
    case "Expedite":
      return {
        label: "Expedite",
        level: "P2",
        color: "border-l-yellow-500",
        badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
        icon: AlertTriangle,
      };
    case "Standard":
      return {
        label: "Standard",
        level: "P3",
        color: "border-l-teal-500",
        badge: "bg-teal-50 text-teal-700 border-teal-200",
        icon: FileText,
      };
    case "Routine":
      return {
        label: "Routine",
        level: "P4",
        color: "border-l-blue-500",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        icon: FileText,
      };
  }
}

export function getNextAction(caseStage: string, assigneeName: string): string {
  if (!assigneeName) return "Start Triage";

  switch (caseStage) {
    case "Waiting on Triage":
      return "Begin Triage";
    case "In Progress":
      return "View Collection";
    case "Recommend Rejection":
      return "Review Rejection";
    case "Rejected":
      return "View Rejection";
    case "Triage Complete":
      return "Start Review";
    case "Cancelled":
      return "View Cancelled";
    case "In Review":
      return "Continue Review";
    case "No Data Provided":
      return "View Collection Results";
    case "Withdrawn":
      return "View Withdrawn";
    case "Resolved":
      return "View Completed Case";
    default:
      return "View Details";
  }
}

export function getWorkflowStageFromCaseStage(
  caseStage: string
): "triage" | "fulfillment" | "collection" {
  switch (caseStage) {
    case "Waiting on Triage":
    case "Recommend Rejection":
    case "Rejected":
    case "Triage Complete":
    case "Cancelled":
      return "triage";
    case "In Review":
      return "fulfillment";
    case "In Progress":
    case "No Data Provided":
    case "Withdrawn":
    case "Resolved":
      return "collection";
    default:
      return "triage";
  }
}

/**
 * Utility function to extract account existence flags from FormData
 */
export function getAccountExistenceFlags(identifiers: any[]): {
  hasEnterpriseAccounts: boolean;
  hasAzureAccounts: boolean;
} {
  let hasEnterpriseAccounts = false;
  let hasAzureAccounts = false;

  for (const identifier of identifiers) {
    if (
      identifier.services?.outlook?.accountExistence?.enterpriseExists ||
      identifier.services?.teams?.accountExistence?.enterpriseExists ||
      identifier.services?.azure?.accountExistence?.enterpriseExists
    ) {
      hasEnterpriseAccounts = true;
    }
    if (
      identifier.services?.azure?.accountExistence?.consumerExists ||
      identifier.services?.azure?.accountExistence?.enterpriseExists
    ) {
      hasAzureAccounts = true;
    }
    if (hasEnterpriseAccounts && hasAzureAccounts) break;
  }

  return { hasEnterpriseAccounts, hasAzureAccounts };
}

// Service icon map for operational badges
export const SERVICE_ICONS: Record<string, typeof Mail> = {
  Outlook: Mail,
  Teams: MessageSquare,
  Azure: Cloud,
  "OneDrive/SharePoint": HardDrive,
};