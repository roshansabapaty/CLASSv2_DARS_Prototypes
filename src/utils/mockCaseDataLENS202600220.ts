/**
 * Mock case data for LNS-2026-00220 — Dutch eEvidence preservation
 * request (EPOC-PR). Validation case for the EPOC-PR feature:
 *   - `requestType: "eEvidence"`, `requestSubType: "EPOC PR"`
 *   - Pipeline collapses to Collection only (no Packaging / Delivery)
 *   - Each target identifier carries its own
 *     `desiredPreservationExpiration` ISO-8601 date that the Collection
 *     page renders read-only on the expanded identifier row.
 *
 * Scenario:
 *   - Issuing Authority is the Dutch Openbaar Ministerie / Public
 *     Prosecutor's Office (Landelijk Parket — National Prosecutor).
 *   - Two target identifiers cover both Consumer + Enterprise account
 *     types with different preservation windows (6mo vs 12mo) so the
 *     per-identifier display is exercised.
 *   - `caseStage: "In Progress"` so the case opens on the Collection
 *     page where the new UX changes live.
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

export function buildLENS202600220FormData(): FormData {
  const createDate = new Date("2026-05-14");
  const dueDate = computeSlaDueDate("Routine", createDate, createDate);
  const startDate = new Date("2026-01-01");
  const endDate = new Date("2026-05-14");
  const leDateRange = { start: "2026-01-01", end: "2026-05-14" };

  // ── Structured legal context — Netherlands / National / OM ─────────────
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
          "Dutch Public Prosecutor's Office (National Prosecutor) — EPOC-PR " +
          "preservation order issued ahead of a coming production request.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: false,
  };

  // ── Pre-seeded preservation jobs — EPOC PR collapses the pipeline to
  //    Collection only (no Publish / Delivery). Each LE-requested service
  //    gets a single seeded job in a state mix; manual + automated data
  //    types covered across the two identifiers.
  function makeSeedJob(services: Record<string, any>) {
    return function seedJob(
      serviceKey: string,
      groupKey: string,
      itemKey: string,
      consumerOrEnterprise: "Consumer" | "Enterprise",
      jobOverrides: Record<string, unknown>,
    ): boolean {
      const svc = services[serviceKey];
      if (!svc?.categoryGroups?.[groupKey]) return false;
      const group = svc.categoryGroups[groupKey];
      if (!group[itemKey]) return false;
      svc.enabled = true;
      if (consumerOrEnterprise === "Consumer") svc.includeConsumerAccount = true;
      else svc.includeEnterpriseAccount = true;
      group[itemKey] = {
        ...group[itemKey],
        enabled: true,
        ...jobOverrides,
      };
      return true;
    };
  }

  // ── Identifier 1 — Consumer account, 6-month preservation window ─────
  const services1 = createDefaultIdentifierServices() as Record<string, any>;
  const seedJob1 = makeSeedJob(services1);

  // id1 / Email · Content Data · Email Content (automated, Collection Complete).
  seedJob1("exchangeConsumer", "contentData", "genericAttributes", "Consumer", {
    taskId: "TSK-EXC-CON-220-001",
    jobId: "JOB-EXC-CON-220-001",
    collectionStatus: "Complete",
    collectionStatusUpdatedAt: new Date("2026-05-15T09:30:00"),
  });

  // id1 / MSA · Subscriber Data · Basic Billing (manual, Collection Started).
  seedJob1("msaProfile", "subscriberData", "basicBilling", "Consumer", {
    taskId: "TSK-MSA-BIL-220-001",
    jobId: "JOB-MSA-BIL-220-001",
    collectionStatus: "Started",
    collectionStatusUpdatedAt: new Date("2026-05-17T11:15:00"),
  });

  const id1: AccountIdentifier = {
    id: genId(),
    value: "subject.nl@outlook.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "not-checked",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: services1,
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: ["Email", "Microsoft Account Profile"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
    },
    issuingAuthorityNotes:
      "Suspect's personal Microsoft consumer account. Preserve subscriber " +
      "data and any content within the EPOC's date window pending follow-on " +
      "production order.",
    desiredPreservationExpiration: "2026-11-14",
  } as any;

  // ── Identifier 2 — Enterprise account, 12-month preservation window ──
  const services2 = createDefaultIdentifierServices() as Record<string, any>;
  const seedJob2 = makeSeedJob(services2);

  // id2 / Email · Content Data · Email Content (automated, Collection Complete).
  seedJob2("exchangeEnterprise", "contentData", "genericAttributes", "Enterprise", {
    taskId: "TSK-EXE-CON-220-002",
    jobId: "JOB-EXE-CON-220-002",
    collectionStatus: "Complete",
    collectionStatusUpdatedAt: new Date("2026-05-15T10:00:00"),
  });

  // id2 / MSA · Subscriber Data · Basic Subscriber Data (automated, Collection Started).
  seedJob2("entraIDProfile", "subscriberData", "genericAttributes", "Enterprise", {
    taskId: "TSK-ENT-SUB-220-002",
    jobId: "JOB-ENT-SUB-220-002",
    collectionStatus: "Started",
    collectionStatusUpdatedAt: new Date("2026-05-16T08:45:00"),
  });

  // id2 / OneDrive · Content Data (manual, Collection Started).
  seedJob2("oneDriveForBusiness", "contentData", "genericAttributes", "Enterprise", {
    taskId: "TSK-ODB-CON-220-002",
    jobId: "JOB-ODB-CON-220-002",
    collectionStatus: "Started",
    collectionStatusUpdatedAt: new Date("2026-05-17T13:20:00"),
  });

  const id2: AccountIdentifier = {
    id: genId(),
    value: "ceo@stichting-leiden.example",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "not-checked",
    geoLocation: "Europe - North Europe",
    createdBy: "LE Agency",
    services: services2,
    checkAccounts: { accountType: "Enterprise" },
    leExternalServices: ["Email", "Microsoft Account Profile", "OneDrive"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
      OneDrive: leDateRange,
    },
    issuingAuthorityNotes:
      "Enterprise mailbox tied to Stichting Leiden Holding B.V. — preserve " +
      "Outlook + OneDrive content for the wider corporate-fraud investigation. " +
      "Longer 12-month preservation window requested due to anticipated trial " +
      "schedule.",
    desiredPreservationExpiration: "2027-05-14",
  } as any;

  return {
    caseId: "LNS-2026-00220",
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
      "Dutch EPOC-PR preservation request. The Openbaar Ministerie is " +
      "preserving Microsoft account data for two target identifiers ahead " +
      "of a planned follow-on EPOC for production. No content delivery is " +
      "required at this stage — the Collection page should show only the " +
      "preservation lane (no Packaging / Delivery) and surface each " +
      "identifier's IA-provided expiration date.",
    // LENS case number — same canonical value as `caseId`. The OM
    // reference lives in `agencyCaseNumber` below.
    caseNumber: "LNS-2026-00220",
    agencyCaseNumber: "OM-LP-2026-EPOC-PR-0220",
    relatedCaseNumbers: "",
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
    authorizationExpirationDate: new Date("2027-05-14"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC-PR (European Production Order — Preservation Request) issued " +
      "by the Dutch Openbaar Ministerie for two target identifiers in an " +
      "ongoing organised financial-fraud investigation. Preservation only — " +
      "production will be requested under a separate EPOC-ER.",
    approvalReferenceNumber: "OM-LP-2026-EPOC-PR-0220",
    approverName: "Rechter-Commissaris mr. Anke de Boer",
    approverRole: "Investigating Judge (Rechtbank Midden-Nederland)",
    approvalTimestamp: new Date("2026-05-13T13:45:00"),
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
    nonDisclosureOrders: [],
    startDate,
    endDate,
    timeZone: "Europe/Amsterdam (CET/CEST)",
    notes: [
      {
        id: `note-${Date.now().toString(36)}-nl1`,
        content:
          "Dutch EPOC-PR demo. Preservation-only flow — no Packaging or " +
          "Delivery. Two target identifiers (Consumer + Enterprise) with " +
          "different `desiredPreservationExpiration` windows.",
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
      approvalReferenceNumbers: ["OM-LP-2026-EPOC-PR-0220"],
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
    eevidenceEnforcingAuthority: {
      name: "Ministerie van Justitie en Veiligheid — Afdeling Internationale Rechtshulp",
      contactName: "Mw. Sanne Bakker",
      address: "Turfmarkt 147\n2511 DP Den Haag\nNetherlands",
      tel: "+31 70 370 7911",
      fax: "+31 70 370 7912",
      email: "eevidence@minjenv.nl",
    },
    // No Enterprise / processor flags — this is a preservation order
    // routed through the standard EPOC-PR envelope. The
    // EnterpriseRequestCard renders Q1 + Q2 as "Not selected".
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: false,
    },
    // Forward-pointer to the follow-on EPOC-ER production order. The
    // linkage was established after the IA's Form 5 — Confirmation of
    // Issuance landed in this case's inbox and the actual EPOC-ER case
    // (LNS-2026-00230) arrived in the queue separately.
    eevidenceRelatedCases: [
      {
        darsCaseNumber: "LNS-2026-00230",
        requestType: "eEvidence",
        requestSubType: "EPOC-ER",
        issuingAuthorityName: "Openbaar Ministerie — Landelijk Parket",
        issuingAuthorityReferenceNumbers: ["OM-LP-2026-EPOC-ER-0230"],
        dateOfTransmission: "2026-05-14",
        serviceProviderName: "Microsoft",
        additionalInformation:
          "Follow-on production order against the data preserved here. " +
          "Linked retroactively after the IA's Form 5 arrived.",
        requestStatus: "Waiting on Triage",
      },
    ],
  };
}
