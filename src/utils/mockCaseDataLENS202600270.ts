/**
 * Mock case data for LNS-2026-00270 — Swedish eEvidence EPOC-ER.
 *
 * **Scenario: Mixed Manual + Automated Job Categories on a Consumer
 * identifier.** Sister demo to LNS-2026-00255 (which curates a small
 * set of jobs in different delivery states for the FailedDelivery /
 * Acknowledged demo). This case instead curates jobs split across
 * **automated** and **manual** categories so the CollectionTracker's
 * Manual vs Automated breakdown (`manualTotal`, `automatedTotal`,
 * etc.) renders meaningful counts on both sides.
 *
 * The Swedish IA submits an EPOC-ER against a single Consumer email.
 * Check Accounts resolves to Consumer. Four Microsoft Consumer
 * services are enabled:
 *   - **MSA Profile (msaProfile)** — automated + manual categories
 *   - **Exchange Consumer (exchangeConsumer)** — automated only
 *   - **OneDrive Consumer (oneDriveConsumer)** — automated + manual
 *   - **Teams for Life (teamsForLife)** — automated + manual
 *
 * Ten jobs are pre-seeded — five automated, five manual — spanning
 * the full Collection → Publish → Delivery pipeline. Statuses range
 * from `Not Started` (queued) to `In Progress` (live) to `Complete`
 * to `DeliveryAcknowledged` so the matrix shows the full lifecycle.
 *
 * Outcome the prototype demonstrates:
 *   - CollectionTracker's job lists render automated and manual
 *     categories side by side, with the manual rows visually
 *     distinguishable (the manual badge / hand icon, per the
 *     existing CollectionTracker rendering).
 *   - The Collection summary chips ("X automated · Y manual") have
 *     meaningful counts on both axes.
 *   - No EA hold, no GFR — the demo is purely about job visibility,
 *     not legal-veto flow. Sweden is in scope for EU eEvidence so
 *     Workflow 2 (International review) still applies but EA clears
 *     implicitly (no GFR block seeded).
 */

import type {
  AccountIdentifier,
  CaseLegalContext,
  FormData,
} from "../types/caseTypes";
import { createDefaultIdentifierServices } from "../config/lensServicesConfig";
import { computeSlaDueDate } from "../constants/slaConstants";

const genId = () =>
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function buildLENS202600270FormData(): FormData {
  const createDate = new Date("2026-05-15");
  const dueDate = computeSlaDueDate("Routine", createDate);
  const startDate = new Date("2026-02-15");
  const endDate = new Date("2026-05-14");
  const leDateRange = { start: "2026-02-15", end: "2026-05-14" };

  // ── Structured legal context ───────────────────────────────────────
  const sweden = {
    countryCode: "SE",
    countryName: "Sweden",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: sweden,
    jurisdictionLevel: "National",
    jurisdictionName: "Konungariket Sverige",
  };
  const issuingAuthority = {
    id: "AGY-SE-AKL-CYBER",
    name: "Åklagarmyndigheten — Riksenheten mot internationell och organiserad brottslighet",
    shortName: "Swedish Prosecution Authority",
    aliases: ["RIO (Swedish Cybercrime Prosecution Unit)"],
    country: sweden,
    agencyType: "Prosecutor" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@aklagare.se",
  };
  const legalContext: CaseLegalContext = {
    country: sweden,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-SE-AKL-001",
          name: "Åklagare Lina Andersson",
          title: "Chefsåklagare",
          email: "l.andersson@aklagare.se",
          phone: "+46 10 562 50 00",
          role: "Submitter",
          languages: "sv - Swedish, en - English",
          source: "agency",
        },
        notes:
          "Swedish EPOC-ER (production order) for a phishing / business " +
          "email compromise investigation. Mixed manual + automated " +
          "job categories enabled on the target Consumer identifier.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: true, // International → EA review applies
  };

  // ── Target identifier ──────────────────────────────────────────────
  // Single Consumer email. Four Consumer-side services enabled with a
  // curated mix of automated + manual categories so the
  // CollectionTracker shows both kinds side by side.
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

  // ── Automated jobs (5) ─────────────────────────────────────────────
  // Each lands in an `automated: true` category per
  // `lensServicesConfig.ts` SERVICE_CATEGORY_GROUPS.

  // MSA Profile · Subscriber Data · Generic Attributes — terminal happy path.
  seedJob("msaProfile", "subscriberData", "genericAttributes", {
    taskId: "TSK-MSA-SUB-270-001",
    jobId: "JOB-MSA-SUB-270-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "DeliveryAcknowledged",
    deliveryJobId: "DLV-MSA-SUB-270-001",
    deliveryAcknowledgedAt: new Date("2026-05-16T11:14:00"),
    collectionStatusUpdatedAt: new Date("2026-05-15T09:20:00"),
    publishStatusUpdatedAt: new Date("2026-05-15T13:05:00"),
    deliveryStatusUpdatedAt: new Date("2026-05-16T11:14:00"),
  });

  // MSA Profile · Authentication Logs · Generic Attributes — simple complete.
  seedJob("msaProfile", "authenticationLogs", "genericAttributes", {
    taskId: "TSK-MSA-AUTH-270-001",
    jobId: "JOB-MSA-AUTH-270-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "Complete",
    deliveryJobId: "DLV-MSA-AUTH-270-001",
    collectionStatusUpdatedAt: new Date("2026-05-15T09:30:00"),
    publishStatusUpdatedAt: new Date("2026-05-15T13:12:00"),
    deliveryStatusUpdatedAt: new Date("2026-05-15T16:48:00"),
  });

  // Exchange Consumer · Content Data · Email Content — publish still running.
  seedJob("exchangeConsumer", "contentData", "genericAttributes", {
    taskId: "TSK-EXC-CON-270-001",
    jobId: "JOB-EXC-CON-270-001",
    collectionStatus: "Complete",
    publishStatus: "In Progress",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-15T10:42:00"),
    publishStatusUpdatedAt: new Date("2026-05-15T14:11:00"),
  });

  // OneDrive Consumer · Traffic Data · API Logs — collection running.
  seedJob("oneDriveConsumer", "trafficData", "genericAttributes", {
    taskId: "TSK-ODC-TRA-270-001",
    jobId: "JOB-ODC-TRA-270-001",
    collectionStatus: "In Progress",
    publishStatus: "Not Started",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-15T15:25:00"),
  });

  // Teams for Life · Content Data · Chat Messaging — queued.
  seedJob("teamsForLife", "contentData", "genericAttributesChats", {
    taskId: "TSK-TFL-CHAT-270-001",
    jobId: "JOB-TFL-CHAT-270-001",
    collectionStatus: "Not Started",
    publishStatus: "Not Started",
    deliveryStatus: "Not Started",
  });

  // ── Manual jobs (5) ────────────────────────────────────────────────
  // Each lands in an `automated: false` category per the service
  // config. CollectionTracker renders these with the manual badge.

  // MSA Profile · Subscriber Data · Basic Billing — manual collection running.
  seedJob("msaProfile", "subscriberData", "basicBilling", {
    taskId: "TSK-MSA-SUB-270-002",
    jobId: "JOB-MSA-SUB-270-002",
    collectionStatus: "In Progress",
    publishStatus: "Not Started",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-16T09:00:00"),
  });

  // MSA Profile · Authentication Logs · 2FA/MFA/Proof — manual collection
  // complete, awaiting publish.
  seedJob("msaProfile", "authenticationLogs", "2FAMFAProof", {
    taskId: "TSK-MSA-AUTH-270-002",
    jobId: "JOB-MSA-AUTH-270-002",
    collectionStatus: "Complete",
    publishStatus: "Not Started",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-16T12:18:00"),
  });

  // MSA Profile · Authentication Logs · Detailed Billing — queued for manual.
  seedJob("msaProfile", "authenticationLogs", "detailedBilling", {
    taskId: "TSK-MSA-AUTH-270-003",
    jobId: "JOB-MSA-AUTH-270-003",
    collectionStatus: "Not Started",
    publishStatus: "Not Started",
    deliveryStatus: "Not Started",
  });

  // Teams for Life · Content Data · Teams Live Intercept — queued for manual.
  seedJob("teamsForLife", "contentData", "teamsLiveIntercept", {
    taskId: "TSK-TFL-LI-270-001",
    jobId: "JOB-TFL-LI-270-001",
    collectionStatus: "Not Started",
    publishStatus: "Not Started",
    deliveryStatus: "Not Started",
  });

  // OneDrive Consumer · Content Data · OneDrive Content — manual content review.
  seedJob("oneDriveConsumer", "contentData", "genericAttributes", {
    taskId: "TSK-ODC-CON-270-001",
    jobId: "JOB-ODC-CON-270-001",
    collectionStatus: "In Progress",
    publishStatus: "Not Started",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-16T13:42:00"),
  });

  const id1: AccountIdentifier = {
    id: genId(),
    value: "phisher.target@hotmail.com",
    type: "Email Address",
    taskId: "LDID-100270",
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "Europe - North Europe",
    createdBy: "LE Agency",
    services,
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: [
      "Email",
      "Microsoft Account Profile",
      "OneDrive",
      "Teams",
    ],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
      OneDrive: leDateRange,
      Teams: leDateRange,
    },
    issuingAuthorityNotes:
      "Subject implicated in a multi-target phishing operation against " +
      "Swedish small businesses. Production scope includes subscriber, " +
      "auth logs, email content, OneDrive content, and Teams chats — " +
      "a deliberate mix of automated and manual collection categories.",
  } as any;

  return {
    caseId: "LNS-2026-00270",
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
    country: sweden.countryName,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+46 10 562 50 00",
    agencyAddress: {
      number: "Östermalmsgatan 87 C",
      city: "Stockholm",
      stateProvince: "Stockholms län",
      postalCode: "114 59",
    },
    legalContext,
    natureOfCrimes: ["Cybercrime", "OtherFinancialCrimeOrFraud"],
    mlat: false,
    additionalCaseInformation:
      "Swedish EPOC-ER (Workflow 2 — International). Mixed manual + " +
      "automated job category demo — four Consumer services enabled " +
      "on a single email identifier, with ten pre-seeded jobs split " +
      "evenly across automated and manual categories so the " +
      "CollectionTracker's Manual vs Automated breakdown surfaces " +
      "meaningful counts on both axes.",
    caseNumber: "LNS-2026-00270",
    agencyCaseNumber: "AKL-RIO-2026-EPOC-ER-0270",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-15",
    dateReceived: "2026-05-15",
    dateOfIssuance: "2026-05-14",
    dateOfTransmission: "2026-05-15",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-se1`,
        name: "Åklagare Lina Andersson",
        title: "Chefsåklagare",
        email: "l.andersson@aklagare.se",
        phone: "+46 10 562 50 00",
        role: "Submitter",
        languages: "sv - Swedish, en - English",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-08-15"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC-ER (European Production Order) issued by the Swedish " +
      "Prosecution Authority's International / Organized Crime Unit " +
      "for a phishing investigation.",
    approvalReferenceNumber: "AKL-RIO-2026-EPOC-ER-0270",
    approverName: "Domare Erik Lindqvist",
    approverRole: "Judge (Stockholms tingsrätt)",
    approvalTimestamp: new Date("2026-05-14T14:00:00"),
    approvalIsEmergency: false,
    approverAlternateName: "Domare E. Lindqvist",
    approverEmail: "stockholms.tingsratt@dom.se",
    approverPhoneNumber: "+46 8 561 650 00",
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
    timeZone: "Europe/Stockholm (CET/CEST)",
    notes: [
      {
        id: `note-${Date.now().toString(36)}-se1`,
        content:
          "Demo case for the Manual vs Automated job category split. " +
          "MSA Profile, Exchange Consumer, OneDrive Consumer, and " +
          "Teams for Life are enabled on the target identifier. Ten " +
          "jobs are seeded — five automated (subscriber / auth-log " +
          "generics, email content, API logs, Teams chats) and five " +
          "manual (basic billing, 2FA/MFA, detailed billing, Teams " +
          "live intercept, OneDrive content review). Statuses span " +
          "Not Started → In Progress → Complete → DeliveryAcknowledged.",
        createdBy: "Nicole Garcia",
        createdAt: createDate,
      },
    ],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-SE-AKL-RIO-001",
      name: "Åklagarmyndigheten — Riksenheten mot internationell och organiserad brottslighet",
      issuingAuthorityRole: "Public Prosecutor's Office",
      country: sweden,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: ["AKL-RIO-2026-EPOC-ER-0270"],
      approver: {
        name: "Domare Erik Lindqvist",
        address:
          "Scheelegatan 7\n112 28 Stockholm\nSweden",
        tel: "+46 8 561 650 00",
        fax: "+46 8 561 650 01",
        email: "stockholms.tingsratt@dom.se",
        languagesSpoken: "sv - Swedish, en - English",
      },
    },
    // No per-case Enforcing Authority override — Microsoft-side default
    // (Department of Justice, Ireland) applies via
    // `resolveEEvidenceEnforcingAuthority`.
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: false,
    },

    // No GFR block, no audit events — EA clears implicitly. The demo
    // focus is the job list, not the legal-veto flow.
    eevidenceWorkflow: 2,
    isInternational: true,
  } as unknown as FormData;
}
