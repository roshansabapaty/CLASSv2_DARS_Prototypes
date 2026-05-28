/**
 * Mock case data for LNS-2026-00200 — French eEvidence case demonstrating
 * the **"Microsoft shall inform the Controller"** path.
 *
 * Scenario:
 *   - Issuing Authority is the French Gendarmerie nationale (Section
 *     de Recherches de Paris). They've transmitted an EPOC and marked
 *     Section g Sub-section D Q2 (`addressedToProcessor`) = YES; the IA
 *     supplied `processorShallInformController = YES` (and
 *     `processorShallNotInformController = NO`).
 *   - When the Response Specialist runs Check Accounts on the target
 *     identifier, the account-existence check resolves to an Enterprise
 *     account hosted in a French tenant (contoso-fr.onmicrosoft.com).
 *     The Enterprise Tenant Profile retrieves the tenant admin's contact
 *     details — those drive the "notify the Controller" banner.
 *
 * The case form should surface an info banner pointing the RS at the
 * tenant admin email address so they can send the IA-mandated Controller
 * notification email.
 */

import type {
  AccountIdentifier,
  CaseLegalContext,
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

export function buildLENS202600200FormData(): FormData {
  const createDate = new Date("2026-05-13");
  const dueDate = computeSlaDueDate("Routine", createDate);
  const startDate = new Date("2026-02-15");
  const endDate = new Date("2026-05-13");
  const leDateRange = { start: "2026-02-15", end: "2026-05-13" };

  // ── Structured legal context — France / National / Gendarmerie ────────
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
    id: "AGY-FR-GEND-SR-PARIS",
    name: "Gendarmerie nationale — Section de Recherches de Paris",
    shortName: "Gendarmerie SR Paris",
    aliases: ["French National Gendarmerie Investigation Section"],
    country: france,
    agencyType: "LawEnforcement" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@gendarmerie.interieur.gouv.fr",
  };
  const legalContext: CaseLegalContext = {
    country: france,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-FR-GEND-001",
          name: "Capitaine Camille Lefèvre",
          title: "Capitaine de Gendarmerie",
          email: "c.lefevre@gendarmerie.interieur.gouv.fr",
          phone: "+33 1 47 03 30 00",
          role: "Submitter",
          languages: "fr - French, en - English",
          source: "agency",
        },
        notes:
          "French Gendarmerie nationale — Investigation Section in Paris. " +
          "IA marked the EPOC as a processor-route Enterprise request with " +
          "an explicit instruction to notify the controller.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: false,
  };

  // ── Pre-seeded collection jobs — one job per LE-requested service
  //    (Email · MSA · Teams) so the CollectionTracker on this case
  //    actually has work to review and the FulfillmentWizard recognises
  //    them as "existing jobs" when re-entered to add new scope.
  //    Mix of automated + manual data types and lifecycle states:
  //      - exchangeEnterprise · Content Data · Email Content
  //        (automated; submitted-for-review state — Collection Complete,
  //         Publish In Progress, Delivery Not Started).
  //      - entraIDProfile · Subscriber Data · Basic Billing
  //        (manual; terminal happy path — Complete + DeliveryAcknowledged).
  //      - teamsForBusiness · Content Data · Generic Content
  //        (automated; Collection Started).
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
    svc.includeEnterpriseAccount = true;
    group[itemKey] = {
      ...group[itemKey],
      enabled: true,
      ...jobOverrides,
    };
    return true;
  }

  // Job 1 — Email · Content Data · Email Content (automated, mid-pipeline).
  seedJob("exchangeEnterprise", "contentData", "genericAttributes", {
    taskId: "TSK-EXE-CON-200-001",
    jobId: "JOB-EXE-CON-200-001",
    collectionStatus: "Complete",
    publishStatus: "Started",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-15T10:00:00"),
    publishStatusUpdatedAt: new Date("2026-05-16T08:00:00"),
  });

  // Job 2 — MSA · Subscriber Data · Basic Billing (manual, terminal).
  seedJob("entraIDProfile", "subscriberData", "basicBilling", {
    taskId: "TSK-ENT-BIL-200-001",
    jobId: "JOB-ENT-BIL-200-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "DeliveryAcknowledged",
    deliveryJobId: "DLV-ENT-BIL-200-001",
    deliveryAcknowledgedAt: new Date("2026-05-17T15:30:00"),
    collectionStatusUpdatedAt: new Date("2026-05-15T11:20:00"),
    publishStatusUpdatedAt: new Date("2026-05-16T14:05:00"),
    deliveryStatusUpdatedAt: new Date("2026-05-17T15:30:00"),
  });

  // Job 3 — Teams · Content Data · Generic Content (automated, early-pipeline).
  seedJob("teamsForBusiness", "contentData", "genericAttributesChats", {
    taskId: "TSK-TFB-CHAT-200-001",
    jobId: "JOB-TFB-CHAT-200-001",
    collectionStatus: "Started",
    publishStatus: "Not Started",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-17T09:45:00"),
  });

  // ── Single Enterprise email identifier — seeded with tenant admin
  //    contact info so the "notify the Controller" banner can surface
  //    the email address on the case form.
  const id1: AccountIdentifier = {
    id: genId(),
    value: "j.dupont@contoso-fr.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    // Phase 1 merge — identifier-level AttorneyReview. The case-level
    // escalation is tied to a held Form 3 outbound; mirrors here so
    // the IdentifierTable surfaces the escalated row.
    taskStatus: "AttorneyReview",
    accountExistenceStatus: "not-checked",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services,
    checkAccounts: {
      accountType: "Enterprise",
      tenantId: "8f4d2c0e-1b97-4d11-9d50-2c0f3b8a6e21",
      tenantPrimaryDomain: "contoso-fr.onmicrosoft.com",
      tenantAdminName: "Hélène Moreau",
      tenantAdminEmail: "tenant.admin@contoso-fr.com",
      tenantAdminPhone: "+33 1 42 60 30 00",
    },
    leExternalServices: ["Email", "Microsoft Account Profile", "Teams"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
      Teams: leDateRange,
    },
    issuingAuthorityNotes:
      "Subject employee linked to corporate espionage matter at Contoso " +
      "France. Gendarmerie requests subscriber + content data from the " +
      "user's Microsoft 365 mailbox and Teams chat history within the " +
      "authorised investigative window.",
    attorneyEscalation: {
      role: "Attorney",
      assignedAttorneyId: "ATT-001",
      reason:
        "Outbound Form 3 — Non-Execution Response held pending attorney " +
        "review of the controller-notification posture under Reg 2023/1543 " +
        "Art. 9.",
      escalatedAt: new Date("2026-05-14T08:42:00"),
      escalatedBy: "Nicole Garcia",
      status: "Pending",
      scope: "all",
      actions: [],
      relatedOutboundIds: ["corr-fr-form3-out-001"],
    },
  } as any;

  // Phase 4 polish — Contoso France enterprise context. Mounts the
  // EnterpriseContextSection + Org Home Location chip + Prior Tenant
  // History drawer (1 redirected precedent under tenant-contoso-fr).
  const enterpriseContext: EnterpriseContext = {
    triggers: ["class_account_check", "eevidence_ia_flag"],
    manifestErrorPresent: false,
    org: MOCK_ORGS["contoso-fr"],
    users: [
      {
        identifierId: id1.id,
        identifierValue: id1.value,
        lastLogonLocation: "Paris, FR",
        geoResolutions30d: ["FR"],
        mailboxRegion: "EU West",
        oneDriveRegion: "EU West",
        conflictOfLawJurisdictions: ["FR"],
      },
    ],
    policyReviewRequired: false,
    execReviewRequired: false,
  };

  return {
    caseId: "LNS-2026-00200",
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
    agencyCountryCode: france.countryCode,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+33 1 47 03 30 00",
    agencyAddress: {
      number: "4 Rue de la Liberté",
      city: "Le Blanc-Mesnil",
      stateProvince: "Île-de-France",
      postalCode: "93150",
    },
    legalContext,
    natureOfCrimes: ["Cybercrime", "OtherFinancialCrimeOrFraud"],
    mlat: false,
    additionalCaseInformation:
      "French eEvidence demo case exercising the controller-notification " +
      "leg. IA marked Section g Sub-section D Q2 = YES and explicitly " +
      "instructed Microsoft to inform the controller after disclosure. " +
      "The target account resolves to an Enterprise tenant — the case " +
      "form surfaces the tenant admin's email so the RS can issue the " +
      "controller notification email.",
    // LENS case number — same canonical value as `caseId`. The
    // Gendarmerie reference lives in `agencyCaseNumber` below.
    caseNumber: "LNS-2026-00200",
    agencyCaseNumber: "GEND-SR-PARIS-2026-CY-0200",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-13",
    dateReceived: "2026-05-13",
    dateOfIssuance: "2026-05-12",
    dateOfTransmission: "2026-05-13",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-fr1`,
        name: "Capitaine Camille Lefèvre",
        title: "Capitaine de Gendarmerie",
        email: "c.lefevre@gendarmerie.interieur.gouv.fr",
        phone: "+33 1 47 03 30 00",
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
    authorizationExpirationDate: new Date("2026-08-13"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC issued by Gendarmerie nationale Section de Recherches for " +
      "subscriber + content data tied to a corporate espionage matter. " +
      "Controller notification is explicitly authorised by the IA.",
    approvalReferenceNumber: "GEND-SR-PARIS-2026-CY-0200",
    approverName: "Procureure de la République Sophie Bernard",
    approverRole: "Public Prosecutor (Tribunal judiciaire de Paris)",
    approvalTimestamp: new Date("2026-05-12T10:30:00"),
    approvalIsEmergency: false,
    approverAlternateName: "Mme Bernard",
    approverEmail: "eevidence@tj-paris.justice.fr",
    approverPhoneNumber: "+33 1 44 32 50 50",
    ndoAttached: "Yes",
    notificationAllowed: "No",
    dateOfLeNotification: undefined,
    leResponseDueDate: undefined,
    leResponseReceived: "",
    dateOfLeResponse: undefined,
    dateOfUserNotification: undefined,
    userResponseDueDate: undefined,
    userResponseReceived: "",
    dateOfUserResponse: undefined,
    identifiers: [id1],
    // Pre-staged "Delay Inform" NDO mirroring the IA's
    // AuthorisationFlags.DelayInformingUser = true instruction. The NDO
    // links to the target identifier's TaskID and inherits the
    // authorisation window dates as a reasonable default.
    nonDisclosureOrders: [
      {
        id: `ndo-${Date.now().toString(36)}-fr1`,
        name: `${id1.taskId} — ${id1.value}`,
        linkedTaskId: id1.taskId,
        status: "Delay Inform",
        statusReason: "Ongoing Investigation",
        exclusionReason: "",
        temporaryNDO: false,
        startDate,
        durationDays: undefined,
        expirationDate: new Date("2026-08-13"),
        createdBy: "Capitaine Camille Lefèvre",
        createdOn: new Date("2026-05-12"),
        relatedCases: [],
        notes:
          "IA AuthorisationFlags.DelayInformingUser = true. User " +
          "notification is paused until further notice from the " +
          "Gendarmerie SR Paris.",
      },
    ],
    startDate,
    endDate,
    timeZone: "Europe/Paris (CET/CEST)",
    notes: [
      {
        id: `note-${Date.now().toString(36)}-fr1`,
        content:
          "French eEvidence demo. IA = Gendarmerie SR Paris. Section g " +
          "Sub-section D Q2 = YES, processorShallInformController = YES. " +
          "Target resolves to Enterprise tenant; controller notification " +
          "email surfaces in Step 4 with the tenant admin contact.",
        createdBy: "Nicole Garcia",
        createdAt: createDate,
      },
    ],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    // Three per-case approver blocks (IA + VA + CA) — all carry the
    // same field shape. The EA is intentionally omitted so the case
    // picks up the Microsoft-side default
    // (`DEFAULT_EEVIDENCE_ENFORCING_AUTHORITY` → Department of Justice
    // (Ireland)). Demonstrates the full 4-approver display.
    eevidenceIssuingAuthority: {
      approverType: "IssuingAuthority",
      idNumber: "IA-FR-GEND-001",
      name: "Gendarmerie nationale — Section de Recherches de Paris",
      issuingAuthorityRole: "National Gendarmerie",
      country: france,
      approvalRole: "OtherCompetentAuthority",
      approvalReferenceNumbers: ["GEND-SR-PARIS-2026-CY-0200"],
      approver: {
        name: "Capitaine Camille Lefèvre",
        address:
          "4 Rue de la Liberté\n93150 Le Blanc-Mesnil\nFrance",
        tel: "+33 1 47 03 30 00",
        fax: "+33 1 47 03 30 01",
        email: "c.lefevre@gendarmerie.interieur.gouv.fr",
        languagesSpoken: "fr - French, en - English",
      },
    },
    eevidenceValidatingAuthority: {
      approverType: "ValidatingAuthority",
      idNumber: "VA-FR-TJ-PARIS-001",
      name: "Tribunal judiciaire de Paris — Parquet de la République",
      authorityRole: "Public Prosecutor's Office",
      country: france,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: ["TJ-PARIS-VAL-2026-0200"],
      approver: {
        name: "Procureure de la République Sophie Bernard",
        address: "Parvis du Tribunal de Paris\n75017 Paris\nFrance",
        tel: "+33 1 44 32 50 50",
        fax: "+33 1 44 32 50 51",
        email: "eevidence@tj-paris.justice.fr",
        languagesSpoken: "fr - French, en - English",
      },
    },
    eevidenceCompetentAuthority: {
      approverType: "CompetentAuthority",
      idNumber: "CA-FR-CA-PARIS-001",
      name: "Cour d'appel de Paris — Chambre de l'instruction",
      authorityRole: "Appellate Investigating Chamber",
      country: france,
      approvalRole: "JudgeCourtOrInvestigatingJudge",
      approvalReferenceNumbers: ["CA-PARIS-2026-INST-0200"],
      approver: {
        name: "Président Marc Lambert",
        address:
          "34 Quai des Orfèvres\n75001 Paris\nFrance",
        tel: "+33 1 44 32 51 51",
        fax: "+33 1 44 32 51 52",
        email: "instruction@ca-paris.justice.fr",
        languagesSpoken: "fr - French, en - English",
      },
    },
    // IA submitted Q2 = YES with explicit instruction to inform the
    // controller after disclosure. The opposite of the typical "shall NOT
    // inform" branch — drives the "notify the Controller" banner.
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: true,
      addressedToProcessorControllerUnidentified: false,
      addressedToProcessorDetrimentalToInvestigation: true,
      processorShallInformController: true,
      processorShallNotInformController: false,
      permissionToNotifyUser: false,
      justification:
        "The investigation is at a stage where controller notification is " +
        "appropriate; the corporate controller is not itself a target of " +
        "the investigation and is expected to cooperate.",
      relevantInformation:
        "EPOC scope limited to the named user account. Gendarmerie has " +
        "coordinated with the Tribunal judiciaire de Paris on the order " +
        "of operations: disclosure first, controller notification second.",
    },
    // Top-level Authorisation flags submitted by the IA. The
    // `delayInformingUser` flag drives the pre-seeded "Delay Inform" NDO
    // surfaced in Step 5 → Non-Disclosure tab.
    eevidenceAuthorisationFlags: {
      delayInformingUser: true,
    },
    eevidenceRelatedCases: [],

    // Correspondence is sourced from the cross-case store (seeded from
    // mockCorrespondenceSeeds.ts at module load). The seed contains a
    // Draft outbound Form 3 the RS composed under the "Attorney
    // Escalation" toggle — held in Draft with `pendingAttorneyReview`
    // true. The escalation block below points back at that outbound via
    // `relatedOutboundIds` so the Release action flips it to Sent.
    correspondence: getCorrespondenceForCase("LNS-2026-00200"),

    // Phase 4 polish — Contoso France enterprise context. Mounts the
    // EnterpriseContextSection + Org Home Location chip + Prior Tenant
    // History drawer.
    enterpriseContext,

    // Form 3 instance the held outbound seed references via
    // `formInstanceId: "fi-fr-form3-200"`. Stored in Draft state so the
    // preview reflects the in-progress posture — the form was authored
    // but not signed; the attorney's release decision will flip it.
    formInstances: [
      {
        instanceId: "fi-fr-form3-200",
        templateId: "EPOC_FORM_3",
        caseId: "LNS-2026-00200",
        status: "Draft",
        createdAt: new Date("2026-05-14T08:20:00"),
        updatedAt: new Date("2026-05-14T08:42:00"),
        values: {
          A_certificateType: "EPOC",
          B_issuingAuthority:
            "Gendarmerie nationale — Section de Recherches de Paris",
          B_issuingFileNumber: "GEND-SR-PARIS-2026-CY-0200",
          B_dateOfIssue: "2026-05-12",
          B_dateOfReceipt: "2026-05-13",
          B_enforcingAuthority: "Ministère de la Justice — Bureau de l'entraide pénale internationale",
          C_addressee: "Microsoft Ireland Operations Limited",
          C_addresseeFileNumber: "LNS-2026-00200",
          D_reasons: ["thirdCountryConflict"],
          D_explanation:
            "The IA's instruction to inform the controller post-disclosure " +
            "creates a conflict with our internal cross-border compliance " +
            "posture under Regulation (EU) 2023/1543 Article 9. The " +
            "controller-notification step is being held pending attorney " +
            "review of the order of operations and the controller's status " +
            "under the prevailing national law.",
          E_lawTitle:
            "Loi n° 78-17 du 6 janvier 1978 (Informatique et libertés)",
          E_statutoryProvision:
            "Articles 6 et 13 — bases légales et information de la " +
            "personne concernée; couplé à l'article 88 RGPD pour le " +
            "traitement dans le cadre des enquêtes pénales.",
          H_contactName: "Nicole Garcia",
          H_contactEmail: "nicole.garcia@microsoft.com",
        },
      },
    ],

    // ── Seeded Attorney Escalation tied to the held outbound ──────────
    attorneyEscalation: {
      role: "Attorney",
      assignedAttorneyId: "ATT-001",
      reason:
        "Outbound correspondence requires attorney review before " +
        "transmission to the Issuing Authority. The IA's instruction to " +
        "notify the controller post-disclosure conflicts with our " +
        "standard cross-border posture under Reg 2023/1543 — counsel " +
        "needs to sign off on the Form 3 wording before it leaves " +
        "Microsoft.",
      escalatedAt: new Date("2026-05-14T08:42:00"),
      escalatedBy: "Nicole Garcia",
      status: "Pending",
      actions: [],
      relatedOutboundIds: ["corr-fr-form3-out-001"],
    },
    escalationAuditEvents: [
      {
        id: "audit-seed-lns200-escalated",
        kind: "Escalated",
        actor: "Nicole Garcia",
        actorRole: "ResponseSpecialist",
        performedAt: new Date("2026-05-14T08:42:00"),
        note:
          "Held outbound \"EPOC Form 3 — Non-Execution Response (held for " +
          "attorney)\" pending attorney review.",
      },
    ],
  };
}
