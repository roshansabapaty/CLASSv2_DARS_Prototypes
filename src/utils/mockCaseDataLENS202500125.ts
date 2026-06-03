/**
 * Mock case data for LNS-2025-00125 — UK Preservation Request, lawyer-assigned.
 *
 * Purpose: Tier 3 attorney-escalation seed (Phase 2 prototype-to-prod merge).
 * Demonstrates the "Lawyer Assignment" path — the RS routed this case to a
 * specific attorney (Michael Chen) for ongoing review rather than firing a
 * one-shot escalation.
 *
 * Shape:
 *   - UK COPO Preservation Request issued by the National Crime Agency
 *     (NCA) — Cyber Crime Unit.
 *   - Single Enterprise mailbox identifier; preservation hold only (no
 *     content production yet).
 *   - `assignedToLawyer: true` on the queue row; the attorneyEscalation
 *     here surfaces the Pending review when the attorney opens the case.
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

export function buildLENS202500125FormData(): FormData {
  const createDate = new Date("2025-01-15T09:42:00");
  const dueDate = computeSlaDueDate("Routine", createDate, createDate);
  const startDate = new Date("2024-12-01");
  const endDate = new Date("2025-01-15");
  const leDateRange = { start: "2024-12-01", end: "2025-01-15" };
  const escalatedAt = new Date("2025-01-15T15:20:00");

  const unitedKingdom = {
    countryCode: "GB",
    countryName: "United Kingdom",
    region: "ROW" as const,
  };
  const jurisdiction = {
    country: unitedKingdom,
    jurisdictionLevel: "National",
    jurisdictionName: "England and Wales",
  };
  const issuingAuthority = {
    id: "AGY-UK-NCA-CCU",
    name: "National Crime Agency — Cyber Crime Unit",
    shortName: "NCA CCU",
    aliases: ["NCA Cyber Crime Unit"],
    country: unitedKingdom,
    agencyType: "LawEnforcement" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@nca.gov.uk",
  };
  const legalContext: CaseLegalContext = {
    country: unitedKingdom,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-UK-NCA-001",
          name: "DS Catherine Walsh",
          title: "Detective Sergeant",
          email: "c.walsh@nca.gov.uk",
          phone: "+44 20 7238 8000",
          role: "Submitter",
          languages: "en - English",
          source: "agency",
        },
        notes:
          "NCA Cyber Crime Unit — investigating a corporate identity-theft ring.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: false,
  };

  // ── Single Enterprise email identifier — preservation hold ────────────
  const id1: AccountIdentifier = {
    id: genId(),
    value: "treasury.ops@globex-uk.example",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    // Lawyer-assigned: identifier sits in attorney review while Michael
    // confirms the preservation scope. No content production until he
    // signs off.
    taskStatus: "AttorneyReview",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices(),
    checkAccounts: {
      accountType: "Enterprise",
      tenantId: "8b3f9c2e-7d14-4a26-9e87-f31a02d4c581",
      tenantPrimaryDomain: "globex-uk.example",
      tenantAdminName: "Michael Thompson",
      tenantAdminEmail: "tenant.admin@globex-uk.example",
      tenantAdminPhone: "+44 20 7946 0480",
    },
    leExternalServices: ["Email", "OneDrive"],
    leExternalServiceDates: {
      Email: leDateRange,
      OneDrive: leDateRange,
    },
    issuingAuthorityNotes:
      "Corporate treasury operations mailbox at Globex UK Ltd. NCA " +
      "requests preservation only — no content production at this stage. " +
      "Production request will follow once the investigation supports a " +
      "full COPO order.",
    attorneyEscalation: {
      role: "Attorney",
      assignedAttorneyId: "ATT-002",
      reason:
        "Enterprise preservation request — attorney should confirm the " +
        "preservation scope is proportionate to the identified investigation " +
        "and review the duration before the hold is committed. Tenant has " +
        "custom contract language we may need to honour.",
      escalatedAt,
      escalatedBy: "Michael Chen",
      status: "Pending",
      scope: "some",
      actions: [],
    },
  } as any;

  // Globex UK enterprise context — single-tenant preservation case.
  // Drives the Enterprise Org Summary card in the case form and the
  // attorney workspace's EnterpriseContextSection (org panel + user
  // panel). Conflict of law is UK-only (LE country, tenant HQ, mailbox
  // region all align) so no cross-border heat.
  const enterpriseContext: EnterpriseContext = {
    triggers: ["class_account_check"],
    manifestErrorPresent: false,
    org: MOCK_ORGS["globex-uk"],
    users: [
      {
        identifierId: id1.id,
        identifierValue: id1.value,
        lastLogonLocation: "London, UK",
        geoResolutions30d: ["GB"],
        mailboxRegion: "UK South",
        oneDriveRegion: "UK South",
        conflictOfLawJurisdictions: ["GB"],
      },
    ],
    policyReviewRequired: false,
    execReviewRequired: false,
  };

  return {
    caseId: "LNS-2025-00125",
    createDate,
    assigneeName: "Michael Chen",
    requestType: "Preservation Request",
    requestSubType: "",
    requestOrigin: "Email forward",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "In Review",
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    country: unitedKingdom.countryName,
    agencyCountryCode: unitedKingdom.countryCode,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+44 20 7238 8000",
    agencyAddress: {
      number: "Units 1-6, Citadel Place",
      city: "London",
      stateProvince: "",
      postalCode: "SE11 5EF",
    },
    legalContext,
    natureOfCrimes: ["Fraud"],
    mlat: false,
    additionalCaseInformation:
      "Preservation request under the Investigatory Powers Act 2016. NCA " +
      "is investigating a suspected corporate identity-theft ring targeting " +
      "treasury operations at multiple UK SMEs. Lawyer-assigned (Michael " +
      "Chen) so the same attorney handles the subsequent COPO order if it " +
      "lands.",
    caseNumber: "LNS-2025-00125",
    agencyCaseNumber: "NCA-CCU-2025-PRES-0125",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2025-01-15",
    dateReceived: "2025-01-15",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-nca1`,
        name: "DS Catherine Walsh",
        title: "Detective Sergeant",
        email: "c.walsh@nca.gov.uk",
        phone: "+44 20 7238 8000",
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
    authorizationExpirationDate: new Date("2025-07-15"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Administrative",
    approvalDescription:
      "NCA preservation request under the Investigatory Powers Act 2016 — " +
      "data hold only, no content production.",
    approvalReferenceNumber: "NCA-CCU-2025-PRES-0125",
    approverName: "Superintendent Robert Hayes",
    approverRole: "NCA Superintendent",
    approvalTimestamp: new Date("2025-01-15T09:15:00"),
    approvalIsEmergency: false,
    approverAlternateName: "Supt R. Hayes",
    approverEmail: "r.hayes@nca.gov.uk",
    approverPhoneNumber: "+44 20 7238 8001",
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
    enterpriseContext,
    nonDisclosureOrders: [],
    startDate,
    endDate,
    timeZone: "Europe/London (GMT/BST)",
    notes: [
      {
        id: `note-${Date.now().toString(36)}-pres1`,
        content:
          "Lawyer-assigned at intake. Michael will review the preservation " +
          "scope + duration; production order expected to follow.",
        createdBy: "Triage Specialist",
        createdAt: createDate,
      },
    ],
    attorneyEscalation: {
      role: "Attorney",
      assignedAttorneyId: "ATT-002",
      reason:
        "Enterprise preservation request — attorney should confirm the " +
        "preservation scope is proportionate and review the duration before " +
        "the hold is committed.",
      escalatedAt,
      escalatedBy: "Michael Chen",
      status: "Pending",
      scope: "some",
      actions: [],
    },
    escalationAuditEvents: [
      {
        id: "audit-seed-lns125-escalated",
        kind: "Escalated",
        actor: "Michael Chen",
        actorRole: "Attorney",
        performedAt: escalatedAt,
        note:
          "Lawyer-assigned: Michael Chen routed this preservation request " +
          "into attorney review to confirm scope + duration before the hold " +
          "is committed.",
      },
    ],
  } as FormData;
}
