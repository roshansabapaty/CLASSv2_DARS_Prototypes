/**
 * Mock case data for LNS-2026-00300 — US Federal subpoena targeting
 * Microsoft accounts that span TWO tenants under one parent TPID
 * (`TPID-CONTOSO` — Contoso Holdings).
 *
 * Scenario:
 *   - USAO SDNY served a subpoena tied to an antitrust investigation.
 *     Two targeted employees:
 *       1. NYC executive on the Contoso Corp (US) tenant
 *          (`tenant-contoso`, `contoso.com`).
 *       2. Paris finance lead on the Contoso France SAS tenant
 *          (`tenant-contoso-fr`, `contoso-fr.onmicrosoft.com`).
 *   - Both tenants share `parentTpid: "TPID-CONTOSO"` — same Microsoft
 *     customer at the TPID level.
 *
 * Demo value: this is the first attorney-flow seed where:
 *   - `enterpriseContext.org` carries a single primary tenant (Contoso
 *     Corp US, the SDNY's primary target) BUT each `AccountIdentifier`
 *     carries its own `tenantId` + `parentTpid` via `checkAccounts`.
 *   - The IdentifierTable shows identifiers spanning two tenants.
 *   - The EscalateToAttorneyDialog scope picker surfaces
 *     "All in Contoso Corp" / "All in Contoso France SAS" / "All
 *     under Contoso Holdings (TPID-CONTOSO)" / "Specific tasks" /
 *     "Administrative" — exercising the tenant + tpid `SignalScope`
 *     variants end-to-end.
 *
 * The case opens with no active attorney escalation so the demoer can
 * walk the full Escalate → pick scope → submit flow.
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

export function buildLENS202600300FormData(): FormData {
  const createDate = new Date("2026-05-18");
  const dueDate = computeSlaDueDate("Routine", createDate);
  const startDate = new Date("2026-02-01");
  const endDate = new Date("2026-05-15");
  const leDateRange = { start: "2026-02-01", end: "2026-05-15" };

  // ── Structured legal context — US Federal / SDNY ─────────────────────
  const unitedStates = {
    countryCode: "US",
    countryName: "United States",
    region: "AMER" as const,
  };
  const jurisdiction = {
    country: unitedStates,
    jurisdictionLevel: "Federal",
    jurisdictionName: "Southern District of New York",
  };
  const issuingAuthority = {
    id: "AGY-US-USAO-SDNY",
    name: "U.S. Attorney's Office — Southern District of New York",
    shortName: "USAO SDNY",
    aliases: ["USAO SDNY", "Southern District of New York"],
    country: unitedStates,
    agencyType: "Prosecutor" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@usdoj.gov",
  };
  const legalContext: CaseLegalContext = {
    country: unitedStates,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-US-SDNY-001",
          name: "AUSA Daniel Park",
          title: "Assistant U.S. Attorney",
          email: "daniel.park@usdoj.gov",
          phone: "+1 212 637 1000",
          role: "Submitter",
          languages: "en - English",
          source: "agency",
        },
        notes:
          "SDNY antitrust investigation. Subpoena requests business " +
          "records + communications from two Microsoft 365 mailboxes " +
          "tied to the same parent organization (Contoso Holdings).",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: true,
  };

  // ── Identifier 1: NYC executive on Contoso Corp (US) ────────────────
  const id1: AccountIdentifier = {
    id: genId(),
    value: "k.alvarez@contoso.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "Americas - East US",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(),
    checkAccounts: {
      accountType: "Enterprise",
      tenantId: "tenant-contoso",
      // Phase 1 write-migration metadata — the per-identifier
      // parentTpid lets `resolveTargetIdentifiers` for scope=tpid pick
      // up this identifier even when it's not the case's primary org.
      parentTpid: "TPID-CONTOSO",
      tenantPrimaryDomain: "contoso.com",
      tenantAdminName: "Daniel Hart",
      tenantAdminEmail: "admin@contoso.com",
      tenantAdminPhone: "+1 425 555 0142",
    },
    leExternalServices: ["Email", "Microsoft Account Profile", "Teams"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
      Teams: leDateRange,
    },
    issuingAuthorityNotes:
      "Senior VP on the US side of Contoso Holdings — direct counterpart " +
      "to the Paris finance lead. SDNY requests email + Teams chats " +
      "for the investigation window.",
  } as any;

  // ── Identifier 2: Paris finance lead on Contoso France SAS ──────────
  const id2: AccountIdentifier = {
    id: genId(),
    value: "m.lefebvre@contoso-fr.onmicrosoft.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(),
    checkAccounts: {
      accountType: "Enterprise",
      tenantId: "tenant-contoso-fr",
      parentTpid: "TPID-CONTOSO",
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
      "Finance lead at Contoso France SAS — corresponding party to the " +
      "US executive on Identifier 1. Mailbox + Teams scope identical.",
  } as any;

  // Multi-tenant case: `org` carries the primary tenant (Contoso US
  // because SDNY jurisdiction targets the US org first) and `orgs[]`
  // lists every tenant the case touches. The EnterpriseContextSection
  // stacks one OrgPanel per tenant; the EscalateToAttorneyDialog
  // surfaces tenant + TPID scope options derived from the identifiers'
  // `checkAccounts.tenantId` + `checkAccounts.parentTpid`.
  const enterpriseContext: EnterpriseContext = {
    triggers: ["class_account_check"],
    manifestErrorPresent: false,
    org: MOCK_ORGS["contoso-com"],
    orgs: [MOCK_ORGS["contoso-com"], MOCK_ORGS["contoso-fr"]],
    users: [
      {
        identifierId: id1.id,
        identifierValue: id1.value,
        lastLogonLocation: "New York, US",
        geoResolutions30d: ["US"],
        mailboxRegion: "US East",
        oneDriveRegion: "US East",
        conflictOfLawJurisdictions: ["US"],
      },
      {
        identifierId: id2.id,
        identifierValue: id2.value,
        lastLogonLocation: "Paris, FR",
        geoResolutions30d: ["FR"],
        mailboxRegion: "EU West",
        oneDriveRegion: "EU West",
        conflictOfLawJurisdictions: ["FR", "US"],
      },
    ],
    policyReviewRequired: false,
    execReviewRequired: false,
  };

  return {
    caseId: "LNS-2026-00300",
    createDate,
    assigneeName: "Nicole Garcia",
    requestType: "Subpoena",
    requestSubType: "",
    requestOrigin: "LE Portal",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "Waiting on Triage",
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    country: unitedStates.countryName,
    agencyCountryCode: unitedStates.countryCode,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+1 212 637 1000",
    agencyAddress: {
      number: "1 St. Andrew's Plaza",
      city: "New York",
      stateProvince: "NY",
      postalCode: "10007",
    },
    legalContext,
    natureOfCrimes: ["OtherFinancialCrimeOrFraud"],
    mlat: false,
    additionalCaseInformation:
      "Multi-tenant cross-border subpoena. Both Contoso US and Contoso " +
      "France SAS mailboxes are in scope. Two tenants, one parent TPID " +
      "(Contoso Holdings). When escalating to attorney review, the " +
      "scope picker surfaces 'All in Contoso Corp', 'All in Contoso " +
      "France SAS', and 'All under Contoso Holdings' so the attorney " +
      "can scope per the legal-entity boundaries that apply to each " +
      "tenant's jurisdiction.",
    caseNumber: "LNS-2026-00300",
    agencyCaseNumber: "USAO-SDNY-2026-ANTITRUST-0300",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-18",
    dateReceived: "2026-05-18",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-sdny1`,
        name: "AUSA Daniel Park",
        title: "Assistant U.S. Attorney",
        email: "daniel.park@usdoj.gov",
        phone: "+1 212 637 1000",
        role: "Submitter",
        languages: "en - English",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-08-18"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Administrative",
    approvalDescription:
      "USAO SDNY antitrust subpoena. Records + communications scope " +
      "for two Microsoft 365 mailboxes within the investigative window.",
    approvalReferenceNumber: "USAO-SDNY-2026-ANTITRUST-0300",
    approverName: "AUSA Daniel Park",
    approverRole: "Assistant U.S. Attorney",
    approvalTimestamp: new Date("2026-05-18T09:15:00"),
    approvalIsEmergency: false,
    approverAlternateName: "AUSA D. Park",
    approverEmail: "daniel.park@usdoj.gov",
    approverPhoneNumber: "+1 212 637 1000",
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
    nonDisclosureOrders: [],
    startDate,
    endDate,
    timeZone: "America/New_York (EST/EDT)",
    notes: [
      {
        id: `note-${Date.now().toString(36)}-mt1`,
        content:
          "Multi-tenant demo case. Two identifiers, two tenants, one " +
          "parent TPID. Use the Escalate dialog to exercise the " +
          "tenant + tpid scope variants.",
        createdBy: "Triage Specialist",
        createdAt: createDate,
      },
    ],
    enterpriseContext,
  } as FormData;
}
