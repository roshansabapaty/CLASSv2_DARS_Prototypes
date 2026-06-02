/**
 * Mock case data for LNS-2026-00130 — Irish eEvidence EPOC-ER.
 *
 * **Scenario: Workflow 1 — Standard Production National.**
 *
 * Irish An Garda Síochána / Office of the Director of Public
 * Prosecutions issues an EPOC against a consumer account. Because
 * Microsoft's EU establishment is in Ireland, the IA and the SP are in
 * the SAME member state — `isInternational: false`, no EA review leg
 * applies. Per Reg 2023/1543 Art. 9(1), the Routine 10-day SLA
 * governs.
 *
 * What this seed demonstrates:
 *   - Full Collection → Package → Delivery pipeline (no preservation
 *     collapse, no GFR panel, no EA review chip)
 *   - Sticky-header chip: Routine 10-day countdown
 *   - Default happy path for eEvidence production — the baseline that
 *     all other workflows branch off from
 *
 * Companion eEvidence seeds:
 *   - LNS-2026-00245 / 00247 / 00255 / 00250 / 00240 → Workflow 2 (EA review)
 *   - LNS-2026-00215 / 00220 → Workflow 4 (preservation)
 *   - LNS-2026-00280 → Workflow 8 (withdrawal)
 *   - LNS-2026-00140 → Workflow 3 (emergency 8h)
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

export function buildLENS202600130FormData(): FormData {
  // Timeline anchors. Today = 2026-06-01.
  //   EPOC received 2026-05-26 (6 days ago) → Routine 10-day SLA
  //   → due 2026-06-05 (4 days remaining, OnTrack chip).
  const createDate = new Date("2026-05-26");
  // Pass createDate as both `received` and `now` so the helper's
  // Math.max(received, now) guard doesn't slide the dueDate forward to
  // "today + 10d" — for a demo seed we want the chronology fixed.
  const dueDate = computeSlaDueDate("Routine", createDate, createDate);
  const startDate = new Date("2026-03-01");
  const endDate = new Date("2026-05-20");
  const leDateRange = { start: "2026-03-01", end: "2026-05-20" };

  // ── Structured legal context — Irish IA, Irish SP → national ──────
  const ireland = {
    countryCode: "IE",
    countryName: "Ireland",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: ireland,
    jurisdictionLevel: "National",
    jurisdictionName: "Republic of Ireland",
  };
  const issuingAuthority = {
    id: "AGY-IE-DPP-DUB",
    name: "Office of the Director of Public Prosecutions",
    shortName: "Irish DPP",
    aliases: ["DPP", "An tArd-Aighne"],
    country: ireland,
    agencyType: "Prosecutor" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@dppireland.ie",
  };
  const legalContext: CaseLegalContext = {
    country: ireland,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-IE-DPP-DUB-001",
          name: "State Solicitor Aoife Ní Bhriain",
          title: "State Solicitor",
          email: "a.nibhriain@dppireland.ie",
          phone: "+353 1 858 8500",
          role: "Submitter",
          languages: "en - English, ga - Irish",
          source: "agency",
        },
        notes:
          "Irish national EPOC-ER for a domestic cybercrime " +
          "investigation. Same-jurisdiction issuance — no EA review " +
          "applies (Workflow 1).",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: false,
  };

  // ── Target identifier — single Consumer email ──────────────────────
  // Seeded with mixed pipeline state so the Collection → Package →
  // Delivery progression is demoable end-to-end.
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

  // One job at Collection:Complete + Publish:Not Started — Submit-to-
  // Publish CTA visible.
  seedJob("msaProfile", "subscriberData", {
    taskId: "TSK-MSA-SUB-130-001",
    jobId: "JOB-MSA-SUB-130-001",
    collectionStatus: "Complete",
    publishStatus: "Not Started",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-28T09:30:00"),
  });
  // One job already at Publish:Complete + Delivery:Not Started — Submit-
  // to-Delivery CTA visible. Workflow 1 has no GFR / EA gate, so the
  // delivery button should be enabled (unlike Workflow 2 cases).
  seedJob("msaProfile", "authenticationLogs", {
    taskId: "TSK-MSA-AUTH-130-001",
    jobId: "JOB-MSA-AUTH-130-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-28T09:30:00"),
    publishStatusUpdatedAt: new Date("2026-05-29T14:00:00"),
  });
  // One job already at Delivery:Complete — counted in deliveredJobs.
  seedJob("exchangeConsumer", "contentData", {
    taskId: "TSK-EXC-CON-130-001",
    jobId: "JOB-EXC-CON-130-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "Complete",
    deliveryJobId: "DLV-EXC-CON-130-001",
    collectionStatusUpdatedAt: new Date("2026-05-28T09:30:00"),
    publishStatusUpdatedAt: new Date("2026-05-29T14:00:00"),
    deliveryStatusUpdatedAt: new Date("2026-05-30T11:00:00"),
  });

  const id1: AccountIdentifier = {
    id: genId(),
    value: "suspect.dublin.42@hotmail.com",
    type: "Email Address",
    taskId: "LDID-130001",
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
      "Irish national EPOC-ER target. Production request for subscriber " +
      "+ content data within the EPOC date window.",
  } as any;

  return {
    caseId: "LNS-2026-00130",
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
    country: ireland.countryName,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+353 1 858 8500",
    agencyAddress: {
      number: "Infirmary Road",
      city: "Dublin",
      stateProvince: "Dublin",
      postalCode: "D07 R6XR",
    },
    legalContext,
    natureOfCrimes: ["Cybercrime"],
    mlat: false,
    additionalCaseInformation:
      "Irish national EPOC-ER (Workflow 1 — Standard Production National). " +
      "IA + SP both in Ireland; no EA review leg applies. Routine 10-day " +
      "SLA governs per Reg 2023/1543 Art. 9(1).",
    caseNumber: "LNS-2026-00130",
    agencyCaseNumber: "DPP-2026-EPOC-ER-0130",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-26",
    dateReceived: "2026-05-26",
    dateOfIssuance: "2026-05-25",
    dateOfTransmission: "2026-05-26",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-ie1`,
        name: "State Solicitor Aoife Ní Bhriain",
        title: "State Solicitor",
        email: "a.nibhriain@dppireland.ie",
        phone: "+353 1 858 8500",
        role: "Submitter",
        languages: "en - English, ga - Irish",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-08-26"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC-ER (European Production Order) issued by the Irish DPP.",
    approvalReferenceNumber: "DPP-2026-EPOC-ER-0130",
    approverName: "District Judge Brendan Murphy",
    approverRole: "District Court Judge",
    approvalTimestamp: new Date("2026-05-25T16:30:00"),
    approvalIsEmergency: false,
    approverAlternateName: "DJ B. Murphy",
    approverEmail: "districtcourt.dublin@courts.ie",
    approverPhoneNumber: "+353 1 888 6000",
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
    timeZone: "Europe/Dublin (GMT/IST)",
    notes: [],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-IE-DPP-DUB-001",
      name: "Office of the Director of Public Prosecutions",
      issuingAuthorityRole: "Public Prosecutor's Office",
      country: ireland,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: ["DPP-2026-EPOC-ER-0130"],
      approver: {
        name: "District Judge Brendan Murphy",
        address:
          "Infirmary Road\nD07 R6XR Dublin\nIreland",
        tel: "+353 1 888 6000",
        fax: "+353 1 888 6001",
        email: "districtcourt.dublin@courts.ie",
        languagesSpoken: "en - English, ga - Irish",
      },
    },
    eevidenceEnforcingAuthority: {
      name: "Office of the Director of Public Prosecutions (Ireland)",
      contactName: "State Solicitor Aoife Ní Bhriain",
      address:
        "Infirmary Road\nD07 R6XR Dublin\nIreland",
      tel: "+353 1 858 8500",
      fax: "+353 1 858 8501",
      email: "ea@dppireland.ie",
    },
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: false,
    },

    escalationAuditEvents: [],

    // ── DARS Phase 2 Appendix F workflow discriminator ────────────────
    eevidenceWorkflow: 1,
    isInternational: false,
  } as unknown as FormData;
}
