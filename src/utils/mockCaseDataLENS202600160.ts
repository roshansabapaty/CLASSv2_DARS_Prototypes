/**
 * Mock case data for LNS-2026-00160 — UK COPO Order demo.
 *
 * Single-identifier scenario specifically built to showcase the external →
 * internal LENS service mapping flow. The LE submission carries the
 * **LE-facing service names** (UK COPO terminology: "Email", "Microsoft
 * Account Profile", "Teams", "OneDrive") via `leExternalServices` /
 * `leExternalServiceDates`. No internal LENS service key is pre-enabled on
 * the identifier — the resolver in `utils/resolveExternalServices.ts` does
 * that mapping at Step 2 mount time, surfacing the names the RS must review
 * and confirm/replace/reject.
 *
 *   Identifier: subject-uk@outlook.com (Consumer email)
 *   LE services: ["Email", "Microsoft Account Profile", "Teams", "OneDrive"]
 *     → all four resolve cleanly for a Consumer identifier, but the RS
 *       still sees the LE-facing names first and has to confirm the mapping.
 */

import type {
  AccountIdentifier,
  CaseLegalContext,
  DisclosureConstraints,
  FormData,
} from "../types/caseTypes";
import { createDefaultIdentifierServices } from "../config/lensServicesConfig";
import { computeSlaDueDate } from "../constants/slaConstants";

const genId = () =>
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const genIdentifierTaskId = () =>
  `LDID-${Math.floor(Math.random() * 900_000) + 100_000}`;

export function buildLENS202600160FormData(): FormData {
  const createDate = new Date("2026-04-28");
  const dueDate = computeSlaDueDate("Routine", createDate, createDate);
  const startDate = new Date("2026-01-01");
  const endDate = new Date("2026-04-28");
  const leDateRange = { start: "2026-01-01", end: "2026-04-28" };

  // ── Structured legal context — UK / National / Metropolitan Police ────
  const unitedKingdom = {
    countryCode: "GB",
    countryName: "United Kingdom",
    region: "ROW" as const, // UK is non-EU; matches existing convention
  };
  const jurisdiction = {
    country: unitedKingdom,
    jurisdictionLevel: "National",
    jurisdictionName: "England and Wales",
  };
  const issuingAuthority = {
    id: "AGY-UK-MET-CYBER",
    name: "Metropolitan Police — Cybercrime Unit",
    shortName: "Met Cyber",
    aliases: ["MPS Cybercrime", "Scotland Yard Cybercrime"],
    country: unitedKingdom,
    agencyType: "LawEnforcement" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@met.police.uk",
  };
  const legalContext: CaseLegalContext = {
    country: unitedKingdom,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-UK-MET-002",
          name: "DC Helena Brooks",
          title: "Detective Constable",
          email: "h.brooks@met.police.uk",
          phone: "+44 20 7946 0001",
          role: "Submitter",
          languages: "en - English",
          source: "agency",
        },
        notes: "UK COPO submission — Cybercrime Unit primary issuing authority.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: false,
  };

  // ── Identifier 1: Consumer email — sole target identifier ────────────
  // Note: services is initialised via createDefaultIdentifierServices() with
  // no internal keys pre-enabled. The LE-facing names below are the source
  // of truth; the resolver maps them to internal LENS keys at Step 2 mount.
  const id1: AccountIdentifier = {
    id: genId(),
    value: "subject-uk@outlook.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    // Phase 1 merge — identifier-level AttorneyReview. CSE-exempt
    // disclosure path: attorney must confirm the exempt classification
    // before any production. Coupled with the cseExemptDisclosure
    // block below — the DisclosureSection should render the purple
    // "Exempt: Child Sexual Exploitation" chip on this identifier's
    // expanded review panel.
    taskStatus: "AttorneyReview",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices("COPO Order"),
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: ["Email", "Microsoft Account Profile", "Teams", "OneDrive"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
      Teams: leDateRange,
      OneDrive: leDateRange,
    },
    // UK COPO seed: LE has marked this task Active (default authorization
    // task status when the order arrives). Demo cases can override this
    // to Cancelled / Suspended / Completed to test downstream surfaces.
    authorizationDesiredTaskStatus: "Active",
    authorizationDesiredTaskStatusUpdatedAt: createDate,
    authorizationDesiredTaskStatusUpdatedBy: "UK Met Police — Cyber",
    attorneyEscalation: {
      role: "Attorney",
      assignedAttorneyId: "ATT-001",
      reason:
        "CSE-exempt case — Microsoft policy mandates non-disclosure for " +
        "Child Sexual Exploitation cases regardless of order language. " +
        "Attorney must confirm the exempt classification + sign off on the " +
        "policy-based notification posture before any data production.",
      escalatedAt: new Date("2026-05-05T09:00:00"),
      escalatedBy: "Nicole Garcia",
      status: "Pending",
      scope: "some",
      actions: [],
    },
  } as any;

  // CSE-exempt demo overlay (Phase 2 of the prototype-to-prod merge).
  // Microsoft policy mandates non-disclosure for child-exploitation cases
  // *regardless of order language* — even when LE didn't attach an NDO.
  // This case carries no NDO but disclosure remains Prohibited via the
  // "Exempt category" source, surfaced in DisclosureSection as a purple
  // chip distinct from order-level NDOs.
  const cseExemptDisclosure: DisclosureConstraints = {
    controllerNotification: "Prohibited",
    controllerNotificationNote:
      "Consumer account — no controller. Field reserved for completeness.",
    userNotification: "Prohibited",
    userNotificationNote:
      "Microsoft policy mandates non-disclosure for CSE / CSAM cases regardless of order language. Violation jeopardises the safety of victims and the integrity of the investigation.",
    source: "Exempt category",
    exemptCategory: "Child Sexual Exploitation",
  };

  return {
    caseId: "LNS-2026-00160",
    createDate,
    assigneeName: "Nicole Garcia",
    requestType: "COPO Order",
    requestSubType: "",
    requestOrigin: "LE Portal",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "Waiting on Triage",
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    // Legacy flat fields (kept for back-compat with components that still
    // read them; structured `legalContext` above is the preferred source).
    country: unitedKingdom.countryName,
    agencyCountryCode: unitedKingdom.countryCode,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+44 20 7946 0000",
    agencyAddress: {
      number: "10 Broadway",
      city: "London",
      stateProvince: "",
      postalCode: "SW1H 0BG",
    },
    legalContext,
    natureOfCrimes: ["Fraud"],
    mlat: false,
    additionalCaseInformation:
      "UK COPO Order issued by the Metropolitan Police Cybercrime Unit under the Investigatory Powers Act 2016. " +
      "Single-identifier demo for the LE-external → internal LENS service mapping flow. " +
      "Services arrive as LE-facing names (Email, Microsoft Account Profile, Teams, OneDrive) and the RS confirms the mapping on Step 2.",
    // LENS case number — same canonical value as `caseId`. The Met
    // Police's reference lives in `agencyCaseNumber` below.
    caseNumber: "LNS-2026-00160",
    agencyCaseNumber: "MET-LDN-2026-FR-0160",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-04-28",
    dateReceived: "2026-04-28",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-uk1`,
        name: "DC Helena Brooks",
        title: "Detective Constable",
        email: "h.brooks@met.police.uk",
        phone: "+44 20 7946 0001",
        role: "Submitter",
        languages: "en - English",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-07-28"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "UK COPO production order under the Investigatory Powers Act 2016. Authorises collection of subscriber, traffic, and content data for the identified Microsoft account.",
    approvalReferenceNumber: "PO-MET-2026-0160",
    approverName: "District Judge Margaret Hollis",
    approverRole: "District Judge (Magistrates' Courts)",
    approvalTimestamp: new Date("2026-04-28T09:30:00"),
    approvalIsEmergency: false,
    approverAlternateName: "DJ M. Hollis",
    approverEmail: "westminster.mc@justice.gov.uk",
    approverPhoneNumber: "+44 20 7805 1000",
    ndoAttached: "",
    notificationAllowed: "",
    dateOfLeNotification: undefined,
    leResponseDueDate: undefined,
    leResponseReceived: "",
    dateOfLeResponse: undefined,
    dateOfUserNotification: undefined,
    userResponseDueDate: undefined,
    userResponseReceived: "",
    dateOfUserResponse: undefined,
    identifiers: [id1],
    nonDisclosureOrders: [],
    startDate,
    endDate,
    timeZone: "Europe/London (GMT/BST)",
    notes: [
      {
        id: `note-${Date.now().toString(36)}-uk1`,
        content:
          "UK COPO single-identifier demo. The LE submission lists services using LE-facing names — RS will see " +
          "\"Email\", \"Microsoft Account Profile\", \"Teams\", \"OneDrive\" on Step 2 and the resolver will map " +
          "each to its internal LENS service key for this Consumer identifier.",
        createdBy: "Nicole Garcia",
        createdAt: createDate,
      },
    ],

    // Attorney review surface — Phase 2 of the prototype-to-prod merge.
    disclosureConstraints: cseExemptDisclosure,
  };
}
