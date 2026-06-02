/**
 * Mock case data for LNS-2026-00250 — Polish eEvidence EPOC-ER.
 *
 * **Scenario: Form1-Partial-EaBlocksOneTask (Workflow chain 2 → 6).**
 *
 * Polish IA issues an EPOC against three target identifiers (two
 * journalistic email accounts + one phone number tied to a witness).
 * The Polish Enforcing Authority reviews Form 1 and issues a
 * **Partial Grounds for Refusal**: one of the identifiers
 * (`LDID-100002` — a journalist's account) carries press-freedom
 * protections (`FreedomOfPressOrExpression`-adjacent, expressed via
 * `ManifestBreachOfFundamentalRights` in the trimmed Art. 12 enum).
 * The other two identifiers may proceed normally.
 *
 * Outcome the prototype demonstrates:
 *   - GroundsForRefusalPanel renders the amber Partial-GFR panel.
 *   - Lists the blocked LDTask Object (the journalist's identifier)
 *     with its reason chip.
 *   - Lists the other two identifiers as "Production continues".
 *   - **Case SLA chip unchanged** (Partial does NOT pause case SLA).
 *   - Phase D will gate every service + data-category row under the
 *     blocked identifier in CollectionTracker; the other two
 *     identifiers' rows remain fully actionable.
 */

import type {
  AccountIdentifier,
  CaseLegalContext,
  EEvidenceGroundsForRefusal,
  EscalationAuditEvent,
  FormData,
} from "../types/caseTypes";
import { createDefaultIdentifierServices } from "../config/lensServicesConfig";
import { computeSlaDueDate } from "../constants/slaConstants";

const genId = () =>
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function buildLENS202600250FormData(): FormData {
  const createDate = new Date("2026-05-10");
  const dueDate = computeSlaDueDate("Routine", createDate, createDate);
  const startDate = new Date("2026-02-01");
  const endDate = new Date("2026-05-08");
  const leDateRange = { start: "2026-02-01", end: "2026-05-08" };

  // ── EA timeline ────────────────────────────────────────────────────
  const eaNotifiedAt = new Date("2026-05-11T08:30:00");
  const eaReviewWindowExpiresAt = new Date("2026-05-21T08:30:00");
  const eaDecidedAt = new Date("2026-05-14T11:05:00");

  // ── Structured legal context ───────────────────────────────────────
  const poland = {
    countryCode: "PL",
    countryName: "Poland",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: poland,
    jurisdictionLevel: "National",
    jurisdictionName: "Rzeczpospolita Polska",
  };
  const issuingAuthority = {
    id: "AGY-PL-PR-WARSZAWA",
    name: "Prokuratura Okręgowa w Warszawie",
    shortName: "Prokuratura Warszawa",
    aliases: ["Regional Prosecutor's Office — Warsaw"],
    country: poland,
    agencyType: "Prosecutor" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@prokuratura.warszawa.gov.pl",
  };
  const legalContext: CaseLegalContext = {
    country: poland,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-PL-PR-001",
          name: "Prokurator Anna Kowalska",
          title: "Prokurator",
          email: "a.kowalska@prokuratura.warszawa.gov.pl",
          phone: "+48 22 173 9000",
          role: "Submitter",
          languages: "pl - Polish, en - English",
          source: "agency",
        },
        notes:
          "Polish EPOC-ER (production order) targeting three accounts. " +
          "EA issued Partial GFR for the journalist identifier; the " +
          "other two may proceed.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: true, // International → EA review applies
  };

  // ── Three target identifiers — LDID-100001/2/3 ─────────────────────
  // Note: stable taskIds (not random) so the GFR's blockedTaskObjectIds
  // references hold across renders. See plan: identifier ID source =
  // AccountIdentifier.taskId; the Partial GFR cites LDID-100002.
  //
  // Pre-seeded jobs: id1 + id3 only. id2 (journalist) is blocked by
  // Partial GFR so no jobs run there.
  function makeSeedJob(services: Record<string, any>) {
    return function seedJob(
      serviceKey: string,
      groupKey: string,
      itemKey: string,
      consumerOrEnterprise: "Consumer" | "Enterprise",
      jobOverrides: Record<string, unknown>,
    ): boolean {
      const svc = services[serviceKey];
      if (!svc?.categoryGroups?.[groupKey]) return false;
      const group = svc.categoryGroups[groupKey];
      if (!group[itemKey]) return false;
      svc.enabled = true;
      if (consumerOrEnterprise === "Consumer") svc.includeConsumerAccount = true;
      else svc.includeEnterpriseAccount = true;
      group[itemKey] = {
        ...group[itemKey],
        enabled: true,
        ...jobOverrides,
      };
      return true;
    };
  }

  const services1 = createDefaultIdentifierServices() as Record<string, any>;
  const seedJob1 = makeSeedJob(services1);

  // id1 / Email · Content Data · Email Content (automated, terminal).
  seedJob1("exchangeConsumer", "contentData", "genericAttributes", "Consumer", {
    taskId: "TSK-EXC-CON-250-001",
    jobId: "JOB-EXC-CON-250-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "DeliveryAcknowledged",
    deliveryJobId: "DLV-EXC-CON-250-001",
    deliveryAcknowledgedAt: new Date("2026-05-13T15:50:00"),
    collectionStatusUpdatedAt: new Date("2026-05-11T09:00:00"),
    publishStatusUpdatedAt: new Date("2026-05-12T14:30:00"),
    deliveryStatusUpdatedAt: new Date("2026-05-13T15:50:00"),
  });

  // id1 / MSA · Subscriber Data · Basic Billing (manual, mid-pipeline).
  seedJob1("msaProfile", "subscriberData", "basicBilling", "Consumer", {
    taskId: "TSK-MSA-BIL-250-001",
    jobId: "JOB-MSA-BIL-250-001",
    collectionStatus: "Complete",
    publishStatus: "Started",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-11T10:15:00"),
    publishStatusUpdatedAt: new Date("2026-05-12T16:00:00"),
  });

  const id1: AccountIdentifier = {
    id: genId(),
    value: "witness.observer@outlook.com",
    type: "Email Address",
    taskId: "LDID-100001",
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "Europe - North Europe",
    createdBy: "LE Agency",
    services: services1,
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: ["Email", "Microsoft Account Profile"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
    },
    issuingAuthorityNotes:
      "Witness account — not subject to the Partial GFR.",
  } as any;

  const id2: AccountIdentifier = {
    id: genId(),
    value: "j.nowak.reporter@dziennik.example",
    type: "Email Address",
    taskId: "LDID-100002",
    // Phase 1 merge — only the journalist identifier escalates. The
    // other two LDTasks proceed normally; this demonstrates the
    // partial-escalation pattern (1 of 3) — N/M chip shows "1/3
    // review" on the dashboard row, and the IdentifierTable shows
    // dimmed non-escalated rows alongside the red-bordered escalated
    // row.
    taskStatus: "AttorneyReview",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(),
    checkAccounts: { accountType: "Enterprise" },
    leExternalServices: ["Email", "Microsoft Account Profile", "OneDrive"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
      OneDrive: leDateRange,
    },
    issuingAuthorityNotes:
      "Journalist email account — EA has marked this LDTask as " +
      "blocked under Partial GFR (press-freedom / fundamental rights " +
      "considerations).",
    attorneyEscalation: {
      role: "Attorney",
      assignedAttorneyId: "ATT-001",
      reason:
        "Partial GFR cites Art. 12(1)(c) — manifest breach of fundamental " +
        "rights — against this journalist's account on press-freedom " +
        "grounds. Attorney must confirm the EA's blocking decision before " +
        "the LDTask is closed; release on the other two identifiers " +
        "proceeds independently.",
      escalatedAt: eaDecidedAt,
      escalatedBy: "Nicole Garcia",
      status: "Pending",
      scope: "some",
      actions: [],
    },
  } as any;

  const services3 = createDefaultIdentifierServices() as Record<string, any>;
  const seedJob3 = makeSeedJob(services3);

  // id3 / MSA · Subscriber Data · Basic Subscriber Data (automated, Started).
  seedJob3("msaProfile", "subscriberData", "genericAttributes", "Consumer", {
    taskId: "TSK-MSA-SUB-250-003",
    jobId: "JOB-MSA-SUB-250-003",
    collectionStatus: "Started",
    publishStatus: "Not Started",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-17T10:30:00"),
  });

  const id3: AccountIdentifier = {
    id: genId(),
    value: "+48 502 173 491",
    type: "Phone Number",
    taskId: "LDID-100003",
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "Europe - North Europe",
    createdBy: "LE Agency",
    services: services3,
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: ["Microsoft Account Profile"],
    leExternalServiceDates: {
      "Microsoft Account Profile": leDateRange,
    },
    issuingAuthorityNotes:
      "Suspect phone number — not subject to the Partial GFR.",
  } as any;

  // ── Partial GFR block ──────────────────────────────────────────────
  const eevidenceGroundsForRefusal: EEvidenceGroundsForRefusal = {
    trigger: "Form1Review",
    notifiedAt: eaNotifiedAt,
    eaReviewWindowExpiresAt,
    ea: {
      name: "Ministerstwo Sprawiedliwości — Departament Współpracy Międzynarodowej",
      referenceNumber: "MS-WM-2026-GFR-0250",
    },
    decision: {
      kind: "Partial",
      decidedAt: eaDecidedAt,
      decidedBy: "Dyrektor Marek Wójcik (EA Coordinator)",
      reasons: ["ManifestBreachOfFundamentalRights"],
      reasonSummary:
        "Konto dziennikarza objęte jest ochroną przewidzianą w art. 8 " +
        "Konstytucji RP oraz przepisach prawa prasowego. Wykonanie " +
        "EPOC w odniesieniu do tego identyfikatora stanowi oczywiste " +
        "naruszenie praw podstawowych w rozumieniu Reg. (UE) 2023/1543 " +
        "Art. 12(1)(c). Pozostałe identyfikatory mogą zostać wykonane.",
      blockedTaskObjectIds: ["LDID-100002"],
    },
  };

  // ── Audit thread ───────────────────────────────────────────────────
  const auditEvents: EscalationAuditEvent[] = [
    {
      id: `audit-${createDate.getTime().toString(36)}-1`,
      kind: "GfrReceived",
      actor: "System (EA inbound)",
      performedAt: eaDecidedAt,
      note:
        "Polish Enforcing Authority issued Partial Grounds for Refusal " +
        "(Art. 12(1)(c) — Manifest breach of fundamental rights) on " +
        "Form 1 review. Blocked LDTask: LDID-100002.",
    },
  ];

  return {
    caseId: "LNS-2026-00250",
    createDate,
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "In Progress",
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    country: poland.countryName,
    agencyCountryCode: poland.countryCode,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+48 22 173 9000",
    agencyAddress: {
      number: "ul. Chocimska 14",
      city: "Warsaw",
      stateProvince: "Mazovia",
      postalCode: "00-791",
    },
    legalContext,
    natureOfCrimes: ["OtherFinancialCrimeOrFraud", "Cybercrime"],
    mlat: false,
    additionalCaseInformation:
      "Polish EPOC-ER production order (Workflow 2 — International " +
      "with EA review). EA issued Partial GFR scoped to the journalist " +
      "identifier (LDID-100002); the other two identifiers may proceed.",
    caseNumber: "LNS-2026-00250",
    agencyCaseNumber: "PR-WAW-2026-EPOC-ER-0250",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-10",
    dateReceived: "2026-05-10",
    dateOfIssuance: "2026-05-09",
    dateOfTransmission: "2026-05-10",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-pl1`,
        name: "Prokurator Anna Kowalska",
        title: "Prokurator",
        email: "a.kowalska@prokuratura.warszawa.gov.pl",
        phone: "+48 22 173 9000",
        role: "Submitter",
        languages: "pl - Polish, en - English",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-08-10"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC-ER (European Production Order) issued by the Regional " +
      "Prosecutor's Office in Warsaw.",
    approvalReferenceNumber: "PR-WAW-2026-EPOC-ER-0250",
    approverName: "Sędzia Tomasz Mazur",
    approverRole: "Sędzia Sądu Okręgowego w Warszawie",
    approvalTimestamp: new Date("2026-05-09T14:00:00"),
    approvalIsEmergency: false,
    approverAlternateName: "Sędzia T. Mazur",
    approverEmail: "kancelaria@warszawa.so.gov.pl",
    approverPhoneNumber: "+48 22 656 5000",
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
    identifiers: [id1, id2, id3],
    nonDisclosureOrders: [],
    startDate,
    endDate,
    timeZone: "Europe/Warsaw (CET/CEST)",
    notes: [],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-PL-PR-WAW-001",
      name: "Prokuratura Okręgowa w Warszawie",
      issuingAuthorityRole: "Public Prosecutor's Office",
      country: poland,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: ["PR-WAW-2026-EPOC-ER-0250"],
      approver: {
        name: "Sędzia Tomasz Mazur",
        address:
          "al. Solidarności 127\n00-898 Warsaw\nPoland",
        tel: "+48 22 656 5000",
        fax: "+48 22 656 5001",
        email: "kancelaria@warszawa.so.gov.pl",
        languagesSpoken: "pl - Polish, en - English",
      },
    },
    eevidenceEnforcingAuthority: {
      name: "Ministerstwo Sprawiedliwości — Departament Współpracy Międzynarodowej",
      contactName: "Dyrektor Marek Wójcik",
      address:
        "Al. Ujazdowskie 11\n00-950 Warsaw\nPoland",
      tel: "+48 22 521 2888",
      fax: "+48 22 521 2999",
      email: "dwm@ms.gov.pl",
    },
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: false,
    },

    // ── Audit trail (no SLA pause — Partial does NOT pause case SLA) ──
    escalationAuditEvents: auditEvents,

    // ── DARS Phase 2 Appendix F workflow discriminator + GFR block ────
    eevidenceWorkflow: 2,
    isInternational: true,
    eevidenceGroundsForRefusal,
  } as unknown as FormData;
}
