/**
 * Mock case data for LNS-2026-00265 — Greek eEvidence EPOC-ER.
 *
 * **Scenario: Form3Response-None-EaOverrulesSp (Workflow chain 2 → 7 → 6).**
 *
 * Greek IA issues an EPOC; case is cross-border. While reviewing, the
 * RS determines Microsoft cannot comply: the target data is held on
 * infrastructure subject to a conflicting US legal order (a gag /
 * non-disclosure regime under 18 U.S.C. § 2705). The RS submits a
 * **Form 3** (Workflow 7 — Non-Execution endpoint, ETSI 6.4) citing
 * `ConflictWithThirdCountryLaw` as the SP's grounds.
 *
 * The Greek EA reviews the Form 3 and **disagrees with the SP's claim**.
 * They reply with `EPOCNoGroundsForRefusalInformation` (ETSI 5.5.4) —
 * the second trigger path per ETSI 5.5.1: "after the Enforcing
 * Authority having received a Form 3 from the Service Provider."
 *
 * Outcome the prototype demonstrates:
 *   - GroundsForRefusalPanel renders the orange "EA rejected your
 *     Form 3 — production required" panel with a "Retract Form 3" CTA.
 *   - Panel header carries the trigger badge "Reviewing Form 3 · {id}"
 *     so the conversation context is immediately visible.
 *   - Clicking Retract Form 3 (Phase B stub) appends a `Form3Retracted`
 *     audit event. (Confirmation dialog + Form 3 status flip lands in
 *     Phase D.)
 *   - Sticky-header chip shows "EA rejected Form 3".
 */

import type {
  AccountIdentifier,
  AttorneyEscalation,
  CaseLegalContext,
  EEvidenceGroundsForRefusal,
  EscalationAuditEvent,
  FormData,
} from "../types/caseTypes";
import type { CaseFormInstance } from "../types/formTemplate";
import { createDefaultIdentifierServices } from "../config/lensServicesConfig";
import { computeSlaDueDate } from "../constants/slaConstants";
import { get as getCorrespondenceForCase } from "../state/correspondenceStore";

const genId = () =>
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function buildLENS202600265FormData(): FormData {
  const createDate = new Date("2026-05-05");
  const dueDate = computeSlaDueDate("Routine", createDate);
  const startDate = new Date("2026-01-20");
  const endDate = new Date("2026-05-02");
  const leDateRange = { start: "2026-01-20", end: "2026-05-02" };

  // ── Form 3 + EA timeline ───────────────────────────────────────────
  // Form 3 was attorney-pre-approved (Sophia Reyes, internal counsel)
  // and sent by Nicole Garcia a few days after the EPOC landed.
  // The EA reviewed the Form 3 and replied with NoGroundsForRefusal,
  // rejecting the SP's claim and triggering the auto-escalation
  // captured below.
  const attorneyPreApprovalAt = new Date("2026-05-09T11:15:00");
  const form3ComposedAt = new Date("2026-05-09T13:42:00");
  const form3SentAt = new Date("2026-05-09T13:45:00");
  // referencedForm3Id == the actual correspondence item ID in
  // mockCorrespondenceSeeds.ts. The GFR Panel + banner read this to
  // surface the Form 3 reference + bubble linkage.
  const form3Id = "corr-gr-form3-out-001";
  const form3InstanceId = "fi-gr-form3-265";
  // EA notified of the Form 3 — restarts a fresh 10-day review window.
  const eaNotifiedAt = new Date("2026-05-09T14:00:00");
  const eaReviewWindowExpiresAt = new Date("2026-05-19T14:00:00");
  const eaDecidedAt = new Date("2026-05-13T16:20:00");
  // Auto-escalation fires immediately when the EA returns NoGFR on a
  // Form 3 response (Phase D Q&A: "Auto-escalate to attorney; require
  // attorney approval before retract").
  const autoEscalatedAt = new Date(eaDecidedAt.getTime() + 5 * 60 * 1000);

  // ── Structured legal context ───────────────────────────────────────
  const greece = {
    countryCode: "GR",
    countryName: "Greece",
    region: "EU" as const,
  };
  const jurisdiction = {
    country: greece,
    jurisdictionLevel: "National",
    jurisdictionName: "Ελληνική Δημοκρατία",
  };
  const issuingAuthority = {
    id: "AGY-GR-PR-ATHINON",
    name: "Εισαγγελία Πρωτοδικών Αθηνών",
    shortName: "Athens Prosecutor",
    aliases: ["Public Prosecutor's Office — Athens"],
    country: greece,
    agencyType: "Prosecutor" as const,
    jurisdiction,
    verificationStatus: "Verified" as const,
    contactDomain: "@eisaggelia.athens.gr",
  };
  const legalContext: CaseLegalContext = {
    country: greece,
    jurisdiction,
    agencies: [
      {
        agency: issuingAuthority,
        role: "IssuingAuthority",
        primaryContact: {
          id: "AGT-GR-PR-001",
          name: "Εισαγγελέας Δημήτρης Παπαδόπουλος",
          title: "Εισαγγελέας Πρωτοδικών",
          email: "d.papadopoulos@eisaggelia.athens.gr",
          phone: "+30 210 925 1234",
          role: "Submitter",
          languages: "el - Greek, en - English",
          source: "agency",
        },
        notes:
          "Greek EPOC-ER (production order). SP submitted Form 3 " +
          "citing ConflictWithThirdCountryLaw; EA reviewed Form 3 and " +
          "rejected the SP's claim (No GFR — production required).",
      },
    ],
    primaryIssuingAuthority: issuingAuthority,
    agencyCountryMatch: true,
    crossBorderFlag: true, // International → EA review applies
  };

  // ── Pre-seeded collection jobs — one job per LE-requested service
  //    (Email · MSA). Consumer services. Mix of automated + manual data
  //    types and lifecycle states.
  const services = createDefaultIdentifierServices() as Record<string, any>;

  function seedJob(
    serviceKey: string,
    groupKey: string,
    itemKey: string,
    jobOverrides: Record<string, unknown>,
  ): boolean {
    const svc = services[serviceKey];
    if (!svc?.categoryGroups?.[groupKey]) return false;
    const group = svc.categoryGroups[groupKey];
    if (!group[itemKey]) return false;
    svc.enabled = true;
    svc.includeConsumerAccount = true;
    group[itemKey] = {
      ...group[itemKey],
      enabled: true,
      ...jobOverrides,
    };
    return true;
  }

  // Job 1 — Email · Content Data · Email Content (automated, mid-pipeline).
  seedJob("exchangeConsumer", "contentData", "genericAttributes", {
    taskId: "TSK-EXC-CON-265-001",
    jobId: "JOB-EXC-CON-265-001",
    collectionStatus: "Complete",
    publishStatus: "Started",
    deliveryStatus: "Not Started",
    collectionStatusUpdatedAt: new Date("2026-05-06T11:30:00"),
    publishStatusUpdatedAt: new Date("2026-05-07T09:15:00"),
  });

  // Job 2 — MSA · Subscriber Data · Basic Billing (manual, terminal).
  seedJob("msaProfile", "subscriberData", "basicBilling", {
    taskId: "TSK-MSA-BIL-265-001",
    jobId: "JOB-MSA-BIL-265-001",
    collectionStatus: "Complete",
    publishStatus: "Complete",
    deliveryStatus: "DeliveryAcknowledged",
    deliveryJobId: "DLV-MSA-BIL-265-001",
    deliveryAcknowledgedAt: new Date("2026-05-08T14:45:00"),
    collectionStatusUpdatedAt: new Date("2026-05-06T12:50:00"),
    publishStatusUpdatedAt: new Date("2026-05-07T15:20:00"),
    deliveryStatusUpdatedAt: new Date("2026-05-08T14:45:00"),
  });

  // ── Target identifier ──────────────────────────────────────────────
  const id1: AccountIdentifier = {
    id: genId(),
    value: "subject.athens@outlook.com",
    type: "Email Address",
    taskId: "LDID-100020",
    // Phase 1 merge — identifier-level AttorneyReview. Auto-escalation
    // path: the Greek EA's NoGFR on the Form 3 triggered attorney
    // review on this identifier. Mirrors the case-level escalation
    // block below.
    taskStatus: "AttorneyReview",
    accountExistenceStatus: "success",
    geoLocation: "Europe - West Europe",
    createdBy: "LE Agency",
    services,
    checkAccounts: { accountType: "Consumer" },
    leExternalServices: ["Email", "Microsoft Account Profile"],
    leExternalServiceDates: {
      Email: leDateRange,
      "Microsoft Account Profile": leDateRange,
    },
    issuingAuthorityNotes:
      "Subject under investigation for cross-border financial fraud. " +
      "Production request for content + subscriber data.",
    attorneyEscalation: {
      role: "Attorney",
      reason:
        "Auto-escalated: Greek EA rejected our Form 3 " +
        "(ConflictWithThirdCountryLaw). Production now risks violating " +
        "U.S. 18 U.S.C. § 2705. Attorney review required before retracting " +
        "and resuming production.",
      escalatedAt: autoEscalatedAt,
      escalatedBy: "System (auto-escalation on EA rejection of Form 3)",
      status: "Pending",
      scope: "all",
      actions: [],
      relatedOutboundIds: [form3Id],
    },
  } as any;

  // ── GFR block — None decision, Form3Response trigger ───────────────
  const eevidenceGroundsForRefusal: EEvidenceGroundsForRefusal = {
    trigger: "Form3Response",
    referencedForm3Id: form3Id,
    notifiedAt: eaNotifiedAt,
    eaReviewWindowExpiresAt,
    ea: {
      name: "Υπουργείο Δικαιοσύνης — Διεύθυνση Διεθνούς Συνεργασίας",
      referenceNumber: "MIN-DIK-2026-NGR-0265",
    },
    decision: {
      kind: "None",
      decidedAt: eaDecidedAt,
      decidedBy: "Διευθύντρια Ελένη Κωνσταντίνου (EA Coordinator)",
      note:
        "Η Εκτελούσα Αρχή εξέτασε τη φόρμα μη εκτέλεσης (Form 3) που " +
        "υπέβαλε ο Πάροχος Υπηρεσίας και διαπιστώνει ότι ο επικαλούμενος " +
        "λόγος σύγκρουσης με νόμο τρίτης χώρας δεν συνιστά λόγο άρνησης " +
        "κατά την έννοια του άρθρου 12 του Καν. (ΕΕ) 2023/1543. Ο " +
        "Πάροχος καλείται να ανακαλέσει τη Φόρμα 3 και να συνεχίσει την " +
        "παραγωγή.",
    },
  };

  // ── Form 3 instance (signed; references the outbound correspondence
  //    item via formInstanceId on `corr-gr-form3-out-001`) ─────────────
  const form3Instance: CaseFormInstance = {
    instanceId: form3InstanceId,
    templateId: "EPOC_FORM_3",
    caseId: "LNS-2026-00265",
    status: "Sent",
    createdAt: form3ComposedAt,
    updatedAt: form3SentAt,
    values: {
      A_certificateType: "EPOC",
      B_issuingAuthority: "Εισαγγελία Πρωτοδικών Αθηνών",
      B_issuingFileNumber: "PR-ATH-2026-EPOC-ER-0265",
      B_dateOfIssue: "2026-05-04",
      B_dateOfReceipt: "2026-05-05",
      B_enforcingAuthority:
        "Υπουργείο Δικαιοσύνης — Διεύθυνση Διεθνούς Συνεργασίας",
      C_addressee: "Microsoft Ireland Operations Limited",
      C_addresseeFileNumber: "LNS-2026-00265",
      D_reasons: ["thirdCountryConflict"],
      D_explanation:
        "Production of the requested subject data would create a " +
        "compliance conflict with U.S. 18 U.S.C. § 2705 (sealed " +
        "court order, non-disclosure regime). Microsoft is unable " +
        "to disclose the same account's records to two authorities " +
        "with conflicting non-disclosure obligations.",
      E_lawTitle:
        "United States — 18 U.S.C. § 2705 (Delayed notice and gag " +
        "orders, Stored Communications Act / SCA)",
      E_statutoryProvision:
        "18 U.S.C. § 2705(b) — A governmental entity acting under " +
        "section 2703 may apply for a court order commanding a " +
        "provider of electronic communications service or remote " +
        "computing service to whom a warrant, subpoena, or court " +
        "order is directed not to notify any other person of the " +
        "existence of the warrant, subpoena, or court order, for " +
        "such period as the court deems appropriate.",
      H_contactName: "Nicole Garcia",
      H_contactEmail: "nicole.garcia@microsoft.com",
    },
  };

  // ── Auto-created attorney escalation (Phase D Q&A) ────────────────
  // EA's NoGFR on a Form3Response triggers attorney review BEFORE the
  // RS can retract. The escalation references the original Form 3
  // outbound via relatedOutboundIds so the Attorney Review panel
  // surfaces it as the artifact under review.
  const attorneyEscalation: AttorneyEscalation = {
    role: "Attorney",
    reason:
      "Auto-escalated: The Greek EA rejected our Form 3 " +
      "(ConflictWithThirdCountryLaw). Production would now expose " +
      "Microsoft to the U.S. 18 U.S.C. § 2705 non-disclosure " +
      "obligation that motivated the original Form 3. Attorney " +
      "review required before retracting + resuming production.",
    escalatedAt: autoEscalatedAt,
    escalatedBy: "System (auto-escalation on EA rejection of Form 3)",
    status: "Pending",
    actions: [],
    relatedOutboundIds: [form3Id],
  };

  // ── Audit thread — pre-approval → Form 3 sent → EA rejected → auto-
  //    escalation. Tells the full story for the AuditThread surface. ─
  const auditEvents: EscalationAuditEvent[] = [
    {
      id: `audit-${createDate.getTime().toString(36)}-1`,
      kind: "Released",
      actor: "Sophia Reyes",
      actorRole: "Attorney",
      performedAt: attorneyPreApprovalAt,
      note:
        "Pre-approved outbound Form 3 (ConflictWithThirdCountryLaw " +
        "claim under U.S. 18 U.S.C. § 2705 non-disclosure regime). " +
        "Released for transmission.",
    },
    {
      id: `audit-${createDate.getTime().toString(36)}-2`,
      kind: "Escalated",
      actor: "Nicole Garcia",
      actorRole: "ResponseSpecialist",
      performedAt: form3SentAt,
      note:
        `Form 3 (${form3Id}) sent to Greek IA via Non-Execution ` +
        "endpoint. SP's claimed grounds: ConflictWithThirdCountryLaw " +
        "(US 18 U.S.C. § 2705 non-disclosure regime conflict).",
    },
    {
      id: `audit-${createDate.getTime().toString(36)}-3`,
      kind: "GfrReceived",
      actor: "System (EA inbound)",
      performedAt: eaDecidedAt,
      note:
        `Greek Enforcing Authority reviewed Form 3 (${form3Id}) and ` +
        "issued No Grounds for Refusal — rejecting the SP's " +
        "non-execution claim. Production required.",
    },
    {
      id: `audit-${createDate.getTime().toString(36)}-4`,
      kind: "Escalated",
      actor: "System (auto-escalation)",
      performedAt: autoEscalatedAt,
      note:
        "Auto-escalated to Attorney: EA's NoGFR on Form3Response " +
        "requires attorney review before retract. Original Form 3 " +
        "cited ConflictWithThirdCountryLaw; production now would " +
        "trigger the U.S. § 2705 conflict the Form 3 anticipated.",
    },
  ];

  return {
    caseId: "LNS-2026-00265",
    createDate,
    assigneeName: "Nicole Garcia",
    requestType: "eEvidence",
    requestSubType: "EPOC ER",
    requestOrigin: "LEAPI",
    requestOriginOther: "",
    otherRequestTypeDescription: "",
    caseStage: "In Progress",
    rejectionReason: "",
    caseEscalated: true,
    escalationNotes:
      "Form 3 submitted citing ConflictWithThirdCountryLaw; EA rejected.",
    country: greece.countryName,
    agencyCountryCode: greece.countryCode,
    jurisdiction: jurisdiction.jurisdictionLevel,
    agency: issuingAuthority.name,
    agencyPhone: "+30 210 925 1234",
    agencyAddress: {
      number: "Λεωφόρος Αλεξάνδρας 5",
      city: "Athens",
      stateProvince: "Attica",
      postalCode: "114 73",
    },
    legalContext,
    natureOfCrimes: ["OtherFinancialCrimeOrFraud", "Cybercrime"],
    mlat: false,
    additionalCaseInformation:
      "Greek EPOC-ER (Workflow chain 2 → 7 → 6). SP submitted Form 3 " +
      "citing conflict with US 18 U.S.C. § 2705 non-disclosure regime. " +
      "EA reviewed the Form 3 (ETSI 5.5.1 second trigger path) and " +
      "rejected the SP's claim by issuing No Grounds for Refusal. " +
      "RS must retract the Form 3 and resume production.",
    caseNumber: "LNS-2026-00265",
    agencyCaseNumber: "PR-ATH-2026-EPOC-ER-0265",
    relatedCaseNumbers: "",
    casePriority: "Routine",
    dateServed: "2026-05-05",
    dateReceived: "2026-05-05",
    dateOfIssuance: "2026-05-04",
    dateOfTransmission: "2026-05-05",
    agents: [
      {
        id: `AGT-${Date.now().toString(36)}-gr1`,
        name: "Εισαγγελέας Δημήτρης Παπαδόπουλος",
        title: "Εισαγγελέας Πρωτοδικών",
        email: "d.papadopoulos@eisaggelia.athens.gr",
        phone: "+30 210 925 1234",
        role: "Submitter",
        languages: "el - Greek, en - English",
        source: "agency",
      },
    ],
    dueDate,
    shieldLawConfirmation: "",
    eu27DsaHarms: [],
    eu27DsaHarmsSubCategories: [],
    authorizationStartDate: startDate,
    authorizationExpirationDate: new Date("2026-08-05"),
    authorizationDesiredStatus: "Approved",
    approvalType: "Judicial",
    approvalDescription:
      "EPOC-ER (European Production Order) issued by the Public " +
      "Prosecutor's Office of Athens.",
    approvalReferenceNumber: "PR-ATH-2026-EPOC-ER-0265",
    approverName: "Ανακριτής Νικόλαος Ιωαννίδης",
    approverRole: "Investigating Judge (Athens First-Instance Court)",
    approvalTimestamp: new Date("2026-05-04T13:00:00"),
    approvalIsEmergency: false,
    approverAlternateName: "Ανακριτής Ν. Ιωαννίδης",
    approverEmail: "anakrites@protodikeio.athens.gr",
    approverPhoneNumber: "+30 210 824 7100",
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
    timeZone: "Europe/Athens (EET/EEST)",
    notes: [],

    // ── eEvidence-only structured envelope blocks ─────────────────────
    eevidenceIssuingAuthority: {
      idNumber: "IA-GR-PR-ATH-001",
      name: "Εισαγγελία Πρωτοδικών Αθηνών",
      issuingAuthorityRole: "Public Prosecutor's Office",
      country: greece,
      approvalRole: "PublicProsecutor",
      approvalReferenceNumbers: ["PR-ATH-2026-EPOC-ER-0265"],
      approver: {
        name: "Ανακριτής Νικόλαος Ιωαννίδης",
        address:
          "Πρώην Σχολή Ευελπίδων\n114 73 Athens\nGreece",
        tel: "+30 210 824 7100",
        fax: "+30 210 824 7101",
        email: "anakrites@protodikeio.athens.gr",
        languagesSpoken: "el - Greek, en - English",
      },
    },
    eevidenceEnforcingAuthority: {
      name: "Υπουργείο Δικαιοσύνης — Διεύθυνση Διεθνούς Συνεργασίας",
      contactName: "Διευθύντρια Ελένη Κωνσταντίνου",
      address:
        "Λεωφόρος Μεσογείων 96\n115 27 Athens\nGreece",
      tel: "+30 213 130 7000",
      fax: "+30 213 130 7001",
      email: "ds@ministryofjustice.gr",
    },
    eevidenceEnterpriseRequest: {
      addressedToController: false,
      addressedToProcessor: false,
    },

    // ── Audit trail ────────────────────────────────────────────────────
    escalationAuditEvents: auditEvents,

    // ── Attorney escalation auto-created on EA rejection of Form 3 ────
    attorneyEscalation,

    // ── Form 3 signed instance (rendered by the FormPreviewPanel when
    //    the RS clicks "View form" on the outbound bubble) ─────────────
    formInstances: [form3Instance],

    // ── Correspondence thread — pulls the mock seed (Form 3 outbound +
    //    EA's GFR-None inbound) so the Correspondence Hub renders the
    //    full conversation, not an empty thread. ────────────────────────
    correspondence: getCorrespondenceForCase("LNS-2026-00265"),

    // ── DARS Phase 2 Appendix F workflow discriminator + GFR block ────
    eevidenceWorkflow: 2,
    isInternational: true,
    eevidenceGroundsForRefusal,
  } as unknown as FormData;
}
