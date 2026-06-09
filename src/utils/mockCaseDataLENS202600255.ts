/**
 * Mock case data for LNS-2026-00255 — Belgian eEvidence EPOC-ER.
 *
 * **Scenario: Form1-None-EaClears (Workflow chain 2 → 6).**
 *
 * Belgian IA issues an EPOC; the case is cross-border so the EA-review
 * leg of Appendix F Workflow 2 applies. The Belgian Enforcing Authority
 * reviews Form 1 and **explicitly clears the case** by issuing a
 * `EPOCNoGroundsForRefusalInformation` (ETSI 5.5.4) — no Art. 12 grounds
 * apply, production may proceed.
 *
 * Outcome the prototype demonstrates:
 *   - GroundsForRefusalPanel renders the green "EA cleared this case"
 *     confirmation banner at the top of Case Overview.
 *   - Sticky-header chip is **not** rendered (None decisions don't get
 *     a persistent chip — the panel alone is enough signal).
 *   - **Case SLA chip unchanged** (None decisions have no SLA effect;
 *     SLA was never paused in the first place).
 *   - Delivery proceeds normally — no gating from CollectionTracker.
 *   - Audit Thread carries the `GfrCleared` event.
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

export function buildLENS202600255FormData(): FormData {
  const createDate = new Date("2026-05-08");
  const dueDate = computeSlaDueDate("Routine", createDate, createDate);
  const startDate = new Date("2026-02-15");
  const endDate = new Date("2026-05-05");
  const leDateRange = { start: "2026-02-15", end: "2026-05-05" };

  // ── EA timeline ────────────────────────────────────────────────────
  const eaNotifiedAt = new Date("2026-05-09T09:00:00");
  const eaReviewWindowExpiresAt = new Date("2026-05-19T09:00:00");
  const eaDecidedAt = new Date("2026-05-12T10:15:00");

  // ── Structured legal context ───────────────────────────────────────
  const belgium = {
    countryCode: "BE",
    countryName: "Belgium",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: belgium,
    jurisdictionLevel: "National",
    jurisdictionName: "Koninkrijk België / Royaume de Belgique",
  };
  const issuingAuthority = {
    id: "AGY-BE-FED-FGP",
    name: "Federaal Parket / Parquet Fédéral",
    shortName: "Federal Prosecutor",
    aliases: ["Belgian Federal Prosecutor's Office"],
    country: belgium,
    agencyType: "Prosecutor" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@just.fgov.be",
  };
  const legalContext: CaseLegalContext = {
    country: belgium,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-BE-FED-001",
          name: "Procureur fédéral Geert Dupont",
          title: "Procureur fédéral",
          email: "g.dupont@just.fgov.be",
          phone: "+32 2 557 7711",
          role: "Submitter",
          languages: "nl - Dutch, fr - French, en - English",
          source: "agency",
        },
        notes:
          "Belgian EPOC-ER (production order) for a cybercrime " +
          "investigation. EA reviewed Form 1 and issued an explicit " +
          "No Grounds for Refusal decision.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: true, // International → EA review applies
  };

  // ── Target identifier ──────────────────────────────────────────────
  // The default service config has every category disabled; we
  // selectively enable a few categories on the consumer-side services
  // (msaProfile + exchangeConsumer) so the CollectionTracker has
  // visible jobs to render the Phase D.5 demo.
  //
  // The Belgian identifier is `Consumer` (per checkAccounts) so the
  // Consumer-side service keys (`msaProfile`, `exchangeConsumer`) are
  // the ones that surface on the case form. One job is pre-seeded
  // with `deliveryStatus: "Failed"` to trigger the WISP error banner +
  // Retry Delivery dialog on case open; another job is pre-seeded as
  // `DeliveryAcknowledged` so the matrix shows both states.
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

  // Service-key reminder: LENS_SERVICES has per-account-type keys
  // (`msaProfile` / `exchangeConsumer` / etc.), each with bespoke
  // group lists. `msaProfile` carries the full four-group taxonomy
  // (subscriberData / authenticationLogs / trafficData / contentData);
  // `exchangeConsumer` only carries trafficData + contentData. The
  // seeds below use the actual existing group keys per service —
  // misnamed groups fall through silently via seedJob's early return.

  // Failed delivery job — surfaces the WISP error banner + Retry
  // Delivery dialog immediately on case open. msaProfile carries the
  // subscriberData group so this lands.
  if (
    !seedJob("msaProfile", "subscriberData", {
      taskId: "TSK-MSA-SUB-255-001",
      jobId: "JOB-MSA-SUB-255-001",
      collectionStatus: "Complete",
      publishStatus: "Complete",
      deliveryStatus: "Failed",
      deliveryJobId: "DLV-MSA-SUB-255-001",
      deliveryError:
        "WISP `/eevidence/deliverystatus` reported 'Error' — receiving " +
        "IA endpoint returned HTTP 503 (Service Unavailable). The " +
        "payload was not accepted; the package remains queued for retry.",
      collectionStatusUpdatedAt: new Date("2026-05-13T09:00:00"),
      publishStatusUpdatedAt: new Date("2026-05-13T11:20:00"),
      deliveryStatusUpdatedAt: new Date("2026-05-13T14:42:00"),
    })
  ) {
    // Defensive: if msaProfile's group config ever changes, surface
    // the miss so a future contributor doesn't lose the demo silently.
    console.warn(
      "[LNS-2026-00255 seed] Failed-delivery seed did not land — " +
        "msaProfile.subscriberData missing from LENS service config.",
    );
  }

  // Acknowledged delivery job — DeliveryAcknowledged terminal state.
  // exchangeConsumer carries the contentData group.
  seedJob("exchangeConsumer", "contentData", {
    taskId: "TSK-EXC-CON-255-001",
    jobId: "JOB-EXC-CON-255-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "DeliveryAcknowledged",
    deliveryJobId: "DLV-EXC-CON-255-001",
    deliveryAcknowledgedAt: new Date("2026-05-13T15:08:00"),
    collectionStatusUpdatedAt: new Date("2026-05-13T09:00:00"),
    publishStatusUpdatedAt: new Date("2026-05-13T11:20:00"),
    deliveryStatusUpdatedAt: new Date("2026-05-13T15:08:00"),
  });

  // Plain `Complete` job — surfaces the standard green ✓ dot for
  // comparison alongside the Failed (✕) and Acknowledged (✓✓) dots.
  // msaProfile.authenticationLogs has one item.
  seedJob("msaProfile", "authenticationLogs", {
    taskId: "TSK-MSA-AUTH-255-001",
    jobId: "JOB-MSA-AUTH-255-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "Complete",
    deliveryJobId: "DLV-MSA-AUTH-255-001",
    collectionStatusUpdatedAt: new Date("2026-05-13T09:00:00"),
    publishStatusUpdatedAt: new Date("2026-05-13T11:20:00"),
    deliveryStatusUpdatedAt: new Date("2026-05-13T13:55:00"),
  });

  // Publishable job — collection complete, publish NOT started. This
  // gives the RS a live Submit-to-Publish gate to exercise on case
  // open, so the natural Collection → Package transition is visible
  // alongside the three terminal-state seeds above. msaProfile.trafficData
  // is a free slot (the other msaProfile groups are taken).
  seedJob("msaProfile", "trafficData", {
    taskId: "TSK-MSA-TRA-255-001",
    jobId: "JOB-MSA-TRA-255-001",
    collectionStatus: "Complete",
    publishStatus: "Not Started",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-13T10:18:00"),
  });

  const id1: AccountIdentifier = {
    id: genId(),
    value: "anonymous.suspect.42@outlook.com",
    type: "Email Address",
    taskId: "LDID-100010",
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
      "Subject under investigation for distributed cybercrime. " +
      "Production request for content + subscriber data.",
  } as any;

  // ── GFR block — None decision, Form1Review trigger ─────────────────
  const eevidenceGroundsForRefusal: EEvidenceGroundsForRefusal = {
    trigger: "Form1Review",
    notifiedAt: eaNotifiedAt,
    eaReviewWindowExpiresAt,
    ea: {
      name: "Department of Justice (Ireland)",
      referenceNumber: "SPF-CI-2026-NGR-0255",
    },
    decision: {
      kind: "None",
      decidedAt: eaDecidedAt,
      decidedBy: "Niamh O'Brien (Central Authority Lead)",
      note:
        "The Enforcing Authority identifies no grounds for refusal " +
        "within the meaning of Art. 12 of Regulation (EU) 2023/1543. " +
        "Production may proceed on the schedule set out in the EPOC.",
    },
  };

  // ── Audit thread ───────────────────────────────────────────────────
  const auditEvents: EscalationAuditEvent[] = [
    {
      id: `audit-${createDate.getTime().toString(36)}-1`,
      kind: "GfrCleared",
      actor: "System (EA inbound)",
      performedAt: eaDecidedAt,
      note:
        "Irish Enforcing Authority issued an explicit No Grounds for " +
        "Refusal decision on Form 1 review. Production may proceed.",
    },
  ];

  return {
    caseId: "LNS-2026-00255",
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
    country: belgium.countryName,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+32 2 557 7711",
    agencyAddress: {
      number: "Rue des Quatre Bras 4",
      city: "Brussels",
      stateProvince: "Brussels-Capital",
      postalCode: "1000",
    },
    legalContext,
    natureOfCrimes: ["Cybercrime"],
    mlat: false,
    additionalCaseInformation:
      "Belgian EPOC-ER (Workflow 2 — International). EA reviewed " +
      "Form 1 and issued explicit No Grounds for Refusal. Production " +
      "may proceed.",
    caseNumber: "LNS-2026-00255",
    agencyCaseNumber: "FED-2026-EPOC-ER-0255",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-08",
    dateReceived: "2026-05-08",
    dateOfIssuance: "2026-05-07",
    dateOfTransmission: "2026-05-08",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-be1`,
        name: "Procureur fédéral Geert Dupont",
        title: "Procureur fédéral",
        email: "g.dupont@just.fgov.be",
        phone: "+32 2 557 7711",
        role: "Submitter",
        languages: "nl - Dutch, fr - French, en - English",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-08-08"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC-ER (European Production Order) issued by the Belgian " +
      "Federal Prosecutor's Office.",
    approvalReferenceNumber: "FED-2026-EPOC-ER-0255",
    approverName: "Juge d'instruction Marc Lambert",
    approverRole: "Investigating Judge (Tribunal de première instance francophone)",
    approvalTimestamp: new Date("2026-05-07T15:30:00"),
    approvalIsEmergency: false,
    approverAlternateName: "JI M. Lambert",
    approverEmail: "instruction@just.fgov.be",
    approverPhoneNumber: "+32 2 557 7800",
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
    timeZone: "Europe/Brussels (CET/CEST)",
    notes: [],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-BE-FED-FGP-001",
      name: "Federaal Parket / Parquet Fédéral",
      issuingAuthorityRole: "Public Prosecutor's Office",
      country: belgium,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: ["FED-2026-EPOC-ER-0255"],
      approver: {
        name: "Juge d'instruction Marc Lambert",
        address:
          "Place Poelaert 1\n1000 Brussels\nBelgium",
        tel: "+32 2 557 7800",
        fax: "+32 2 557 7801",
        email: "instruction@just.fgov.be",
        languagesSpoken: "nl - Dutch, fr - French, en - English",
      },
    },
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: false,
    },

    // ── Audit trail (no SLA pause — None doesn't pause case SLA) ──────
    escalationAuditEvents: auditEvents,

    // ── DARS Phase 2 Appendix F workflow discriminator + GFR block ────
    eevidenceWorkflow: 2,
    isInternational: true,
    eevidenceGroundsForRefusal,
  } as unknown as FormData;
}
