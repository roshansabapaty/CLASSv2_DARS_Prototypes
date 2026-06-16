/**
 * Mock case data for LNS-2026-00325 — CLASSv2 v2.1 Demo Case.
 *
 * Purpose: demonstrate the v2.1 Related Identifiers per-account UI and
 * Consumer User Location Summary/Detail panels using real CLASS response
 * patterns from the spec:
 *
 *   - Identifier 1: `andyryan@microsoft.com` — enterprise user with
 *     work-email EASI MSA (dual-account: Primary Enterprise MSIT +
 *     Primary Consumer system-provisioned MSA). Plus 4 system-infra
 *     accounts and 5 B2B guest shadows.
 *
 *   - Identifier 2: `roshankp@outlook.com` — consumer user with B2B
 *     guest shadows (primary consumer MSA with 6 aliases, 3 B2B guests,
 *     1 Unknown, 1 SystemInfrastructure). Includes Consumer User
 *     Location Summary and Detail data.
 */

import type {
  AccountIdentifier,
  FormData,
} from "../types/caseTypes";
import { createDefaultIdentifierServices } from "../config/lensServicesConfig";
import { computeSlaDueDate } from "../constants/slaConstants";

const genId = () =>
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function buildLENS202600325FormData(): FormData {
  const createDate = new Date("2026-06-10");
  const dueDate = computeSlaDueDate("Routine", createDate, createDate);
  const startDate = new Date("2026-01-01");
  const endDate = new Date("2026-06-10");

  const services = createDefaultIdentifierServices(startDate, endDate);

  // ────────────────────────────────────────────────────────────────────────
  // Identifier 1: andyryan@microsoft.com
  // Enterprise user (MSIT) + system-provisioned consumer MSA (Andy pattern)
  // From relatedidentifiersspec.md Example 1 (roshanp/Andy pattern)
  // ────────────────────────────────────────────────────────────────────────
  const id1: AccountIdentifier = {
    id: genId(),
    value: "andyryan@microsoft.com",
    type: "Email Address",
    taskId: "LDID-325010",
    taskStatus: "InProgress",
    accountExistenceStatus: undefined,
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(startDate, endDate),
    checkAccounts: {
      accountType: "Enterprise-and-Consumer",
      primaryIdentifier: "andyryan@microsoft.com",
      relatedIdentifiers: [
        "andyryan@Service.microsoft.com",
        "34001B0289502",
        "ANDYRYAN@ame.gbl",
        "andyryan_debug@prdtrs01.prod.outlook.com",
        "andyryan_debug@trs10.prod.exo.sovnext.contoso.com",
        "andyryan@testtrs01.onmicrosoft.com",
        "andyryan_microsoft.com#EXT#@PRINGLEINC.onmicrosoft.com",
        "andyryan_microsoft.com#EXT#@westerncape.onmicrosoft.com",
        "andyryan_microsoft.com#EXT#@intel.onmicrosoft.com",
        "andyryan_microsoft.com#EXT#@hmgadmin.onmicrosoft.com",
        "andyryan_microsoft.com#EXT#@ContosoNow2022.onmicrosoft.com",
      ],
      category: "Primary Enterprise",
      disclosureRelevance: "RELEVANT",
      disclosureProcess: "Enterprise",
      tenantId: "72f988bf-86f1-41af-91ab-2d7cd011db47",
      discoveredAccounts: [
        // ── PRIMARY: MSIT Enterprise ──
        {
          accountType: "EnterpriseUser",
          tenantId: "72f988bf-86f1-41af-91ab-2d7cd011db47",
          upn: "andyryan@microsoft.com",
          externalDirectoryObjectId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          category: "Primary Enterprise",
          disclosureRelevance: "RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "andyryan@microsoft.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "andyryan@Service.microsoft.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
        // ── PRIMARY: Consumer MSA (system-provisioned, Andy pattern) ──
        {
          accountType: "Consumer",
          tenantId: "84df9e7f-e9f6-40af-b435-aaaaaaaaaaaa",
          puid: "340019355E015",
          easiAlias: "andyryan@microsoft.com",
          msaIdentityExists: true,
          hasMailboxStore: true,
          mailboxStatus: "Active",
          category: "Primary Consumer",
          disclosureRelevance: "RELEVANT",
          disclosureProcess: "Consumer",
          identifiers: [
            { identifier: "andyryan@microsoft.com", identifierType: "SmtpAddress", primary: true, externalEmailAddress: "andyryan@microsoft.com" },
            { identifier: "340019355E015", identifierType: "PUID", primary: false },
          ],
        },
        // ── RELATED: AME system-infrastructure ──
        {
          accountType: "EnterpriseUser",
          tenantId: "33e01921-4d64-4f8c-a055-5bdaffd5e33d",
          upn: "ANDYRYAN@ame.gbl",
          category: "RELATED account - SystemInfrastructure",
          disclosureRelevance: "NOT_RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "ANDYRYAN@ame.gbl", identifierType: "SmtpAddress", primary: true },
            { identifier: "ANDYRYAN@microsoft.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
        // ── RELATED: Torus prdtrs01 system-infrastructure ──
        {
          accountType: "EnterpriseUser",
          tenantId: "cdc5aeea-15c5-4db6-b079-fcadd2505dc2",
          upn: "andyryan_debug@prdtrs01.prod.outlook.com",
          category: "RELATED account - SystemInfrastructure",
          disclosureRelevance: "NOT_RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "andyryan_debug@prdtrs01.prod.outlook.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "andyryan@microsoft.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
        // ── RELATED: Torus trs10/sovnext system-infrastructure ──
        {
          accountType: "EnterpriseUser",
          tenantId: "e0001658-74e8-467c-b9c6-5414737179d5",
          upn: "andyryan_debug@trs10.prod.exo.sovnext.contoso.com",
          category: "RELATED account - SystemInfrastructure",
          disclosureRelevance: "NOT_RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "andyryan_debug@trs10.prod.exo.sovnext.contoso.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "andyryan@microsoft.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
        // ── RELATED: Torus testtrs01 system-infrastructure ──
        {
          accountType: "EnterpriseUser",
          tenantId: "b1a4f7cb-a159-44a6-ac48-6674e85c4ddc",
          upn: "andyryan@testtrs01.onmicrosoft.com",
          category: "RELATED account - SystemInfrastructure",
          disclosureRelevance: "NOT_RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "andyryan@testtrs01.onmicrosoft.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "andyryan@microsoft.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
        // ── RELATED: B2B guest in PRINGLEINC ──
        {
          accountType: "EnterpriseUser",
          tenantId: "af222276-768c-4d8e-af74-8def4f133e9b",
          upn: "andyryan_microsoft.com#EXT#@PRINGLEINC.onmicrosoft.com",
          category: "RELATED account - GuestAccount",
          disclosureRelevance: "RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "andyryan_microsoft.com#EXT#@PRINGLEINC.onmicrosoft.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "andyryan@microsoft.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
        // ── RELATED: B2B guest in westerncape ──
        {
          accountType: "EnterpriseUser",
          tenantId: "ae74bf7f-cfc3-4760-a1fe-0731afaa5502",
          upn: "andyryan_microsoft.com#EXT#@westerncape.onmicrosoft.com",
          category: "RELATED account - GuestAccount",
          disclosureRelevance: "RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "andyryan_microsoft.com#EXT#@westerncape.onmicrosoft.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "andyryan@microsoft.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
        // ── RELATED: B2B guest in intel ──
        {
          accountType: "EnterpriseUser",
          tenantId: "46c98d88-e344-4ed4-8496-4ed7712e255d",
          upn: "andyryan_microsoft.com#EXT#@intel.onmicrosoft.com",
          category: "RELATED account - GuestAccount",
          disclosureRelevance: "RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "andyryan_microsoft.com#EXT#@intel.onmicrosoft.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "andyryan@microsoft.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
        // ── RELATED: B2B guest in hmgadmin ──
        {
          accountType: "EnterpriseUser",
          tenantId: "1a092f68-5741-455a-8057-2acdb897a850",
          upn: "andyryan_microsoft.com#EXT#@hmgadmin.onmicrosoft.com",
          category: "RELATED account - GuestAccount",
          disclosureRelevance: "RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "andyryan_microsoft.com#EXT#@hmgadmin.onmicrosoft.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "andyryan@microsoft.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
        // ── RELATED: B2B guest in ContosoNow2022 ──
        {
          accountType: "EnterpriseUser",
          tenantId: "135a0f48-eb72-4859-8509-0ef1a2791f1a",
          upn: "andyryan_microsoft.com#EXT#@ContosoNow2022.onmicrosoft.com",
          category: "RELATED account - GuestAccount",
          disclosureRelevance: "RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "andyryan_microsoft.com#EXT#@ContosoNow2022.onmicrosoft.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "andyryan@microsoft.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
      ],
    },
    // Andy is enterprise-primary — consumer MSA is system-provisioned
    // (defaults-only, no user content). No consumer location data.
  } as any;

  // ────────────────────────────────────────────────────────────────────────
  // Identifier 2: roshankp@outlook.com
  // Consumer user with B2B guest shadows
  // From relatedidentifiersspec.md Example 2
  // ────────────────────────────────────────────────────────────────────────
  const id2: AccountIdentifier = {
    id: genId(),
    value: "roshankp@outlook.com",
    type: "Email Address",
    taskId: "LDID-325020",
    taskStatus: "InProgress",
    accountExistenceStatus: undefined,
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(startDate, endDate),
    checkAccounts: {
      accountType: "Consumer",
      primaryIdentifier: "roshanpadmanabhan@hotmail.com",
      relatedIdentifiers: [
        "roshankp@outlook.com",
        "roshankp",
        "+1-XXX-XXX-XXXX",
        "+91-XXXXX-XXXXX",
        "roshanpadmanabhan_hotmail.com#EXT#@PRINGLEINC.onmicrosoft.com",
        "pringleincadmin@PRINGLEINC.onmicrosoft.com",
        "roshanpadmanabhan_hotmail.com#EXT#@roshanpadmanabhanhotmail.onmicrosoft.com",
        "roshanpadmanabhan_hotmail.com#EXT#@microsoft.onmicrosoft.com",
        "636813256055782561@microsoftaccounts.onmicrosoft.com",
      ],
      category: "Primary Consumer",
      disclosureRelevance: "RELEVANT",
      disclosureProcess: "Consumer",
      discoveredAccounts: [
        // ── PRIMARY: Consumer MSA ──
        {
          accountType: "Consumer",
          tenantId: "84df9e7f-e9f6-40af-b435-aaaaaaaaaaaa",
          puid: "14A3072FD7D48",
          category: "Primary Consumer",
          disclosureRelevance: "RELEVANT",
          disclosureProcess: "Consumer",
          msaIdentityExists: true,
          hasMailboxStore: true,
          mailboxStatus: "Active",
          identifiers: [
            { identifier: "roshanpadmanabhan@hotmail.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "roshankp@outlook.com", identifierType: "SmtpAddress", primary: false },
            { identifier: "14A3072FD7D48", identifierType: "PUID", primary: false },
            { identifier: "roshankp", identifierType: "SkypeId", primary: false },
            { identifier: "+1-XXX-XXX-XXXX", identifierType: "PhoneNumber", primary: false },
            { identifier: "+91-XXXXX-XXXXX", identifierType: "PhoneNumber", primary: false },
          ],
        },
        // ── RELATED: B2B guest in PRINGLEINC ──
        {
          accountType: "EnterpriseUser",
          tenantId: "af222276-768c-4d8e-af74-8def4f133e9b",
          upn: "roshanpadmanabhan_hotmail.com#EXT#@PRINGLEINC.onmicrosoft.com",
          category: "RELATED account - GuestAccount",
          disclosureRelevance: "RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "roshanpadmanabhan_hotmail.com#EXT#@PRINGLEINC.onmicrosoft.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "roshanpadmanabhan@hotmail.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
        // ── RELATED: Unknown admin in PRINGLEINC ──
        {
          accountType: "EnterpriseUser",
          tenantId: "af222276-768c-4d8e-af74-8def4f133e9b",
          upn: "pringleincadmin@PRINGLEINC.onmicrosoft.com",
          category: "RELATED account - Unknown",
          disclosureRelevance: "PENDING_CLASSIFICATION",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "pringleincadmin@PRINGLEINC.onmicrosoft.com", identifierType: "SmtpAddress", primary: true },
          ],
        },
        // ── RELATED: B2B guest in own Azure tenant ──
        {
          accountType: "EnterpriseUser",
          tenantId: "46daee02-ad87-4d98-b627-5eb24f92a7bf",
          upn: "roshanpadmanabhan_hotmail.com#EXT#@roshanpadmanabhanhotmail.onmicrosoft.com",
          category: "RELATED account - GuestAccount",
          disclosureRelevance: "RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "roshanpadmanabhan_hotmail.com#EXT#@roshanpadmanabhanhotmail.onmicrosoft.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "roshanpadmanabhan@hotmail.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
        // ── RELATED: B2B guest in MSIT (microsoft.com tenant) ──
        {
          accountType: "EnterpriseUser",
          tenantId: "72f988bf-86f1-41af-91ab-2d7cd011db47",
          upn: "roshanpadmanabhan_hotmail.com#EXT#@microsoft.onmicrosoft.com",
          category: "RELATED account - GuestAccount",
          disclosureRelevance: "RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "roshanpadmanabhan_hotmail.com#EXT#@microsoft.onmicrosoft.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "roshanpadmanabhan@hotmail.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
        // ── RELATED: MSA shadow in microsoftaccounts ──
        {
          accountType: "EnterpriseUser",
          tenantId: "9188040d-6c67-4c5b-b112-36a304b66dad",
          category: "RELATED account - SystemInfrastructure",
          disclosureRelevance: "NOT_RELEVANT",
          disclosureProcess: "Enterprise",
          identifiers: [
            { identifier: "636813256055782561@microsoftaccounts.onmicrosoft.com", identifierType: "SmtpAddress", primary: true },
            { identifier: "roshanpadmanabhan@hotmail.com", identifierType: "SmtpAddress", primary: false },
          ],
        },
      ],
    },
    // ── Consumer User Location data (Scenarios 7 & 8) ──
    consumerLocationSummary: {
      targetSelector: "roshankp@outlook.com",
      identifierType: "smtpAddress",
      window: { startDate: "2026-05-17", endDate: "2026-06-16" },
      consistencyIndicator: "Multiple",
      mostRecentLogin: {
        country: "United States",
        date: "2026-06-15",
        timestamp: "2026-06-15T18:10:24Z",
      },
      dominantCountry: [
        { country: "United States", loginCount: 8 },
      ],
      countries: [
        {
          country: "United States",
          loginCount: 8,
          logins: [
            { date: "2026-06-15", timestamp: "2026-06-15T18:10:24Z" },
            { date: "2026-06-14", timestamp: "2026-06-14T09:42:11Z" },
            { date: "2026-06-12", timestamp: "2026-06-12T15:03:42Z" },
            { date: "2026-06-10", timestamp: "2026-06-10T07:28:15Z" },
            { date: "2026-06-08", timestamp: "2026-06-08T21:55:30Z" },
            { date: "2026-06-05", timestamp: "2026-06-05T11:17:09Z" },
            { date: "2026-05-30", timestamp: "2026-05-30T14:22:45Z" },
            { date: "2026-05-25", timestamp: "2026-05-25T08:45:33Z" },
          ],
        },
        {
          country: "India",
          loginCount: 3,
          logins: [
            { date: "2026-06-09", timestamp: "2026-06-09T04:15:33Z" },
            { date: "2026-06-01", timestamp: "2026-06-01T16:30:22Z" },
            { date: "2026-05-28", timestamp: "2026-05-28T23:12:07Z" },
          ],
        },
        {
          country: "Germany",
          loginCount: 1,
          logins: [
            { date: "2026-06-03", timestamp: "2026-06-03T12:45:10Z" },
          ],
        },
      ],
    },
    consumerLocationDetail: {
      targetSelector: "roshankp@outlook.com",
      identifierType: "smtpAddress",
      window: { startDateTimeUtc: "2025-12-17T00:00:00Z", endDateTimeUtc: "2026-06-16T23:59:59Z" },
      events: [
        { ipAddress: "71.231.193.110", dateTimeChangedUtc: "2026-06-15T18:10:24Z", country: "United States" },
        { ipAddress: "71.231.193.110", dateTimeChangedUtc: "2026-06-14T09:42:11Z", country: "United States" },
        { ipAddress: "71.231.193.115", dateTimeChangedUtc: "2026-06-12T15:03:42Z", country: "United States" },
        { ipAddress: "49.207.56.18", dateTimeChangedUtc: "2026-06-10T07:28:15Z", country: "United States" },
        { ipAddress: "103.21.125.77", dateTimeChangedUtc: "2026-06-09T04:15:33Z", country: "India" },
        { ipAddress: "71.231.193.110", dateTimeChangedUtc: "2026-06-08T21:55:30Z", country: "United States" },
        { ipAddress: "71.231.193.110", dateTimeChangedUtc: "2026-06-05T11:17:09Z", country: "United States" },
        { ipAddress: "203.0.113.27", dateTimeChangedUtc: "2026-06-03T12:45:10Z", country: "Germany" },
        { ipAddress: "103.21.125.80", dateTimeChangedUtc: "2026-06-01T16:30:22Z", country: "India" },
        { ipAddress: "71.231.193.110", dateTimeChangedUtc: "2026-05-30T14:22:45Z", country: "United States" },
        { ipAddress: "103.21.125.77", dateTimeChangedUtc: "2026-05-28T23:12:07Z", country: "India" },
        { ipAddress: "71.231.193.110", dateTimeChangedUtc: "2026-05-25T08:45:33Z", country: "United States" },
      ],
    },
  } as any;

  // ────────────────────────────────────────────────────────────────────────
  // Case envelope
  // ────────────────────────────────────────────────────────────────────────
  return {
    caseId: "LNS-2026-00325",
    requestType: "Subpoena",
    requestSubType: "Federal Subpoena",
    requestOrigin: "US",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "In Progress",
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    country: "United States",
    jurisdiction: "Federal",
    agency: "Federal Bureau of Investigation",
    agencyPhone: "+1-202-324-3000",
    agencyAddress: {
      number: "935 Pennsylvania Avenue NW",
      city: "Washington",
      stateProvince: "DC",
      postalCode: "20535",
    },
    natureOfCrimes: ["Computer Fraud", "Identity Theft"],
    mlat: false,
    additionalCaseInformation:
      "CLASSv2 v2.1 Demo Case — demonstrates Related Identifiers " +
      "per-account structure and Consumer User Location summary/detail " +
      "using real CLASS response patterns for andyryan@microsoft.com " +
      "(enterprise + consumer dual-account) and roshankp@outlook.com " +
      "(consumer with B2B guests).",
    caseNumber: "LNS-2026-00325",
    agencyCaseNumber: "FBI-2026-CF-00325",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-06-10",
    dateReceived: "2026-06-10",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-fbi1`,
        name: "Special Agent J. Smith",
        title: "Special Agent",
        email: "j.smith@fbi.gov",
        phone: "+1-202-324-3000",
        role: "Submitter",
        languages: "en - English",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
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
    notes: [],
  } as unknown as FormData;
}
