/**
 * Mock case data for LNS-2026-00215 — Spanish eEvidence EPOC-PR.
 *
 * **Scenario: Workflow 4 — Preservation Order Active.**
 *
 * Spanish Audiencia Nacional issues an EPOC-PR. DARS receives the
 * Form 2 envelope and the case enters the "preserving" state. No
 * extensions yet, no production order incoming, no end-of-preservation.
 *
 * What this seed demonstrates:
 *   - PreservationOrderActiveBanner at the top of CollectionTracker
 *     showing the earliest preservation expiry + "Acknowledge Receipt" CTA
 *   - Sticky-header chip: standard SLA (no retention clock yet — that
 *     starts on a terminal event)
 *   - Form 2 inbound correspondence item viewable in the Correspondence
 *     panel via the EPOC_FORM_2 template
 *   - Audit thread: `PreservationOrderReceived` auto-fired on case open
 *   - Acknowledge Receipt CTA opens the composer with
 *     EPOC_PRESERVATION_ACK pre-attached; on send, the
 *     `PreservationOrderAcknowledged` audit lands and the banner
 *     swaps to the confirmation state
 *
 * Companion EPOC-PR seeds:
 *   - LNS-2026-00220: full lifecycle (Form 2 → Form 5 → Form 6 → End)
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

export function buildLENS202600215FormData(): FormData {
  // Timeline anchors. Today = 2026-05-27.
  //   EPOC-PR received 2026-05-25 (2 days ago).
  //   Initial preservation expiration 2026-11-25 (6 months out).
  const createDate = new Date("2026-05-25");
  const dueDate = computeSlaDueDate("Routine", createDate, createDate);
  const startDate = new Date("2026-02-15");
  const endDate = new Date("2026-05-20");
  const leDateRange = { start: "2026-02-15", end: "2026-05-20" };

  // ── Structured legal context ───────────────────────────────────────
  const spain = {
    countryCode: "ES",
    countryName: "Spain",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: spain,
    jurisdictionLevel: "National",
    jurisdictionName: "Reino de España",
  };
  const issuingAuthority = {
    id: "AGY-ES-AN-MAD",
    name: "Audiencia Nacional — Juzgado Central de Instrucción",
    shortName: "Madrid Audiencia Nacional",
    aliases: ["AN Central Madrid"],
    country: spain,
    agencyType: "Court" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@poderjudicial.es",
  };
  const legalContext: CaseLegalContext = {
    country: spain,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-ES-AN-MAD-001",
          name: "Magistrado Juan Carlos Martínez",
          title: "Juez Central de Instrucción",
          email: "j.martinez@poderjudicial.es",
          phone: "+34 91 397 1234",
          role: "Submitter",
          languages: "es - Spanish, en - English",
          source: "agency",
        },
        notes:
          "Spanish EPOC-PR preservation order issued by the Audiencia " +
          "Nacional for an ongoing organised-crime investigation. " +
          "Awaiting follow-on production order.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: true,
  };

  // ── Target identifier — single Consumer email ──────────────────────
  const services = createDefaultIdentifierServices() as Record<string, any>;

  const id1: AccountIdentifier = {
    id: genId(),
    value: "investigation.target@hotmail.es",
    type: "Email Address",
    taskId: "LDID-215001",
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
      "Spanish EPOC-PR target. Preserve subscriber + content data " +
      "pending the production order's issuance.",
    desiredPreservationExpiration: "2026-11-25",
  } as any;

  return {
    caseId: "LNS-2026-00215",
    createDate,
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC PR",
    requestOrigin: "LEAPI",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "In Progress",
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    country: spain.countryName,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+34 91 397 1234",
    agencyAddress: {
      number: "Calle García Gutiérrez 1",
      city: "Madrid",
      stateProvince: "Madrid",
      postalCode: "28004",
    },
    legalContext,
    natureOfCrimes: ["OtherFinancialCrimeOrFraud"],
    mlat: false,
    additionalCaseInformation:
      "Spanish EPOC-PR (Workflow 4 — Preservation Order). Form 2 " +
      "received 2026-05-25; preservation obligation active until " +
      "2026-11-25 unless extended (Form 6) or ended (EndPreservation).",
    caseNumber: "LNS-2026-00215",
    agencyCaseNumber: "AN-2026-EPOC-PR-0215",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-25",
    dateReceived: "2026-05-25",
    dateOfIssuance: "2026-05-24",
    dateOfTransmission: "2026-05-25",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-es1`,
        name: "Magistrado Juan Carlos Martínez",
        title: "Juez Central de Instrucción",
        email: "j.martinez@poderjudicial.es",
        phone: "+34 91 397 1234",
        role: "Submitter",
        languages: "es - Spanish, en - English",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-11-25"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC-PR (European Preservation Order) issued by the Madrid " +
      "Audiencia Nacional.",
    approvalReferenceNumber: "AN-2026-EPOC-PR-0215",
    approverName: "Magistrado Juan Carlos Martínez",
    approverRole: "Investigating Judge",
    approvalTimestamp: new Date("2026-05-24T17:00:00"),
    approvalIsEmergency: false,
    approverAlternateName: "JCI J.C. Martínez",
    approverEmail: "j.martinez@poderjudicial.es",
    approverPhoneNumber: "+34 91 397 1234",
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
    timeZone: "Europe/Madrid (CET/CEST)",
    notes: [],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-ES-AN-MAD-001",
      name: "Audiencia Nacional — Juzgado Central de Instrucción",
      issuingAuthorityRole: "Court",
      country: spain,
      approvalRole: "Court",
      approvalReferenceNumbers: ["AN-2026-EPOC-PR-0215"],
      approver: {
        name: "Magistrado Juan Carlos Martínez",
        address:
          "Calle García Gutiérrez 1\n28004 Madrid\nSpain",
        tel: "+34 91 397 1234",
        fax: "+34 91 397 1235",
        email: "j.martinez@poderjudicial.es",
        languagesSpoken: "es - Spanish, en - English",
      },
    },
    eevidenceEnforcingAuthority: {
      name: "Ministerio de Justicia — Subdirección General de Cooperación Jurídica Internacional",
      contactName: "Subdirectora María Soto",
      address:
        "Calle de San Bernardo 45\n28015 Madrid\nSpain",
      tel: "+34 91 390 4500",
      fax: "+34 91 390 4501",
      email: "cooperacion@mjusticia.es",
    },
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: false,
    },

    escalationAuditEvents: [],

    // ── DARS Phase 2 Appendix F workflow discriminator ────────────────
    eevidenceWorkflow: 4,
    isInternational: true,
  } as unknown as FormData;
}
