import type { SubCategory, ServiceCategoryGroups, IdentifierServiceConfig, IdentifierServices } from "../types/caseTypes";

// ── Config Interfaces ──────────────────────────────────────────────────────────

export interface CategoryItemConfig {
  key: string;       // camelCase, e.g. "dateOfBirth"
  name: string;      // Display name, e.g. "Date of Birth"
  info?: string;     // Tooltip/info-bubble text: specific data attributes included in this category
  automated?: boolean; // true = automated collection tool available; false = manual collection required
  defaultSelected?: boolean; // pre-enabled when service is first added to an identifier
  locked?: boolean;          // user cannot uncheck this item in the wizard
}

export interface CategoryGroupConfig {
  key: string;              // camelCase, e.g. "subscriberData"
  name: string;             // Display name, e.g. "Subscriber Data"
  items: CategoryItemConfig[];
  layout?: 'dropdown' | 'checkboxList'; // default 'dropdown' — checkboxList opens a multi-select popover
}

export interface LensService {
  key: string;  // camelCase, e.g. "exchangeEnterprise"
  name: string; // Display name, e.g. "Exchange Enterprise"
  icon?: string;
  /** Account-type scoping: "Consumer" or "Enterprise" services are only valid for identifiers
   *  whose account check returned that account type. Undefined = the service is valid for either. */
  accountType?: "Consumer" | "Enterprise";
  /** Request-type scoping. When present, the service is auto-enabled on every
   *  identifier whose case has a matching `requestType`. Used by surfaces
   *  like Production Letters (UK COPO only) where the manual disclosure
   *  document is part of every order package. Undefined = the service is
   *  not auto-enabled for any request type (the default — most services
   *  start disabled and the user enables them per identifier). */
  requestTypeScope?: string[];
}

// ── Per-Service Category Groups ───────────────────────────────────────────────
// Generated from: C:/R/Docs/lens_Services_DataCategoryGroups_DataCategories.csv
// Services not listed here fall back to STANDARD_CATEGORY_GROUPS (defensive only).

export const SERVICE_CATEGORY_GROUPS: Partial<Record<string, CategoryGroupConfig[]>> = {
  msaProfile: [
    {
      key: "subscriberData",
      name: "Subscriber Data",
      items: [
        { key: "genericAttributes", name: "Basic Subscriber Data", info: "MSA; Name (Reg); CID (hex); PUID; Address; Phone Number; Creation Date; Initial Creation Info; Duration of Services; Types of Services Utilized; Services Provisioned; Display Name; Alt Email; Alias, Address, Language", automated: true, defaultSelected: true },
        { key: "dateOfBirth", name: "Date of Birth", info: "Date of Birth", automated: true },
        { key: "gender", name: "Gender", info: "Gender", automated: true },
        { key: "deviceInfo", name: "Device Info", info: "Device Info", automated: true },
        { key: "basicBilling", name: "Basic Billing", info: "Basic Billing / Means & Source of Payment (Billing Address; Account Holder Name; Expiration Date; Payment Method Last 4)", automated: false },
      ],
    },
    {
      key: "authenticationLogs",
      name: "Authentication Logs",
      items: [
        { key: "genericAttributes", name: "Basic Authentication/IP", info: "Auth Logs / IP History", automated: true, defaultSelected: true },
      ],
    },
    {
      key: "trafficData",
      name: "Traffic Data",
      items: [
        { key: "2FAMFAProof", name: "2FA / MFA / Proof", info: "2FA / MFA / Proof", automated: false },
        { key: "pushTokens", name: "Push Tokens", info: "Push Tokens", automated: false },
        { key: "detailedBilling", name: "Detailed Billing", info: "Detailed Billing", automated: false },
        { key: "reverse2FA", name: "Reverse 2FA", info: "Reverse 2FA", automated: false },
        { key: "reverseIP", name: "Reverse IP", info: "Reverse IP", automated: false },
      ],
    },
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "unifiedAuditLogs", name: "Unified Audit Logs", info: "Unified Audit Logs" },
      ],
    },
  ],
  entraIDProfile: [
    {
      key: "subscriberData",
      name: "Subscriber Data",
      items: [
        { key: "genericAttributes", name: "Basic Subscriber Data", info: "PUID (hex); PUID; Duration of Services; Services Utilized; Services Provisioned; Organization Profile (Domain) or Enterprise User Profile (SMTP)", automated: true, defaultSelected: true },
        { key: "language", name: "Language", info: "Language", automated: true },
        { key: "dateOfBirth", name: "Date of Birth", info: "Date of Birth", automated: true },
        { key: "deviceInfo", name: "Device Info", info: "Device Info", automated: true },
        { key: "gender", name: "Gender", info: "Gender", automated: true },
        { key: "basicBilling", name: "Basic Billing", info: "Subscriptions; Billing Address; Account Holder Name; Expiration Date; Payment Method Last 4", automated: false },
      ],
    },
    {
      key: "authenticationLogs",
      name: "Authentication Logs",
      items: [
        { key: "genericAttributes", name: "Basic Authentication/IP", info: "Auth Logs / IP History", automated: true, defaultSelected: true },
      ],
    },
    {
      key: "trafficData",
      name: "Traffic Data",
      items: [
        { key: "listOfAccounts", name: "List of Accounts", info: "List of Accounts (SMTP)", automated: false },
        { key: "listOfDomains", name: "List of Domains", info: "List of Domains (SMTP)", automated: false },
        { key: "detailedBilling", name: "Detailed Billing", info: "Detailed Billing", automated: false },
        { key: "passwordChangeHistory", name: "Password Change History", info: "Password Change History", automated: false },
        { key: "advertisingInformation", name: "Advertising Information", info: "Advertising Information (Bing Ads)", automated: false },
        { key: "reverse2FA", name: "Reverse 2FA", info: "Reverse 2FA", automated: false },
        { key: "reverseIP", name: "Reverse IP", info: "Reverse IP", automated: false },
      ],
    },
  ],
  exchangeEnterprise: [
    {
      key: "trafficData",
      name: "Traffic Data",
      items: [
        { key: "passwordChangeHistory", name: "Password Change History", info: "Password Change History", automated: false },
        { key: "emailHeadersNonContent", name: "Email Headers (Non-Content)", info: "Email Headers (Non-Content)", automated: true },
      ],
    },
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "Email Content", automated: true, defaultSelected: true },
        { key: "emailHeaders", name: "Email Headers", info: "Email Full Headers", automated: true },
        { key: "emailContacts", name: "Email Contacts", info: "Email Contacts", automated: true },
        { key: "emailCalendar", name: "Email Calendar", info: "Email Calendar", automated: true },
      ],
    },
  ],
  exchangeConsumer: [
    {
      key: "trafficData",
      name: "Traffic Data",
      items: [
        { key: "emailHeadersNonContent", name: "Email Headers (Non-Content)", info: "Email Headers (Non-Content)", automated: true },
      ],
    },
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "Email Content", automated: true, defaultSelected: true },
        { key: "emailHeaders", name: "Email Headers", info: "Email Headers", automated: true },
        { key: "emailContacts", name: "Email Contacts", info: "Email Contacts", automated: true },
        { key: "emailCalendar", name: "Email Calendar", info: "Email Calendar", automated: true },
      ],
    },
  ],
  teamsForBusiness: [
    {
      key: "trafficData",
      name: "Traffic Data",
      items: [
        { key: "2FAMFAProof", name: "2FA / MFA / Proof", info: "2FA / MFA / Proof", automated: false },
      ],
    },
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributesChats", name: "Generic Content", info: "Teams Chat Messaging", automated: true, defaultSelected: true },
      ],
    },
  ],
  teamsForLife: [
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributesChats", name: "Generic Content", info: "Teams Chat Messaging", automated: true, defaultSelected: true },
        { key: "teamsLiveIntercept", name: "Teams Live Intercept", info: "Teams Live Intercept", automated: false },
      ],
    },
  ],
  oneDriveForBusiness: [
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "• OneDrive Content", automated: true, defaultSelected: true },
      ],
    },
  ],
  sharePointOnline: [
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "• SharePoint Content", automated: true, defaultSelected: true },
      ],
    },
  ],
  oneDriveConsumer: [
    {
      key: "trafficData",
      name: "Traffic Data",
      items: [
        { key: "genericAttributes", name: "Generic Traffic Data", info: "• API Logs", automated: true, defaultSelected: true },
      ],
    },
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "OneDrive Content", automated: true, defaultSelected: true },
      ],
    },
  ],
  devTunnels: [
    {
      key: "trafficData",
      name: "Traffic Data",
      items: [
        { key: "genericAttributes", name: "Generic Traffic Data", info: "Device Info", automated: false, defaultSelected: true },
      ],
    },
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "DevTunnels Content", automated: false, defaultSelected: true },
      ],
    },
  ],
  bitlocker: [
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "Bitlocker Key", automated: false, defaultSelected: true },
      ],
    },
  ],
  azureStorage: [
    {
      key: "trafficData",
      name: "Traffic Data",
      items: [
        { key: "genericAttributes", name: "Generic Traffic Data", info: "• ARM Logs\n• Netflow IP", automated: false, defaultSelected: true },
      ],
    },
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "• Azure Storage Blobs\n• Sites\n• File Shares\n• Tables and Queues", automated: false, defaultSelected: true },
        { key: "unifiedAuditLogs", name: "Unified Audit Logs", info: "Unified Audit Logs", automated: false },
      ],
    },
  ],
  azureVMDisks: [
    {
      key: "trafficData",
      name: "Traffic Data",
      items: [
        { key: "genericAttributes", name: "Generic Traffic Data", info: "• ARM Logs\n• Netflow IP\n• VIP History", automated: false, defaultSelected: true },
      ],
    },
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "• Azure VMs & Disks", automated: false, defaultSelected: true },
        { key: "unifiedAuditLogs", name: "Unified Audit Logs", info: "Unified Audit Logs", automated: false },
      ],
    },
  ],
  coPilotConsumer: [
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "• CoPilot Prompts & Responses", automated: false, defaultSelected: true },
      ],
    },
  ],
  coPilotEnterprise: [
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "• CoPilot Prompts & Responses\n• Tenant ID", automated: false, defaultSelected: true },
      ],
    },
  ],
  xbox: [
    {
      key: "subscriberData",
      name: "Subscriber Data",
      items: [
        { key: "genericAttributes", name: "Basic Subscriber Data", info: "• Xbox Gamertag\n• MSA\n• Account Created Date\n• Customer Name\n• Country\n• Contact Email", automated: false, defaultSelected: true },
      ],
    },
    {
      key: "authenticationLogs",
      name: "Authentication Logs",
      items: [
        { key: "genericAttributes", name: "Basic Authentication/IP", info: "IP History (serial number of XBOX machine and the Gamer Tag)", automated: false, defaultSelected: true },
      ],
    },
    {
      key: "trafficData",
      name: "Traffic Data",
      items: [
        { key: "strikeLogs", name: "Strike Logs", info: "Strike Logs", automated: false },
        { key: "purchaseHistory", name: "Purchase History", info: "Purchase History", automated: false },
        { key: "prePaidBalance", name: "PrePaid Balance", info: "PrePaid Balance", automated: false },
      ],
    },
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "• Profile Photo\n• Xbox Clubs\n• Xbox Contacts\n• Xbox Content\n• Xbox Video (Recorded)\n• Xbox Voice (Recorded)", automated: false, defaultSelected: true },
      ],
    },
  ],
  skype: [
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "Contact List / Skype Buddy List", automated: false, defaultSelected: true },
      ],
    },
  ],
  microsoftAds: [
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "Domain Names; Keywords", automated: false, defaultSelected: true },
      ],
    },
  ],
  bingSearch: [
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "Bing Search Query Content", automated: false, defaultSelected: true },
      ],
    },
  ],
  groupMe: [
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "GroupMe Chat Content", automated: false, defaultSelected: true },
      ],
    },
  ],
  minecraft: [
    {
      key: "trafficData",
      name: "Traffic Data",
      items: [
        { key: "genericAttributes", name: "Generic Traffic Data", info: "Purchase History", automated: false, defaultSelected: true },
      ],
    },
    {
      key: "contentData",
      name: "Content Data",
      items: [
        { key: "genericAttributes", name: "Content Data", info: "Minecraft Content", automated: false, defaultSelected: true },
      ],
    },
  ],
  microsoftForms: [
    {
      key: "subscriberData",
      name: "Subscriber Data",
      items: [
        { key: "genericAttributes", name: "Basic Subscriber Data", info: "Associated Account Information", automated: false, defaultSelected: true },
      ],
    },
  ],
  // ── Production Letters (UK COPO short-term scaffolding) ────────────
  // Authority-side document deliverables that travel WITH a production
  // order. Auto-enabled on every identifier when the case's requestType
  // matches `LENS_SERVICES.productionLetters.requestTypeScope`
  // ("COPO Order" today). The "Affidavit" item is the only category for
  // now; future expansion may add other Disclosure Letters types.
  //
  // Long-term these belong on the case-level Documents viewer alongside
  // Search Warrant / Subpoena / NDO (see UX_EVALUATION follow-up). This
  // service-level placement is a short-term prototype affordance.
  productionLetters: [
    {
      key: "disclosureLetters",
      name: "Disclosure Letters",
      items: [
        { key: "affidavit", name: "Affidavit", info: "Sworn statement / supporting affidavit attached to the production order. Manual upload — file is attached to the identifier's collection notes via the manual collection form.", automated: false, defaultSelected: true },
      ],
    },
  ],
};

/** Returns per-service category groups, falling back to STANDARD_CATEGORY_GROUPS */
export function getServiceCategoryGroups(serviceKey: string): CategoryGroupConfig[] {
  return SERVICE_CATEGORY_GROUPS[serviceKey] ?? STANDARD_CATEGORY_GROUPS;
}

// ── Standard Category Groups (defensive fallback for services without a bespoke config) ────

export const STANDARD_CATEGORY_GROUPS: CategoryGroupConfig[] = [
  {
    key: "subscriberData",
    name: "Subscriber Data",
    items: [
      { key: "genericAttributes", name: "Basic Subscriber Data", defaultSelected: true },
    ],
  },
  {
    key: "authenticationLogs",
    name: "Authentication Logs",
    items: [
      { key: "genericAttributes", name: "Basic Authentication/IP", defaultSelected: true },
    ],
  },
  {
    key: "trafficData",
    name: "Traffic Data",
    items: [
      { key: "genericAttributes", name: "Generic Traffic Data", defaultSelected: true },
    ],
  },
  {
    key: "contentData",
    name: "Content Data",
    items: [
      { key: "genericAttributes", name: "Content Data", defaultSelected: true },
    ],
  },
];

// ── Service Catalog (22 services, generated from CSV) ─────────────────────────

export const LENS_SERVICES: LensService[] = [
  { key: "msaProfile",          name: "Microsoft Account Profile - MSA",     icon: "👤", accountType: "Consumer" },
  { key: "entraIDProfile",      name: "Microsoft Account Profile - EntraID", icon: "👤", accountType: "Enterprise" },
  { key: "exchangeEnterprise",  name: "Exchange Enterprise",                 icon: "📧", accountType: "Enterprise" },
  { key: "exchangeConsumer",    name: "Exchange Consumer",                   icon: "📧", accountType: "Consumer" },
  { key: "teamsForBusiness",    name: "Teams for Business",                  icon: "👥", accountType: "Enterprise" },
  { key: "teamsForLife",        name: "Teams for Life",                      icon: "👥", accountType: "Consumer" },
  { key: "oneDriveForBusiness", name: "OneDrive for Business",               icon: "📁", accountType: "Enterprise" },
  { key: "sharePointOnline",    name: "SharePointOnline",                    icon: "📁", accountType: "Enterprise" },
  { key: "oneDriveConsumer",    name: "OneDrive for Consumer",               icon: "📁", accountType: "Consumer" },
  { key: "devTunnels",          name: "DevTunnels",                          icon: "🔧" },
  { key: "bitlocker",           name: "BitLocker",                           icon: "🔒" },
  { key: "azureStorage",        name: "Azure Storage",                       icon: "☁️", accountType: "Enterprise" },
  { key: "azureVMDisks",        name: "Azure VM Disks",                      icon: "💿", accountType: "Enterprise" },
  { key: "coPilotConsumer",     name: "CoPilot Consumer",                    icon: "🤖", accountType: "Consumer" },
  { key: "coPilotEnterprise",   name: "CoPilot Enterprise",                  icon: "🤖", accountType: "Enterprise" },
  { key: "xbox",                name: "XBOX",                                icon: "🎮", accountType: "Consumer" },
  { key: "skype",               name: "Skype",                               icon: "📞", accountType: "Consumer" },
  { key: "microsoftAds",        name: "Microsoft Ads",                       icon: "📢" },
  { key: "bingSearch",          name: "Bing Search",                         icon: "🔍" },
  { key: "groupMe",             name: "GroupMe",                             icon: "💬", accountType: "Consumer" },
  { key: "minecraft",           name: "Minecraft",                           icon: "🧱", accountType: "Consumer" },
  { key: "microsoftForms",      name: "Microsoft Forms",                     icon: "📝" },
  // Production Letters — UK COPO scaffolding. Auto-enabled on every
  // identifier whose case `requestType === "COPO Order"`. The service's
  // single category group (Disclosure Letters > Affidavit) is a manual
  // upload surface inside the existing Manual Collection form.
  { key: "productionLetters",   name: "Production Letters",                  icon: "📜", requestTypeScope: ["COPO Order"] },
];

// Lookup map: serviceKey → LensService
export const LENS_SERVICE_MAP: Record<string, LensService> = Object.fromEntries(
  LENS_SERVICES.map((s) => [s.key, s])
);

// ── Default Factories ─────────────────────────────────────────────────────────

const createDefaultSubCategory = (): SubCategory => ({
  enabled: false,
  taskId: "",
  startDate: undefined,
  endDate: undefined,
  status: "Not started",
  collectionStatusUpdatedAt: undefined,
  publishStatusUpdatedAt: undefined,
  deliveryStatusUpdatedAt: undefined,
});

/** Returns all groups/items for a service as disabled SubCategory objects */
export function createDefaultServiceCategoryGroups(serviceKey?: string): ServiceCategoryGroups {
  const groups: ServiceCategoryGroups = {};
  const groupConfig = serviceKey ? getServiceCategoryGroups(serviceKey) : STANDARD_CATEGORY_GROUPS;
  for (const group of groupConfig) {
    groups[group.key] = {};
    for (const item of group.items) {
      groups[group.key][item.key] = createDefaultSubCategory();
    }
  }
  return groups;
}

/** Returns an IdentifierServiceConfig with all groups/items disabled */
export function createDefaultServiceConfig(serviceKey?: string): IdentifierServiceConfig {
  return {
    enabled: false,
    categoryGroups: createDefaultServiceCategoryGroups(serviceKey),
  };
}

/** Returns every catalogued service as a disabled entry on the identifier.
 *
 *  When `requestType` is supplied, services declaring a matching
 *  `requestTypeScope` are returned **enabled** (with their `defaultSelected`
 *  category items pre-selected). Used today for Production Letters on
 *  UK COPO cases so the Affidavit upload surface appears on every
 *  identifier automatically — no manual "Add service" step required.
 *
 *  Backwards compatible: callers that don't pass `requestType` get the
 *  pre-existing all-disabled behaviour. */
export function createDefaultIdentifierServices(
  requestType?: string,
): IdentifierServices {
  const services: IdentifierServices = {};
  for (const service of LENS_SERVICES) {
    const config = createDefaultServiceConfig(service.key);
    if (
      requestType &&
      service.requestTypeScope &&
      service.requestTypeScope.includes(requestType)
    ) {
      // Auto-enable the service and its defaultSelected category items
      // so the identifier lands with the scoped manual surface ready
      // for input.
      config.enabled = true;
      const groupConfig = getServiceCategoryGroups(service.key);
      for (const group of groupConfig) {
        for (const item of group.items) {
          if (item.defaultSelected) {
            config.categoryGroups[group.key][item.key] = {
              ...config.categoryGroups[group.key][item.key],
              enabled: true,
            };
          }
        }
      }
    }
    services[service.key] = config;
  }
  return services;
}

/** Reconcile an existing identifier's services map with the request-type
 *  scoping rules. Useful for case-load paths that need to ensure a
 *  scoped service (e.g. Production Letters on UK COPO) is present on
 *  identifiers that pre-date the rule, without rewriting every seed.
 *
 *  Idempotent: services already in the expected state are left alone. */
export function applyRequestTypeServiceDefaults(
  services: IdentifierServices,
  requestType: string | undefined,
): IdentifierServices {
  if (!requestType) return services;
  const next: IdentifierServices = { ...services };
  for (const service of LENS_SERVICES) {
    if (!service.requestTypeScope?.includes(requestType)) continue;
    const existing = next[service.key];
    if (existing?.enabled) continue; // already on — nothing to do
    const fresh = createDefaultServiceConfig(service.key);
    fresh.enabled = true;
    const groupConfig = getServiceCategoryGroups(service.key);
    for (const group of groupConfig) {
      for (const item of group.items) {
        if (item.defaultSelected) {
          fresh.categoryGroups[group.key][item.key] = {
            ...fresh.categoryGroups[group.key][item.key],
            enabled: true,
          };
        }
      }
    }
    next[service.key] = fresh;
  }
  return next;
}

// ── Display Helpers ───────────────────────────────────────────────────────────

/** Get the display name for a group key (optionally scoped to a service) */
export function getGroupName(groupKey: string, serviceKey?: string): string {
  const groups = serviceKey ? getServiceCategoryGroups(serviceKey) : STANDARD_CATEGORY_GROUPS;
  return groups.find((g) => g.key === groupKey)?.name ?? groupKey;
}

/** Get the display name for an item key within a group (optionally scoped to a service) */
export function getItemName(groupKey: string, itemKey: string, serviceKey?: string): string {
  const groups = serviceKey ? getServiceCategoryGroups(serviceKey) : STANDARD_CATEGORY_GROUPS;
  const group = groups.find((g) => g.key === groupKey);
  return group?.items.find((i) => i.key === itemKey)?.name ?? itemKey;
}

/** Get the info tooltip text for an item (optionally scoped to a service) */
export function getItemInfo(groupKey: string, itemKey: string, serviceKey?: string): string | undefined {
  const groups = serviceKey ? getServiceCategoryGroups(serviceKey) : STANDARD_CATEGORY_GROUPS;
  const group = groups.find((g) => g.key === groupKey);
  return group?.items.find((i) => i.key === itemKey)?.info;
}

/** Get the display name for a service key */
export function getServiceName(serviceKey: string): string {
  return LENS_SERVICE_MAP[serviceKey]?.name ?? serviceKey;
}

/** Returns true if the category item requires manual collection (automated: false in config) */
export function isManualCategory(serviceKey: string, compoundCategoryKey: string): boolean {
  const [groupKey, itemKey] = compoundCategoryKey.split(':');
  const groups = getServiceCategoryGroups(serviceKey);
  const group = groups.find(g => g.key === groupKey);
  return group?.items.find(i => i.key === itemKey)?.automated === false;
}
