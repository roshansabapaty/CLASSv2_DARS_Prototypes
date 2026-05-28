/**
 * Mock case data for LNS-2025-00142 — US Emergency Disclosure Request.
 *
 * Purpose: Tier 3 attorney-escalation seed (Phase 2 prototype-to-prod merge).
 * Demonstrates the highest-priority attorney scenario: a kidnapping / threat-
 * to-life case escalated for emergency disclosure under 18 USC 2702(b)(8).
 *
 * Shape:
 *   - Emergency Request submitted by the FBI Cyber Crime Center (C3).
 *   - Three identifiers (email, phone, address) — all escalated under a
 *     case-scoped review since the attorney must clear the entire package
 *     of exigent-circumstance signals before any data leaves Microsoft.
 *   - `isThreatToLife: true` on the queue row + `casePriority: "Emergency"`
 *     so the dashboard pins it at the top of the queue.
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

export function buildLENS202500142FormData(): FormData {
  const createDate = new Date("2025-01-19T11:37:00");
  const dueDate = computeSlaDueDate("Emergency", createDate);
  const startDate = new Date("2025-01-19");
  const endDate = new Date("2025-01-19");
  const leDateRange = { start: "2025-01-15", end: "2025-01-19" };
  const escalatedAt = new Date("2025-01-19T11:55:00");

  const unitedStates = {
    countryCode: "US",
    countryName: "United States",
    region: "AMER" as const,
  };
  const jurisdiction = {
    country: unitedStates,
    jurisdictionLevel: "Federal",
    jurisdictionName: "Federal Bureau of Investigation",
  };
  const issuingAuthority = {
    id: "AGY-US-FBI-CCD",
    name: "FBI — Cyber Crime Division (C3)",
    shortName: "FBI C3",
    aliases: ["Federal Bureau of Investigation", "FBI C3"],
    country: unitedStates,
    agencyType: "LawEnforcement" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@fbi.gov",
  };
  const legalContext: CaseLegalContext = {
    country: unitedStates,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-US-FBI-001",
          name: "SA Rachel Vance",
          title: "Special Agent",
          email: "r.vance@fbi.gov",
          phone: "+1 202 555 0144",
          role: "Submitter",
          languages: "en - English",
          source: "agency",
        },
        notes:
          "Lead investigator on active kidnapping matter — exigent-circumstances declaration filed under 18 USC 2702(b)(8).",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: false,
  };

  // ── Three target identifiers, all escalated (case-scoped). ────────────
  const id1: AccountIdentifier = {
    id: genId(),
    value: "victim.contact@outlook.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "AttorneyReview",
    accountExistenceStatus: "not-checked",
    geoLocation: "Americas - East US",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(),
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: ["Email", "Microsoft Account Profile", "Teams"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
      Teams: leDateRange,
    },
    issuingAuthorityNotes:
      "Last known communication account of the victim. Most recent inbound " +
      "messages requested to identify abductor contact.",
    attorneyEscalation: {
      role: "Attorney",
      reason:
        "Emergency Disclosure Request under 18 USC 2702(b)(8). Attorney " +
        "must confirm exigent circumstances and authorize emergency " +
        "disclosure on all three identifiers in this package before any " +
        "data leaves Microsoft.",
      escalatedAt,
      escalatedBy: "Triage Specialist",
      status: "Pending",
      scope: "all",
      actions: [],
    },
  } as any;

  const id2: AccountIdentifier = {
    id: genId(),
    value: "+1 415 555 0167",
    type: "Phone Number",
    taskId: genIdentifierTaskId(),
    taskStatus: "AttorneyReview",
    accountExistenceStatus: "not-checked",
    geoLocation: "Americas - West US",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(),
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: ["Microsoft Account Profile"],
    leExternalServiceDates: {
      "Microsoft Account Profile": leDateRange,
    },
    issuingAuthorityNotes:
      "Phone number associated with a burner Microsoft account suspected " +
      "to be controlled by the abductor.",
    attorneyEscalation: {
      role: "Attorney",
      reason:
        "Emergency Disclosure Request — same case-scoped escalation as " +
        "the victim's email account.",
      escalatedAt,
      escalatedBy: "Triage Specialist",
      status: "Pending",
      scope: "all",
      actions: [],
    },
  } as any;

  const id3: AccountIdentifier = {
    id: genId(),
    value: "2715 Mission St, San Francisco, CA 94110",
    type: "Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "AttorneyReview",
    accountExistenceStatus: "not-checked",
    geoLocation: "Americas - West US",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(),
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: ["Microsoft Account Profile", "Azure"],
    leExternalServiceDates: {
      "Microsoft Account Profile": leDateRange,
      Azure: leDateRange,
    },
    issuingAuthorityNotes:
      "Last known physical address of the victim — FBI requests any " +
      "Microsoft account linked to this address (Azure subscriptions, " +
      "billing addresses) for correlation.",
    attorneyEscalation: {
      role: "Attorney",
      reason:
        "Emergency Disclosure Request — same case-scoped escalation as " +
        "the other two identifiers.",
      escalatedAt,
      escalatedBy: "Triage Specialist",
      status: "Pending",
      scope: "all",
      actions: [],
    },
  } as any;

  return {
    caseId: "LNS-2025-00142",
    createDate,
    assigneeName: "",
    requestType: "Emergency Request",
    requestSubType: "",
    requestOrigin: "LE Portal",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "Waiting on Triage",
    rejectionReason: "",
    caseEscalated: true,
    escalationNotes:
      "Case auto-escalated to attorney review at intake due to Emergency " +
      "Request priority + Threat to Life classification.",
    country: unitedStates.countryName,
    agencyCountryCode: unitedStates.countryCode,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+1 202 555 0144",
    agencyAddress: {
      number: "935 Pennsylvania Avenue NW",
      city: "Washington",
      stateProvince: "DC",
      postalCode: "20535",
    },
    legalContext,
    natureOfCrimes: ["Kidnapping", "TerrorismOrThreatToPublicSafety"],
    mlat: false,
    additionalCaseInformation:
      "Active kidnapping investigation. Subject taken from her residence " +
      "around 22:00 local time on 2025-01-18. FBI submitted an Emergency " +
      "Disclosure Request under 18 USC 2702(b)(8) — exigent-circumstances " +
      "declaration signed by SAC. All three identifiers must be reviewed " +
      "together; attorney sign-off required on the exigent classification " +
      "before any disclosure.",
    caseNumber: "LNS-2025-00142",
    agencyCaseNumber: "FBI-C3-EDR-2025-00142",
    relatedCaseNumbers: "",
    casePriority: "Emergency",
    dateServed: "2025-01-19",
    dateReceived: "2025-01-19",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-fbi1`,
        name: "SA Rachel Vance",
        title: "Special Agent",
        email: "r.vance@fbi.gov",
        phone: "+1 202 555 0144",
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
    authorizationExpirationDate: new Date("2025-02-19"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Emergency",
    approvalDescription:
      "Emergency Disclosure Request under 18 USC 2702(b)(8) — exigent " +
      "circumstances involving a credible threat to life.",
    approvalReferenceNumber: "FBI-C3-EDR-2025-00142",
    approverName: "SAC Daniel Ortiz",
    approverRole: "Special Agent in Charge",
    approvalTimestamp: new Date("2025-01-19T11:20:00"),
    approvalIsEmergency: true,
    approverAlternateName: "SAC D. Ortiz",
    approverEmail: "d.ortiz@fbi.gov",
    approverPhoneNumber: "+1 202 555 0145",
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
    identifiers: [id1, id2, id3],
    nonDisclosureOrders: [],
    startDate,
    endDate,
    timeZone: "America/Los_Angeles (PST)",
    notes: [
      {
        id: `note-${Date.now().toString(36)}-edr1`,
        content:
          "Triage flagged this as an Emergency Disclosure Request — auto " +
          "escalated to attorney review per the Emergency Request workflow.",
        createdBy: "Triage Specialist",
        createdAt: createDate,
      },
    ],
    isThreatToLife: true,
    attorneyEscalation: {
      role: "Attorney",
      reason:
        "Emergency Disclosure Request under 18 USC 2702(b)(8). Attorney " +
        "must confirm exigent circumstances and authorize emergency " +
        "disclosure on all three identifiers in this package before any " +
        "data leaves Microsoft.",
      escalatedAt,
      escalatedBy: "Triage Specialist",
      status: "Pending",
      scope: "all",
      actions: [],
    },
    escalationAuditEvents: [
      {
        id: "audit-seed-lns142-escalated",
        kind: "Escalated",
        actor: "Triage Specialist",
        actorRole: "TriageSpecialist",
        performedAt: escalatedAt,
        note:
          "Case auto-escalated at intake — Emergency Request + Threat to " +
          "Life. Attorney must confirm the exigent-circumstances " +
          "classification before any disclosure.",
      },
    ],
  } as FormData;
}
