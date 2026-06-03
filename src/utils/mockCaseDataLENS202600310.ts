/**
 * Mock case data for LNS-2026-00310 — LE Service Mapping Failure Demo.
 *
 * Purpose: exercise every failure mode of the LE → internal service
 * mapping pipeline. Up to now every seeded case used canonical
 * external names ("Email", "Microsoft Account Profile", "Teams",
 * "OneDrive") that resolve cleanly, so the UX for unresolvable inputs
 * was never reachable from a demo. This seed deliberately submits
 * names + categories the resolver cannot map so the LE Review panel,
 * Step 1 validation chips, and the AccountIdentifiers section all
 * render their "unmapped" states.
 *
 * Why eEvidence (and not UK COPO):
 *   EU eEvidence Form 1 (the EPOC envelope) lets the IA submit
 *   free-form text strings for the services, data categories, data
 *   types, and per-task date range they want produced. The Decentralised
 *   IT System has no controlled vocabulary on those fields — it accepts
 *   whatever the requesting authority writes, with no inline validation.
 *   UK COPO submissions go through a structured Home Office template
 *   with a closed list of services, so the unmapped-name path is
 *   effectively unreachable from that channel. eEvidence is where this
 *   failure mode actually happens in production.
 *
 * Three identifiers, each tagged with a different failure-mode story:
 *
 *   id1 (Consumer)  : FastFax + YammerLite + Email
 *                     → 2× unmapped-name (FastFax = deprecated 2024 fax
 *                       retrieval product; YammerLite = the IA typo'd
 *                       "Yammer" — rebranded to Viva Engage) +
 *                       1× resolved (Email → exchangeConsumer).
 *                     Tests `unmapped-name` status from
 *                     resolveExternalServices.ts:55-62.
 *
 *   id2 (Consumer)  : SharePoint + Email
 *                     → 1× wrong-account-type (SharePoint is Enterprise-only) +
 *                       1× resolved.
 *                     Tests `wrong-account-type` status (line 75-84).
 *
 *   id3 (Enterprise): XBOX/Minecraft + Email
 *                     → 1× wrong-account-type (XBOX/Minecraft is Consumer-only) +
 *                       1× resolved (Email → exchangeEnterprise).
 *                     Tests the symmetrical wrong-type case.
 *
 * Where the failure surfaces in the UI:
 *   - LEReviewPanel.tsx — red `unmappedChip` Tag on every unresolved row.
 *   - validateIdentifier.ts — informational `le-service-unmapped` +
 *     `le-service-incompatible` chips in the Step 1 identifier list.
 *   - AccountIdentifiersSection — the per-identifier review caption
 *     lists unmapped names with the resolver's `reason` tooltip.
 *
 * The case stage starts at "Waiting on Triage" so the tester can walk
 * the demo from a clean slate. Account check pre-stamps Consumer/
 * Enterprise on the identifiers so the resolver has an account type
 * to disambiguate against (otherwise it returns `missing-account-type`
 * for everything and we lose the demo signal).
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

export function buildLENS202600310FormData(): FormData {
  // ── Dates anchored to the demo day ────────────────────────────────────
  // The IA's Form 1 free-text submission carries three per-service date
  // windows so the demo exercises the per-service-range rendering plus
  // a per-category override (a category-specific window narrower than
  // the service-level one — common when the IA only cares about a
  // specific incident window for one data type).
  const createDate = new Date("2026-06-03");
  const dueDate = computeSlaDueDate("Routine", createDate, createDate);
  const startDate = new Date("2026-02-01");
  const endDate = new Date("2026-06-03");
  const leDateRange = { start: "2026-02-01", end: "2026-06-03" };
  // FastFax narrows to a 14-day incident window — the IA only knows
  // the fax transmissions happened mid-March 2026.
  const fastFaxIncidentRange = { start: "2026-03-08", end: "2026-03-22" };
  // YammerLite was active for ~90 days before the case opened.
  const yammerLiteRange = { start: "2026-03-01", end: "2026-06-03" };

  // ── Structured legal context — Romania / National / DIICOT ─────────
  // Romanian Directorate for Investigating Organized Crime and Terrorism
  // (Direcția de Investigare a Infracțiunilor de Criminalitate Organizată
  // și Terorism — DIICOT). EU eEvidence issuing authority operating under
  // Regulation 2023/1543. Distinct from existing seeds (Greek, Italian,
  // French, Spanish, German, Belgian, Polish, Irish, Portuguese, Swedish)
  // so this case is recognisable on its own in the queue.
  const romania = {
    countryCode: "RO",
    countryName: "Romania",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: romania,
    jurisdictionLevel: "National",
    jurisdictionName: "Bucharest",
  };
  const issuingAuthority = {
    id: "AGY-RO-DIICOT",
    name: "Direcția de Investigare a Infracțiunilor de Criminalitate Organizată și Terorism",
    shortName: "DIICOT",
    aliases: [
      "Romanian Directorate for Investigating Organized Crime and Terrorism",
      "DIICOT Bucharest",
    ],
    country: romania,
    agencyType: "Prosecutor" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@diicot.ro",
  };
  const legalContext: CaseLegalContext = {
    country: romania,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-RO-DIICOT-001",
          name: "Procuror-șef Andreea Ionescu",
          title: "Chief Prosecutor",
          email: "a.ionescu@diicot.ro",
          phone: "+40 21 312 1424",
          role: "Submitter",
          languages: "ro - Romanian, en - English",
          source: "agency",
        },
        notes:
          "LE service-mapping failure demo — IA's Form 1 free-text fields " +
          "include deprecated / typo'd external service names so the " +
          "resolver's unmapped + wrong-account-type paths render.",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: false,
  };

  // ── id1 — Consumer · two unmapped names + one resolved ───────────────
  // "FastFax" is a deprecated fax-retrieval product the prosecutor's
  // template still autocompletes from old casework. "YammerLite" is a
  // typo — Yammer was renamed to Viva Engage in 2023; neither name is in
  // the LE_EXTERNAL_SERVICE_MAP. Both should hit `unmapped-name`.
  const id1: AccountIdentifier = {
    id: genId(),
    value: "case310.unmapped@outlook.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices("eEvidence"),
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: ["FastFax", "YammerLite", "Email"],
    leExternalServiceDates: {
      FastFax: fastFaxIncidentRange,
      YammerLite: yammerLiteRange,
      Email: leDateRange,
    },
    leExternalCategoryRequests: {
      // FastFax — IA wrote three free-text category names + per-item
      // data-type lists. Categories don't match any LENS catalog group
      // (the service itself isn't mapped), so the resolver will surface
      // them as `unmapped-name` at the service level; categories never
      // get a chance to be validated against a non-existent catalog.
      FastFax: [
        {
          groupName: "Transmitted Fax Pages",
          items: [
            "TIFF page images",
            "Cover page metadata",
            "Resolution and pagination details",
          ],
          dateRange: fastFaxIncidentRange,
        },
        {
          groupName: "Transmission Logs",
          items: [
            "Send timestamp (UTC)",
            "Recipient fax number (E.164)",
            "Transmission status codes",
            "Retry attempts",
          ],
        },
        {
          groupName: "Sender Identifiers",
          items: [
            "Caller-ID number",
            "Sender email address (if email-to-fax relay)",
            "Originating account holder",
          ],
        },
      ],
      // YammerLite — IA wrote a four-category breakdown that mirrors the
      // way Microsoft 365 Yammer (now Viva Engage) used to expose data
      // in compliance exports. Categories and data types are LE's
      // verbatim text — they're not validated against the LENS catalog.
      YammerLite: [
        {
          groupName: "Group Posts",
          items: [
            "Post body text",
            "Author user-id",
            "Reactions (emoji + count)",
            "Edit history",
          ],
        },
        {
          groupName: "Direct Messages",
          items: [
            "Message body text",
            "Sender / recipient user-ids",
            "Sent timestamp (UTC)",
            "Read receipts",
          ],
        },
        {
          groupName: "Member List",
          items: [
            "Email address",
            "Group role (member / admin)",
            "Joined-at timestamp",
          ],
        },
        {
          groupName: "File Attachments",
          items: [
            "File name",
            "MIME type",
            "Storage URL / blob reference",
            "Uploader user-id",
          ],
        },
      ],
      // Email — canonical name, resolves to exchangeConsumer. Categories
      // are well-formed and will validate cleanly against the LENS
      // exchangeConsumer category groups.
      Email: [
        {
          groupName: "Subscriber Information",
          items: [
            "Display name",
            "Primary alias",
            "Account creation date",
            "Recovery contact (phone / secondary email)",
          ],
        },
        {
          groupName: "Message Headers",
          items: [
            "From / To / Cc / Bcc",
            "Subject line",
            "Sent + received timestamps",
            "Message-ID + In-Reply-To",
          ],
        },
        {
          groupName: "Message Body",
          items: [
            "Body text (plain + HTML)",
            "Inline attachments",
            "Email signatures",
          ],
        },
      ],
    },
    issuingAuthorityNotes:
      "Form 1 free-text Services field listed three services with category " +
      "breakdowns:\n" +
      "  • FastFax (deprecated 2024) — 3 categories spanning fax pages, " +
      "transmission logs, sender identifiers; date window Mar 8–22 2026.\n" +
      "  • YammerLite (typo — Yammer was rebranded to Viva Engage in 2023) " +
      "— 4 categories spanning group posts, DMs, member list, file " +
      "attachments; date window Mar 1 – Jun 3 2026.\n" +
      "  • Email (canonical) — 3 categories (subscriber, headers, body); " +
      "full case window Feb 1 – Jun 3 2026.\n" +
      "Email resolves to exchangeConsumer; FastFax + YammerLite are " +
      "unmapped — the IA either pulled them from outdated casework " +
      "templates or made transcription errors.",
  } as any;

  // ── id2 — Consumer · SharePoint requested on a Consumer identifier ──
  // SharePoint is Enterprise-only per LE_EXTERNAL_SERVICE_MAP. The IA
  // probably saw the subject's SharePoint share-link in the seizure and
  // wrote "SharePoint" in the Services field without realising it's an
  // Enterprise-only product. Resolver should return `wrong-account-type`
  // with supportedAccountTypes: ["Enterprise"].
  const id2: AccountIdentifier = {
    id: genId(),
    value: "case310.wrongtype@hotmail.com",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices("eEvidence"),
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: ["SharePoint", "Email"],
    leExternalServiceDates: {
      SharePoint: leDateRange,
      Email: leDateRange,
    },
    leExternalCategoryRequests: {
      // SharePoint — Enterprise-only product. Categories are well-formed
      // (mirror real M365 SharePoint compliance exports) but the service
      // itself fails the wrong-account-type check on a Consumer ID, so
      // the categories never get walked downstream.
      SharePoint: [
        {
          groupName: "Site Contents",
          items: [
            "Document libraries",
            "Page contents",
            "File version history",
            "Permission inheritance",
          ],
        },
        {
          groupName: "User Activity Logs",
          items: [
            "Page-view events",
            "Download events",
            "Share-link creation events",
            "External-share recipients",
          ],
        },
        {
          groupName: "Site Subscriber Metadata",
          items: [
            "Site administrators",
            "Site collection ID",
            "Creation date",
          ],
        },
      ],
      Email: [
        {
          groupName: "Subscriber Information",
          items: [
            "Display name",
            "Primary alias",
            "Account creation date",
          ],
        },
        {
          groupName: "Message Headers",
          items: [
            "From / To / Cc / Bcc",
            "Subject line",
            "Sent + received timestamps",
          ],
        },
        {
          groupName: "Message Body",
          items: [
            "Body text (plain + HTML)",
            "Inline attachments",
          ],
        },
      ],
    },
    issuingAuthorityNotes:
      "Form 1 listed SharePoint against a Consumer identifier — IA cited " +
      "three categories (Site Contents, User Activity Logs, Site Subscriber " +
      "Metadata) drawing from M365 SharePoint compliance-export terminology. " +
      "SharePoint is Enterprise-only in the LENS catalog; the resolver " +
      "should refuse the service mapping (`wrong-account-type`) and surface " +
      "the supportedAccountTypes hint. Email resolves to exchangeConsumer.",
  } as any;

  // ── id3 — Enterprise · XBOX/Minecraft requested on an Enterprise ID ─
  // Symmetric wrong-type case. The IA flagged the suspect's Xbox account
  // as a target without realising the company-domain mailbox resolves to
  // an Enterprise tenant. XBOX/Minecraft is Consumer-only per the map.
  // Email still resolves cleanly to exchangeEnterprise.
  const id3: AccountIdentifier = {
    id: genId(),
    value: "case310.entwrong@kontoso.example",
    type: "Email Address",
    taskId: genIdentifierTaskId(),
    taskStatus: "InProgress",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services: createDefaultIdentifierServices("eEvidence"),
    checkAccounts: { accountType: "Enterprise" },
    leExternalServices: ["XBOX/Minecraft", "Email"],
    leExternalServiceDates: {
      "XBOX/Minecraft": leDateRange,
      Email: leDateRange,
    },
    leExternalCategoryRequests: {
      // XBOX/Minecraft — Consumer-only. The categories are well-formed
      // (mirror real Xbox / Minecraft compliance categories) but the
      // resolver refuses on the wrong-account-type ground.
      "XBOX/Minecraft": [
        {
          groupName: "Gamertag Profile",
          items: [
            "Gamertag",
            "Display name",
            "Account creation date",
            "Region setting",
            "Microsoft Account (MSA) link",
          ],
        },
        {
          groupName: "Login History",
          items: [
            "Sign-in timestamp (UTC)",
            "Device type (Xbox Series X/S, PC, Mobile)",
            "Console serial number",
            "Originating IP",
          ],
        },
        {
          groupName: "Game Sessions",
          items: [
            "Title played",
            "Session ID",
            "Session duration",
            "Multiplayer party members",
          ],
        },
        {
          groupName: "Friends & Communications",
          items: [
            "Friends list",
            "Direct messages (text)",
            "Voice chat metadata (no audio)",
          ],
        },
      ],
      Email: [
        {
          groupName: "Subscriber Information",
          items: [
            "Display name",
            "Primary SMTP alias",
            "Account creation date",
            "Mailbox region",
          ],
        },
        {
          groupName: "Message Headers",
          items: [
            "From / To / Cc / Bcc",
            "Subject line",
            "Sent + received timestamps",
            "Message-ID + In-Reply-To",
          ],
        },
        {
          groupName: "Message Body",
          items: [
            "Body text (plain + HTML)",
            "Inline attachments",
            "Calendar invites referenced in-thread",
          ],
        },
      ],
    },
    issuingAuthorityNotes:
      "Form 1 listed XBOX/Minecraft alongside the corporate-domain mailbox. " +
      "IA wrote four categories under XBOX/Minecraft (Gamertag Profile, " +
      "Login History, Game Sessions, Friends & Communications) drawn from " +
      "the public Xbox compliance disclosure pattern. Account check " +
      "resolved the identifier to an Enterprise tenant; XBOX/Minecraft is " +
      "Consumer-only, so the resolver should refuse the mapping while " +
      "Email continues to resolve (→ exchangeEnterprise).",
  } as any;

  return {
    caseId: "LNS-2026-00310",
    createDate,
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    // EPOC ER (Production Order) — the canonical Form 1 free-text path.
    // EPOC PR (Preservation) and EPOC PR Extension use different field
    // sets and don't expose the unmapped-services failure mode the
    // same way.
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "Waiting on Triage",
    rejectionReason: "",
    caseEscalated: false,
    escalationNotes: "",
    // Legacy flat fields (kept for back-compat).
    country: romania.countryName,
    agencyCountryCode: romania.countryCode,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+40 21 312 1424",
    agencyAddress: {
      number: "Bd. Libertății 12-14",
      city: "Bucharest",
      stateProvince: "Sector 5",
      postalCode: "050706",
    },
    legalContext,
    natureOfCrimes: ["Cybercrime", "OtherFinancialCrimeOrFraud"],
    mlat: false,
    additionalCaseInformation:
      "EU eEvidence (Reg. 2023/1543) submission via the Decentralised IT " +
      "System. Demo case for the LE → internal service mapping failure " +
      "paths — IA's Form 1 free-text Services field included a mix of " +
      "deprecated names, typos, and Enterprise-only / Consumer-only " +
      "products requested against the wrong account type. Walk Triage → " +
      "Identifier & Services → Fulfillment Wizard Step 2 to see each " +
      "failure mode render in the LEReviewPanel.",
    caseNumber: "LNS-2026-00310",
    agencyCaseNumber: "DIICOT-2026-CY-0310",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    // ISO 8601 sources used by EPOC Form 3 autofill.
    dateServed: "2026-06-03",
    dateReceived: "2026-06-03",
    dateOfIssuance: "2026-06-01",
    dateOfTransmission: "2026-06-03",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-diicot1`,
        name: "Procuror-șef Andreea Ionescu",
        title: "Chief Prosecutor",
        email: "a.ionescu@diicot.ro",
        phone: "+40 21 312 1424",
        role: "Submitter",
        languages: "ro - Romanian, en - English",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-09-03"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "European Production Order Certificate (EPOC) issued under Regulation " +
      "(EU) 2023/1543 by DIICOT for an active organised cybercrime / financial " +
      "fraud investigation. Authorises production of subscriber, traffic, and " +
      "content data for identified Microsoft accounts. The IA's Form 1 " +
      "Services field includes free-text entries that the LENS resolver " +
      "cannot map; this case is used to verify the unmapped + wrong-account-" +
      "type UX surfaces end-to-end.",
    approvalReferenceNumber: "EPOC-RO-DIICOT-2026-0310",
    approverName: "Procuror-șef Andreea Ionescu",
    approverRole: "Chief Prosecutor",
    approvalTimestamp: new Date("2026-06-01T08:30:00"),
    approvalIsEmergency: false,
    approverEmail: "a.ionescu@diicot.ro",
    approverPhoneNumber: "+40 21 312 1424",
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
    timeZone: "Europe/Bucharest (EET/EEST)",
    notes: [
      {
        id: `note-${Date.now().toString(36)}-diicot1`,
        content:
          "LE service-mapping failure demo (Romanian EPOC). Each identifier " +
          "exercises a different resolver failure mode triggered by Form 1's " +
          "free-text Services field:\n" +
          "  • id1 (Consumer): FastFax + YammerLite → unmapped-name; Email → resolved.\n" +
          "  • id2 (Consumer): SharePoint → wrong-account-type (Enterprise-only); Email → resolved.\n" +
          "  • id3 (Enterprise): XBOX/Minecraft → wrong-account-type (Consumer-only); Email → resolved.\n" +
          "Walk Triage → Identifier & Services → Fulfillment Wizard Step 2 to " +
          "verify each failure mode renders the expected chip.",
        createdBy: "Nicole Garcia",
        createdAt: createDate,
      },
    ],

    // ── eEvidence-specific structured envelope blocks ─────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-RO-DIICOT-001",
      name: "Direcția de Investigare a Infracțiunilor de Criminalitate Organizată și Terorism",
      issuingAuthorityRole: "Public Prosecutor's Office (DIICOT)",
      country: romania,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: [
        "EPOC-RO-DIICOT-2026-0310",
        "DIICOT-2026-CY-0310",
      ],
      approver: {
        name: "Procuror-șef Andreea Ionescu",
        address:
          "Bd. Libertății 12-14\n050706 Bucharest, Sector 5\nRomania",
        tel: "+40 21 312 1424",
        fax: "+40 21 312 1499",
        email: "a.ionescu@diicot.ro",
        languagesSpoken: "ro - Romanian, en - English",
      },
    },
  };
}
