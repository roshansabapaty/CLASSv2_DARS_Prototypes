/**
 * Mock case data for LNS-2026-00150 — EU eEvidence demo.
 *
 * Purpose: verify the Phase 1 Forms & Letters happy path for EPOC Form 3.
 *  - requestType:   "eEvidence"
 *  - requestSubType: "EPOC"   (the LD default for eEvidence; user can switch to
 *                              "EPOC PR" / "EPOC ER")
 *  - country:       Germany   (EU region) — picks up EPOC Form 3 jurisdiction filter
 *  - legalContext:  Populated so the new structured jurisdiction model resolves
 *                    `legalContext.country.region === "EU"` for the template picker.
 *
 * Two Enterprise identifiers under the Kontoso GmbH tenant — both match
 * the IA's Section g Sub-section D Enterprise claim (Q1 + Q2 both YES),
 * so no manifest-error banner fires on this case. Used to exercise the
 * full-cascade Enterprise-happy-path demo across the wizard / collection
 * surfaces if the demo extends past Forms.
 */

import type {
  FormData,
  AccountIdentifier,
  CaseLegalContext,
  EnterpriseContext,
} from "../types/caseTypes";
import { createDefaultIdentifierServices } from "../config/lensServicesConfig";
import { computeSlaDueDate } from "../constants/slaConstants";
import { get as getCorrespondenceForCase } from "../state/correspondenceStore";
import { MOCK_ORGS } from "../data/mockOrgs";

const genId = () =>
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const genIdentifierTaskId = () =>
  `LDID-${Math.floor(Math.random() * 900_000) + 100_000}`;

export function buildLENS202600150FormData(): FormData {
  const createDate = new Date("2026-04-22");
  const dueDate = computeSlaDueDate("Routine", createDate);
  const startDate = new Date("2026-01-01");
  const endDate = new Date("2026-04-22");
  const leDateRange = { start: "2026-01-01", end: "2026-04-22" };

  // ── Structured legal context — drives template filtering by region ─────
  const germany = {
    countryCode: "DE",
    countryName: "Germany",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: germany,
    jurisdictionLevel: "National",
    jurisdictionName: "Frankfurt am Main",
  };
  const issuingAuthority = {
    id: "AGY-DE-FFM-PROSEC",
    name: "Public Prosecutor's Office of Frankfurt am Main",
    shortName: "StA Frankfurt",
    aliases: ["Staatsanwaltschaft Frankfurt am Main"],
    country: germany,
    agencyType: "Prosecutor" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@sta-frankfurt.justiz.hessen.de",
  };
  const legalContext: CaseLegalContext = {
    country: germany,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-DE-FFM-001",
          name: "Oberstaatsanwältin Anja Becker",
          title: "Senior Public Prosecutor",
          email: "a.becker@sta-frankfurt.justiz.hessen.de",
          phone: "+49 69 1367-2424",
          role: "Submitter",
          languages: "de - German, en - English",
          source: "agency",
        },
        notes: "Cybercrime division — primary issuing authority on the EPOC.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: false,
  };

  // ── Identifier 1: enterprise happy path — Kontoso GmbH employee ──────
  // Seeded Enterprise so `accountExistenceCheck` deterministically returns
  // Enterprise — matching the IA's Q1 + Q2 = YES Enterprise claim. No
  // manifest-error mismatch on this case.
  const id1: AccountIdentifier = {
    id: genId(),
    value: "cfo@kontoso-de.example",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    // Phase 1 merge — identifier-level AttorneyReview. Mirrors the
    // case-level escalation reason (scope=case): the attorney needs to
    // clear both Kontoso mailboxes together because the controller-
    // notification question applies uniformly.
    taskStatus: "AttorneyReview",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(),
    checkAccounts: { accountType: "Enterprise" },
    leExternalServices: ["Email", "Microsoft Account Profile"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
    },
    issuingAuthorityNotes:
      "Subject is a finance director at Kontoso GmbH; uses this account as " +
      "the primary contact for the fraud scheme described in the EPOC. " +
      "Please include any associated payment-instrument metadata (last-4 " +
      "digits, issuer country) if present on the account. Priority " +
      "handling requested under Art. 9(2).",
    // eEvidence seed: IA opened this task in Active status — the
    // default for new EPOC orders. IA can later push a Cancelled or
    // Suspended update via Form 3 / 4.
    authorizationDesiredTaskStatus: "Active",
    authorizationDesiredTaskStatusUpdatedAt: createDate,
    authorizationDesiredTaskStatusUpdatedBy: "Procura della Repubblica di Milano",
    attorneyEscalation: {
      role: "Attorney",
      assignedAttorneyId: "ATT-001",
      reason:
        "Enterprise mailbox under controller relationship — need attorney " +
        "review of content-data scope before disclosure. Processor-route " +
        "flags are set; verify the controller-notification posture.",
      escalatedAt: new Date("2026-04-23T10:15:00"),
      escalatedBy: "Nicole Garcia",
      status: "Pending",
      scope: "all",
      actions: [],
    },
  } as any;

  // ── Identifier 2: enterprise happy path ──────────────────────────────
  const id2: AccountIdentifier = {
    id: genId(),
    value: "ceo@kontoso-de.example",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    // Phase 1 merge — second identifier under the same case-level
    // attorney review (scope=case).
    taskStatus: "AttorneyReview",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(),
    checkAccounts: { accountType: "Enterprise" },
    issuingAuthorityNotes:
      "Enterprise mailbox associated with Kontoso GmbH. Note that the data " +
      "controller may be the enterprise customer rather than Microsoft; " +
      "verify the data-controller status before producing content data. " +
      "Subscriber + traffic data is in scope regardless.",
    attorneyEscalation: {
      role: "Attorney",
      assignedAttorneyId: "ATT-001",
      reason:
        "Enterprise mailbox under controller relationship — need attorney " +
        "review of content-data scope before disclosure. Processor-route " +
        "flags are set; verify the controller-notification posture.",
      escalatedAt: new Date("2026-04-23T10:15:00"),
      escalatedBy: "Nicole Garcia",
      status: "Pending",
      scope: "all",
      actions: [],
    },
    // eEvidence seed: IA has signalled this task should be Cancelled —
    // demonstrates the chip rendering the disruption-tier (red) state.
    authorizationDesiredTaskStatus: "Cancelled",
    authorizationDesiredTaskStatusUpdatedAt: createDate,
    authorizationDesiredTaskStatusUpdatedBy: "Procura della Repubblica di Milano",
    leExternalServices: ["Outlook", "Teams"],
    leExternalServiceDates: {
      Outlook: leDateRange,
      Teams: leDateRange,
    },
  } as any;

  // Phase 4 polish — Kontoso GmbH enterprise context so the
  // EnterpriseContextSection renders + the Prior Tenant History
  // drawer has content on this case.
  const enterpriseContext: EnterpriseContext = {
    triggers: ["class_account_check"],
    manifestErrorPresent: false,
    org: MOCK_ORGS["kontoso-de"],
    users: [
      {
        identifierId: id1.id,
        identifierValue: id1.value,
        lastLogonLocation: "Frankfurt, DE",
        geoResolutions30d: ["DE"],
        mailboxRegion: "EU North",
        oneDriveRegion: "EU North",
        conflictOfLawJurisdictions: ["DE"],
      },
      {
        identifierId: id2.id,
        identifierValue: id2.value,
        lastLogonLocation: "Frankfurt, DE",
        geoResolutions30d: ["DE"],
        mailboxRegion: "EU North",
        oneDriveRegion: "EU North",
        conflictOfLawJurisdictions: ["DE"],
      },
    ],
    policyReviewRequired: false,
    execReviewRequired: false,
  };

  return {
    caseId: "LNS-2026-00150",
    createDate,
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC",
    requestOrigin: "LEAPI",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "Waiting on Triage",
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    // Legacy flat fields (kept for back-compat with components that still
    // read them; structured `legalContext` below is the preferred source).
    country: germany.countryName,
    agencyCountryCode: germany.countryCode,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+49 69 1367-2424",
    agencyAddress: {
      number: "Konrad-Adenauer-Str. 20",
      city: "Frankfurt am Main",
      stateProvince: "Hessen",
      postalCode: "60313",
    },
    legalContext,
    // ETSI-keyed entries demonstrate the eEvidence badge on the Nature of
    // Crime picker. "MoneyLaundering" is the canonical ETSI value (replaces
    // the legacy "Money Laundering" string per the migration map).
    natureOfCrimes: ["MoneyLaundering", "OtherFinancialCrimeOrFraud"],
    mlat: false,
    additionalCaseInformation:
      "EU eEvidence (Reg. 2023/1543) submission via the Decentralised IT System. " +
      "Used to verify the Phase 1 Forms & Letters flow end-to-end with EPOC Form 3 — Non-Execution Response.",
    // LENS case number — same canonical value as `caseId`. The
    // Staatsanwaltschaft Frankfurt's reference lives in
    // `agencyCaseNumber` below.
    caseNumber: "LNS-2026-00150",
    agencyCaseNumber: "StA-FFM-2026-CY-0150",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    // ISO 8601 sources used by EPOC Form 3 autofill (B_dateOfIssue / B_dateOfReceipt).
    dateServed: "2026-04-22",
    dateReceived: "2026-04-22",
    // eEvidence-specific dates supplied by the Issuing Authority via the
    // Decentralised IT System submission envelope. Surfaced on the Request
    // Type card; not used by non-eEvidence request types.
    dateOfIssuance: "2026-04-20",
    dateOfTransmission: "2026-04-22",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-eu1`,
        name: "Oberstaatsanwältin Anja Becker",
        title: "Senior Public Prosecutor",
        email: "a.becker@sta-frankfurt.justiz.hessen.de",
        phone: "+49 69 1367-2424",
        role: "Submitter",
        languages: "de - German, en - English",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-07-22"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "European Production Order Certificate (EPOC) issued under Regulation (EU) 2023/1543 by the Public Prosecutor's Office of Frankfurt am Main. Authorises production of subscriber, traffic, and content data for identified Microsoft accounts.",
    approvalReferenceNumber: "EPOC-DE-FFM-2026-0150",
    approverName: "Oberstaatsanwältin Anja Becker",
    approverRole: "Senior Public Prosecutor",
    approvalTimestamp: new Date("2026-04-22T08:30:00"),
    approvalIsEmergency: false,
    approverEmail: "a.becker@sta-frankfurt.justiz.hessen.de",
    approverPhoneNumber: "+49 69 1367-2424",
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
    identifiers: [id1, id2],
    nonDisclosureOrders: [],
    startDate,
    endDate,
    timeZone: "Europe/Berlin (CET/CEST)",
    notes: [
      {
        id: `note-${Date.now().toString(36)}-eu1`,
        content:
          "EU eEvidence demo case for Phase 1 Forms & Letters verification. " +
          "Open the Forms & Letters accordion → New form → Rejection Responses tab → EPOC Form 3 — Non-Execution Response.",
        createdBy: "Nicole Garcia",
        createdAt: createDate,
      },
    ],
    // Correspondence is sourced from the cross-case store (seeded from
    // mockCorrespondenceSeeds.ts at module load). Reading via the store
    // keeps the active FormData in sync with mutations made earlier in
    // the same session — e.g., mark-as-read from the AppHeader bell.
    correspondence: getCorrespondenceForCase("LNS-2026-00150"),

    // Phase 4 polish — Kontoso enterprise context. Mounts the
    // EnterpriseContextSection + Org Home Location chip + Prior Tenant
    // History drawer (1 prior case under tenant-kontoso-de).
    enterpriseContext,

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-DE-FFM-001",
      name: "Public Prosecutor's Office of Frankfurt am Main",
      issuingAuthorityRole: "Prosecutor's Office (Staatsanwaltschaft)",
      country: germany,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: [
        "EPOC-DE-FFM-2026-0150",
        "STA-FFM-2026-CY-0150",
      ],
      approver: {
        name: "Oberstaatsanwältin Anja Becker",
        address:
          "Konrad-Adenauer-Str. 20\n60313 Frankfurt am Main\nGermany",
        tel: "+49 69 1367-2424",
        fax: "+49 69 1367-2999",
        email: "a.becker@sta-frankfurt.justiz.hessen.de",
        languagesSpoken: "de - German, en - English",
      },
      // Central authority contact omitted — IA is itself the contact.
    },
    // VA omitted — IA is a PublicProsecutor, no separate validator needed.
    eevidenceEnforcingAuthority: {
      name: "Bundesamt für Justiz (Federal Office of Justice)",
      contactName: "Dr. Markus Hoffmann",
      address: "Adenauerallee 99-103\n53113 Bonn\nGermany",
      tel: "+49 228 99-410-40",
      fax: "+49 228 99-410-5050",
      email: "eevidence@bfj.bund.de",
    },
    // Walks the deepest branch of the UnderlyingConditions tree so the demo
    // shows every cascading layer expanded with realistic prose.
    eevidenceEnterpriseRequest: {
      // Q1 (controller) and Q2 (processor) are both YES — this case
      // walks the deepest branch and shows every cascading layer.
      addressedToController: true,
      addressedToProcessor: true,
      addressedToProcessorControllerUnidentified: false,
      addressedToProcessorDetrimentalToInvestigation: true,
      processorShallInformController: false,
      processorShallNotInformController: true,
      // IA explicitly withheld permission to notify the end user — they're
      // under active investigation. The flag surfaces independently of the
      // Q1/Q2 cascade.
      permissionToNotifyUser: false,
      justification:
        "Notifying the enterprise customer (controller) at this stage would " +
        "alert the subject employee — under active financial fraud " +
        "investigation — and risk destruction of business records held in " +
        "the Microsoft 365 tenant.",
      relevantInformation:
        "Order issued under §100a StPO. Investigating prosecutor has " +
        "obtained a judicial preservation hold (LNS-2025-00280) on the " +
        "same Microsoft account; the present EPOC requests production of " +
        "the preserved data. Controller notification is suspended pending " +
        "charges, expected Q3 2026.",
    },

    // ── Seeded Attorney Escalation (Pending) ───────────────────────────
    // Pre-populated escalation so reviewers landing on LNS-2026-00150 can
    // walk the full attorney-review loop without composing anything:
    //   1. Header shows the red "Attorney Review Required" chip.
    //   2. Case Overview shows AttorneyReviewPanel at top with the four
    //      action buttons + the Specialist's reason.
    //   3. AuditThread (below Case Overview) shows the initial
    //      `Escalated` event.
    attorneyEscalation: {
      role: "Attorney",
      assignedAttorneyId: "ATT-001", // Sarah Mitchell
      reason:
        "EU eEvidence case with mixed Consumer + Enterprise targets. The " +
        "IA's Section g Sub-section D processor-route flags are set and " +
        "the Enterprise mailbox at Kontoso GmbH likely sits under a " +
        "controller relationship we need to clarify before disclosing " +
        "content data. Requesting attorney review of the controller-" +
        "notification posture and the scope of content data permitted on " +
        "the Enterprise account.",
      escalatedAt: new Date("2026-04-23T10:15:00"),
      escalatedBy: "Nicole Garcia",
      status: "Pending",
      actions: [],
    },
    escalationAuditEvents: [
      {
        id: "audit-seed-lns150-escalated",
        kind: "Escalated",
        actor: "Nicole Garcia",
        actorRole: "ResponseSpecialist",
        performedAt: new Date("2026-04-23T10:15:00"),
        note:
          "Specialist escalated the case to Attorney (Sarah Mitchell). " +
          "Mixed Consumer + Enterprise targets; controller-notification " +
          "posture needs attorney review.",
      },
    ],

    // Related preservation case (EPOC-PR) the IA cross-referenced.
    eevidenceRelatedCases: [
      {
        darsCaseNumber: "LNS-2025-00280",
        requestType: "eEvidence",
        requestSubType: "EPOC-PR",
        issuingAuthorityName:
          "Public Prosecutor's Office of Frankfurt am Main",
        issuingAuthorityReferenceNumbers: [
          "EPOC-PR-DE-FFM-2025-0280",
          "STA-FFM-2025-CY-0280",
        ],
        dateOfTransmission: "2025-11-15T10:42:00",
        serviceProviderName: "Microsoft Ireland Operations Limited",
        additionalInformation:
          "Continuation case — preservation order placed first against the " +
          "same subject Microsoft account in November 2025. This EPOC " +
          "requests production of the data preserved under that earlier " +
          "order.",
        preservationEndDate: "2026-05-15",
        dataDestructionDate: "2026-08-15",
        requestStatus: "Resolved",
        resolutionReason: "Preserved",
      },
    ],
  };
}
