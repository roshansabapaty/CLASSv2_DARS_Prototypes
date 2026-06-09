/**
 * Mock case data for LNS-2026-00245 — Italian eEvidence EPOC-ER.
 *
 * **Scenario: Workflow 2 — Active EA Review Window.**
 *
 * Italian Procura della Repubblica issues an EPOC against a consumer
 * account. Cross-border → EA review applies. The EA has not yet
 * decided; the 10-day review window is currently active with several
 * days remaining.
 *
 * What this seed demonstrates:
 *   - Sticky-header chip: "EA REVIEW WINDOW · 5d"
 *   - GFR Panel: "EA REVIEW WINDOW — Enforcing Authority is reviewing"
 *     with the operational countdown badge
 *   - CollectionTracker Submit-to-Delivery button visibly disabled with
 *     the spec tooltip "Action blocked — EA review window active.
 *     Awaiting EA determination."
 *   - Collection still allowed during the hold (data ready for the
 *     moment the window clears)
 *
 * Companion seed LNS-2026-00247 demonstrates the *lapsed* path (Day-10
 * passed with no decision → green banner + Resume Delivery CTA).
 */

import type {
  AccountIdentifier,
  CaseLegalContext,
  EEvidenceGroundsForRefusal,
  FormData,
} from "../types/caseTypes";
import { createDefaultIdentifierServices } from "../config/lensServicesConfig";
import { computeSlaDueDate } from "../constants/slaConstants";

const genId = () =>
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function buildLENS202600245FormData(): FormData {
  // Timeline anchors. Today = 2026-05-27.
  //   EPOC received 2026-05-22 → EA notified same day.
  //   Window expires 2026-06-01 → 5 days remaining on case open.
  const createDate = new Date("2026-05-22");
  const dueDate = computeSlaDueDate("Routine", createDate, createDate);
  const startDate = new Date("2026-03-01");
  const endDate = new Date("2026-05-15");
  const leDateRange = { start: "2026-03-01", end: "2026-05-15" };

  const eaNotifiedAt = new Date("2026-05-22T09:00:00");
  const eaReviewWindowExpiresAt = new Date("2026-06-01T09:00:00");

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
    id: "AGY-IT-PR-MIL",
    name: "Procura della Repubblica di Milano",
    shortName: "Milan Public Prosecutor",
    aliases: ["Milan Procura"],
    country: italy,
    agencyType: "Prosecutor" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@giustizia.it",
  };
  const legalContext: CaseLegalContext = {
    country: italy,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-IT-PR-MIL-001",
          name: "Pubblico Ministero Lucia Romano",
          title: "Pubblico Ministero",
          email: "l.romano@giustizia.it",
          phone: "+39 02 5468 1234",
          role: "Submitter",
          languages: "it - Italian, en - English",
          source: "agency",
        },
        notes:
          "Italian EPOC-ER for an organised-fraud investigation. " +
          "EA review window currently open; awaiting determination.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: true,
  };

  // ── Target identifier ──────────────────────────────────────────────
  // Single Consumer identifier with collection-complete jobs sitting in
  // the publishable/deliverable queue. The "Review & Deliver" button on
  // CollectionTracker should render disabled with the EA-window tooltip.
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

  // Two jobs at Publish:Complete waiting for Submit-to-Delivery — the
  // visible gate the bridge installs.
  seedJob("msaProfile", "subscriberData", {
    taskId: "TSK-MSA-SUB-245-001",
    jobId: "JOB-MSA-SUB-245-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-23T08:00:00"),
    publishStatusUpdatedAt: new Date("2026-05-23T10:30:00"),
  });
  seedJob("exchangeConsumer", "contentData", {
    taskId: "TSK-EXC-CON-245-001",
    jobId: "JOB-EXC-CON-245-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-23T08:00:00"),
    publishStatusUpdatedAt: new Date("2026-05-23T10:30:00"),
  });

  const id1: AccountIdentifier = {
    id: genId(),
    value: "subject.under.investigation@hotmail.com",
    type: "Email Address",
    taskId: "LDID-245001",
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
      "Suspect under investigation for organised-fraud network " +
      "operating across northern Italy. Production request for " +
      "subscriber + content data within the EPOC date window.",
  } as any;

  // ── GFR block — no decision yet (active EA review window) ──────────
  const eevidenceGroundsForRefusal: EEvidenceGroundsForRefusal = {
    trigger: "Form1Review",
    notifiedAt: eaNotifiedAt,
    eaReviewWindowExpiresAt,
    ea: {
      name: "Department of Justice (Ireland)",
      referenceNumber: "MGCI-2026-EPOC-EA-0245",
    },
    // decision: undefined → EA is actively reviewing.
  };

  return {
    caseId: "LNS-2026-00245",
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
    agencyPhone: "+39 02 5468 1234",
    agencyAddress: {
      number: "Via Freguglia 1",
      city: "Milan",
      stateProvince: "Lombardy",
      postalCode: "20122",
    },
    legalContext,
    natureOfCrimes: ["Fraud"],
    mlat: false,
    additionalCaseInformation:
      "Italian EPOC-ER (Workflow 2 — International). EA review window " +
      "currently active; delivery is blocked pending EA determination " +
      "(or the lapse of the 10-day window per Art. 8 + 10(2)).",
    caseNumber: "LNS-2026-00245",
    agencyCaseNumber: "MIL-2026-EPOC-ER-0245",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-22",
    dateReceived: "2026-05-22",
    dateOfIssuance: "2026-05-21",
    dateOfTransmission: "2026-05-22",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-it1`,
        name: "Pubblico Ministero Lucia Romano",
        title: "Pubblico Ministero",
        email: "l.romano@giustizia.it",
        phone: "+39 02 5468 1234",
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
    authorizationExpirationDate: new Date("2026-08-22"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC-ER (European Production Order) issued by the Milan Procura.",
    approvalReferenceNumber: "MIL-2026-EPOC-ER-0245",
    approverName: "Giudice per le Indagini Preliminari Marco Bianchi",
    approverRole: "Investigating Judge",
    approvalTimestamp: new Date("2026-05-21T16:00:00"),
    approvalIsEmergency: false,
    approverAlternateName: "GIP M. Bianchi",
    approverEmail: "gip.milano@giustizia.it",
    approverPhoneNumber: "+39 02 5468 1300",
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
      idNumber: "IA-IT-PR-MIL-001",
      name: "Procura della Repubblica di Milano",
      issuingAuthorityRole: "Public Prosecutor's Office",
      country: italy,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: ["MIL-2026-EPOC-ER-0245"],
      approver: {
        name: "Giudice per le Indagini Preliminari Marco Bianchi",
        address: "Via Freguglia 1\n20122 Milan\nItaly",
        tel: "+39 02 5468 1300",
        fax: "+39 02 5468 1301",
        email: "gip.milano@giustizia.it",
        languagesSpoken: "it - Italian, en - English",
      },
    },
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: false,
    },

    escalationAuditEvents: [],

    // ── DARS Phase 2 Appendix F workflow discriminator + GFR block ────
    eevidenceWorkflow: 2,
    isInternational: true,
    eevidenceGroundsForRefusal,
  } as unknown as FormData;
}
