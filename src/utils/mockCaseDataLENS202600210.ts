/**
 * Mock case data for LNS-2026-00210 — Italian eEvidence case
 * demonstrating the **"enterprise-detected" manifest-error direction**:
 *
 * Scenario:
 *   - Issuing Authority is the Italian Polizia di Stato — Servizio
 *     Polizia Postale e delle Comunicazioni (Postal & Communications
 *     Police).
 *   - IA transmitted the EPOC with both Section g Sub-section D
 *     checkboxes UNSELECTED (Q1 `addressedToController = false`,
 *     Q2 `addressedToProcessor = false`). The IA effectively classified
 *     this as a Consumer-style eEvidence request.
 *   - When the Response Specialist runs Check Accounts on the target
 *     identifier, the account-existence check returns **Enterprise**:
 *     the account is hosted in an Italian tenancy
 *     (`acme-it.onmicrosoft.com`).
 *
 * The mismatch — IA didn't claim Enterprise; Microsoft sees Enterprise
 * — is the mirror image of LNS-2026-00190 and trips the new
 * `enterprise-detected` manifest-error direction in
 * `ManifestErrorWarningBanner`. The RS should issue an outbound Form 3
 * — Non-Execution Response with `manifestErrors` selected as the reason
 * because the EPOC should have been routed to the Enterprise customer
 * who controls the data, not addressed to Microsoft as the data
 * controller.
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
const genIdentifierTaskId = () =>
  `LDID-${Math.floor(Math.random() * 900_000) + 100_000}`;

export function buildLENS202600210FormData(): FormData {
  const createDate = new Date("2026-05-14");
  const dueDate = computeSlaDueDate("Routine", createDate);
  const startDate = new Date("2026-02-20");
  const endDate = new Date("2026-05-14");
  const leDateRange = { start: "2026-02-20", end: "2026-05-14" };

  // ── Structured legal context — Italy / National / Polizia di Stato ────
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
    id: "AGY-IT-POLPOST-001",
    name: "Polizia di Stato — Servizio Polizia Postale e delle Comunicazioni",
    shortName: "Polizia Postale",
    aliases: ["Italian Postal & Communications Police"],
    country: italy,
    agencyType: "LawEnforcement" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@poliziadistato.it",
  };
  const legalContext: CaseLegalContext = {
    country: italy,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-IT-POLPOST-001",
          name: "Sostituto Commissario Marco Bianchi",
          title: "Sostituto Commissario",
          email: "m.bianchi@poliziadistato.it",
          phone: "+39 06 4688 2200",
          role: "Submitter",
          languages: "it - Italian, en - English",
          source: "agency",
        },
        notes:
          "Italian Postal & Communications Police — Central Crime " +
          "Operations Service. IA transmitted the EPOC without ticking " +
          "either Enterprise checkbox in Section g Sub-section D.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: false,
  };

  // ── Single Enterprise email identifier — deliberate mismatch with the
  //    IA's "no Enterprise flag" submission. The seeded `Enterprise`
  //    accountType drives `accountExistenceCheck.ts` to return Enterprise
  //    when the RS clicks Check Accounts, surfacing the manifest-error
  //    banner in its new `enterprise-detected` direction.
  const id1: AccountIdentifier = {
    id: genId(),
    value: "m.rossi@acme-it.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "not-checked",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(),
    checkAccounts: {
      accountType: "Enterprise",
      tenantId: "2c7b6d31-4a18-4e89-bf02-91a4e0d59b73",
      tenantPrimaryDomain: "acme-it.onmicrosoft.com",
      tenantAdminName: "Giulia Conti",
      tenantAdminEmail: "tenant.admin@acme-it.com",
      tenantAdminPhone: "+39 02 7212 3400",
    },
    leExternalServices: ["Email", "Microsoft Account Profile"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
    },
    issuingAuthorityNotes:
      "Polizia Postale investigation into a coordinated payment-card " +
      "fraud network operating across northern Italy. Suspect linked to " +
      "this Microsoft account; the IA did not classify the account as " +
      "Enterprise on the EPOC envelope.",
  } as any;

  return {
    caseId: "LNS-2026-00210",
    createDate,
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "Waiting on Triage",
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    country: italy.countryName,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+39 06 4688 2200",
    agencyAddress: {
      number: "Via Tuscolana 1548",
      city: "Rome",
      stateProvince: "Lazio",
      postalCode: "00173",
    },
    legalContext,
    natureOfCrimes: ["OtherFinancialCrimeOrFraud", "Cybercrime"],
    mlat: false,
    additionalCaseInformation:
      "Italian eEvidence demo case exercising the inverse manifest-error " +
      "path. IA submitted the EPOC envelope with both Section g " +
      "Sub-section D Enterprise checkboxes unselected (Q1 = false, " +
      "Q2 = false). Check Accounts on the target identifier returns " +
      "Enterprise — the EPOC should have been routed to the Enterprise " +
      "customer rather than addressed to Microsoft as the data " +
      "controller. The Manifest Error banner should fire with the " +
      "'enterprise-detected' direction.",
    // LENS case number — same canonical value as `caseId`. The
    // Polizia Postale reference lives in `agencyCaseNumber` below.
    caseNumber: "LNS-2026-00210",
    agencyCaseNumber: "POLPOST-ROM-2026-FR-0210",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-14",
    dateReceived: "2026-05-14",
    dateOfIssuance: "2026-05-13",
    dateOfTransmission: "2026-05-14",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-it1`,
        name: "Sostituto Commissario Marco Bianchi",
        title: "Sostituto Commissario",
        email: "m.bianchi@poliziadistato.it",
        phone: "+39 06 4688 2200",
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
    authorizationExpirationDate: new Date("2026-08-14"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC issued by Polizia Postale for subscriber + content data " +
      "linked to a coordinated payment-card fraud investigation. IA did " +
      "not tick either Enterprise checkbox in Section g Sub-section D.",
    approvalReferenceNumber: "POLPOST-ROM-2026-FR-0210",
    approverName: "Pubblico Ministero Lorenzo Ricci",
    approverRole: "Public Prosecutor (Procura della Repubblica di Roma)",
    approvalTimestamp: new Date("2026-05-13T14:00:00"),
    approvalIsEmergency: false,
    approverAlternateName: "PM L. Ricci",
    approverEmail: "eevidence@procura.roma.giustizia.it",
    approverPhoneNumber: "+39 06 4434 1000",
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
    notes: [
      {
        id: `note-${Date.now().toString(36)}-it1`,
        content:
          "Italian eEvidence demo. IA = Polizia Postale. Section g " +
          "Sub-section D Q1 + Q2 both UNSELECTED. Target identifier " +
          "resolves to Enterprise — manifest-error warning should fire in " +
          "the new 'enterprise-detected' direction. RS should issue an " +
          "outbound Form 3 (Non-Execution Response, manifestErrors).",
        createdBy: "Nicole Garcia",
        createdAt: createDate,
      },
    ],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-IT-POLPOST-001",
      name: "Polizia di Stato — Servizio Polizia Postale e delle Comunicazioni",
      issuingAuthorityRole: "National Police",
      country: italy,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: ["POLPOST-ROM-2026-FR-0210"],
      approver: {
        name: "Pubblico Ministero Lorenzo Ricci",
        address:
          "Piazzale Clodio 1\n00195 Rome\nItaly",
        tel: "+39 06 4434 1000",
        fax: "+39 06 4434 1001",
        email: "eevidence@procura.roma.giustizia.it",
        languagesSpoken: "it - Italian, en - English",
      },
    },
    eevidenceEnforcingAuthority: {
      name: "Ministero della Giustizia — Direzione Generale degli Affari Internazionali",
      contactName: "Dott.ssa Elena Russo",
      address: "Via Arenula 70\n00186 Rome\nItaly",
      tel: "+39 06 6885 1234",
      fax: "+39 06 6885 1235",
      email: "eevidence@giustizia.it",
    },
    // IA submitted the envelope with BOTH Enterprise checkboxes
    // explicitly unselected. This is the validation case for the
    // `enterprise-detected` manifest-error direction — Check Accounts
    // will return Enterprise even though the IA didn't claim it.
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: false,
      // The IA did mark `permissionToNotifyUser = true` — direct user
      // notification was permitted on the envelope. Surfaces under
      // its own row regardless of Q1/Q2 per the existing display rules.
      permissionToNotifyUser: true,
    },
    eevidenceRelatedCases: [],
    // Workflow 2 — Italy IA, cross-border to the Irish SP.
    eevidenceWorkflow: 2,
    isInternational: true,
  };
}
