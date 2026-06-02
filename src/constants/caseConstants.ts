import type { TaskStatus, CaseRegion, ResolutionReason } from "../types/caseTypes";

// EU 27 Countries
export const EU_COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
  "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta",
  "Netherlands", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia",
  "Spain", "Sweden"
];

// EEAA Countries (EU + Iceland, Liechtenstein, Norway)
export const EEAA_COUNTRIES = [
  ...EU_COUNTRIES,
  "Iceland", "Liechtenstein", "Norway"
];

// GNI Countries (assuming Gibraltar, Guernsey, Jersey, Isle of Man - UK Crown Dependencies and territories)
export const GNI_COUNTRIES = [
  "Gibraltar", "Guernsey", "Jersey", "Isle of Man"
];

// Rest of World Countries (major countries outside EU/EEAA/GNI)
export const REST_OF_WORLD_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belize", "Benin",
  "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Burkina Faso",
  "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad",
  "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Côte d'Ivoire", "Cuba",
  "Democratic Republic of the Congo", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Fiji",
  "Gabon", "Gambia", "Georgia", "Ghana", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hong Kong", "India", "Indonesia", "Iran", "Iraq", "Israel",
  "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait",
  "Kyrgyzstan", "Laos", "Lebanon", "Lesotho", "Liberia", "Libya", "Macao", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Marshall Islands", "Mauritania", "Mauritius",
  "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique",
  "Myanmar", "Namibia", "Nauru", "Nepal", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Korea", "North Macedonia", "Oman", "Pakistan", "Palau", "Palestine", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Qatar", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa",
  "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles",
  "Sierra Leone", "Singapore", "Solomon Islands", "Somalia", "South Africa", "South Korea",
  "South Sudan", "Sri Lanka", "Sudan", "Suriname", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago",
  "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

// Combine all jurisdictions with categories
export const JURISDICTIONS = [
  { label: "EU 27 Countries", countries: EU_COUNTRIES },
  { label: "EEAA Countries", countries: EEAA_COUNTRIES },
  { label: "GNI Countries", countries: GNI_COUNTRIES },
  { label: "Rest of World", countries: REST_OF_WORLD_COUNTRIES },
];

// Nature of Crimes - Global Categories
/**
 * Structured option for the Nature of Crime picker. ETSI-sourced entries
 * carry `source: "eEvidence"` so the picker can render a small badge next
 * to the label — the IA on an eEvidence case typically picks an
 * ETSI-tagged value, while non-eEvidence cases keep using the generic
 * (un-badged) entries.
 */
export interface NatureOfCrimeOption {
  /** Canonical storage value persisted on `FormData.natureOfCrimes`.
   *  Existing generic entries keep their original strings; ETSI entries
   *  use the camelCase ETSI dictionary key. */
  value: string;
  /** Friendly English label shown in the picker + chips. */
  label: string;
  /** When set, the picker renders the eEvidence badge next to the label. */
  source?: "eEvidence";
}

export const NATURE_OF_CRIMES: NatureOfCrimeOption[] = [
  // ── ETSI AuthorisationTypeOfCase dictionary (eEvidence) ─────────────
  // Where an ETSI key has the same label as an existing generic entry
  // (Cybercrime, Human Trafficking, Money Laundering, Theft), the ETSI-
  // badged row is the single source of truth and the older mock-data
  // strings are migrated via NATURE_OF_CRIMES_MIGRATION_MAP below.
  { value: "ChildExploitationOrChildSexualAbuse", label: "Child Exploitation or Child Sexual Abuse", source: "eEvidence" },
  { value: "Corruption", label: "Corruption", source: "eEvidence" },
  { value: "Cybercrime", label: "Cybercrime", source: "eEvidence" },
  { value: "Defamation", label: "Defamation", source: "eEvidence" },
  { value: "DrugsOrDrugTrafficking", label: "Drugs or Drug Trafficking", source: "eEvidence" },
  { value: "HarassmentOrThreatToPersonalSafety", label: "Harassment or Threat to Personal Safety", source: "eEvidence" },
  { value: "HateSpeech", label: "Hate Speech", source: "eEvidence" },
  { value: "HumanTrafficking", label: "Human Trafficking", source: "eEvidence" },
  { value: "MissingPerson", label: "Missing Person", source: "eEvidence" },
  { value: "MoneyLaundering", label: "Money Laundering", source: "eEvidence" },
  { value: "OtherFinancialCrimeOrFraud", label: "Other Financial Crime or Fraud", source: "eEvidence" },
  { value: "SexualAbuseOrExploitation", label: "Sexual Abuse or Exploitation", source: "eEvidence" },
  { value: "Theft", label: "Theft", source: "eEvidence" },
  { value: "TerrorismOrThreatToPublicSafety", label: "Terrorism or Threat to Public Safety", source: "eEvidence" },
  { value: "ViolenceOrCrimeAgainstAPerson", label: "Violence or Crime Against a Person", source: "eEvidence" },
  { value: "Other", label: "Other", source: "eEvidence" },
  { value: "NotSpecified", label: "Not Specified", source: "eEvidence" },

  // ── Generic Nature of Crime values kept for non-eEvidence cases ─────
  // These have no ETSI equivalent (or carry semantics narrower / broader
  // than any ETSI entry). Picker shows them without a badge.
  { value: "Terrorism", label: "Terrorism" },
  { value: "Child Exploitation", label: "Child Exploitation" },
  { value: "Child Sexual Abuse Material (CSAM)", label: "Child Sexual Abuse Material (CSAM)" },
  { value: "Drug Trafficking", label: "Drug Trafficking" },
  { value: "Weapons Trafficking", label: "Weapons Trafficking" },
  { value: "Organized Crime", label: "Organized Crime" },
  { value: "Fraud", label: "Fraud" },
  { value: "Identity Theft", label: "Identity Theft" },
  { value: "Extortion", label: "Extortion" },
  { value: "Kidnapping", label: "Kidnapping" },
  { value: "Murder/Homicide", label: "Murder/Homicide" },
  { value: "Assault", label: "Assault" },
  { value: "Robbery", label: "Robbery" },
  { value: "Burglary", label: "Burglary" },
  { value: "Sexual Assault", label: "Sexual Assault" },
  { value: "Stalking/Harassment", label: "Stalking/Harassment" },
];

/**
 * One-shot rename map for mocks / persisted drafts that pre-date the ETSI
 * merge. Apply via `migrateNatureOfCrimes()` before rendering or saving.
 * Keys = old strings; values = ETSI camelCase keys.
 */
export const NATURE_OF_CRIMES_MIGRATION_MAP: Record<string, string> = {
  "Human Trafficking": "HumanTrafficking",
  "Money Laundering": "MoneyLaundering",
};

/**
 * Map an array of legacy Nature of Crime strings onto the new ETSI-keyed
 * values. Idempotent — already-migrated values pass through unchanged.
 */
export function migrateNatureOfCrimes(values: string[] | undefined): string[] {
  if (!values) return [];
  return values.map((v) => NATURE_OF_CRIMES_MIGRATION_MAP[v] ?? v);
}

/**
 * Look up a Nature of Crime option by its stored value. Returns undefined
 * when the value isn't in the canonical list (e.g. a stale mock that
 * predates a migration run).
 */
export function getNatureOfCrimeOption(value: string): NatureOfCrimeOption | undefined {
  return NATURE_OF_CRIMES.find((o) => o.value === value);
}

/**
 * Friendly label for a stored Nature of Crime value, falling back to the
 * raw value when no canonical option matches.
 */
export function getNatureOfCrimeLabel(value: string): string {
  return getNatureOfCrimeOption(value)?.label ?? value;
}

// EU27 DSA Harms Categories (based on DSA regulation)
export const EU27_DSA_HARMS = [
  "Illegal Content",
  "Child Sexual Abuse Material",
  "Illegal Hate Speech",
  "Illegal Incitement to Violence and Terrorism",
  "Sale of Non-Compliant, Dangerous, and Counterfeit Products",
  "Protection of Consumers",
  "Protection of Privacy and Personal Data",
  "Intellectual Property Infringements",
  "Platform Integrity and Authenticity",
];

// EU27 DSA Harms Subcategories (mapped to parent categories)
export const EU27_DSA_HARMS_SUBCATEGORIES: Record<string, string[]> = {
  "Illegal Content": [
    "Illegal or harmful speech",
    "Violence",
    "Animal welfare",
    "Self-mutilation",
    "Scams and fraud",
    "Unsafe, non-compliant, and prohibited products",
    "Data protection and privacy violations",
    "Other",
  ],
  "Child Sexual Abuse Material": [
    "Age-specific restrictions",
    "Child sexual abuse material",
  ],
  "Illegal Hate Speech": [
    "Hate speech",
  ],
  "Illegal Incitement to Violence and Terrorism": [
    "Incitement to violence, hatred and terrorism",
  ],
  "Sale of Non-Compliant, Dangerous, and Counterfeit Products": [
    "Unsafe, non-compliant, and prohibited products",
  ],
  "Protection of Consumers": [
    "Scams and fraud",
  ],
  "Protection of Privacy and Personal Data": [
    "Data protection and privacy violations",
  ],
  "Intellectual Property Infringements": [
    "Intellectual property infringements",
  ],
  "Platform Integrity and Authenticity": [
    "Inauthentic accounts",
    "Inauthentic listings",
    "Inauthentic user reviews",
  ],
};

export const IDENTIFIER_TYPES = [
  "Email address",
  "SkypeID",
  "Xbox Gamertag",
  "Credit Card (Last 4)",
  "MRN",
  "Other Payment Instrument",
  "IP address",
  "CID",
  "Domain Name",
  "Tenant ID",
  "PUID",
  "Sharepoint URL",
  "Microsoft Forms URL",
  "Other URL",
  "Teams Meeting ID",
  "Teams Meeting URL",
  "NCMEC Report ID",
  "Phone Number",
  "Serial Number",
  "XBOX 5X5 Token",
  "Push Tokens",
  "Other:",
];

export const NDO_STATUSES = [
  "Active",
  "Delay Inform",
  "Expired",
  "Pending",
  "Cancelled",
];

export const NDO_STATUS_REASONS = [
  "Court Order",
  "Ongoing Investigation",
  "National Security",
  "Victim Protection",
  "Other",
];

export const AGENT_ROLES = [
  "Submitter",
  "Recipient",
  "Both",
  "Other",
];

export const ISO_639_1_LANGUAGES = [
  "en - English",
  "es - Spanish",
  "fr - French",
  "de - German",
  "it - Italian",
  "pt - Portuguese",
  "nl - Dutch",
  "ru - Russian",
  "zh - Chinese",
  "ja - Japanese",
  "ko - Korean",
  "ar - Arabic",
  "hi - Hindi",
  "bn - Bengali",
  "pa - Punjabi",
  "tr - Turkish",
  "vi - Vietnamese",
  "pl - Polish",
  "uk - Ukrainian",
  "ro - Romanian",
  "el - Greek",
  "cs - Czech",
  "sv - Swedish",
  "hu - Hungarian",
  "fi - Finnish",
  "no - Norwegian",
  "da - Danish",
  "he - Hebrew",
  "th - Thai",
  "id - Indonesian",
  "ms - Malay",
  "fa - Persian",
  "ur - Urdu",
  "sw - Swahili",
  "ta - Tamil",
  "te - Telugu",
  "mr - Marathi",
  "kn - Kannada",
  "gu - Gujarati",
  "ml - Malayalam",
];

export const TIMEZONES = [
  "UTC",
  "America/New_York (EST/EDT)",
  "America/Chicago (CST/CDT)",
  "America/Denver (MST/MDT)",
  "America/Los_Angeles (PST/PDT)",
  "Europe/London (GMT/BST)",
  "Europe/Paris (CET/CEST)",
  "Asia/Tokyo (JST)",
  "Australia/Sydney (AEST/AEDT)",
];

export const REQUEST_TYPES = [
  "Administrative Subpoena or Summons",
  "Civil Demand",
  "Consent Release",
  "COPO Order",
  "Court Order",
  "eEvidence",
  "Emergency Letter",
  "Grand Jury Subpoena",
  "International Order",
  "Lawful Intercept",
  "NSL",
  "Other",
  "Preservation",
  "Search Warrant",
];

export const INTERNAL_REQUEST_TYPES = [
  "Duplicate",
  "IREQ",
  "Internal",
  "LE Portal Feedback",
  "Not Valid",
  "Testimony Subpoena/Summons",
];

export const REQUEST_SUB_TYPES = [
  "Cease",
  "Civil",
  "Content",
  "Defense Counsel",
  "Disclosure",
  "Enterprise",
  "EPOC ER",
  "EPOC PR",
  "EPOC PR Extension",
  "Evidence Hold",
  "FACTA",
  "Intercept",
  "Internal",
  "Judicial Order",
  "KU Special",
  "Non-Content",
  "Non-Judicial Order",
  "None",
  "OIA",
  "Preservation",
  "PRTT",
  "Renewal",
  "Start",
  "Stored",
  "Stop",
  "UA Special",
  "Verify Only",
];

/**
 * Per-request-type allow-lists for Request Sub-Type. When a request type has
 * an entry here, the Sub-Type picker is filtered to that list. Request types
 * with no entry fall through to the full REQUEST_SUB_TYPES list (legacy).
 *
 * The first element in each list is treated as the default sub-type when the
 * request type is selected.
 */
export const REQUEST_SUB_TYPES_BY_TYPE: Record<string, string[]> = {
  eEvidence: ["EPOC", "EPOC PR", "EPOC ER"],
};

/** Returns the allowed sub-types for a given request type. Falls back to the
 *  full list when the request type has no specific allow-list. */
export function getSubTypesForRequestType(requestType: string): string[] {
  return REQUEST_SUB_TYPES_BY_TYPE[requestType] ?? REQUEST_SUB_TYPES;
}

/** Returns the default sub-type for a given request type, or undefined when
 *  there is no specific default. */
export function getDefaultSubTypeForRequestType(
  requestType: string,
): string | undefined {
  const list = REQUEST_SUB_TYPES_BY_TYPE[requestType];
  return list?.[0];
}

export const CASE_STAGES = [
  "Waiting on Triage",
  "In Progress",
  "Recommend Rejection",
  "Rejected",
  "Cancelled",
];

export const COUNTRY_CONTACT_STATUSES = [
  "Awaiting CC Review",
  "CC Approved",
  "CC Escalation",
  "CC Rejected",
];

// Contact status options for needs more information flows
export const CONTACT_STATUSES = [
  "Awaiting Review and/or QC",
  "Escalation",
  "Approved",
  "Rejected",
];

export const AUTHORIZATION_STATUSES = [
  "AwaitingApproval",
  "EmergencyApproval",
  "Approved",
  "Rejected",
  "Suspended",
  "Cancelled",
  "Expired",
  "Invalid",
];

export const APPROVAL_TYPES = [
  "Creation",
  "Renewal",
  "Modification",
  "Cancellation",
];

export const APPROVER_ROLES = [
  "Case Manager",
  "Senior Case Manager",
  "Legal Counsel",
  "Director",
  "Compliance Officer",
  "Executive Approver",
];

export const FULFILLMENT_STAGES = [
  "In Review",
  "No Data Provided",
  "Rejected",
  "Withdrawn",
  "In Progress",
  "Resolved",
  "Cancelled",
];

/** Stages that represent a closed/terminated case. Used by the case
 *  header to decide whether to surface "Resolve Case" vs. the
 *  "Edit resolution / Re-open" menu. */
export const CLOSURE_STAGES: ReadonlySet<string> = new Set([
  "Resolved",
  "No Data Provided",
  "Rejected",
  "Withdrawn",
  "Cancelled",
]);

export function isClosureStage(stage: string | undefined): boolean {
  return !!stage && CLOSURE_STAGES.has(stage);
}

/** Per-reason metadata for the structured Resolution Reason picker.
 *  Single source of truth — the legacy `RESOLUTION_REASON_LABELS` and
 *  `RESOLUTION_REASON_TO_STAGE` exports below are derived views. */
export interface ResolutionReasonMeta {
  /** Short display label rendered in the picker option. */
  label: string;
  /** Right-column helper sentence; mirrors the closure-reason table. */
  description: string;
  /** Target `caseStage` set when this reason is chosen. Must be a member
   *  of `FULFILLMENT_STAGES`. */
  stage: string;
}

export const RESOLUTION_REASON_META: Record<ResolutionReason, ResolutionReasonMeta> = {
  // ── Canonical 14 ─────────────────────────────────────────────────────
  InfoProvided: {
    label: "Info provided",
    description: "Data successfully disclosed.",
    stage: "Resolved",
  },
  NoData: {
    label: "No Data",
    description:
      "No data found for the target identifier, service, and data category " +
      "requested and/or date ranges requested. Only a production letter will " +
      "be delivered to the authorities.",
    stage: "No Data Provided",
  },
  RejectedMicrosoft: {
    label: "Rejected – Microsoft",
    description: "Request rejected by Microsoft.",
    stage: "Rejected",
  },
  EnterpriseRedirected: {
    label: "Enterprise Redirected",
    description:
      "Request redirected to the Enterprise customer that Microsoft hosts " +
      "data for (data controller).",
    stage: "Resolved",
  },
  PreservationExtension: {
    label: "Preservation extension",
    description: "Preservation period extended.",
    stage: "Resolved",
  },
  Preserved: {
    label: "Preserved",
    description: "Data preserved (no disclosure yet).",
    stage: "Resolved",
  },
  WithdrawnExternal: {
    label: "Withdrawn – External",
    description: "Request withdrawn by requester.",
    stage: "Withdrawn",
  },
  HandOffToAnotherTeam: {
    label: "Hand off to another team",
    description: "Ownership transferred internally.",
    stage: "Resolved",
  },
  Duplicate: {
    label: "Duplicate",
    description: "Duplicate request.",
    stage: "Resolved",
  },
  UserQuashed: {
    label: "User Quashed",
    description:
      "Request invalidated by authority quashed by user after user notice.",
    stage: "Cancelled",
  },
  Test: {
    label: "Test",
    description: "Non-production / test request.",
    stage: "Resolved",
  },
  CsamPreservations: {
    label: "CSAM preservations (PhotoDNA)",
    description: "Special preservation category.",
    stage: "Resolved",
  },
  NdoExtension: {
    label: "NDO Extension (new request)",
    description: "Non-disclosure extension scenario.",
    stage: "Resolved",
  },
  ProblemSolved: {
    label: "Problem Solved",
    description: "Used for \"Not Valid\" requests requiring manual effort.",
    stage: "Resolved",
  },
  // ── Legacy outliers (no direct equivalent in the new list) ──────────
  PartialDelivery: {
    label: "Partial delivery (legacy)",
    description: "Some data delivered; remainder not produced.",
    stage: "Resolved",
  },
  CancelledByLE: {
    label: "Cancelled by LE (legacy)",
    description: "Case cancelled by the law-enforcement counterparty.",
    stage: "Cancelled",
  },
};

/** Order keys appear in the picker. Canonical 14 first (alphabetical by
 *  label, with NDO/CSAM at the end to keep niche items below common ones),
 *  legacy outliers last. */
export const RESOLUTION_REASON_ORDER: ResolutionReason[] = [
  "InfoProvided",
  "NoData",
  "RejectedMicrosoft",
  "WithdrawnExternal",
  "Duplicate",
  "EnterpriseRedirected",
  "HandOffToAnotherTeam",
  "UserQuashed",
  "Preserved",
  "PreservationExtension",
  "NdoExtension",
  "CsamPreservations",
  "ProblemSolved",
  "Test",
  // Legacy outliers — kept available, ranked last so they don't crowd the picker.
  "PartialDelivery",
  "CancelledByLE",
];

/** Display labels for the structured Resolution Reason picker.
 *  Derived view over `RESOLUTION_REASON_META` for back-compat with callers. */
export const RESOLUTION_REASON_LABELS: Record<ResolutionReason, string> =
  Object.fromEntries(
    (Object.keys(RESOLUTION_REASON_META) as ResolutionReason[]).map((k) => [
      k,
      RESOLUTION_REASON_META[k].label,
    ]),
  ) as Record<ResolutionReason, string>;

/** Maps each Resolution Reason to the target case stage. Derived view.
 *  Values must be members of FULFILLMENT_STAGES. */
export const RESOLUTION_REASON_TO_STAGE: Record<ResolutionReason, string> =
  Object.fromEntries(
    (Object.keys(RESOLUTION_REASON_META) as ResolutionReason[]).map((k) => [
      k,
      RESOLUTION_REASON_META[k].stage,
    ]),
  ) as Record<ResolutionReason, string>;

export const SHIELD_LAW_STATES = [
  "Washington",
  "California",
];

// Unified category labels for all services
export const UNIFIED_CATEGORY_LABELS = {
  basicSubscriber: "Basic Subscriber",
  authenticationLogs: "Authentication Logs",
  serviceTelemetry: "Service Telemetry",
  content: "Content",
  transactionalData: "Transactional Data",
};

// MSA-specific category labels
export const MSA_CATEGORY_LABELS = {
  servicesUtilized: "Services Utilized",
  basicRegistration: "Basic Registration",
  emailChangeHistory: "Email Change History",
};

// Enterprise-specific category labels
export const ENTERPRISE_CATEGORY_LABELS = {
  organizationalProfile: "Organizational Profile",
  userProfile: "User Profile",
  smtpPull: "SMTP Pull",
};

// Task status configuration with colors and labels
export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  New: { label: "New", color: "#0078d4", bgColor: "#deecf9", borderColor: "#0078d4" },
  InProgress: { label: "In Progress", color: "#8a6d3b", bgColor: "#fff4ce", borderColor: "#8a6d3b" },
  InReview: { label: "In Review", color: "#5c2d91", bgColor: "#f4e7fc", borderColor: "#5c2d91" },
  AwaitingApproval: { label: "Awaiting Approval", color: "#8a6d3b", bgColor: "#fff4ce", borderColor: "#8a6d3b" },
  AwaitingDisclosure: { label: "Awaiting Disclosure", color: "#8a6d3b", bgColor: "#fff4ce", borderColor: "#8a6d3b" },
  Disclosed: { label: "Disclosed", color: "#107c10", bgColor: "#dff6dd", borderColor: "#107c10" },
  DisclosureNotAvailable: { label: "Disclosure Not Available", color: "#605e5c", bgColor: "#f3f2f1", borderColor: "#8a8886" },
  Rejected: { label: "Rejected", color: "#a4262c", bgColor: "#fde7e9", borderColor: "#a4262c" },
  Cancelled: { label: "Cancelled", color: "#605e5c", bgColor: "#f3f2f1", borderColor: "#8a8886" },
  Error: { label: "Error", color: "#ca5010", bgColor: "#fff9f5", borderColor: "#ca5010" },
  Invalid: { label: "Invalid", color: "#a4262c", bgColor: "#fde7e9", borderColor: "#a4262c" },
  AwaitingPreservation: { label: "Awaiting Preservation", color: "#8a6d3b", bgColor: "#fff4ce", borderColor: "#8a6d3b" },
  Preserved: { label: "Preserved", color: "#107c10", bgColor: "#dff6dd", borderColor: "#107c10" },
  PreservationNotAvailable: { label: "Preservation Not Available", color: "#605e5c", bgColor: "#f3f2f1", borderColor: "#8a8886" },
  AwaitingProvisioning: { label: "Awaiting Provisioning", color: "#8a6d3b", bgColor: "#fff4ce", borderColor: "#8a6d3b" },
  Active: { label: "Active", color: "#107c10", bgColor: "#dff6dd", borderColor: "#107c10" },
  Suspended: { label: "Suspended", color: "#ca5010", bgColor: "#fff9f5", borderColor: "#ca5010" },
  Expired: { label: "Expired", color: "#605e5c", bgColor: "#f3f2f1", borderColor: "#8a8886" },
};

// Identifier format validation rules
export const IDENTIFIER_FORMAT_RULES: Record<string, {
  pattern?: RegExp;
  validate?: (value: string) => boolean;
  description: string;
  example: string;
}> = {
  "Email address": {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    description: "Must be a valid email format",
    example: "user@example.com"
  },
  "Phone Number": {
    pattern: /^[\d\s\-\+\(\)]+$/,
    validate: (value: string) => {
      const digitsOnly = value.replace(/\D/g, '');
      return digitsOnly.length >= 10 && digitsOnly.length <= 15;
    },
    description: "Must contain 10-15 digits with optional formatting",
    example: "+1 (555) 123-4567"
  },
  "IP address": {
    validate: (value: string) => {
      // IPv4
      const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      // IPv6 (simplified)
      const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
      return ipv4Pattern.test(value) || ipv6Pattern.test(value);
    },
    description: "Must be a valid IPv4 or IPv6 address",
    example: "192.168.1.1 or 2001:0db8::1"
  },
  "Domain Name": {
    pattern: /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    description: "Must be a valid domain name",
    example: "example.com"
  },
  "Sharepoint URL": {
    pattern: /^https:\/\/[a-zA-Z0-9\-]+\.sharepoint\.com\/.*/,
    description: "Must be a valid SharePoint URL",
    example: "https://contoso.sharepoint.com/sites/..."
  },
  "Microsoft Forms URL": {
    pattern: /^https:\/\/forms\.(office\.com|microsoft\.com)\/.*/,
    description: "Must be a valid Microsoft Forms URL",
    example: "https://forms.office.com/..."
  },
  "Other URL": {
    pattern: /^https?:\/\/.+\..+/,
    description: "Must be a valid URL with http:// or https://",
    example: "https://example.com"
  },
  "Teams Meeting URL": {
    pattern: /^https:\/\/teams\.microsoft\.com\/.*/,
    description: "Must be a valid Teams meeting URL",
    example: "https://teams.microsoft.com/l/meetup-join/..."
  },
  "Credit Card (Last 4)": {
    pattern: /^\d{4}$/,
    description: "Must be exactly 4 digits",
    example: "1234"
  },
  "Tenant ID": {
    pattern: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    description: "Must be a valid GUID format",
    example: "12345678-1234-1234-1234-123456789abc"
  },
  "PUID": {
    pattern: /^[0-9a-fA-F]{16}$/,
    description: "Must be a 16-character hexadecimal string",
    example: "00030000C84C91A8"
  },
  "CID": {
    pattern: /^[0-9a-fA-F]{16}$/,
    description: "Must be a 16-character hexadecimal string",
    example: "1234567890ABCDEF"
  },
  "NCMEC Report ID": {
    pattern: /^\d+$/,
    description: "Must contain only digits",
    example: "12345678"
  },
  "Teams Meeting ID": {
    pattern: /^\d{3}\s\d{3}\s\d{3}$/,
    description: "Must be in format: ### ### ###",
    example: "123 456 789"
  },
  // XBOX gift-card redemption codes are 25 alphanumeric characters
  // printed as five groups of five, separated by hyphens. The IA only
  // sees this token — they don't know which MSA redeemed it. Account
  // existence cannot be checked against the token directly; the RS
  // resolves it via an external XBOX gift-card-registry tool, then
  // attaches the resolved MSA as a Supplemental identifier and runs
  // Check Accounts on the supplemental.
  "XBOX 5X5 Token": {
    pattern: /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/i,
    description: "Must be 5 groups of 5 alphanumeric characters separated by hyphens",
    example: "M2Q4T-PQRJX-7HK9F-WVNB3-RSTYZ",
  },
};

// MICROSOFT_SERVICES_CONFIG was previously duplicated here; canonical source is
// src/config/microsoftServices.ts. Import from there.

// Current logged-in user for prototype
export const CURRENT_USER = "Nicole Garcia";

// User names for assignment dropdowns
export const RESPONSE_SPECIALISTS = [
  "Amanda Williams",
  "Christopher Lee",
  "Lauren Thompson",
  "Marcus Anderson",
  "Nicole Garcia",
  "Brandon Taylor",
];

// ── Attorney Escalation ──────────────────────────────────────────────────

import type { EscalationRole } from "../types/caseTypes";

export const ESCALATION_ROLES: Array<{ value: EscalationRole; label: string }> = [
  { value: "Attorney",           label: "Attorney" },
  { value: "LensLeadOrManager",  label: "LENS Lead / Manager" },
  { value: "ResponseSpecialist", label: "Response Specialist" },
  { value: "TriageSpecialist",   label: "Triage Specialist" },
];

/** Mock directory of escalation targets across all four DARS roles.
 *  Real DARS would query an org-chart service. */
export interface EscalationDirectoryEntry {
  id: string;
  name: string;
  role: EscalationRole;
  email: string;
}

export const ESCALATION_DIRECTORY: EscalationDirectoryEntry[] = [
  // Attorneys
  { id: "ATT-001", name: "Sarah Mitchell",  role: "Attorney",            email: "s.mitchell@legal.contoso.com" },
  { id: "ATT-002", name: "Thomas Anderson", role: "Attorney",            email: "t.anderson@legal.contoso.com" },
  // LENS Lead / Manager
  { id: "LEAD-01", name: "Priya Iyer",      role: "LensLeadOrManager",   email: "p.iyer@contoso.com" },
  // Response Specialists
  { id: "RS-001",  name: "Nicole Garcia",   role: "ResponseSpecialist",  email: "n.garcia@contoso.com" },
  { id: "RS-002",  name: "Marcus Kohl",     role: "ResponseSpecialist",  email: "m.kohl@contoso.com" },
  // Triage Specialists
  { id: "TS-001",  name: "Elena Ruiz",      role: "TriageSpecialist",    email: "e.ruiz@contoso.com" },
];

export function getEscalationRoleLabel(role: EscalationRole): string {
  return ESCALATION_ROLES.find((r) => r.value === role)?.label ?? role;
}

export function findEscalationAssignee(
  id: string | undefined,
): EscalationDirectoryEntry | undefined {
  if (!id) return undefined;
  return ESCALATION_DIRECTORY.find((d) => d.id === id);
}

// Request Origin options
export const REQUEST_ORIGIN_OPTIONS = [
  "LE Portal",
  "LEAPI",
  "Email forward",
  "Mail/Letter",
  "Other",
];

// Countries list for dropdown (legacy — kept for backward compat)
export const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "India",
  "Brazil",
  "Mexico",
  "Italy",
  "Spain",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Ireland",
  "New Zealand",
  "Singapore",
];

// ── Country metadata — used by CaseLegalContext ─────────────────────────────
// Provides ISO 3166-1 alpha-2 codes and region groupings for CHI scoring.
export const COUNTRY_METADATA: Record<string, { countryCode: string; region: CaseRegion }> = {
  "United States":    { countryCode: "US", region: "US" },
  "Canada":           { countryCode: "CA", region: "ROW" },
  "United Kingdom":   { countryCode: "GB", region: "EEA" },
  "Australia":        { countryCode: "AU", region: "APAC" },
  "Germany":          { countryCode: "DE", region: "EU" },
  "France":           { countryCode: "FR", region: "EU" },
  "Japan":            { countryCode: "JP", region: "APAC" },
  "India":            { countryCode: "IN", region: "APAC" },
  "Brazil":           { countryCode: "BR", region: "LATAM" },
  "Mexico":           { countryCode: "MX", region: "LATAM" },
  "Italy":            { countryCode: "IT", region: "EU" },
  "Spain":            { countryCode: "ES", region: "EU" },
  "Netherlands":      { countryCode: "NL", region: "EU" },
  "Sweden":           { countryCode: "SE", region: "EU" },
  "Norway":           { countryCode: "NO", region: "EEA" },
  "Denmark":          { countryCode: "DK", region: "EU" },
  "Finland":          { countryCode: "FI", region: "EU" },
  "Ireland":          { countryCode: "IE", region: "EU" },
  "New Zealand":      { countryCode: "NZ", region: "APAC" },
  "Singapore":        { countryCode: "SG", region: "APAC" },
};

// ── Jurisdiction levels per country ────────────────────────────────────────
// Valid jurisdiction levels are country-specific. Used to populate the
// jurisdiction dropdown after a country is selected.
export const JURISDICTION_LEVELS: Record<string, string[]> = {
  "US": ["Federal", "State", "Local", "Tribal"],
  "CA": ["Federal", "Provincial", "Territorial"],
  "GB": ["National", "Regional"],
  "AU": ["Federal", "State", "Territory"],
  "DE": ["Federal", "State (Land)"],
  "FR": ["National", "Regional"],
  "JP": ["National", "Prefectural"],
  "IN": ["Central", "State"],
  "BR": ["Federal", "State"],
  "MX": ["Federal", "State"],
  "IT": ["National", "Regional"],
  "ES": ["National", "Regional", "Local"],
  "NL": ["National", "Regional"],
  "SE": ["National", "Regional"],
  "NO": ["National", "Regional"],
  "DK": ["National", "Regional"],
  "FI": ["National", "Regional"],
  "IE": ["National", "Regional"],
  "NZ": ["National", "Regional"],
  "SG": ["National"],
  // Default for any country not listed (EU eEvidence, ROW)
  "__default__": ["National"],
};

/** Returns valid jurisdiction levels for a given ISO alpha-2 country code. */
export function getJurisdictionLevels(countryCode: string): string[] {
  return JURISDICTION_LEVELS[countryCode] ?? JURISDICTION_LEVELS["__default__"];
}

// ── Agency Types ─────────────────────────────────────────────────────────────
export const AGENCY_TYPES = [
  { value: "LawEnforcement",         label: "Law Enforcement" },
  { value: "IntelligenceAgency",     label: "Intelligence Agency" },
  { value: "RegulatoryBody",         label: "Regulatory Body" },
  { value: "Court",                  label: "Court" },
  { value: "Prosecutor",             label: "Prosecutor / DA" },
  { value: "MilitaryLawEnforcement", label: "Military Law Enforcement" },
  { value: "InternationalBody",      label: "International Body (Interpol / Europol)" },
  { value: "Other",                  label: "Other" },
] as const;

// ── Authority Roles ───────────────────────────────────────────────────────────
export const AUTHORITY_ROLES = [
  { value: "IssuingAuthority",   label: "Issuing Authority",   description: "Court or body that authorized the legal demand" },
  { value: "EnforcingAuthority", label: "Enforcing Authority", description: "Agency executing or serving the demand" },
  { value: "RequestingAgency",   label: "Requesting Agency",   description: "Agency that submitted the request to Microsoft" },
  { value: "CooperatingAgency",  label: "Cooperating Agency",  description: "Additional agency involved (e.g., Interpol coordination)" },
  { value: "OutsideCounsel",     label: "Outside Counsel",     description: "External legal representation (India / MLAT scenarios)" },
] as const;

// Azure region to country mapping. Every entry here must have a country
// the LENS Collection Boundary roll-up (constants/collectionBoundaries.ts)
// knows how to bucket — when adding a new region, also extend
// `COUNTRY_TO_BOUNDARY` if the country is genuinely new.
export const REGION_TO_LOCATION: Record<string, { region: string; country: string }> = {
  // North America
  "North America - East US 2": { region: "East US 2", country: "United States" },
  "North America - West US": { region: "West US", country: "United States" },
  "North America - Central US": { region: "Central US", country: "United States" },
  "North America - Canada Central": { region: "Canada Central", country: "Canada" },
  "North America - Mexico Central": { region: "Mexico Central", country: "Mexico" },
  // Europe
  "Europe - West Europe": { region: "West Europe", country: "Netherlands" },
  "Europe - North Europe": { region: "North Europe", country: "Ireland" },
  "Europe - UK South": { region: "UK South", country: "United Kingdom" },
  "Europe - Germany West Central": { region: "Germany West Central", country: "Germany" },
  "Europe - France Central": { region: "France Central", country: "France" },
  "Europe - Switzerland North": { region: "Switzerland North", country: "Switzerland" },
  // Asia Pacific
  "Asia Pacific - Southeast Asia": { region: "Southeast Asia", country: "Singapore" },
  "Asia Pacific - East Asia": { region: "East Asia", country: "Hong Kong" },
  "Asia Pacific - Japan East": { region: "Japan East", country: "Japan" },
  "Asia Pacific - Australia East": { region: "Australia East", country: "Australia" },
  "Asia Pacific - India South": { region: "India South", country: "India" },
  // South America
  "South America - Brazil South": { region: "Brazil South", country: "Brazil" },
  // Middle East
  "Middle East - UAE North": { region: "UAE North", country: "United Arab Emirates" },
};