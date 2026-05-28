/**
 * Mock case data for LNS-2026-00190 — German eEvidence case demonstrating
 * the **Enterprise/Consumer mismatch → Manifest Error → Form 3** flow.
 *
 * Scenario:
 *   - Issuing Authority is the German BKA (Bundeskriminalamt). They've
 *     transmitted an EPOC and marked Section g Sub-section D Q2
 *     (`addressedToProcessor`) = YES — i.e. they believe Microsoft is
 *     processing the data on behalf of an enterprise controller.
 *   - When the Response Specialist runs Check Accounts on the only target
 *     identifier, the account-existence check returns **Consumer** (a
 *     personal outlook.com account, not an enterprise tenancy).
 *
 * This mismatch — IA says Enterprise; Microsoft sees Consumer — is a
 * textbook **manifest error** ("addressed to wrong company"). The case
 * form surfaces a warning banner pointing the RS at the outbound Form 3
 * — Non-Execution Response with `manifestErrors` selected as the reason.
 */

import type {
  AccountIdentifier,
  CaseLegalContext,
  FormData,
} from "../types/caseTypes";
import { createDefaultIdentifierServices } from "../config/lensServicesConfig";
import { computeSlaDueDate } from "../constants/slaConstants";
import { get as getCorrespondenceForCase } from "../state/correspondenceStore";

const genId = () =>
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const genIdentifierTaskId = () =>
  `LDID-${Math.floor(Math.random() * 900_000) + 100_000}`;

export function buildLENS202600190FormData(): FormData {
  const createDate = new Date("2026-05-12");
  // Intended deadline (Routine = 30 days from receipt). Kept here even
  // though Form 3 was sent — see `slaPausedAt` below — so the SLA chip
  // can show what the impending due date would be if the timer were to
  // restart.
  const dueDate = computeSlaDueDate("Routine", createDate);
  const startDate = new Date("2026-02-01");
  const endDate = new Date("2026-05-12");
  const leDateRange = { start: "2026-02-01", end: "2026-05-12" };

  // ── Structured legal context — Germany / Federal / BKA ────────────────
  const germany = {
    countryCode: "DE",
    countryName: "Germany",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: germany,
    jurisdictionLevel: "Federal",
    jurisdictionName: "Bundesrepublik Deutschland",
  };
  const issuingAuthority = {
    id: "AGY-DE-BKA-CYBER",
    name: "Bundeskriminalamt — Cybercrime Division",
    shortName: "BKA Cyber",
    aliases: ["German Federal Criminal Police Office"],
    country: germany,
    agencyType: "LawEnforcement" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@bka.bund.de",
  };
  const legalContext: CaseLegalContext = {
    country: germany,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-DE-BKA-001",
          name: "Kriminaldirektor Stefan Werner",
          title: "Kriminaldirektor",
          email: "s.werner@bka.bund.de",
          phone: "+49 611 55 16450",
          role: "Submitter",
          languages: "de - German, en - English",
          source: "agency",
        },
        notes:
          "German Federal Criminal Police Office — Cybercrime Division. " +
          "IA marked the EPOC as addressed to Microsoft as the processor.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: false,
  };

  // ── Single Consumer email identifier — deliberate Enterprise/Consumer
  //    mismatch with the IA's Section g Sub-section D claim. The seeded
  //    `Consumer` value drives `accountExistenceCheck.ts` to return
  //    Consumer when the RS clicks Check Accounts.
  // ── Pre-seeded collection jobs — one job per LE-requested service
  //    (Email · MSA). Consumer-side services.
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
    svc.includeConsumerAccount = true;
    group[itemKey] = {
      ...group[itemKey],
      enabled: true,
      ...jobOverrides,
    };
    return true;
  }

  // Job 1 — Email · Content Data · Email Content (automated, mid-pipeline).
  seedJob("exchangeConsumer", "contentData", "genericAttributes", {
    taskId: "TSK-EXC-CON-190-001",
    jobId: "JOB-EXC-CON-190-001",
    collectionStatus: "Complete",
    publishStatus: "Started",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-14T10:00:00"),
    publishStatusUpdatedAt: new Date("2026-05-15T09:00:00"),
  });

  // Job 2 — MSA · Subscriber Data · Basic Billing (manual, terminal).
  seedJob("msaProfile", "subscriberData", "basicBilling", {
    taskId: "TSK-MSA-BIL-190-001",
    jobId: "JOB-MSA-BIL-190-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "DeliveryAcknowledged",
    deliveryJobId: "DLV-MSA-BIL-190-001",
    deliveryAcknowledgedAt: new Date("2026-05-16T14:20:00"),
    collectionStatusUpdatedAt: new Date("2026-05-14T11:35:00"),
    publishStatusUpdatedAt: new Date("2026-05-15T13:40:00"),
    deliveryStatusUpdatedAt: new Date("2026-05-16T14:20:00"),
  });

  const id1: AccountIdentifier = {
    id: genId(),
    value: "user.muster@outlook.de",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    // Pre-check state: status `not-checked` so the RS still has to click
    // Check Accounts to surface the mismatch warning.
    accountExistenceStatus: "not-checked",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services,
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: ["Email", "Microsoft Account Profile"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
    },
    issuingAuthorityNotes:
      "BKA investigation into an organised financial-fraud ring believed " +
      "to be operating through a Microsoft 365 tenancy. IA expects the " +
      "data to live in an enterprise environment under a corporate " +
      "controller.",
  } as any;

  return {
    caseId: "LNS-2026-00190",
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
    country: germany.countryName,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+49 611 55 16450",
    agencyAddress: {
      number: "Thaerstraße 11",
      city: "Wiesbaden",
      stateProvince: "Hesse",
      postalCode: "65193",
    },
    legalContext,
    natureOfCrimes: ["OtherFinancialCrimeOrFraud", "Cybercrime"],
    mlat: false,
    additionalCaseInformation:
      "German eEvidence demo case exercising the manifest-error path. " +
      "BKA marked the EPOC's Section g Sub-section D as a processor-route " +
      "Enterprise request, but the only target identifier resolves to a " +
      "Consumer outlook.de account. The case form should surface a " +
      "manifest-error warning when the RS runs Check Accounts.",
    // LENS case number — same canonical value as `caseId`. The BKA
    // reference lives in `agencyCaseNumber` below.
    caseNumber: "LNS-2026-00190",
    agencyCaseNumber: "BKA-WI-2026-CYBER-0190",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-12",
    dateReceived: "2026-05-12",
    dateOfIssuance: "2026-05-11",
    dateOfTransmission: "2026-05-12",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-de1`,
        name: "Kriminaldirektor Stefan Werner",
        title: "Kriminaldirektor",
        email: "s.werner@bka.bund.de",
        phone: "+49 611 55 16450",
        role: "Submitter",
        languages: "de - German, en - English",
        source: "agency",
      },
    ],
    dueDate,
    // SLA paused — Form 3 was sent at 2026-05-12T09:00:00 (see the
    // `formInstances[0].status === "Sent"` block below). The chip
    // surfaces both the intended deadline AND a "SLA paused" pill so
    // the impending due date remains visible if the timer ever
    // resumes. The matching `SLAStopped` audit event is in
    // `escalationAuditEvents` so the AuditThread shows the pause history.
    slaPausedAt: new Date("2026-05-12T09:00:00"),
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-08-12"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC issued by BKA Cybercrime Division for subscriber + content " +
      "data tied to a suspected organised financial-fraud ring. IA " +
      "expects an enterprise tenancy backing the target account.",
    approvalReferenceNumber: "BKA-WI-2026-CYBER-0190",
    approverName: "Oberstaatsanwältin Dr. Hannah Becker",
    approverRole: "Public Prosecutor (Generalstaatsanwaltschaft Frankfurt)",
    approvalTimestamp: new Date("2026-05-11T09:15:00"),
    approvalIsEmergency: false,
    approverAlternateName: "OStAin Dr. H. Becker",
    approverEmail: "eevidence@gsta-frankfurt.justiz.de",
    approverPhoneNumber: "+49 69 1367 2424",
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
    timeZone: "Europe/Berlin (CET/CEST)",
    notes: [
      {
        id: `note-${Date.now().toString(36)}-de1`,
        content:
          "German eEvidence demo. IA = BKA Cybercrime; expects Enterprise " +
          "data path per Section g Sub-section D Q2. Target identifier " +
          "resolves to Consumer — manifest-error warning should appear and " +
          "the RS should issue an outbound Form 3 (Non-Execution Response).",
        createdBy: "Nicole Garcia",
        createdAt: createDate,
      },
    ],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-DE-BKA-001",
      name: "Bundeskriminalamt — Cybercrime Division",
      issuingAuthorityRole: "Federal Police",
      country: germany,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: ["BKA-WI-2026-CYBER-0190"],
      approver: {
        name: "Oberstaatsanwältin Dr. Hannah Becker",
        address:
          "Konrad-Adenauer-Straße 20\n60313 Frankfurt am Main\nGermany",
        tel: "+49 69 1367 2424",
        fax: "+49 69 1367 2425",
        email: "eevidence@gsta-frankfurt.justiz.de",
        languagesSpoken: "de - German, en - English",
      },
    },
    eevidenceEnforcingAuthority: {
      name: "Bundesamt für Justiz — Internationale Rechtshilfe",
      contactName: "Frau Dr. Maria Schäfer",
      address: "Adenauerallee 99-103\n53113 Bonn\nGermany",
      tel: "+49 228 99-410-40",
      fax: "+49 228 99-410-5050",
      email: "eevidence@bfj.bund.de",
    },
    // IA submitted Q2 = YES on Section g Sub-section D (processor-route
    // Enterprise claim). One processor reason supplied as required when
    // Q2 = YES. Q1 was answered NO. This case is intentionally
    // mismatched with the seeded Consumer identifier — the manifest-error
    // banner surfaces after Check Accounts runs.
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: true,
      addressedToProcessorControllerUnidentified: true,
      addressedToProcessorDetrimentalToInvestigation: false,
      processorShallNotInformController: true,
      processorShallInformController: false,
      // BKA withheld permission to notify the end user — they're a target
      // of the broader fraud investigation. Surfaces independently of
      // Q1/Q2 per ETSI.
      permissionToNotifyUser: false,
      justification:
        "Notifying the controller at this stage would risk compromising " +
        "ongoing investigative actions against the wider fraud ring.",
      relevantInformation:
        "BKA's intelligence indicates the controller (an enterprise " +
        "tenancy) is itself a target of the broader investigation. " +
        "Disclosure to the controller is therefore not appropriate.",
    },
    eevidenceRelatedCases: [],

    // SLA pause history — the case sent Form 3 at 2026-05-12T09:00:00,
    // which halted the SLA clock per the attorney-escalation plan. The
    // AuditThread surfaces this so the historical pause is auditable.
    escalationAuditEvents: [
      {
        id: "audit-sla-lns190-form3",
        kind: "SLAStopped",
        actor: "Nicole Garcia",
        actorRole: "ResponseSpecialist",
        performedAt: new Date("2026-05-12T09:00:00"),
        note:
          "SLA countdown halted by Form 3 — Non-Execution Response submission " +
          "(manifest-error response to the BKA's EPOC).",
      },
    ],

    // Correspondence is sourced from the cross-case store (seeded from
    // mockCorrespondenceSeeds.ts at module load). The seed contains the
    // outbound EPOC Form 3 the RS already sent — currently Acknowledged
    // by the IA and awaiting their substantive reply within the 5-day
    // Reg 2023/1543 window.
    correspondence: getCorrespondenceForCase("LNS-2026-00190"),

    // The Form 3 instance the outbound seed references via
    // `formInstanceId: "fi-de-form3-190"`. Clicking the form pill in
    // the bubble hydrates `FormPreviewPanel` from this instance so the
    // RS can re-read what was sent.
    formInstances: [
      {
        instanceId: "fi-de-form3-190",
        templateId: "EPOC_FORM_3",
        caseId: "LNS-2026-00190",
        status: "Sent",
        createdAt: new Date("2026-05-12T08:40:00"),
        updatedAt: new Date("2026-05-12T09:00:00"),
        signature: {
          signerName: "Nicole Garcia",
          signedAt: new Date("2026-05-12T08:55:00"),
          attestation: true,
        },
        values: {
          // Section A — Certificate concerned
          A_certificateType: "EPOC",
          // Section B — Issuing authority
          B_issuingAuthority: "Bundeskriminalamt — Cybercrime Division",
          B_issuingFileNumber: "BKA-WI-2026-CYBER-0190",
          B_dateOfIssue: "2026-05-11",
          B_dateOfReceipt: "2026-05-12",
          B_enforcingAuthority:
            "Bundesamt für Justiz — Internationale Rechtshilfe",
          // Section C — Addressee
          C_addressee: "Microsoft Ireland Operations Limited",
          C_addresseeFileNumber: "LNS-2026-00190",
          // Section D — Non-execution reasons
          D_reasons: ["manifestErrors"],
          D_explanation:
            "The Order is addressed to Microsoft as the processor under " +
            "Section g Sub-section D Q2, but the target identifier resolves " +
            "to a Consumer outlook.de account. There is no enterprise " +
            "controller relationship behind the data — therefore the EPOC " +
            "contains a manifest error in its addressee designation. We " +
            "request the IA re-issue the EPOC addressed to Microsoft as " +
            "the controller (Section g Sub-section D Q1).",
          // Section H — Contact details + signature
          H_contactName: "Nicole Garcia",
          H_contactEmail: "nicole.garcia@microsoft.com",
        },
      },
    ],
  };
}
