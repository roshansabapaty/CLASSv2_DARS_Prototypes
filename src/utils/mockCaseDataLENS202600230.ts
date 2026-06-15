/**
 * Mock case data for LNS-2026-00230 — Dutch eEvidence production order
 * (EPOC-ER) that is the **follow-on** to the preservation order
 * LNS-2026-00220 (EPOC-PR). The case arrives after the IA signalled
 * intent via a Form 5 — Confirmation of Issuance on LNS-2026-00220.
 *
 * Linkage:
 *   - This case carries an `eevidenceRelatedCases` entry pointing back
 *     to LNS-2026-00220 (`requestSubType: "EPOC-PR"`).
 *   - LNS-2026-00220 carries a reciprocal entry pointing forward to
 *     this case (`requestSubType: "EPOC-ER"`).
 *
 * Per the user's decision, **no fields are propagated** from the parent
 * EPOC-PR to this EPOC-ER yet — the linkage is a back-pointer only. The
 * field-propagation question is documented as an open question in the
 * EPOC-PR plan: which envelope fields (identifiers, IA block, etc.) the
 * feature crew wants to auto-inherit when the EPOC-ER lands.
 *
 * Scenario continues the LNS-2026-00220 narrative:
 *   - Issuing Authority: Openbaar Ministerie / Landelijk Parket
 *   - Two target identifiers (Consumer + Enterprise), matching the
 *     preserved scope but RE-ENTERED on the EPOC-ER envelope (the IA
 *     submits them fresh; we don't yet pre-fill from the PR).
 *   - `caseStage: "Waiting on Triage"` so the case lands in the queue
 *     ready for the RS to triage and link to the parent EPOC-PR.
 */

import type {
  AccountIdentifier,
  CaseLegalContext,
  EnterpriseContext,
  FormData,
} from "../types/caseTypes";
import { createDefaultIdentifierServices } from "../config/lensServicesConfig";
import { computeSlaDueDate } from "../constants/slaConstants";
import { MOCK_ORGS } from "../data/mockOrgs";

const genId = () =>
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const genIdentifierTaskId = () =>
  `LDID-${Math.floor(Math.random() * 900_000) + 100_000}`;

export function buildLENS202600230FormData(): FormData {
  const createDate = new Date("2026-05-14");
  const dueDate = computeSlaDueDate("Routine", createDate, createDate);
  const startDate = new Date("2026-01-01");
  const endDate = new Date("2026-05-14");
  const leDateRange = { start: "2026-01-01", end: "2026-05-14" };

  // ── Structured legal context — mirrors LNS-2026-00220 ─────────────────
  const netherlands = {
    countryCode: "NL",
    countryName: "Netherlands",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: netherlands,
    jurisdictionLevel: "National",
    jurisdictionName: "Koninkrijk der Nederlanden",
  };
  const issuingAuthority = {
    id: "AGY-NL-OM-LP",
    name: "Openbaar Ministerie — Landelijk Parket",
    shortName: "OM-LP",
    aliases: ["Dutch Public Prosecutor's Office — National Prosecutor"],
    country: netherlands,
    agencyType: "Prosecutor" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@om.nl",
  };
  const legalContext: CaseLegalContext = {
    country: netherlands,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-NL-OM-001",
          name: "Officier van Justitie Joost van der Velde",
          title: "Officier van Justitie",
          email: "j.vandervelde@om.nl",
          phone: "+31 88 699 1500",
          role: "Submitter",
          languages: "nl - Dutch, en - English",
          source: "agency",
        },
        notes:
          "Follow-on EPOC-ER (production) order. Targets the same Microsoft " +
          "account scope that was preserved under LNS-2026-00220.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: false,
  };

  // Identifiers re-supplied by the IA on the EPOC-ER envelope. Same
  // values as the parent EPOC-PR but fresh task IDs — the EPOC-ER stands
  // on its own as a production order.
  // The IA's production order adds a NEW data category that was NOT in the
  // preservation scope (OneDrive content) — it needs fresh collection. This
  // demonstrates a mixed case: linked preserved jobs (overlaid at case-open
  // by applySubsequentProduction) ready to package, alongside a new job to
  // collect.
  const id1Services = createDefaultIdentifierServices() as Record<string, any>;
  {
    const svc = id1Services["oneDriveConsumer"];
    const item = svc?.categoryGroups?.["contentData"]?.["genericAttributes"];
    if (svc && item) {
      svc.enabled = true;
      svc.includeConsumerAccount = true;
      svc.categoryGroups["contentData"]["genericAttributes"] = {
        ...item,
        enabled: true,
        taskId: "TSK-ODB-CON-230-NEW",
        jobId: "JOB-ODB-CON-230-NEW",
        collectionStatus: "Not Started",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-05-20"),
      };
    }
  }

  const id1: AccountIdentifier = {
    id: genId(),
    value: "subject.nl@outlook.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "not-checked",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: id1Services,
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: ["Email", "Microsoft Account Profile"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
    },
    issuingAuthorityNotes:
      "Production request for the consumer account previously preserved " +
      "under LNS-2026-00220. Disclose subscriber + content data within the " +
      "EPOC's date window.",
  } as any;

  const id2: AccountIdentifier = {
    id: genId(),
    value: "ceo@stichting-leiden.example",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "not-checked",
    geoLocation: "Europe - North Europe",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(),
    checkAccounts: {
      accountType: "Enterprise",
      tenantId: "5f02a18c-3e64-4b92-a371-87d1f0c4e215",
      tenantPrimaryDomain: "stichting-leiden.onmicrosoft.com",
      tenantAdminName: "Pieter de Jong",
      tenantAdminEmail: "tenant.admin@stichting-leiden.example",
      tenantAdminPhone: "+31 71 521 4040",
    },
    leExternalServices: ["Email", "Microsoft Account Profile", "OneDrive"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
      OneDrive: leDateRange,
    },
    issuingAuthorityNotes:
      "Production request for the enterprise account previously preserved " +
      "under LNS-2026-00220. Same Stichting Leiden Holding B.V. context.",
  } as any;

  // Stichting Leiden enterprise context — follow-on EPOC-ER under the
  // same tenant as LNS-2026-00220 (preservation order). Prior tenant
  // history surfaces 00220 as the related case when the RS opens the
  // drawer.
  const enterpriseContext: EnterpriseContext = {
    triggers: ["class_account_check"],
    manifestErrorPresent: false,
    org: MOCK_ORGS["stichting-leiden-nl"],
    users: [
      {
        identifierId: id2.id,
        identifierValue: id2.value,
        lastLogonLocation: "Amsterdam, NL",
        geoResolutions30d: ["NL"],
        mailboxRegion: "EU West",
        oneDriveRegion: "EU West",
        conflictOfLawJurisdictions: ["NL"],
      },
    ],
    policyReviewRequired: false,
    execReviewRequired: false,
  };

  return {
    caseId: "LNS-2026-00230",
    createDate,
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    // Subsequent Production (Workflow 5): this EPOC-ER follows the preserved
    // data under LNS-2026-00220. It opens on Collection with the preserved
    // jobs seeded (via applySubsequentProduction) ready for package + delivery.
    eevidenceWorkflow: 5,
    caseStage: "In Progress",
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    country: netherlands.countryName,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+31 88 699 1500",
    agencyAddress: {
      number: "Maliebaan 76",
      city: "Utrecht",
      stateProvince: "Utrecht",
      postalCode: "3581 CV",
    },
    legalContext,
    natureOfCrimes: ["OtherFinancialCrimeOrFraud", "Cybercrime"],
    mlat: false,
    additionalCaseInformation:
      "Dutch EPOC-ER production order. Follow-on to the preservation " +
      "order LNS-2026-00220 (the IA signalled intent via Form 5 — " +
      "Confirmation of Issuance). Targets the same Microsoft account " +
      "scope; the linkage to the parent EPOC-PR is captured below in " +
      "eevidenceRelatedCases.",
    // LENS case number — same canonical value as `caseId`. The OM
    // reference lives in `agencyCaseNumber` below.
    caseNumber: "LNS-2026-00230",
    agencyCaseNumber: "OM-LP-2026-EPOC-ER-0230",
    relatedCaseNumbers: "LNS-2026-00220",
    casePriority: "Routine",
    dateServed: "2026-05-14",
    dateReceived: "2026-05-14",
    dateOfIssuance: "2026-05-13",
    dateOfTransmission: "2026-05-14",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-nl1`,
        name: "Officier van Justitie Joost van der Velde",
        title: "Officier van Justitie",
        email: "j.vandervelde@om.nl",
        phone: "+31 88 699 1500",
        role: "Submitter",
        languages: "nl - Dutch, en - English",
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
      "EPOC-ER (European Production Order — Production Request) issued by " +
      "the Dutch Openbaar Ministerie for production of the data previously " +
      "preserved under LNS-2026-00220.",
    approvalReferenceNumber: "OM-LP-2026-EPOC-ER-0230",
    approverName: "Rechter-Commissaris mr. Anke de Boer",
    approverRole: "Investigating Judge (Rechtbank Midden-Nederland)",
    approvalTimestamp: new Date("2026-05-13T16:00:00"),
    approvalIsEmergency: false,
    approverAlternateName: "RC mr. A. de Boer",
    approverEmail: "rechter.commissaris@rechtbankmnl.nl",
    approverPhoneNumber: "+31 88 361 1000",
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
    identifiers: [id1, id2],
    enterpriseContext,
    nonDisclosureOrders: [],
    startDate,
    endDate,
    timeZone: "Europe/Amsterdam (CET/CEST)",
    notes: [
      {
        id: `note-${Date.now().toString(36)}-nl1`,
        content:
          "EPOC-ER follow-on to preservation order LNS-2026-00220. " +
          "Linked back via eevidenceRelatedCases. OPEN QUESTION (feature " +
          "crew): which envelope fields (identifiers, IA block, NDO " +
          "state, etc.) should auto-propagate from the parent EPOC-PR?",
        createdBy: "Nicole Garcia",
        createdAt: createDate,
      },
    ],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-NL-OM-LP-001",
      name: "Openbaar Ministerie — Landelijk Parket",
      issuingAuthorityRole: "Public Prosecutor's Office",
      country: netherlands,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: ["OM-LP-2026-EPOC-ER-0230"],
      approver: {
        name: "Rechter-Commissaris mr. Anke de Boer",
        address:
          "Vrouwe Justitiaplein 1\n3511 EX Utrecht\nNetherlands",
        tel: "+31 88 361 1000",
        fax: "+31 88 361 1001",
        email: "rechter.commissaris@rechtbankmnl.nl",
        languagesSpoken: "nl - Dutch, en - English",
      },
    },
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: false,
    },
    // Back-pointer to the parent preservation order. The Collection
    // page's RelatedCaseSummaryCard surfaces this so the RS can jump
    // back to the source EPOC-PR.
    eevidenceRelatedCases: [
      {
        darsCaseNumber: "LNS-2026-00220",
        requestType: "eEvidence",
        requestSubType: "EPOC-PR",
        issuingAuthorityName: "Openbaar Ministerie — Landelijk Parket",
        issuingAuthorityReferenceNumbers: ["OM-LP-2026-EPOC-PR-0220"],
        dateOfTransmission: "2026-05-14",
        serviceProviderName: "Microsoft",
        additionalInformation:
          "Parent preservation order. Data preserved under this case is " +
          "the production scope for the current EPOC-ER.",
        preservationEndDate: "2027-05-14",
        requestStatus: "In Progress",
      },
    ],
  };
}
