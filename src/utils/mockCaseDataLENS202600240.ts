/**
 * Mock case data for LNS-2026-00240 — Italian eEvidence EPOC-ER.
 *
 * **Scenario: Form1-Full-EaBlocks (Workflow chain 2 → 6).**
 *
 * Italian IA issues an EPOC; case is cross-border (international) so
 * the EA-review leg of Appendix F Workflow 2 applies. While the case
 * was being worked, the Italian Enforcing Authority issued a
 * **Full Grounds for Refusal** citing `ImmunitiesOrPrivileges`
 * (Art. 12(1)(a)) — the target's profession (member of parliament)
 * carries jurisdictional immunity that the EA considers a manifest
 * bar to production.
 *
 * Outcome the prototype demonstrates:
 *   - GroundsForRefusalPanel renders the red Full-GFR HOLD card at
 *     the top of Case Overview.
 *   - Sticky-header chip shows "EA Hold — Full".
 *   - Case SLA pauses (per the Conflict 1 resolution: Full = pause).
 *   - Delivery gates (Send / Form 3 / Resolve) are disabled in
 *     CollectionTracker once Phase D lands.
 *   - Audit Thread carries the `GfrReceived` event.
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

export function buildLENS202600240FormData(): FormData {
  const createDate = new Date("2026-05-12");
  const dueDate = computeSlaDueDate("Routine", createDate, createDate);
  const startDate = new Date("2026-01-15");
  const endDate = new Date("2026-05-10");
  const leDateRange = { start: "2026-01-15", end: "2026-05-10" };

  // ── EA timeline ────────────────────────────────────────────────────
  // Notification went out shortly after case creation; EA decision
  // landed 3 days later (well within the 10-day window).
  const eaNotifiedAt = new Date("2026-05-13T09:00:00");
  const eaReviewWindowExpiresAt = new Date("2026-05-23T09:00:00"); // notifiedAt + 10d
  const eaDecidedAt = new Date("2026-05-16T14:20:00");
  const slaPausedAt = new Date(eaDecidedAt); // SLA paused on Full decision

  // ── Structured legal context ───────────────────────────────────────
  const italy = {
    countryCode: "IT",
    countryName: "Italy",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: italy,
    jurisdictionLevel: "National",
    jurisdictionName: "Repubblica Italiana",
  };
  const issuingAuthority = {
    id: "AGY-IT-PR-MILANO",
    name: "Procura della Repubblica di Milano",
    shortName: "Procura Milano",
    aliases: ["Public Prosecutor's Office — Milan"],
    country: italy,
    agencyType: "Prosecutor" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@procura.milano.giustizia.it",
  };
  const legalContext: CaseLegalContext = {
    country: italy,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-IT-PR-001",
          name: "Pubblico Ministero Dott. Marco Rinaldi",
          title: "Pubblico Ministero",
          email: "m.rinaldi@procura.milano.giustizia.it",
          phone: "+39 02 5453 1",
          role: "Submitter",
          languages: "it - Italian, en - English",
          source: "agency",
        },
        notes:
          "Italian EPOC-ER (production order) targeting a politically " +
          "sensitive account. EA in receiving member state has raised " +
          "Full Grounds for Refusal citing parliamentary immunity.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: true, // International → EA review applies
  };

  // ── Pre-seeded collection jobs — one job per LE-requested service
  //    (Email · MSA). Enterprise services. Mix of automated + manual
  //    data types and lifecycle states.
  const services = createDefaultIdentifierServices() as Record<string, any>;

  function seedJob(
    serviceKey: string,
    groupKey: string,
    itemKey: string,
    jobOverrides: Record<string, unknown>,
  ): boolean {
    const svc = services[serviceKey];
    if (!svc?.categoryGroups?.[groupKey]) return false;
    const group = svc.categoryGroups[groupKey];
    if (!group[itemKey]) return false;
    svc.enabled = true;
    svc.includeEnterpriseAccount = true;
    group[itemKey] = {
      ...group[itemKey],
      enabled: true,
      ...jobOverrides,
    };
    return true;
  }

  // Job 1 — Email · Content Data · Email Content (automated, mid-pipeline).
  seedJob("exchangeEnterprise", "contentData", "genericAttributes", {
    taskId: "TSK-EXE-CON-240-001",
    jobId: "JOB-EXE-CON-240-001",
    collectionStatus: "Complete",
    publishStatus: "Started",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-13T10:15:00"),
    publishStatusUpdatedAt: new Date("2026-05-14T08:30:00"),
  });

  // Job 2 — MSA · Subscriber Data · Basic Billing (manual, terminal).
  seedJob("entraIDProfile", "subscriberData", "basicBilling", {
    taskId: "TSK-ENT-BIL-240-001",
    jobId: "JOB-ENT-BIL-240-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "DeliveryAcknowledged",
    deliveryJobId: "DLV-ENT-BIL-240-001",
    deliveryAcknowledgedAt: new Date("2026-05-15T16:00:00"),
    collectionStatusUpdatedAt: new Date("2026-05-13T11:40:00"),
    publishStatusUpdatedAt: new Date("2026-05-14T14:25:00"),
    deliveryStatusUpdatedAt: new Date("2026-05-15T16:00:00"),
  });

  // ── Target identifier ──────────────────────────────────────────────
  const id1: AccountIdentifier = {
    id: genId(),
    value: "lorenzo.bianchi@parlamento.it",
    type: "Email Address",
    taskId: "LDID-200001",
    taskStatus: "InReview",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services,
    checkAccounts: { accountType: "Enterprise" },
    leExternalServices: ["Email", "Microsoft Account Profile"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
    },
    issuingAuthorityNotes:
      "Subject under investigation for OtherFinancialCrimeOrFraud. " +
      "Request subscriber + content data within the order's date window.",
  } as any;

  // ── GFR block — Full refusal, Form1Review trigger ──────────────────
  const eevidenceGroundsForRefusal: EEvidenceGroundsForRefusal = {
    trigger: "Form1Review",
    notifiedAt: eaNotifiedAt,
    eaReviewWindowExpiresAt,
    ea: {
      name: "Ministero della Giustizia — Direzione Generale degli Affari Internazionali",
      referenceNumber: "MIN-GIUST-2026-GFR-0240",
    },
    decision: {
      kind: "Full",
      decidedAt: eaDecidedAt,
      decidedBy: "Dott.ssa Chiara Lombardi (Magistrato di Collegamento)",
      reasons: ["ImmunitiesOrPrivileges"],
      reasonSummary:
        "Il soggetto identificato gode di immunità parlamentare ai sensi " +
        "dell'art. 68 della Costituzione italiana. La produzione richiesta " +
        "costituisce ostacolo manifesto alla immunità prevista dalla legge " +
        "dello Stato di esecuzione, ai sensi del Reg. (UE) 2023/1543 " +
        "Art. 12(1)(a).",
    },
  };

  // ── Audit thread — Italy GFR received + SLA stopped ────────────────
  const auditEvents: EscalationAuditEvent[] = [
    {
      id: `audit-${createDate.getTime().toString(36)}-1`,
      kind: "GfrReceived",
      actor: "System (EA inbound)",
      performedAt: eaDecidedAt,
      note:
        "Italian Enforcing Authority issued Full Grounds for Refusal " +
        "(Art. 12(1)(a) — Immunities or Privileges) on Form 1 review.",
    },
    {
      id: `audit-${createDate.getTime().toString(36)}-2`,
      kind: "SLAStopped",
      actor: "System",
      performedAt: eaDecidedAt,
      note:
        "Case SLA paused on receipt of Full GFR (DARS Phase 2 Appendix F " +
        "Workflow 6). Collection jobs may continue; delivery is blocked.",
    },
  ];

  return {
    caseId: "LNS-2026-00240",
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
    country: italy.countryName,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+39 02 5453 1",
    agencyAddress: {
      number: "Via Carlo Freguglia 1",
      city: "Milan",
      stateProvince: "Lombardy",
      postalCode: "20122",
    },
    legalContext,
    natureOfCrimes: ["OtherFinancialCrimeOrFraud", "Corruption"],
    mlat: false,
    additionalCaseInformation:
      "Italian EPOC-ER production order. Cross-border (Workflow 2 — " +
      "International, with EA review). EA has issued Full GFR citing " +
      "parliamentary immunity (Art. 12(1)(a)). Delivery is blocked; " +
      "collection jobs continue but nothing leaves Microsoft.",
    caseNumber: "LNS-2026-00240",
    agencyCaseNumber: "PR-MI-2026-EPOC-ER-0240",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-12",
    dateReceived: "2026-05-12",
    dateOfIssuance: "2026-05-11",
    dateOfTransmission: "2026-05-12",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-it1`,
        name: "Pubblico Ministero Dott. Marco Rinaldi",
        title: "Pubblico Ministero",
        email: "m.rinaldi@procura.milano.giustizia.it",
        phone: "+39 02 5453 1",
        role: "Submitter",
        languages: "it - Italian, en - English",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-08-12"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC-ER (European Production Order) issued by the Public " +
      "Prosecutor's Office of Milan, validated by the GIP at the " +
      "Tribunale di Milano.",
    approvalReferenceNumber: "PR-MI-2026-EPOC-ER-0240",
    approverName: "GIP Dott. Andrea Conti",
    approverRole: "Giudice per le Indagini Preliminari (Tribunale di Milano)",
    approvalTimestamp: new Date("2026-05-11T11:00:00"),
    approvalIsEmergency: false,
    approverAlternateName: "GIP A. Conti",
    approverEmail: "gip@tribunale.milano.giustizia.it",
    approverPhoneNumber: "+39 02 5463 1",
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
    timeZone: "Europe/Rome (CET/CEST)",
    notes: [],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-IT-PR-MI-001",
      name: "Procura della Repubblica di Milano",
      issuingAuthorityRole: "Public Prosecutor's Office",
      country: italy,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: ["PR-MI-2026-EPOC-ER-0240"],
      approver: {
        name: "GIP Dott. Andrea Conti",
        address:
          "Via Carlo Freguglia 1\n20122 Milan\nItaly",
        tel: "+39 02 5463 1",
        fax: "+39 02 5463 2",
        email: "gip@tribunale.milano.giustizia.it",
        languagesSpoken: "it - Italian, en - English",
      },
    },
    eevidenceEnforcingAuthority: {
      name: "Ministero della Giustizia — Direzione Generale degli Affari Internazionali",
      contactName: "Dott.ssa Chiara Lombardi",
      address:
        "Via Arenula 70\n00186 Rome\nItaly",
      tel: "+39 06 6885 1",
      fax: "+39 06 6885 2",
      email: "dgia@giustizia.it",
    },
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: false,
    },

    // ── GFR-driven SLA pause + audit trail ────────────────────────────
    slaPausedAt,
    escalationAuditEvents: auditEvents,

    // ── DARS Phase 2 Appendix F workflow discriminator + GFR block ────
    eevidenceWorkflow: 2,
    isInternational: true,
    eevidenceGroundsForRefusal,
  } as unknown as FormData;
}
