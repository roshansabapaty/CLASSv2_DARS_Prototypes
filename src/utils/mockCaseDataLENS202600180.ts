/**
 * Mock case data for LNS-2026-00180 — Spanish eEvidence demo case that
 * exercises the **Other Competent Authority → Validating Authority** path.
 *
 * Scenario:
 *   - Issuing Authority is the Catalan regional police (Mossos d'Esquadra),
 *     which under Spanish law is an "OtherCompetentAuthority" — they require
 *     judicial validation before transmitting an EPOC.
 *   - Validating Authority is an Investigating Judge of the Juzgado Central
 *     de Instrucción (Audiencia Nacional, Madrid).
 *   - Enforcing Authority is the Ministerio de Justicia central authority.
 *
 * The case demonstrates the conditional Validating Authority subsection
 * appearing on the Authorization Details card. The Enterprise Request card
 * is also populated to walk a shallower branch (no processor route — IA
 * went to the controller only) so the demo can show the early-stop UX.
 */

import type {
  AccountIdentifier,
  CaseLegalContext,
  DisclosureConstraints,
  EnterpriseContext,
  FormData,
} from "../types/caseTypes";
import { createDefaultIdentifierServices } from "../config/lensServicesConfig";
import { computeSlaDueDate } from "../constants/slaConstants";
import { get as getCorrespondenceForCase } from "../state/correspondenceStore";
import { MOCK_ORGS } from "../data/mockOrgs";

const genId = () =>
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const genIdentifierTaskId = () =>
  `LDID-${Math.floor(Math.random() * 900_000) + 100_000}`;

export function buildLENS202600180FormData(): FormData {
  const createDate = new Date("2026-05-10");
  const dueDate = computeSlaDueDate("Routine", createDate);
  const startDate = new Date("2026-01-01");
  const endDate = new Date("2026-05-10");
  const leDateRange = { start: "2026-01-01", end: "2026-05-10" };

  // ── Structured legal context — Spain / National / Mossos + Audiencia ──
  const spain = {
    countryCode: "ES",
    countryName: "Spain",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: spain,
    jurisdictionLevel: "National",
    jurisdictionName: "Cataluña / Madrid (Audiencia Nacional)",
  };
  const issuingAuthority = {
    id: "AGY-ES-MOSSOS-CIBER",
    name: "Mossos d'Esquadra — Unitat Central de Cibercriminalitat",
    shortName: "Mossos CIBER",
    aliases: ["Catalan Police Cybercrime Unit"],
    country: spain,
    agencyType: "LawEnforcement" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@mossos.gencat.cat",
  };
  const legalContext: CaseLegalContext = {
    country: spain,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-ES-MOSSOS-001",
          name: "Inspector Jordi Ferrer i Solé",
          title: "Inspector",
          email: "j.ferrer@mossos.gencat.cat",
          phone: "+34 93 300 22 96",
          role: "Submitter",
          languages: "ca - Catalan, es - Spanish, en - English",
          source: "agency",
        },
        notes:
          "Catalan regional police — Other Competent Authority under the " +
          "eEvidence regulation; judicial validation required.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: false,
  };

  // ── Single Enterprise email identifier — controller-route path ────────
  // Seeded Enterprise so `accountExistenceCheck` deterministically returns
  // Enterprise for this case. The Spanish demo demonstrates an EPOC that
  // the IA addressed to Microsoft as the controller, with an enterprise
  // tenancy backing the account (no manifest error mismatch).
  const id1: AccountIdentifier = {
    id: genId(),
    value: "subject-es@corp-iberia.example",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    // Per-identifier attorney review — Phase 1 merge. Mirrors the
    // case-level escalation block below so the AttorneyReviewWorkspace
    // surfaces the inline AttorneyReviewPanel on this row.
    taskStatus: "AttorneyReview",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(),
    checkAccounts: { accountType: "Enterprise" },
    leExternalServices: ["Email", "Microsoft Account Profile"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
    },
    issuingAuthorityNotes:
      "Suspect linked to organised cybercrime cell active in Catalonia. " +
      "Mossos requests subscriber data + IP login history; content data " +
      "scope is limited to investigative period authorised by the " +
      "validating judge.",
    attorneyEscalation: {
      role: "Attorney",
      assignedAttorneyId: "ATT-001",
      reason:
        "Spanish OCA-VA case with mixed authority roles. Need attorney " +
        "review of the validating judge's scope before disclosing content " +
        "data — the Mossos issued the EPOC under the Other Competent " +
        "Authority path; the Audiencia Nacional judge validated. Confirm " +
        "this combination meets Reg 2023/1543 Article 4(1) requirements.",
      escalatedAt: new Date("2026-05-11T09:30:00"),
      escalatedBy: "Nicole Garcia",
      status: "InformationRequested",
      scope: "some",
      informationRequest:
        "Please confirm with the IA whether the validating judge's " +
        "warrant covers content data extraction in full, or only the " +
        "subscriber + traffic-data scope listed in §C of the EPOC.",
      actions: [],
    },
  } as any;

  // Enterprise context for the new Attorney Review surfaces. Iberia is
  // flagged via the CLASS account check AND the eEvidence IA's
  // "addressed to controller" flag (both triggers fire).
  const enterpriseContext: EnterpriseContext = {
    triggers: ["class_account_check", "eevidence_ia_flag"],
    manifestErrorPresent: false,
    org: MOCK_ORGS["iberia-corp-es"],
    users: [
      {
        identifierId: id1.id,
        identifierValue: id1.value,
        lastLogonLocation: "Madrid, ES",
        geoResolutions30d: ["ES", "FR"],
        mailboxRegion: "EU North",
        oneDriveRegion: "EU North",
        conflictOfLawJurisdictions: ["ES", "FR"],
      },
    ],
    policyReviewRequired: false,
    execReviewRequired: false,
  };

  // eEvidence Art. 9(3) — controller notification is REQUIRED when the
  // EPOC is addressed to the controller leg; user notification is
  // permitted unless the order says otherwise.
  const disclosureConstraints: DisclosureConstraints = {
    controllerNotification: "Required",
    controllerNotificationNote:
      "EPOC addressed to controller — processor must inform controller per Reg. 2023/1543 Art. 9(3).",
    userNotification: "Permitted",
    userNotificationNote:
      "Order does not prohibit notifying the data subject; controller will likely handle the notification themselves.",
    source: "Order",
  };

  return {
    caseId: "LNS-2026-00180",
    createDate,
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC",
    requestOrigin: "LEAPI",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "Waiting on Triage",
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    country: spain.countryName,
    agencyCountryCode: spain.countryCode,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+34 93 300 22 96",
    agencyAddress: {
      number: "Travessera de les Corts 319-321",
      city: "Barcelona",
      stateProvince: "Catalonia",
      postalCode: "08029",
    },
    legalContext,
    // ETSI-keyed entries — TerrorismOrThreatToPublicSafety covers the
    // organised-cybercrime threat angle for this fictional scenario.
    natureOfCrimes: ["Cybercrime", "OtherFinancialCrimeOrFraud"],
    mlat: false,
    additionalCaseInformation:
      "Spanish eEvidence demo case. Exercises the Other Competent Authority " +
      "→ Validating Authority path: regional police issues the EPOC, an " +
      "Investigating Judge of the Audiencia Nacional validates it. The " +
      "Enterprise Request card walks the controller-only branch (no " +
      "processor-route reasons) to demonstrate the early-stop UX.",
    // LENS case number — same canonical value as `caseId`. The Mossos
    // d'Esquadra reference lives in `agencyCaseNumber` below.
    caseNumber: "LNS-2026-00180",
    agencyCaseNumber: "MOSSOS-BCN-2026-CIBER-0180",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-10",
    dateReceived: "2026-05-10",
    dateOfIssuance: "2026-05-08",
    dateOfTransmission: "2026-05-10",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-es1`,
        name: "Inspector Jordi Ferrer i Solé",
        title: "Inspector",
        email: "j.ferrer@mossos.gencat.cat",
        phone: "+34 93 300 22 96",
        role: "Submitter",
        languages: "ca - Catalan, es - Spanish, en - English",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-08-10"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC issued by Mossos d'Esquadra Cybercrime Unit and validated by " +
      "an Investigating Judge of the Audiencia Nacional. Authorises " +
      "collection of subscriber + content data for the identified " +
      "Microsoft consumer account in connection with an active organised " +
      "cybercrime investigation.",
    approvalReferenceNumber: "DJ-AN-2026-0180",
    approverName: "Magistrada-Jueza María del Carmen Castaño",
    approverRole: "Investigating Judge (Juzgado Central de Instrucción)",
    approvalTimestamp: new Date("2026-05-09T11:20:00"),
    approvalIsEmergency: false,
    approverAlternateName: "MJ M. Castaño",
    approverEmail: "audnac.juzg.cent.instr@justicia.es",
    approverPhoneNumber: "+34 91 397 23 00",
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
    notes: [
      {
        id: `note-${Date.now().toString(36)}-es1`,
        content:
          "Spanish eEvidence demo. IA = Mossos (Other Competent Authority); " +
          "VA = Investigating Judge of the Audiencia Nacional. Validates the " +
          "conditional Validating Authority subsection in the Authorization " +
          "Details card.",
        createdBy: "Nicole Garcia",
        createdAt: createDate,
      },
    ],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-ES-MOSSOS-001",
      name: "Mossos d'Esquadra — Unitat Central de Cibercriminalitat",
      issuingAuthorityRole: "Regional Police (Other Competent Authority)",
      country: spain,
      // Drives the conditional VA subsection on the Authorization Details
      // card and the EPOC Form 3 `B_validatingAuthority` autofill.
      approvalRole: "OtherCompetentAuthority",
      approvalReferenceNumbers: ["MOSSOS-BCN-2026-CIBER-0180"],
      approver: {
        name: "Inspector Jordi Ferrer i Solé",
        address:
          "Travessera de les Corts 319-321\n08029 Barcelona\nCataluña, Spain",
        tel: "+34 93 300 22 96",
        fax: "+34 93 300 22 99",
        email: "j.ferrer@mossos.gencat.cat",
        languagesSpoken: "ca - Catalan, es - Spanish, en - English",
      },
    },
    // Validating Authority — Investigating Judge that validated the EPOC.
    eevidenceValidatingAuthority: {
      idNumber: "VA-ES-AN-CENTRAL-INST-001",
      name: "Juzgado Central de Instrucción nº 6, Audiencia Nacional",
      country: spain,
      approvalRole: "JudgeCourtOrInvestigatingJudge",
      approvalReferenceNumbers: ["DJ-AN-2026-0180"],
      approver: {
        name: "Magistrada-Jueza María del Carmen Castaño",
        address:
          "Calle García Gutiérrez 1\n28004 Madrid\nSpain",
        tel: "+34 91 397 23 00",
        fax: "+34 91 397 23 11",
        email: "audnac.juzg.cent.instr@justicia.es",
        languagesSpoken: "es - Spanish, en - English",
      },
    },
    eevidenceEnforcingAuthority: {
      name: "Ministerio de Justicia — Subdirección General de Cooperación Jurídica Internacional",
      contactName: "Dña. Elena Ruiz Pérez",
      address: "Calle San Bernardo 62\n28015 Madrid\nSpain",
      tel: "+34 91 837 22 95",
      fax: "+34 91 837 22 96",
      email: "eevidence@mjusticia.es",
    },
    // Enterprise Request walks the controller-only branch (Q1 = YES,
    // Q2 = NO). The card is visible because Q1 = YES. The IA submitted
    // YES to both `processorShallNotInformController` and
    // `permissionToNotifyUser`, so both surface in the card — the new
    // rule renders these whenever the card is visible AND the IA's value
    // is YES, independent of which of Q1 / Q2 was YES.
    eevidenceEnterpriseRequest: {
      addressedToController: true,
      addressedToProcessor: false,
      processorShallNotInformController: true,
      permissionToNotifyUser: true,
    },
    // No related cases for this scenario — demo the empty state.
    eevidenceRelatedCases: [],

    // ── Attorney escalation: Info Requested ────────────────────────────
    // Scenario: the RS escalated this case to attorney review (concern
    // about the controller-only branch + judicial validation). The
    // attorney has bounced it back with an `InformationRequested` ask —
    // they need clarification on the validating judge's authority scope
    // before they'll release the case. This seeds the demo for:
    //   1. Header chip flips to amber "Info Requested".
    //   2. WorkflowStageBanner exposes a "Resume Escalation" button.
    //   3. Compose tab surfaces the RFI template at the top with the
    //      green "Recommended — Attorney requested more info" badge.
    attorneyEscalation: {
      role: "Attorney",
      assignedAttorneyId: "ATT-001", // Sarah Mitchell
      reason:
        "Spanish OCA-VA case with mixed authority roles. Need attorney " +
        "review of the validating judge's scope before disclosing content " +
        "data — the Mossos issued the EPOC under the Other Competent " +
        "Authority path; the Audiencia Nacional judge validated. Confirm " +
        "this combination meets Reg 2023/1543 Article 4(1) requirements.",
      escalatedAt: new Date("2026-05-11T09:30:00"),
      escalatedBy: "Nicole Garcia",
      status: "InformationRequested",
      informationRequest:
        "Please confirm with the IA whether the validating judge's " +
        "warrant covers content data extraction in full, or only the " +
        "subscriber + traffic-data scope listed in §C of the EPOC. The " +
        "judge's reference number doesn't disambiguate this. Once we " +
        "have a written clarification from the Audiencia Nacional, I " +
        "can sign off on the release.",
      actions: [],
    },
    escalationAuditEvents: [
      {
        id: "audit-seed-lns180-escalated",
        kind: "Escalated",
        actor: "Nicole Garcia",
        actorRole: "ResponseSpecialist",
        performedAt: new Date("2026-05-11T09:30:00"),
        note:
          "Specialist escalated the case to Attorney (Sarah Mitchell). " +
          "Concern about Validating Authority warrant scope for content " +
          "data on this OCA-routed EPOC.",
      },
      {
        id: "audit-seed-lns180-info-requested",
        kind: "InformationRequested",
        actor: "Sarah Mitchell",
        actorRole: "Attorney",
        performedAt: new Date("2026-05-12T13:42:00"),
        note:
          "Sarah needs the IA to clarify whether the validating judge's " +
          "warrant covers content data extraction in full, or only the " +
          "subscriber + traffic-data scope listed in §C of the EPOC.",
      },
    ],

    // Correspondence sourced from the cross-case store (seeded from
    // mockCorrespondenceSeeds.ts). Includes an inbound
    // `RequestAdditionalInformation` from the IA — gives the demo a
    // bubble that surfaces the "Reply with Provide Additional
    // Information" CTA.
    correspondence: getCorrespondenceForCase("LNS-2026-00180"),

    // Attorney review surfaces — Phase 2 of the prototype-to-prod merge.
    enterpriseContext,
    disclosureConstraints,
    // Workflow 2 — Spain IA, cross-border to the Irish SP.
    eevidenceWorkflow: 2,
    isInternational: true,
  };
}
