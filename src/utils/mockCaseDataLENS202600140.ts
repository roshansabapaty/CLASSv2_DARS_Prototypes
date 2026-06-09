/**
 * Mock case data for LNS-2026-00140 — German eEvidence Emergency EPOC-ER.
 *
 * **Scenario: Workflow 3 — Emergency Production (8-hour SLA).**
 *
 * German Bundeskriminalamt (BKA) issues an emergency EPOC against a
 * consumer account for an imminent kidnapping case. Per Reg 2023/1543
 * Art. 9(2), the IA's declaration of imminent danger to life triggers
 * the accelerated 8-hour SLA window.
 *
 * What this seed demonstrates:
 *   - `eevidenceWorkflow: 3` + `casePriority: "Emergency"` triggers the
 *     8h tier in `getSlaConfig` (Reg 2023/1543 Art. 9(2))
 *   - EmergencyEEvidenceBanner renders at the top of CollectionTracker
 *     showing the IA's stated emergency category + justification
 *   - Sticky-header SLA chip shows the accelerated 8h countdown — at
 *     case-open time the chip should be in Approaching (amber) state
 *     with ~2 hours remaining
 *   - Full Collection → Package → Delivery pipeline (no GFR, no
 *     preservation collapse)
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

export function buildLENS202600140FormData(): FormData {
  // Timeline anchors. Today = 2026-06-01.
  //   EPOC received 2026-06-01 04:00 (8h ago wall-clock).
  //   8h SLA → due 2026-06-01 12:00.
  //   Today ~10:00 UTC → ~2h remaining → Approaching (amber).
  const createDate = new Date("2026-06-01T04:00:00Z");
  // Compute the due date EXPLICITLY with the Emergency-eEvidence context
  // so the seeded dueDate matches the 8h SLA (not the legacy 3h tier).
  // Pass createDate as both `received` and `now` so Math.max(received, now)
  // resolves to createDate — otherwise the dueDate slides to "now + 8h"
  // every time the case-data builder runs and the chip's "Approaching"
  // demo never lands.
  const dueDate = computeSlaDueDate("Emergency", createDate, createDate, {
    requestType: "eEvidence",
    eevidenceWorkflow: 3,
  });
  const startDate = new Date("2026-04-01");
  const endDate = new Date("2026-06-01");
  const leDateRange = { start: "2026-04-01", end: "2026-06-01" };

  // ── Structured legal context — German IA, cross-border to Irish SP ──
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
    id: "AGY-DE-BKA-WIES",
    name: "Bundeskriminalamt — Abteilung Schwere und Organisierte Kriminalität",
    shortName: "BKA SO",
    aliases: ["BKA", "Federal Criminal Police"],
    country: germany,
    agencyType: "Police" as const,
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
          id: "AGT-DE-BKA-WIES-001",
          name: "Kriminaloberkommissarin Dr. Sandra Hofmann",
          title: "Kriminaloberkommissarin",
          email: "s.hofmann@bka.bund.de",
          phone: "+49 611 55 0",
          role: "Submitter",
          languages: "de - German, en - English",
          source: "agency",
        },
        notes:
          "German emergency EPOC-ER for an active kidnapping case. " +
          "IA declared imminent danger to life — Reg 2023/1543 " +
          "Art. 9(2) emergency procedure (8h SLA).",
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

  // One job ready to dispatch — Publish:Complete waiting on
  // Submit-to-Delivery. With 2h remaining on the 8h clock, the RS must
  // act quickly. No EA gate (Workflow 3 short-circuits the EA window
  // model for emergency cases per current scope).
  seedJob("msaProfile", "subscriberData", {
    taskId: "TSK-MSA-SUB-140-001",
    jobId: "JOB-MSA-SUB-140-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-06-01T05:30:00Z"),
    publishStatusUpdatedAt: new Date("2026-06-01T07:30:00Z"),
  });
  seedJob("msaProfile", "authenticationLogs", {
    taskId: "TSK-MSA-AUTH-140-001",
    jobId: "JOB-MSA-AUTH-140-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-06-01T05:30:00Z"),
    publishStatusUpdatedAt: new Date("2026-06-01T07:30:00Z"),
  });

  const id1: AccountIdentifier = {
    id: genId(),
    value: "kidnapping.suspect@outlook.de",
    type: "Email Address",
    taskId: "LDID-140001",
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
      "Suspect's consumer email account, last known active 6 hours ago. " +
      "Subscriber + authentication-log data critical to locating the " +
      "victim before the 8h SLA expires.",
  } as any;

  return {
    caseId: "LNS-2026-00140",
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
    agencyPhone: "+49 611 55 0",
    agencyAddress: {
      number: "Thaerstraße 11",
      city: "Wiesbaden",
      stateProvince: "Hesse",
      postalCode: "65193",
    },
    legalContext,
    natureOfCrimes: ["Kidnapping", "Cybercrime"],
    isThreatToLife: true,
    mlat: false,
    additionalCaseInformation:
      "German emergency EPOC-ER (Workflow 3 — Reg 2023/1543 Art. 9(2)). " +
      "Active kidnapping investigation; IA declared imminent danger to " +
      "life. 8-hour SLA window applies.",
    caseNumber: "LNS-2026-00140",
    agencyCaseNumber: "BKA-2026-EPOC-ER-0140-EMERG",
    relatedCaseNumbers: "",
    casePriority: "Emergency",
    dateServed: "2026-06-01",
    dateReceived: createDate,
    dateOfIssuance: "2026-06-01",
    dateOfTransmission: createDate,
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-de1`,
        name: "Kriminaloberkommissarin Dr. Sandra Hofmann",
        title: "Kriminaloberkommissarin",
        email: "s.hofmann@bka.bund.de",
        phone: "+49 611 55 0",
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
    authorizationExpirationDate: new Date("2026-09-01"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "Emergency EPOC-ER issued by the BKA — Reg 2023/1543 Art. 9(2).",
    approvalReferenceNumber: "BKA-2026-EPOC-ER-0140-EMERG",
    approverName: "Ermittlungsrichter Dr. Klaus Werner",
    approverRole: "Investigating Judge",
    approvalTimestamp: new Date("2026-06-01T03:30:00Z"),
    approvalIsEmergency: true,
    approverAlternateName: "ER K. Werner",
    approverEmail: "ermittlungsgericht@bka.bund.de",
    approverPhoneNumber: "+49 611 55 100",
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
    notes: [],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-DE-BKA-WIES-001",
      name: "Bundeskriminalamt — Abteilung Schwere und Organisierte Kriminalität",
      issuingAuthorityRole: "Federal Police",
      country: germany,
      approvalRole: "Judge",
      approvalReferenceNumbers: ["BKA-2026-EPOC-ER-0140-EMERG"],
      approver: {
        name: "Ermittlungsrichter Dr. Klaus Werner",
        address:
          "Thaerstraße 11\n65193 Wiesbaden\nGermany",
        tel: "+49 611 55 100",
        fax: "+49 611 55 101",
        email: "ermittlungsgericht@bka.bund.de",
        languagesSpoken: "de - German, en - English",
      },
    },
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: false,
    },
    // ── Art. 9(2) emergency declaration ───────────────────────────────
    eevidenceAuthorisationFlags: {
      emergencyJustification: {
        category: "DangerToLife",
        note:
          "Active kidnapping investigation, victim location unknown. " +
          "Subject made phone contact with extortion demand 6 hours " +
          "prior to EPOC issuance; subscriber + authentication-log data " +
          "needed urgently to locate the victim. Imminent threat to " +
          "life within the 8-hour Art. 9(2) window.",
      },
    },

    escalationAuditEvents: [],

    // ── DARS Phase 2 Appendix F workflow discriminator ────────────────
    eevidenceWorkflow: 3,
    isInternational: true,
  } as unknown as FormData;
}
