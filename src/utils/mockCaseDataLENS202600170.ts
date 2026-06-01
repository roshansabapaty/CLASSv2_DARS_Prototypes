/**
 * Mock case data for LNS-2026-00170 — UK COPO walkthrough test case.
 *
 * Purpose: end-to-end demo walkthrough — Triage → Review → Collection.
 *
 * Shape:
 *   - Standard UK COPO Order (Investigatory Powers Act 2016) issued by the
 *     City of London Police — Economic Crime Directorate.
 *   - Single consumer email identifier so the fulfillment + collection
 *     pipeline stays uncluttered.
 *   - Authorization, agency, and signer fields PRE-FILLED so the RS isn't
 *     blocked on missing autofill paths during the walkthrough.
 *   - Case stage starts at "Waiting on Triage". No prior correspondence,
 *     no resolution history, no jobs yet — clean slate for the demo.
 *
 * Distinct from LNS-2026-00160 (Metropolitan Police, Cybercrime Unit) so
 * both UK COPO scenarios can co-exist in the queue without overlap.
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

export function buildLENS202600170FormData(): FormData {
  // ── Dates anchored to the walkthrough demo day ─────────────────────────
  const createDate = new Date("2026-05-12");
  const dueDate = computeSlaDueDate("Routine", createDate);
  const startDate = new Date("2026-01-01");
  const endDate = new Date("2026-05-12");
  const leDateRange = { start: "2026-01-01", end: "2026-05-12" };

  // ── Structured legal context — UK / National / City of London Police ──
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
    id: "AGY-UK-COL-ECD",
    name: "City of London Police — Economic Crime Directorate",
    shortName: "CoLP ECD",
    aliases: ["City of London ECD", "CoLP Fraud Squad"],
    country: unitedKingdom,
    agencyType: "LawEnforcement" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@cityoflondon.police.uk",
  };
  const legalContext: CaseLegalContext = {
    country: unitedKingdom,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-UK-COL-001",
          name: "DI Marcus Whitfield",
          title: "Detective Inspector",
          email: "m.whitfield@cityoflondon.police.uk",
          phone: "+44 20 7601 2222",
          role: "Submitter",
          languages: "en - English",
          source: "agency",
        },
        notes:
          "UK COPO walkthrough demo — primary contact for Economic Crime Directorate.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: false,
  };

  // ── Single Consumer email identifier — clean fulfillment path ─────────
  const id1: AccountIdentifier = {
    id: genId(),
    value: "demo.subject@outlook.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices("COPO Order"),
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: ["Email", "Microsoft Account Profile"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
    },
  } as any;

  return {
    caseId: "LNS-2026-00170",
    createDate,
    assigneeName: "Nicole Garcia",
    requestType: "COPO Order",
    requestSubType: "",
    requestOrigin: "LE Portal",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "Waiting on Triage",
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    // Legacy flat fields (kept for back-compat).
    country: unitedKingdom.countryName,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+44 20 7601 2222",
    agencyAddress: {
      number: "182 Bishopsgate",
      city: "London",
      stateProvince: "",
      postalCode: "EC2M 4NR",
    },
    legalContext,
    natureOfCrimes: ["Fraud"],
    mlat: false,
    additionalCaseInformation:
      "Walkthrough test case for the Triage → Review → Collection flow. UK COPO Order " +
      "under the Investigatory Powers Act 2016, issued by the City of London Police " +
      "Economic Crime Directorate. Single Consumer email identifier; standard " +
      "subscriber + content data scope.",
    // LENS case number — same canonical value as `caseId`. The City of
    // London Police ECD's reference lives in `agencyCaseNumber` below.
    caseNumber: "LNS-2026-00170",
    agencyCaseNumber: "COLP-ECD-2026-FR-0170",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-12",
    dateReceived: "2026-05-12",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-colp1`,
        name: "DI Marcus Whitfield",
        title: "Detective Inspector",
        email: "m.whitfield@cityoflondon.police.uk",
        phone: "+44 20 7601 2222",
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
    authorizationExpirationDate: new Date("2026-08-12"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "UK COPO production order under the Investigatory Powers Act 2016. " +
      "Authorises collection of subscriber and content data for the identified " +
      "Microsoft consumer account in connection with an active fraud investigation.",
    approvalReferenceNumber: "PO-COLP-2026-0170",
    approverName: "District Judge Eleanor Whitmore",
    approverRole: "District Judge (Magistrates' Courts)",
    approvalTimestamp: new Date("2026-05-12T10:15:00"),
    approvalIsEmergency: false,
    approverAlternateName: "DJ E. Whitmore",
    approverEmail: "city.mc@justice.gov.uk",
    approverPhoneNumber: "+44 20 7563 5000",
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
    timeZone: "Europe/London (GMT/BST)",
    notes: [
      {
        id: `note-${Date.now().toString(36)}-colp1`,
        content:
          "Walkthrough test case. Use this to rehearse the end-to-end flow: " +
          "triage review → confirm legal & agency → review identifier & services → " +
          "(Continue to Fulfillment) → Fulfillment Wizard → (Send to Collection) → " +
          "Collection page job tracking → Resolve Case.",
        createdBy: "Nicole Garcia",
        createdAt: createDate,
      },
    ],
  };
}
