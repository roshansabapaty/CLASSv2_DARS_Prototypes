/**
 * Mock case data factory
 * Generates stage-appropriate FormData from a CaseQueueItem
 */
import type { FormData, AccountIdentifier, SubCategory, ServiceWithResults, IdentifierServices, Agent } from "../types/caseTypes";
import { createDefaultIdentifierServices, createDefaultServiceCategoryGroups, getServiceCategoryGroups, LENS_SERVICES } from "../config/lensServicesConfig";
import type { CaseQueueItem } from "../components/case-queue/case-queue-types";

const genId = () => `id-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
const genJobId = () => `JOB-${Date.now().toString(36).substring(2)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
const genTaskId = () => `LDID-${Math.floor(Math.random() * 900000) + 100000}`;

// Agency data by country — sourced from the submitting LE authority
const AGENCY_BY_COUNTRY: Record<string, { name: string; phone: string; address: { number: string; city: string; stateProvince: string; postalCode: string }; agents: Omit<Agent, "id">[] }> = {
  "United States": {
    name: "FBI — Cyber Division",
    phone: "+1 (202) 324-3000",
    address: { number: "935 Pennsylvania Ave NW", city: "Washington", stateProvince: "DC", postalCode: "20535" },
    agents: [
      { name: "SSA Jennifer Walsh", title: "Supervisory Special Agent", email: "j.walsh@ic.fbi.gov", phone: "+1 (202) 324-3001", role: "Submitter", languages: "en - English", source: "agency" },
      { name: "SA Marcus Thompson", title: "Special Agent", email: "m.thompson@ic.fbi.gov", phone: "+1 (202) 324-3002", role: "Recipient", languages: "en - English", source: "agency" },
    ],
  },
  "Canada": {
    name: "Royal Canadian Mounted Police — Cybercrime Unit",
    phone: "+1 (613) 993-7267",
    address: { number: "73 Leikin Drive", city: "Ottawa", stateProvince: "ON", postalCode: "K1A 0R2" },
    agents: [
      { name: "Cpl. Élodie Tremblay", title: "Corporal, Cybercrime Investigations", email: "e.tremblay@rcmp-grc.gc.ca", phone: "+1 (613) 993-7268", role: "Submitter", languages: "en - English, fr - French", source: "agency" },
      { name: "Sgt. James Whitfield", title: "Sergeant, Digital Forensics", email: "j.whitfield@rcmp-grc.gc.ca", phone: "+1 (613) 993-7269", role: "Recipient", languages: "en - English", source: "agency" },
    ],
  },
  "United Kingdom": {
    name: "National Crime Agency — Cyber Crime Unit",
    phone: "+44 (0)370 496 7622",
    address: { number: "Units 1-6 Citadel Place", city: "London", stateProvince: "England", postalCode: "SE11 5EF" },
    agents: [
      { name: "DI Oliver Hastings", title: "Detective Inspector", email: "o.hastings@nca.gov.uk", phone: "+44 20 7238 8001", role: "Submitter", languages: "en - English", source: "agency" },
    ],
  },
  "Germany": {
    name: "Bundeskriminalamt (BKA) — Cybercrime Division",
    phone: "+49 (0)611 55-0",
    address: { number: "Thaerstraße 11", city: "Wiesbaden", stateProvince: "Hessen", postalCode: "65193" },
    agents: [
      { name: "KHK Stefan Müller", title: "Kriminalhauptkommissar", email: "s.mueller@bka.bund.de", phone: "+49 611 55-1234", role: "Submitter", languages: "de - German, en - English", source: "agency" },
      { name: "KK Anna Weber", title: "Kriminalkommissarin", email: "a.weber@bka.bund.de", phone: "+49 611 55-1235", role: "Recipient", languages: "de - German, en - English", source: "agency" },
    ],
  },
  "Australia": {
    name: "Australian Federal Police — Cybercrime Operations",
    phone: "+61 2 6131 3000",
    address: { number: "Edmund Barton Building", city: "Canberra", stateProvince: "ACT", postalCode: "2600" },
    agents: [
      { name: "Det. Sgt. Liam O'Brien", title: "Detective Sergeant", email: "l.obrien@afp.gov.au", phone: "+61 2 6131 3001", role: "Submitter", languages: "en - English", source: "agency" },
    ],
  },
  "France": {
    name: "Direction Centrale de la Police Judiciaire — OCLCTIC",
    phone: "+33 1 40 97 80 00",
    address: { number: "101 Rue des Trois Fontanot", city: "Nanterre", stateProvince: "Île-de-France", postalCode: "92000" },
    agents: [
      { name: "Cmdt. Sophie Durand", title: "Commandant de Police", email: "s.durand@interieur.gouv.fr", phone: "+33 1 40 97 80 01", role: "Submitter", languages: "fr - French, en - English", source: "agency" },
    ],
  },
};

function buildAgentsForCase(item: CaseQueueItem): Agent[] {
  const agencyData = AGENCY_BY_COUNTRY[item.country];
  if (!agencyData) {
    return [{ id: genId(), name: "Unknown Agent", title: "Agent", email: "agent@agency.gov", phone: "+1-555-0100", role: "Submitter", source: "agency" }];
  }
  return agencyData.agents.map(a => ({ ...a, id: genId() }));
}

const IDENTIFIER_SAMPLES: Record<string, string[]> = {
  email: ["user@outlook.com", "contact@hotmail.com", "person@live.com", "suspect@outlook.com"],
  phone: ["+1-425-555-0191", "+1-206-555-0142", "+44-20-7946-0958", "+49-30-1234-5678"],
  address: ["123 Main St, Seattle WA", "456 Oak Ave, London UK", "789 Pine Rd, Berlin DE"],
};

/**
 * Expand a queue-card service label into one or more service keys.
 *
 * Several queue labels conflate identity-layer + product-layer data that the
 * new service catalog separates. For example, "Outlook" implies both Exchange
 * email content AND the underlying enterprise account profile, so it expands
 * into two keys.
 */
function expandServiceLabelToKeys(label: string): string[] {
  switch (label) {
    case "Outlook":              return ["exchangeEnterprise", "entraIDProfile"];
    case "Outlook Consumer":     return ["exchangeConsumer", "msaProfile"];
    case "Exchange (MSA)":       return ["exchangeConsumer", "msaProfile"];
    case "Teams":                return ["teamsForBusiness"];
    case "Teams Consumer":       return ["teamsForLife"];
    case "Azure":                return ["azureStorage"];
    case "OneDrive/SharePoint":  return ["oneDriveForBusiness", "sharePointOnline"];
    case "OneDrive for Business": return ["oneDriveForBusiness"];
    case "OneDrive Consumer":    return ["oneDriveConsumer"];
    case "Skype":                return ["skype"];
    case "XBOX":                 return ["xbox"];
    default:                     return [];
  }
}

function makeDefaultSubCategory(): SubCategory {
  return { enabled: false, taskId: "", startDate: undefined, endDate: undefined, status: "Not started" };
}

function makeAllDefaultServices(): IdentifierServices {
  return createDefaultIdentifierServices();
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function randomCollectionStatus(): "Started" | "Complete" | "No Data" {
  const r = Math.random();
  if (r < 0.5) return "Started";
  if (r < 0.85) return "Complete";
  return "No Data";
}

// Pick one representative item per group from the service's config (prefer
// "genericAttributes" if it exists, else first item) so the mock data shape
// matches the actual catalog (no phantom items for groups a service doesn't have).
function getMockJobItemsFor(serviceKey: string): Array<{ groupKey: string; itemKey: string }> {
  const groups = getServiceCategoryGroups(serviceKey);
  return groups
    .map((g) => {
      const generic = g.items.find((i) => i.key === "genericAttributes");
      const pick = generic || g.items[0];
      return pick ? { groupKey: g.key, itemKey: pick.key } : null;
    })
    .filter(Boolean) as Array<{ groupKey: string; itemKey: string }>;
}

function enableServiceWithJobs(
  services: IdentifierServices,
  serviceKey: string,
  startDate: Date,
  endDate: Date,
  statusOverride?: "Started" | "Complete" | "No Data" | "Not Started",
  pipelineComplete?: boolean,
) {
  const svc = services[serviceKey];
  if (!svc) return;
  svc.enabled = true;
  getMockJobItemsFor(serviceKey).forEach(({ groupKey, itemKey }) => {
    if (!svc.categoryGroups[groupKey]) svc.categoryGroups[groupKey] = {};
    if (!svc.categoryGroups[groupKey][itemKey]) {
      svc.categoryGroups[groupKey][itemKey] = makeDefaultSubCategory();
    }
    const status = statusOverride || randomCollectionStatus();
    const jobId = genJobId();
    const cat = svc.categoryGroups[groupKey][itemKey];
    cat.enabled = true;
    cat.taskId = `TSK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    cat.startDate = startDate;
    cat.endDate = endDate;
    cat.createdOn = hoursAgo(Math.floor(Math.random() * 48) + 2);
    cat.jobId = jobId;
    cat.collectionStatus = status;
    cat.collectionStatusUpdatedAt = hoursAgo(Math.floor(Math.random() * 12) + 1);
    if (status === "Complete" || status === "No Data") {
      cat.publishStatus = pipelineComplete ? "Complete" : "Not Started";
      cat.publishJobId = pipelineComplete ? `PRP-${jobId.substring(4)}` : undefined;
      cat.publishStatusUpdatedAt = pipelineComplete ? hoursAgo(Math.floor(Math.random() * 6)) : undefined;
      cat.deliveryStatus = pipelineComplete ? "Complete" : "Not Started";
      cat.deliveryJobId = pipelineComplete ? `DLV-${jobId.substring(4)}` : undefined;
      cat.deliveryStatusUpdatedAt = pipelineComplete ? hoursAgo(1) : undefined;
    } else {
      cat.publishStatus = "Not Started";
      cat.deliveryStatus = "Not Started";
    }
    cat.status = status === "Complete" ? "Completed" : "In Progress";
  });
}

function enableServiceWithoutJobs(
  services: IdentifierServices,
  serviceKey: string,
  startDate: Date,
  endDate: Date,
) {
  const svc = services[serviceKey];
  if (!svc) return;
  svc.enabled = true;
  getMockJobItemsFor(serviceKey).forEach(({ groupKey, itemKey }) => {
    if (!svc.categoryGroups[groupKey]) svc.categoryGroups[groupKey] = {};
    if (!svc.categoryGroups[groupKey][itemKey]) {
      svc.categoryGroups[groupKey][itemKey] = makeDefaultSubCategory();
    }
    const cat = svc.categoryGroups[groupKey][itemKey];
    cat.enabled = true;
    cat.taskId = `TSK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    cat.startDate = startDate;
    cat.endDate = endDate;
  });
}

function buildIdentifiers(item: CaseQueueItem, withJobs: boolean, statusOverride?: any, pipelineComplete?: boolean): AccountIdentifier[] {
  const identifiers: AccountIdentifier[] = [];
  const startDate = new Date("2024-10-01");
  const endDate = new Date("2025-01-15");

  let emailIdx = 0, phoneIdx = 0, addressIdx = 0;

  for (let i = 0; i < item.identifierCount; i++) {
    // Pick identifier type round-robin from the case's identifierTypes
    const types = Object.entries(item.identifierTypes);
    const [type] = types[i % types.length];
    let value: string;
    if (type === "email") {
      value = IDENTIFIER_SAMPLES.email[emailIdx++ % IDENTIFIER_SAMPLES.email.length];
    } else if (type === "phone") {
      value = IDENTIFIER_SAMPLES.phone[phoneIdx++ % IDENTIFIER_SAMPLES.phone.length];
    } else {
      value = IDENTIFIER_SAMPLES.address[addressIdx++ % IDENTIFIER_SAMPLES.address.length];
    }

    const typeLabel = type === "email" ? "Email Address" : type === "phone" ? "Phone Number" : "Physical Address";
    const services = makeAllDefaultServices();

    // Enable requested services. Each queue label may expand into multiple service keys.
    item.servicesRequested.forEach(svcName => {
      const svcKeys = expandServiceLabelToKeys(svcName);
      svcKeys.forEach(svcKey => {
        if (withJobs) {
          enableServiceWithJobs(services, svcKey, startDate, endDate, statusOverride, pipelineComplete);
        } else {
          enableServiceWithoutJobs(services, svcKey, startDate, endDate);
        }
      });
    });

    identifiers.push({
      id: genId(),
      value,
      type: typeLabel,
      taskId: genTaskId(),
      taskStatus: withJobs ? "InProgress" : "Not Started",
      accountExistenceStatus: item.accountExistenceChecked ? "success" : "not-checked",
      geoLocation: item.country,
      createdBy: "LE Agency",
      services,
    } as AccountIdentifier);
  }

  return identifiers;
}

export function buildFormDataFromQueueItem(item: CaseQueueItem): FormData {
  const stage = item.caseStage;

  // Determine what data to generate based on case stage
  let identifiers: AccountIdentifier[];

  switch (stage) {
    case "Waiting on Triage":
      // LE has already specified services/categories/sub-categories + date ranges
      // when submitting the case. Triage reviews — not configures from scratch.
      identifiers = buildIdentifiers(item, false);
      break;

    case "Recommend Rejection":
    case "Rejected":
    case "Cancelled":
      // Triage data only, services may be partially configured
      identifiers = buildIdentifiers(item, false);
      break;

    case "Triage Complete":
    case "In Review":
      // Services configured but no jobs submitted yet
      identifiers = buildIdentifiers(item, false);
      break;

    case "In Progress":
      // Active collection — jobs with mixed statuses
      identifiers = buildIdentifiers(item, true);
      break;

    case "No Data Provided":
      // All collection jobs complete with "No Data"
      identifiers = buildIdentifiers(item, true, "No Data");
      break;

    case "Resolved":
      // Full pipeline complete
      identifiers = buildIdentifiers(item, true, "Complete", true);
      break;

    case "Withdrawn":
      // Some jobs may have started
      identifiers = buildIdentifiers(item, true, "Started");
      break;

    default:
      identifiers = buildIdentifiers(item, false);
  }

  // Determine if case has progressed past triage (has authorization/approval data)
  const pastTriage = !["Waiting on Triage", "Recommend Rejection", "Cancelled"].includes(stage);
  const pastFulfillment = ["In Progress", "No Data Provided", "Withdrawn", "Resolved"].includes(stage);
  const isTerminal = ["Rejected", "Cancelled", "Resolved", "Withdrawn"].includes(stage);

  // Request sub-type mapping based on request type
  const REQUEST_SUBTYPES: Record<string, string> = {
    "Emergency Request": "Emergency Disclosure Request (EDR)",
    "Emergency Disclosure": "Emergency Disclosure Request (EDR)",
    "Search Warrant": "Federal Search Warrant",
    "Subpoena": "Grand Jury Subpoena",
    "Preservation Request": "90-Day Preservation",
  };

  // Approval type mapping based on request type
  const APPROVAL_TYPES: Record<string, { type: string; description: string; approverName: string; approverRole: string; approverAlt: string; approverEmail: string; approverPhone: string }> = {
    "Emergency Request": { type: "Emergency", description: "Emergency disclosure request based on imminent threat to life. Authorized under 18 U.S.C. § 2702(b)(8) and (c)(4).", approverName: "AUSA Katherine Reeves", approverRole: "Assistant US Attorney", approverAlt: "K. Reeves, DOJ", approverEmail: "k.reeves@usdoj.gov", approverPhone: "+1-202-514-2000" },
    "Emergency Disclosure": { type: "Emergency", description: "Emergency disclosure request involving imminent danger to a child. Authorized under applicable emergency provisions.", approverName: "Crown Prosecutor Marc Leblanc", approverRole: "Crown Prosecutor", approverAlt: "M. Leblanc", approverEmail: "m.leblanc@ppsc-sppc.gc.ca", approverPhone: "+1-613-957-4222" },
    "Search Warrant": { type: "Judicial", description: "Search warrant issued by federal court for subscriber information, transactional data and stored communications.", approverName: "Magistrate Judge Helen Park", approverRole: "US Magistrate Judge", approverAlt: "Hon. H. Park", approverEmail: "court.clerk@uscourts.gov", approverPhone: "+1-202-354-3000" },
    "Subpoena": { type: "Judicial", description: "Grand jury subpoena for subscriber information and transactional records related to ongoing criminal investigation.", approverName: "Judge Patricia L. Chen", approverRole: "Superior Court Judge", approverAlt: "Hon. P. Chen", approverEmail: "court.clerk@kingcounty.gov", approverPhone: "+1-206-477-1600" },
    "Preservation Request": { type: "Law Enforcement", description: "90-day preservation request under 18 U.S.C. § 2703(f) for account data pending issuance of legal process.", approverName: "DI Oliver Hastings", approverRole: "Detective Inspector", approverAlt: "DI Hastings", approverEmail: "o.hastings@nca.gov.uk", approverPhone: "+44 20 7238 8001" },
  };

  const approval = APPROVAL_TYPES[item.requestType] || APPROVAL_TYPES["Subpoena"];
  const createDate = item.createDate ? new Date(item.createDate) : new Date();
  const authStart = new Date(createDate);
  authStart.setDate(authStart.getDate() - 2);
  const authExpiry = new Date(createDate);
  authExpiry.setMonth(authExpiry.getMonth() + 3);

  // Case narrative
  const crimeText = item.natureOfCrime.join(", ").toLowerCase();
  const serviceText = item.servicesRequested.join(", ");
  const additionalInfo = `Investigation into ${crimeText} involving suspect activity across Microsoft services (${serviceText}). ${item.identifierCount} identifier${item.identifierCount !== 1 ? "s" : ""} provided by submitting authority for data collection. ${item.isThreatToLife ? "THREAT TO LIFE — expedited processing required." : ""}`.trim();

  // Notification fields — populated for post-fulfillment cases
  const notificationDate = pastFulfillment ? new Date(createDate.getTime() + 3 * 24 * 60 * 60 * 1000) : undefined;
  const leResponseDate = pastFulfillment ? new Date(createDate.getTime() + 7 * 24 * 60 * 60 * 1000) : undefined;

  return {
    caseId: item.caseId,
    createDate,
    assigneeName: item.assigneeName,
    requestType: item.requestType,
    requestSubType: REQUEST_SUBTYPES[item.requestType] || "",
    requestOrigin: item.requestOrigin,
    requestOriginOther: item.requestOrigin === "Other" ? "Direct agency liaison" : "",
    otherRequestTypeDescription: "",
    caseStage: item.caseStage,
    rejectionReason: stage === "Rejected" ? "Insufficient legal authority — submitted legal process does not meet the threshold for the requested data categories under applicable law." : "",
    caseEscalated: item.escalatedToLE || false,
    escalationNotes: item.escalatedToLE ? "Escalated to LE for additional documentation. Awaiting updated legal authority for enterprise account data." : "",
    country: item.country,
    jurisdiction: item.jurisdiction,
    natureOfCrimes: item.natureOfCrime,
    mlat: ["Germany", "France", "Australia"].includes(item.country),
    additionalCaseInformation: additionalInfo,
    caseNumber: item.caseId,
    agencyCaseNumber: `AG-${item.caseId.substring(5)}`,
    relatedCaseNumbers: "",
    casePriority: item.casePriority,
    agents: buildAgentsForCase(item),
    agency: AGENCY_BY_COUNTRY[item.country]?.name || "Law Enforcement Agency",
    agencyPhone: AGENCY_BY_COUNTRY[item.country]?.phone || "+1-800-555-0100",
    agencyAddress: AGENCY_BY_COUNTRY[item.country]?.address || { number: "100 Government Way", city: "Washington", stateProvince: "DC", postalCode: "20001" },
    dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
    dueDateManuallySetBy: item.casePriority === "Emergency" ? "System (Emergency SLA)" : undefined,
    shieldLawConfirmation: item.country === "United States" ? "confirmed" : "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],

    // Authorization — populated for all cases (comes with the legal process submission)
    authorizationStartDate: authStart,
    authorizationExpirationDate: authExpiry,
    authorizationDesiredStatus: item.authorizationDesiredStatus || (isTerminal ? "Cancelled" : pastFulfillment ? "Active" : "Pending"),

    // Approval — populated for all cases (submitted by the authority)
    approvalType: approval.type,
    approvalDescription: approval.description,
    approvalReferenceNumber: `${approval.type.substring(0, 3).toUpperCase()}-${item.caseId.substring(5)}`,
    approverName: approval.approverName,
    approverRole: approval.approverRole,
    approvalTimestamp: authStart,
    approvalIsEmergency: item.casePriority === "Emergency",
    approverAlternateName: approval.approverAlt,
    approverEmail: approval.approverEmail,
    approverPhoneNumber: approval.approverPhone,

    // Notification — populated for post-fulfillment cases
    ndoAttached: pastFulfillment ? "yes" : pastTriage ? "pending" : "",
    notificationAllowed: pastFulfillment ? "no" : "",
    dateOfLeNotification: notificationDate,
    leResponseDueDate: leResponseDate,
    leResponseReceived: pastFulfillment ? "yes" : "",
    dateOfLeResponse: pastFulfillment ? leResponseDate : undefined,
    dateOfUserNotification: undefined,
    userResponseDueDate: undefined,
    userResponseReceived: "",
    dateOfUserResponse: undefined,

    identifiers,
    nonDisclosureOrders: pastTriage ? [{
      id: genId(),
      temporaryNDO: false,
      startDate: authStart,
      durationDays: 90,
      expirationDate: authExpiry,
      createdBy: approval.approverName,
      createdOn: authStart,
      relatedCases: [],
    }] : [],
    startDate: pastFulfillment ? new Date("2024-10-01") : undefined,
    endDate: pastFulfillment ? new Date("2025-01-15") : undefined,
    timeZone: item.country === "United States" ? "America/Los_Angeles (PST/PDT)" :
              item.country === "Canada" ? "America/Toronto (EST/EDT)" :
              item.country === "United Kingdom" ? "Europe/London (GMT/BST)" :
              item.country === "Germany" ? "Europe/Berlin (CET/CEST)" :
              item.country === "France" ? "Europe/Paris (CET/CEST)" :
              item.country === "Australia" ? "Australia/Sydney (AEST/AEDT)" : "UTC",
    notes: pastTriage ? [
      {
        id: genId(),
        content: `Case received via ${item.requestOrigin}. ${item.requestType} from ${AGENCY_BY_COUNTRY[item.country]?.name || "submitting agency"}. ${item.identifierCount} identifiers provided for ${item.servicesRequested.join(", ")} services.`,
        createdBy: "System",
        createdAt: createDate,
      },
    ] : [],
  };
}
