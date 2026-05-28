/**
 * Mock case data factory for LNS-2025-00095
 * Pre-populated with collection jobs in progress for the Fulfillment Tracker
 */
import type { FormData, AccountIdentifier, SubCategory, IdentifierServices } from "../types/caseTypes";
import { createDefaultIdentifierServices, createDefaultServiceCategoryGroups } from "../config/lensServicesConfig";

// Helper to generate unique IDs
const genId = () => `id-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
const genJobId = (prefix: string, seq: number) => `JOB-202501-${prefix}${seq.toString().padStart(3, "0")}`;
const genPrepareJobId = (prefix: string, seq: number) => `PRP-202501-${prefix}${seq.toString().padStart(3, "0")}`;
const genDeliveryJobId = (prefix: string, seq: number) => `DLV-202501-${prefix}${seq.toString().padStart(3, "0")}`;
const genTaskId = (svc: string, cat: string) =>
  `${svc.substring(0, 3).toUpperCase()}-${cat.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
const genIdentifierTaskId = () => {
  const types = ["LDID", "LIID", "LPID"];
  return `${types[Math.floor(Math.random() * types.length)]}-${Math.floor(Math.random() * 900000) + 100000}`;
};

function makeDefaultSubCategory(): SubCategory {
  return {
    enabled: false,
    taskId: "",
    startDate: undefined,
    endDate: undefined,
    status: "Not started",
  };
}

function makeAllDefaultServices(): IdentifierServices {
  return createDefaultIdentifierServices();
}

/**
 * Build a ServiceCategoryGroups from old flat-category assignments.
 * Maps old keys → new group+item:
 *   basicSubscriber        → subscriberData.genericAttributes
 *   authenticationLogs     → authenticationLogs.genericAttributes
 *   serviceTelemetry       → trafficData.genericAttributes
 *   content                → contentData.genericAttributes
 *   transactionalData      → subscriberData.paymentInformation
 */
function makeCategoryGroups(cats: {
  basicSubscriber?: SubCategory;
  authenticationLogs?: SubCategory;
  serviceTelemetry?: SubCategory;
  content?: SubCategory;
  transactionalData?: SubCategory;
}) {
  const g = createDefaultServiceCategoryGroups();
  if (cats.basicSubscriber) g.subscriberData.genericAttributes = cats.basicSubscriber;
  if (cats.authenticationLogs) g.authenticationLogs.genericAttributes = cats.authenticationLogs;
  if (cats.serviceTelemetry) g.trafficData.genericAttributes = cats.serviceTelemetry;
  if (cats.content) g.contentData.genericAttributes = cats.content;
  if (cats.transactionalData) g.subscriberData.paymentInformation = cats.transactionalData;
  return g;
}

// Create collection-active subcategory with varied statuses
function makeActiveSubCategory(
  svc: string,
  cat: string,
  jobPrefix: string,
  seq: number,
  collectionStatus: "Started" | "Complete" | "No Data",
  startDate: Date,
  endDate: Date,
): SubCategory {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

  return {
    enabled: true,
    taskId: genTaskId(svc, cat),
    startDate,
    endDate,
    status: collectionStatus === "Complete" ? "Completed" : "In Progress",
    jobId: genJobId(jobPrefix, seq),
    collectionStatus,
    collectionStatusUpdatedAt: hoursAgo(Math.floor(Math.random() * 12) + 1),
    publishStatus: collectionStatus === "Complete" ? "Not Started" : "Not Started",
    deliveryStatus: "Not Started",
  };
}

// Create a subcategory that has progressed beyond collection through the pipeline
// Each stage that has been reached gets its own unique job ID (as the backend API always returns one)
function makePipelineSubCategory(
  svc: string,
  cat: string,
  jobPrefix: string,
  seq: number,
  startDate: Date,
  endDate: Date,
  pipeline: {
    publishStatus: "Not Started" | "Started" | "Complete" | "Failed";
    deliveryStatus: "Not Started" | "Started" | "Complete" | "Failed";
  },
): SubCategory {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

  return {
    enabled: true,
    taskId: genTaskId(svc, cat),
    startDate,
    endDate,
    status: "Completed",
    jobId: genJobId(jobPrefix, seq),
    collectionStatus: "Complete",
    collectionStatusUpdatedAt: hoursAgo(Math.floor(Math.random() * 24) + 12),
    publishStatus: pipeline.publishStatus,
    publishJobId: pipeline.publishStatus !== "Not Started" ? genPrepareJobId(jobPrefix, seq) : undefined,
    publishStatusUpdatedAt: pipeline.publishStatus !== "Not Started" ? hoursAgo(Math.floor(Math.random() * 8) + 4) : undefined,
    deliveryStatus: pipeline.deliveryStatus,
    deliveryJobId: pipeline.deliveryStatus !== "Not Started" ? genDeliveryJobId(jobPrefix, seq) : undefined,
    deliveryStatusUpdatedAt: pipeline.deliveryStatus !== "Not Started" ? hoursAgo(Math.floor(Math.random() * 4) + 1) : undefined,
  };
}

export function buildLENS202500095FormData(): FormData {
  const createDate = new Date("2025-01-08");
  const dueDate = new Date("2025-01-16");
  const startDate = new Date("2024-10-08"); // ~90 days before create
  const endDate = new Date("2025-01-08");

  // --- Identifier 1: sarah.victim@outlook.com ---
  const id1: AccountIdentifier = {
    id: genId(),
    value: "sarah.victim@outlook.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "North America - West US",
    createdBy: "LE Agency",
    services: makeAllDefaultServices(),
    fulfillmentPlan: {
      dateRange: { start: "2024-10-08", end: "2025-01-08" },
      services: {
        outlook: {
          enabled: true,
          dataCategories: ["basicSubscriber", "authenticationLogs", "content", "transactionalData"],
          dataCenterLocation: "North America - West US",
        },
        teams: {
          enabled: true,
          dataCategories: ["basicSubscriber", "authenticationLogs", "content"],
          dataCenterLocation: "North America - West US",
        },
      },
    },
  } as any;

  // Enable Exchange (Entra ID) with active collection jobs
  id1.services.exchangeEnterprise.enabled = true;
  // Mutually-exclusive invariant — an identifier resolves to Consumer
  // OR Enterprise, never both. Aligning to Enterprise here (the corp
  // contoso.com identity) so sarah.victim's resolved type stays
  // consistent with the Teams service below (also Enterprise).
  id1.services.exchangeEnterprise.accountExistence = {
    consumerExists: false,
    enterpriseExists: true,
    enterpriseAccounts: ["sarah.victim@contoso.com"],
    enterpriseStorageLocation: "North America - West US 2",
  };
  id1.services.exchangeEnterprise.categoryGroups = makeCategoryGroups({
    basicSubscriber: makePipelineSubCategory("outlook", "basicSubscriber", "OLK", 1, startDate, endDate, { publishStatus: "Complete", deliveryStatus: "Started" }),
    authenticationLogs: makeActiveSubCategory("outlook", "authenticationLogs", "OLK", 2, "Started", startDate, endDate),
    content: makeActiveSubCategory("outlook", "content", "OLK", 3, "Started", startDate, endDate),
    transactionalData: makeActiveSubCategory("outlook", "transactionalData", "OLK", 4, "Started", startDate, endDate),
  });

  // Enable Teams for Business with active collection jobs
  id1.services.teamsForBusiness.enabled = true;
  id1.services.teamsForBusiness.accountExistence = {
    consumerExists: false,
    enterpriseExists: true,
    enterpriseAccounts: ["sarah.victim@contoso.com"],
    enterpriseStorageLocation: "North America - West US 2",
  };
  id1.services.teamsForBusiness.categoryGroups = makeCategoryGroups({
    basicSubscriber: makePipelineSubCategory("teams", "basicSubscriber", "TMS", 1, startDate, endDate, { publishStatus: "Complete", deliveryStatus: "Not Started" }),
    authenticationLogs: makePipelineSubCategory("teams", "authenticationLogs", "TMS", 2, startDate, endDate, { publishStatus: "Started", deliveryStatus: "Not Started" }),
    content: makeActiveSubCategory("teams", "content", "TMS", 3, "Started", startDate, endDate),
  });

  // --- Identifier 2: +1-425-555-0191 ---
  const id2: AccountIdentifier = {
    id: genId(),
    value: "+1-425-555-0191",
    type: "Phone Number",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "North America - West US",
    createdBy: "LE Agency",
    services: makeAllDefaultServices(),
    fulfillmentPlan: {
      dateRange: { start: "2024-10-08", end: "2025-01-08" },
      services: {
        outlook: {
          enabled: true,
          dataCategories: ["basicSubscriber", "authenticationLogs"],
          dataCenterLocation: "North America - West US",
        },
        skype: {
          enabled: true,
          dataCategories: ["basicSubscriber", "authenticationLogs", "content", "transactionalData"],
          dataCenterLocation: "North America - West US",
        },
      },
    },
  } as any;

  id2.services.exchangeEnterprise.enabled = true;
  id2.services.exchangeEnterprise.accountExistence = {
    consumerExists: true,
    consumerAccounts: ["+1-425-555-0191"],
    consumerStorageLocation: "North America - West US",
    enterpriseExists: false,
  };
  id2.services.exchangeEnterprise.categoryGroups = makeCategoryGroups({
    basicSubscriber: makePipelineSubCategory("outlook", "basicSubscriber", "OLK", 5, startDate, endDate, { publishStatus: "Complete", deliveryStatus: "Complete" }),
    authenticationLogs: makeActiveSubCategory("outlook", "authenticationLogs", "OLK", 6, "Started", startDate, endDate),
  });

  id2.services.skype.enabled = true;
  id2.services.skype.categoryGroups = makeCategoryGroups({
    basicSubscriber: makePipelineSubCategory("skype", "basicSubscriber", "SKY", 1, startDate, endDate, { publishStatus: "Complete", deliveryStatus: "Not Started" }),
    authenticationLogs: makeActiveSubCategory("skype", "authenticationLogs", "SKY", 2, "Started", startDate, endDate),
    content: makeActiveSubCategory("skype", "content", "SKY", 3, "Started", startDate, endDate),
    transactionalData: makeActiveSubCategory("skype", "transactionalData", "SKY", 4, "No Data", startDate, endDate),
  });

  // --- Identifier 3: stalker.suspect@hotmail.com (LE Agency supplemental) ---
  const id3: AccountIdentifier = {
    id: genId(),
    value: "stalker.suspect@hotmail.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "Rejected",
    accountExistenceStatus: "success",
    geoLocation: "North America - East US",
    createdBy: "LE Agency",
    services: makeAllDefaultServices(),
    rejection: {
      rejected: true,
      rejectedAt: new Date("2026-04-29T14:22:00"),
      rejectedBy: "Nicole Garcia",
      reason:
        "LE document missing jurisdiction signature; cannot verify legal authority for this identifier. Pending follow-up demand.",
    },
    fulfillmentPlan: {
      dateRange: { start: "2024-10-08", end: "2025-01-08" },
      services: {
        outlook: {
          enabled: true,
          dataCategories: ["basicSubscriber", "authenticationLogs", "content", "transactionalData", "serviceTelemetry"],
          dataCenterLocation: "North America - East US",
        },
        oneDriveConsumer: {
          enabled: true,
          dataCategories: ["basicSubscriber", "content", "transactionalData"],
          dataCenterLocation: "North America - East US",
        },
        azureStorage: {
          enabled: true,
          dataCategories: ["basicSubscriber", "authenticationLogs"],
          dataCenterLocation: "North America - East US",
        },
      },
    },
  } as any;

  id3.services.exchangeEnterprise.enabled = true;
  id3.services.exchangeEnterprise.accountExistence = {
    consumerExists: true,
    consumerAccounts: ["stalker.suspect@hotmail.com"],
    consumerStorageLocation: "North America - East US",
    enterpriseExists: false,
  };
  id3.services.exchangeEnterprise.categoryGroups = makeCategoryGroups({
    basicSubscriber: makePipelineSubCategory("outlook", "basicSubscriber", "OLK", 7, startDate, endDate, { publishStatus: "Complete", deliveryStatus: "Complete" }),
    authenticationLogs: makePipelineSubCategory("outlook", "authenticationLogs", "OLK", 8, startDate, endDate, { publishStatus: "Complete", deliveryStatus: "Started" }),
    serviceTelemetry: makeActiveSubCategory("outlook", "serviceTelemetry", "OLK", 9, "Started", startDate, endDate),
    content: makeActiveSubCategory("outlook", "content", "OLK", 10, "Started", startDate, endDate),
    transactionalData: makeActiveSubCategory("outlook", "transactionalData", "OLK", 11, "Started", startDate, endDate),
  });

  id3.services.oneDriveConsumer.enabled = true;
  id3.services.oneDriveConsumer.categoryGroups = makeCategoryGroups({
    basicSubscriber: makePipelineSubCategory("oneDrive", "basicSubscriber", "OD1", 1, startDate, endDate, { publishStatus: "Complete", deliveryStatus: "Not Started" }),
    content: makeActiveSubCategory("oneDrive", "content", "OD1", 2, "Started", startDate, endDate),
    transactionalData: makeActiveSubCategory("oneDrive", "transactionalData", "OD1", 3, "Started", startDate, endDate),
  });

  id3.services.azureStorage.enabled = true;
  id3.services.azureStorage.accountExistence = {
    consumerExists: false,
    enterpriseExists: true,
    enterpriseAccounts: ["stalker.suspect@contoso.com"],
    enterpriseStorageLocation: "North America - East US",
  };
  id3.services.azureStorage.categoryGroups = makeCategoryGroups({
    basicSubscriber: makeActiveSubCategory("azure", "basicSubscriber", "AZR", 1, "Started", startDate, endDate),
    authenticationLogs: makeActiveSubCategory("azure", "authenticationLogs", "AZR", 2, "Started", startDate, endDate),
  });

  // --- Identifier 4: j.doe.harasser@gmail.com (mapped to MS account) ---
  const id4: AccountIdentifier = {
    id: genId(),
    value: "j.doe.harasser@gmail.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "Complete",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West",
    createdBy: "LE Agency",
    services: makeAllDefaultServices(),
    fulfillmentPlan: {
      dateRange: { start: "2024-10-08", end: "2025-01-08" },
      services: {
        outlook: {
          enabled: true,
          dataCategories: ["basicSubscriber", "authenticationLogs"],
          dataCenterLocation: "Europe - West",
        },
      },
    },
  } as any;

  id4.services.exchangeEnterprise.enabled = true;
  id4.services.exchangeEnterprise.accountExistence = {
    consumerExists: true,
    consumerAccounts: ["j.doe.harasser@outlook.com"],
    consumerStorageLocation: "Europe - West",
    enterpriseExists: false,
  };
  id4.services.exchangeEnterprise.categoryGroups = makeCategoryGroups({
    basicSubscriber: makePipelineSubCategory("outlook", "basicSubscriber", "OLK", 12, startDate, endDate, { publishStatus: "Complete", deliveryStatus: "Complete" }),
    authenticationLogs: makePipelineSubCategory("outlook", "authenticationLogs", "OLK", 13, startDate, endDate, { publishStatus: "Complete", deliveryStatus: "Complete" }),
  });

  // --- Identifier 5: 192.168.55.100 ---
  const id5: AccountIdentifier = {
    id: genId(),
    value: "192.168.55.100",
    type: "IP Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "North America - West US",
    createdBy: "LE Agency",
    services: makeAllDefaultServices(),
    fulfillmentPlan: {
      dateRange: { start: "2024-10-08", end: "2025-01-08" },
      services: {
        consumerIPHistory: {
          enabled: true,
          dataCategories: ["basicSubscriber", "authenticationLogs"],
          dataCenterLocation: "North America - West US",
        },
      },
    },
  } as any;

  id5.services.bingSearch.enabled = true;
  id5.services.bingSearch.categoryGroups = makeCategoryGroups({
    basicSubscriber: makeActiveSubCategory("bingSearch", "basicSubscriber", "CIP", 1, "Started", startDate, endDate),
    authenticationLogs: makeActiveSubCategory("bingSearch", "authenticationLogs", "CIP", 2, "Started", startDate, endDate),
  });

  // --- Identifier 6: +44-20-7946-0958 ---
  const id6: AccountIdentifier = {
    id: genId(),
    value: "+44-20-7946-0958",
    type: "Phone Number",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "Europe - UK South",
    createdBy: "LE Agency",
    services: makeAllDefaultServices(),
    fulfillmentPlan: {
      dateRange: { start: "2024-10-08", end: "2025-01-08" },
      services: {
        skype: {
          enabled: true,
          dataCategories: ["basicSubscriber", "content"],
          dataCenterLocation: "Europe - UK South",
        },
        teams: {
          enabled: true,
          dataCategories: ["basicSubscriber"],
          dataCenterLocation: "Europe - UK South",
        },
      },
    },
  } as any;

  id6.services.skype.enabled = true;
  id6.services.skype.categoryGroups = makeCategoryGroups({
    basicSubscriber: makePipelineSubCategory("skype", "basicSubscriber", "SKY", 5, startDate, endDate, { publishStatus: "Started", deliveryStatus: "Not Started" }),
    content: makeActiveSubCategory("skype", "content", "SKY", 6, "Started", startDate, endDate),
  });
  id6.services.teamsForBusiness.enabled = true;
  id6.services.teamsForBusiness.categoryGroups = makeCategoryGroups({
    basicSubscriber: makeActiveSubCategory("teams", "basicSubscriber", "TMS", 4, "Started", startDate, endDate),
  });

  // --- Identifier 7: dark.alias99@proton.me (mapped to MS account) ---
  const id7: AccountIdentifier = {
    id: genId(),
    value: "dark.alias99@proton.me",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "no_account",
    geoLocation: "",
    createdBy: "Analyst",
    services: makeAllDefaultServices(),
    fulfillmentPlan: {
      dateRange: { start: "2024-10-08", end: "2025-01-08" },
      services: {},
    },
  } as any;

  // --- Identifier 8: xboxgamer2024 ---
  const id8: AccountIdentifier = {
    id: genId(),
    value: "xboxgamer2024",
    type: "Xbox Gamertag",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "North America - Central US",
    createdBy: "LE Agency",
    services: makeAllDefaultServices(),
    fulfillmentPlan: {
      dateRange: { start: "2024-10-08", end: "2025-01-08" },
      services: {
        xbox: {
          enabled: true,
          dataCategories: ["basicSubscriber", "authenticationLogs", "content"],
          dataCenterLocation: "North America - Central US",
        },
      },
    },
  } as any;

  id8.services.xbox.enabled = true;
  id8.services.xbox.categoryGroups = makeCategoryGroups({
    basicSubscriber: makePipelineSubCategory("xbox", "basicSubscriber", "XBX", 1, startDate, endDate, { publishStatus: "Complete", deliveryStatus: "Started" }),
    authenticationLogs: makeActiveSubCategory("xbox", "authenticationLogs", "XBX", 2, "Complete", startDate, endDate),
    content: makeActiveSubCategory("xbox", "content", "XBX", 3, "Started", startDate, endDate),
  });

  // --- Identifier 9: suspect.burner@outlook.com ---
  const id9: AccountIdentifier = {
    id: genId(),
    value: "suspect.burner@outlook.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "North America - East US",
    createdBy: "Analyst",
    services: makeAllDefaultServices(),
    fulfillmentPlan: {
      dateRange: { start: "2024-10-08", end: "2025-01-08" },
      services: {
        outlook: {
          enabled: true,
          dataCategories: ["basicSubscriber", "authenticationLogs", "content"],
          dataCenterLocation: "North America - East US",
        },
        oneDriveConsumer: {
          enabled: true,
          dataCategories: ["basicSubscriber", "content"],
          dataCenterLocation: "North America - East US",
        },
      },
    },
  } as any;

  id9.services.exchangeEnterprise.enabled = true;
  id9.services.exchangeEnterprise.accountExistence = {
    consumerExists: true,
    consumerAccounts: ["suspect.burner@outlook.com"],
    consumerStorageLocation: "North America - East US",
    enterpriseExists: false,
  };
  id9.services.exchangeEnterprise.categoryGroups = makeCategoryGroups({
    basicSubscriber: makeActiveSubCategory("outlook", "basicSubscriber", "OLK", 14, "Complete", startDate, endDate),
    authenticationLogs: makeActiveSubCategory("outlook", "authenticationLogs", "OLK", 15, "Started", startDate, endDate),
    content: makeActiveSubCategory("outlook", "content", "OLK", 16, "Started", startDate, endDate),
  });
  id9.services.oneDriveConsumer.enabled = true;
  id9.services.oneDriveConsumer.categoryGroups = makeCategoryGroups({
    basicSubscriber: makeActiveSubCategory("oneDrive", "basicSubscriber", "OD1", 4, "Complete", startDate, endDate),
    content: makeActiveSubCategory("oneDrive", "content", "OD1", 5, "Started", startDate, endDate),
  });

  // --- Identifier 10: 10.0.42.200 ---
  const id10: AccountIdentifier = {
    id: genId(),
    value: "10.0.42.200",
    type: "IP Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "Pending",
    accountExistenceStatus: "pending",
    geoLocation: "",
    createdBy: "LE Agency",
    services: makeAllDefaultServices(),
    fulfillmentPlan: {
      dateRange: { start: "2024-10-08", end: "2025-01-08" },
      services: {},
    },
  } as any;

  return {
    caseId: "LNS-2025-00095",
    createDate,
    assigneeName: "Sarah Johnson",
    requestType: "Subpoena",
    requestSubType: "",
    requestOrigin: "Email Submission",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "Collection In Progress",
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    country: "United States",
    jurisdiction: "State",
    natureOfCrimes: ["Cyberstalking", "Harassment"],
    mlat: false,
    additionalCaseInformation:
      "Investigation into cyberstalking and online harassment campaign targeting the victim through multiple Microsoft services. Suspect used Outlook, Teams, Skype and OneDrive to coordinate harassment activities. LE has identified three persons of interest through their Microsoft account identifiers.",
    // LENS case number — same canonical value as `caseId`. The external
    // agency's reference lives below in `agencyCaseNumber`.
    caseNumber: "LNS-2025-00095",
    agencyCaseNumber: "WA-CS-2025-0412",
    relatedCaseNumbers: "",
    casePriority: "Urgent",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-a1`,
        name: "Detective Maria Santos",
        title: "Lead Investigator",
        email: "m.santos@wa-sheriff.gov",
        phone: "+1 (425) 555-0180",
        role: "Submitter",
        languages: "en - English, es - Spanish",
        source: "agency",
      },
      {
        id: `AGT-${Date.now().toString(36)}-a2`,
        name: "Sgt. David Park",
        title: "Cyber Crimes Unit Supervisor",
        email: "d.park@wa-sheriff.gov",
        phone: "+1 (425) 555-0181",
        role: "Recipient",
        languages: "en - English",
        source: "agency",
      },
    ],
    agency: "King County Sheriff's Office - Cyber Crimes Unit",
    agencyPhone: "+1 (206) 296-3311",
    agencyAddress: {
      number: "516 3rd Avenue",
      city: "Seattle",
      stateProvince: "WA",
      postalCode: "98104",
    },
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],

    // Authorization details
    authorizationStartDate: new Date("2025-01-06"),
    authorizationExpirationDate: new Date("2025-04-06"),
    authorizationDesiredStatus: "Cancelled",

    // Approval details
    approvalType: "Judicial",
    approvalDescription:
      "Subpoena issued by King County Superior Court for subscriber information, transactional data and stored communications related to cyberstalking investigation. Scope covers Microsoft Outlook, Teams, Skype and OneDrive services for identified accounts.",
    approvalReferenceNumber: "SUB-KC-2025-0412",
    approverName: "Judge Patricia L. Chen",
    approverRole: "Superior Court Judge",
    approvalTimestamp: new Date("2025-01-06T14:30:00"),
    approvalIsEmergency: false,
    approverAlternateName: "Hon. P. Chen",
    approverEmail: "court.clerk@kingcounty.gov",
    approverPhoneNumber: "+1-206-477-1600",

    // Notification
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

    // Data Specification
    identifiers: [id1, id2, id3, id4, id5, id6, id7, id8, id9, id10],
    nonDisclosureOrders: [],
    startDate,
    endDate,
    timeZone: "America/Los_Angeles (PST/PDT)",

    // Notes
    notes: [
      {
        id: `note-${Date.now().toString(36)}-1`,
        content:
          "Fulfillment plan applied. Collection jobs submitted for 3 identifiers across Outlook, Teams, Skype, OneDrive Consumer, and Azure services. Multiple jobs already reporting Complete status.",
        createdBy: "Sarah Johnson",
        createdAt: new Date("2025-01-09T10:15:00"),
      },
      {
        id: `note-${Date.now().toString(36)}-2`,
        content:
          "LE contact confirmed all three identifiers are relevant to investigation. Suspect account (stalker.suspect@hotmail.com) has Azure enterprise association that may yield additional evidence.",
        createdBy: "Sarah Johnson",
        createdAt: new Date("2025-01-08T16:45:00"),
      },
    ],
  };
}