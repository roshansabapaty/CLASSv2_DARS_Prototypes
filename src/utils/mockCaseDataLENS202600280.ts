/**
 * Mock case data for LNS-2026-00280 — Portuguese eEvidence EPOC-ER.
 *
 * **Scenario: Workflow 8 — Mid-Collection Withdrawal.**
 *
 * Portuguese Ministério Público issued an EPOC against a consumer
 * account. Collection was underway when the IA withdrew the EPOC.
 * On case open, the `Withdrawal` inbound handler:
 *   - cancels every pending + ready-to-deliver job
 *   - starts the 45-day retention clock anchored to the effective date
 *   - flips `authorizationDesiredStatus` + `caseStage` to "Withdrawn"
 *   - appends an `EpocWithdrawn` audit event
 *
 * Seeded delivery pipeline state (pre-handler):
 *   - msaProfile.subscriberData — publish:Complete, delivery:Started
 *   - msaProfile.authenticationLogs — publish:Complete, delivery:Not Started
 *   - exchangeConsumer.contentData — collection:Complete, publish:Not Started
 *   - exchangeConsumer.trafficData — delivery:Complete (already delivered)
 *
 * Expected post-handler state:
 *   - subscriberData delivery → Cancelled (was Started)
 *   - authenticationLogs delivery → Cancelled (was Ready-not-submitted)
 *   - trafficData stays Complete (already delivered, untouched)
 *   - WithdrawalBanner renders at top of CollectionTracker
 *   - RetentionClockChip ticks down from the effective date + 45d
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

export function buildLENS202600280FormData(): FormData {
  // Timeline anchors. Today = 2026-05-27.
  //   EPOC received 2026-05-12; collection underway when withdrawal lands.
  //   Withdrawal effective 2026-05-20 (7 days ago) → retention expires
  //   2026-07-04 (~38 days remaining, neutral chip tone).
  const createDate = new Date("2026-05-12");
  const dueDate = computeSlaDueDate("Routine", createDate);
  const startDate = new Date("2026-02-15");
  const endDate = new Date("2026-05-05");
  const leDateRange = { start: "2026-02-15", end: "2026-05-05" };

  // ── Structured legal context ───────────────────────────────────────
  const portugal = {
    countryCode: "PT",
    countryName: "Portugal",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: portugal,
    jurisdictionLevel: "National",
    jurisdictionName: "República Portuguesa",
  };
  const issuingAuthority = {
    id: "AGY-PT-MP-LIS",
    name: "Ministério Público — Departamento de Investigação e Ação Penal de Lisboa",
    shortName: "Lisbon Public Prosecutor",
    aliases: ["DIAP Lisboa"],
    country: portugal,
    agencyType: "Prosecutor" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@pgr.pt",
  };
  const legalContext: CaseLegalContext = {
    country: portugal,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-PT-MP-LIS-001",
          name: "Procurador Adjunto Ricardo Almeida",
          title: "Procurador Adjunto",
          email: "r.almeida@pgr.pt",
          phone: "+351 21 384 6000",
          role: "Submitter",
          languages: "pt - Portuguese, en - English",
          source: "agency",
        },
        notes:
          "Portuguese EPOC-ER for a corporate-fraud investigation. " +
          "IA withdrew the EPOC mid-collection after the underlying " +
          "criminal complaint was rescinded by the complainant.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: true,
  };

  // ── Target identifier with seeded mid-pipeline jobs ────────────────
  const services = createDefaultIdentifierServices() as Record<string, any>;

  function seedJob(
    serviceKey: string,
    groupKey: string,
    jobOverrides: Record<string, unknown>,
  ): boolean {
    const svc = services[serviceKey];
    if (!svc?.categoryGroups?.[groupKey]) return false;
    const group = svc.categoryGroups[groupKey];
    const itemKeys = Object.keys(group);
    if (itemKeys.length === 0) return false;
    const firstItemKey = itemKeys[0];
    svc.enabled = true;
    svc.includeConsumerAccount = true;
    group[firstItemKey] = {
      ...group[firstItemKey],
      enabled: true,
      ...jobOverrides,
    };
    return true;
  }

  // In-flight delivery — Started. Handler should cancel this.
  seedJob("msaProfile", "subscriberData", {
    taskId: "TSK-MSA-SUB-280-001",
    jobId: "JOB-MSA-SUB-280-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "Started",
    deliveryJobId: "DLV-MSA-SUB-280-001",
    collectionStatusUpdatedAt: new Date("2026-05-13T08:00:00"),
    publishStatusUpdatedAt: new Date("2026-05-14T10:00:00"),
    deliveryStatusUpdatedAt: new Date("2026-05-15T11:00:00"),
  });

  // Ready-but-not-submitted — Publish Complete, Delivery Not Started.
  // Handler should also cancel this.
  seedJob("msaProfile", "authenticationLogs", {
    taskId: "TSK-MSA-AUTH-280-001",
    jobId: "JOB-MSA-AUTH-280-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-13T08:00:00"),
    publishStatusUpdatedAt: new Date("2026-05-14T10:00:00"),
  });

  // Already-delivered — handler must NOT touch this one (over-disclosure
  // already happened pre-withdrawal; retention still applies but the
  // delivery itself stands as a fait accompli).
  seedJob("exchangeConsumer", "contentData", {
    taskId: "TSK-EXC-CON-280-001",
    jobId: "JOB-EXC-CON-280-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "Complete",
    deliveryJobId: "DLV-EXC-CON-280-001",
    collectionStatusUpdatedAt: new Date("2026-05-13T08:00:00"),
    publishStatusUpdatedAt: new Date("2026-05-14T10:00:00"),
    deliveryStatusUpdatedAt: new Date("2026-05-16T13:00:00"),
  });

  const id1: AccountIdentifier = {
    id: genId(),
    value: "corporate.target@outlook.pt",
    type: "Email Address",
    taskId: "LDID-280001",
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
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
      "Suspect under investigation for corporate fraud. EPOC " +
      "withdrawn after the criminal complaint was rescinded.",
  } as any;

  return {
    caseId: "LNS-2026-00280",
    createDate,
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "In Progress", // Handler flips to "Withdrawn" on open.
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    country: portugal.countryName,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+351 21 384 6000",
    agencyAddress: {
      number: "Rua de São Bento 47",
      city: "Lisbon",
      stateProvince: "Lisbon",
      postalCode: "1200-820",
    },
    legalContext,
    natureOfCrimes: ["OtherFinancialCrimeOrFraud"],
    mlat: false,
    additionalCaseInformation:
      "Portuguese EPOC-ER (Workflow 8 — Withdrawal). IA withdrew the " +
      "EPOC mid-collection after the underlying complaint was rescinded. " +
      "Handler cancels pending delivery + starts 45-day retention.",
    caseNumber: "LNS-2026-00280",
    agencyCaseNumber: "DIAP-2026-EPOC-ER-0280",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-12",
    dateReceived: "2026-05-12",
    dateOfIssuance: "2026-05-11",
    dateOfTransmission: "2026-05-12",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-pt1`,
        name: "Procurador Adjunto Ricardo Almeida",
        title: "Procurador Adjunto",
        email: "r.almeida@pgr.pt",
        phone: "+351 21 384 6000",
        role: "Submitter",
        languages: "pt - Portuguese, en - English",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-08-12"),
    // Pre-handler: still Approved. Handler flips on case open.
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC-ER (European Production Order) issued by Lisbon DIAP.",
    approvalReferenceNumber: "DIAP-2026-EPOC-ER-0280",
    approverName: "Juíza de Instrução Cláudia Sousa",
    approverRole: "Investigating Judge",
    approvalTimestamp: new Date("2026-05-11T16:00:00"),
    approvalIsEmergency: false,
    approverAlternateName: "JI C. Sousa",
    approverEmail: "instrucao.lisboa@pgr.pt",
    approverPhoneNumber: "+351 21 384 6100",
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
    timeZone: "Europe/Lisbon (WET/WEST)",
    notes: [],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-PT-MP-LIS-001",
      name: "Ministério Público — Departamento de Investigação e Ação Penal de Lisboa",
      issuingAuthorityRole: "Public Prosecutor's Office",
      country: portugal,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: ["DIAP-2026-EPOC-ER-0280"],
      approver: {
        name: "Juíza de Instrução Cláudia Sousa",
        address: "Rua de São Bento 47\n1200-820 Lisbon\nPortugal",
        tel: "+351 21 384 6100",
        fax: "+351 21 384 6101",
        email: "instrucao.lisboa@pgr.pt",
        languagesSpoken: "pt - Portuguese, en - English",
      },
    },
    eevidenceEnforcingAuthority: {
      name: "Procuradoria-Geral da República — Direção de Cooperação Judiciária Internacional",
      contactName: "Diretora Inês Carvalho",
      address: "Rua da Escola Politécnica 140\n1269-269 Lisbon\nPortugal",
      tel: "+351 21 392 1900",
      fax: "+351 21 392 1901",
      email: "cooperacao@pgr.pt",
    },
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: false,
    },

    escalationAuditEvents: [],

    // ── DARS Phase 2 Appendix F workflow discriminator ────────────────
    eevidenceWorkflow: 8,
    isInternational: true,
  } as unknown as FormData;
}
