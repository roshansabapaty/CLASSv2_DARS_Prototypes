/**
 * Mock case data for LNS-2026-00247 — French eEvidence EPOC-ER.
 *
 * **Scenario: Workflow 2 — EA Review Window Lapsed (Art. 8 + 10(2)).**
 *
 * French Tribunal Judiciaire issues an EPOC against a consumer
 * account. Cross-border → EA review applies. The 10-day window has
 * passed with no EA decision; on case open the `useEaWindowExpiry`
 * hook auto-fires the `EaWindowExpired` audit event and flips the
 * GFR Panel into the lapsed-with-Resume-Delivery branch.
 *
 * What this seed demonstrates:
 *   - Sticky-header chip: "EA window lapsed · resume delivery" (warn)
 *   - GFR Panel: green card with "EA review window expired — delivery
 *     is now permitted" + primary Resume Delivery CTA
 *   - Audit thread shows the auto-appended `EaWindowExpired` event
 *   - After Resume Delivery: chip flips to success tone, panel swaps
 *     to confirmation card, Submit-to-Delivery becomes clickable
 *
 * Companion seed LNS-2026-00245 demonstrates the *active* window path
 * (5 days remaining, EA still reviewing).
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

export function buildLENS202600247FormData(): FormData {
  // Timeline anchors. Today = 2026-05-27.
  //   EPOC received 2026-05-15 → EA notified same day.
  //   Window expired 2026-05-25 (2 days ago) → useEaWindowExpiry
  //   hook fires EaWindowExpired on case mount.
  const createDate = new Date("2026-05-15");
  const dueDate = computeSlaDueDate("Routine", createDate);
  const startDate = new Date("2026-02-15");
  const endDate = new Date("2026-05-10");
  const leDateRange = { start: "2026-02-15", end: "2026-05-10" };

  const eaNotifiedAt = new Date("2026-05-15T09:00:00");
  const eaReviewWindowExpiresAt = new Date("2026-05-25T09:00:00");

  // ── Structured legal context ───────────────────────────────────────
  const france = {
    countryCode: "FR",
    countryName: "France",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: france,
    jurisdictionLevel: "National",
    jurisdictionName: "République française",
  };
  const issuingAuthority = {
    id: "AGY-FR-TJ-PAR",
    name: "Tribunal Judiciaire de Paris — Parquet National Cyber",
    shortName: "Paris J3 Cyber Prosecutor",
    aliases: ["J3 Parquet"],
    country: france,
    agencyType: "Prosecutor" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@justice.fr",
  };
  const legalContext: CaseLegalContext = {
    country: france,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-FR-TJ-PAR-001",
          name: "Procureur de la République Camille Lefèvre",
          title: "Procureur de la République",
          email: "c.lefevre@justice.fr",
          phone: "+33 1 44 32 51 51",
          role: "Submitter",
          languages: "fr - French, en - English",
          source: "agency",
        },
        notes:
          "French EPOC-ER for a ransomware-extortion investigation. " +
          "EA review window passed with no decision — hold lapsed by " +
          "operation of Art. 8 + 10(2), EU Reg. 2023/1543.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: true,
  };

  // ── Target identifier ──────────────────────────────────────────────
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

  // Two jobs at Publish:Complete awaiting Submit-to-Delivery so the
  // Resume Delivery → "Review & Deliver" transition is visible.
  seedJob("msaProfile", "subscriberData", {
    taskId: "TSK-MSA-SUB-247-001",
    jobId: "JOB-MSA-SUB-247-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-16T08:00:00"),
    publishStatusUpdatedAt: new Date("2026-05-16T11:00:00"),
  });
  seedJob("exchangeConsumer", "contentData", {
    taskId: "TSK-EXC-CON-247-001",
    jobId: "JOB-EXC-CON-247-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-16T08:00:00"),
    publishStatusUpdatedAt: new Date("2026-05-16T11:00:00"),
  });

  const id1: AccountIdentifier = {
    id: genId(),
    value: "ransomware.suspect@outlook.fr",
    type: "Email Address",
    taskId: "LDID-247001",
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
      "Suspect under investigation for ransomware extortion targeting " +
      "French municipalities. Production request for subscriber + " +
      "content data covering the EPOC window.",
  } as any;

  // ── GFR block — no decision, window already lapsed ──────────────────
  // `windowLapsed` is intentionally left unset so the useEaWindowExpiry
  // hook fires the audit event on mount (live demo of auto-detection).
  const eevidenceGroundsForRefusal: EEvidenceGroundsForRefusal = {
    trigger: "Form1Review",
    notifiedAt: eaNotifiedAt,
    eaReviewWindowExpiresAt,
    ea: {
      name: "Ministère de la Justice — Direction des Affaires Criminelles et des Grâces",
      referenceNumber: "DACG-2026-EPOC-EA-0247",
    },
    // decision: undefined → no EA determination ever arrived.
    // windowLapsed: not set yet → hook auto-fires on case open.
  };

  return {
    caseId: "LNS-2026-00247",
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
    country: france.countryName,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+33 1 44 32 51 51",
    agencyAddress: {
      number: "Parvis du Tribunal de Paris 1",
      city: "Paris",
      stateProvince: "Île-de-France",
      postalCode: "75017",
    },
    legalContext,
    natureOfCrimes: ["Cybercrime", "OtherFinancialCrimeOrFraud"],
    mlat: false,
    additionalCaseInformation:
      "French EPOC-ER (Workflow 2 — International). EA review window " +
      "lapsed at 2026-05-25 with no decision. By Art. 8 + 10(2), EU " +
      "Reg. 2023/1543, the hold lifts — Specialist must manually " +
      "initiate delivery via the Resume Delivery CTA.",
    caseNumber: "LNS-2026-00247",
    agencyCaseNumber: "PNJ-2026-EPOC-ER-0247",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-15",
    dateReceived: "2026-05-15",
    dateOfIssuance: "2026-05-14",
    dateOfTransmission: "2026-05-15",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-fr1`,
        name: "Procureur de la République Camille Lefèvre",
        title: "Procureur de la République",
        email: "c.lefevre@justice.fr",
        phone: "+33 1 44 32 51 51",
        role: "Submitter",
        languages: "fr - French, en - English",
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
      "EPOC-ER (European Production Order) issued by the Paris J3 Cyber Prosecutor.",
    approvalReferenceNumber: "PNJ-2026-EPOC-ER-0247",
    approverName: "Juge d'instruction Émilie Garnier",
    approverRole: "Investigating Judge",
    approvalTimestamp: new Date("2026-05-14T15:00:00"),
    approvalIsEmergency: false,
    approverAlternateName: "JI E. Garnier",
    approverEmail: "instruction.j3@justice.fr",
    approverPhoneNumber: "+33 1 44 32 51 60",
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
    timeZone: "Europe/Paris (CET/CEST)",
    notes: [],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-FR-TJ-PAR-001",
      name: "Tribunal Judiciaire de Paris — Parquet National Cyber",
      issuingAuthorityRole: "Public Prosecutor's Office",
      country: france,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: ["PNJ-2026-EPOC-ER-0247"],
      approver: {
        name: "Juge d'instruction Émilie Garnier",
        address:
          "Parvis du Tribunal de Paris 1\n75017 Paris\nFrance",
        tel: "+33 1 44 32 51 60",
        fax: "+33 1 44 32 51 61",
        email: "instruction.j3@justice.fr",
        languagesSpoken: "fr - French, en - English",
      },
    },
    eevidenceEnforcingAuthority: {
      name: "Ministère de la Justice — Direction des Affaires Criminelles et des Grâces",
      contactName: "Sous-directrice Margaux Petit",
      address:
        "13 Place Vendôme\n75001 Paris\nFrance",
      tel: "+33 1 44 77 60 60",
      fax: "+33 1 44 77 60 61",
      email: "dacg@justice.fr",
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
