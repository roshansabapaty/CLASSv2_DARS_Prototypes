/**
 * Seed correspondence per case for the prototype.
 *
 * The cross-case notification system needs to know which inbound items are
 * "out there" without forcing every mock case builder to materialise. So
 * this map is the authoritative initial state — it's loaded into the
 * `correspondenceStore` at module init, and mock-case builders read it on
 * demand to populate `FormData.correspondence` when the user opens a case.
 *
 * To add inbound items for additional cases (e.g. UK COPO LNS-2026-00160),
 * extend this map. The store + notifications hook + AppHeader bell will
 * pick the new items up automatically.
 */

import type { CorrespondenceItem } from "../types/correspondence";

// Inline data-URL helpers — let the prototype demonstrate the
// click-to-preview path on attachment chips without any network
// dependency or real file picker. Both the bubble's chip click and the
// in-panel preview dialog render straight from these URLs.
const SUPPLEMENTARY_EVIDENCE_SVG =
  `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">' +
      '<rect width="640" height="420" fill="#faf9f8"/>' +
      '<rect x="20" y="20" width="600" height="50" fill="#0078d4"/>' +
      '<text x="40" y="55" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="22" font-weight="600">' +
      'Supplementary Evidence — Payment-Instrument Scope' +
      '</text>' +
      '<text x="40" y="110" fill="#323130" font-family="Segoe UI, sans-serif" font-size="14">' +
      'Microsoft Response Specialist · 6 May 2026' +
      '</text>' +
      '<line x1="40" y1="130" x2="600" y2="130" stroke="#605e5c" stroke-width="1"/>' +
      '<text x="40" y="170" fill="#323130" font-family="Segoe UI, sans-serif" font-size="14">' +
      'Subject account: cfo@kontoso-de.example' +
      '</text>' +
      '<text x="40" y="195" fill="#323130" font-family="Segoe UI, sans-serif" font-size="14">' +
      'Authorisation window: 1 Jan 2026 – 22 Apr 2026' +
      '</text>' +
      '<text x="40" y="220" fill="#323130" font-family="Segoe UI, sans-serif" font-size="14">' +
      'Payment instruments on record: 2' +
      '</text>' +
      '<text x="40" y="245" fill="#323130" font-family="Segoe UI, sans-serif" font-size="14">' +
      'Linked corporate billing identifiers: 0' +
      '</text>' +
      '<text x="40" y="290" fill="#605e5c" font-family="Segoe UI, sans-serif" font-size="12" font-style="italic">' +
      'Demo attachment — click the chip in the chat thread to view this preview.' +
      '</text>' +
      '<rect x="20" y="20" width="600" height="380" fill="none" stroke="#8a8886" stroke-width="1"/>' +
      '</svg>',
  )}`;
const SUPPLEMENTARY_EVIDENCE_BYTES = SUPPLEMENTARY_EVIDENCE_SVG.length;

const RFI_NOTES_TEXT_URL =
  `data:text/plain;charset=utf-8,${encodeURIComponent(
    'EPOC-DE-FFM-2026-0150 — RFI notes\n' +
      '====================================\n\n' +
      'Subject mailboxes:\n' +
      '  - cfo@kontoso-de.example\n' +
      '  - ceo@kontoso-de.example\n\n' +
      'Open questions for IA:\n' +
      '  1. Scope of payment-instrument metadata (billing ids?)\n' +
      '  2. Time window — mirror EPOC authorisation window?\n\n' +
      'Drafted: 2026-05-06 10:18 CET\n',
  )}`;
const RFI_NOTES_TEXT_BYTES = RFI_NOTES_TEXT_URL.length;

export const MOCK_CORRESPONDENCE_SEEDS: Record<string, CorrespondenceItem[]> = {
  // EU eEvidence demo case — see mockCaseDataLENS202600150.ts for context.
  //
  // Threading shape (for the chat-thread side panel):
  //   • Thread A — Receipt Acknowledgement (single inbound, root)
  //   • Thread B — Scope clarification (single inbound, root)
  //   • Thread C — RequestAdditionalInformation loop:
  //       outbound RFI (root) → inbound ProvideAdditionalInformation reply
  //       linked via `inReplyToId`. Demonstrates the chat-thread side
  //       panel's tab grouping of an outbound + its inbound response.
  "LNS-2026-00150": [
    {
      id: "corr-eu-001",
      caseId: "LNS-2026-00150",
      direction: "Inbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      kind: "Acknowledgement",
      subject: "Receipt confirmation — EPOC-DE-FFM-2026-0150",
      body:
        "Sehr geehrte Damen und Herren,\n\n" +
        "We acknowledge receipt of your case-opening confirmation for the " +
        "European Production Order EPOC-DE-FFM-2026-0150 dated 22 April 2026. " +
        "Please proceed with the production of the requested data within the " +
        "regulatory deadline. Our reference: STA-FFM-ACK-04-2026-0150.\n\n" +
        "Mit freundlichen Grüßen,\n" +
        "Oberstaatsanwältin Anja Becker\n" +
        "Public Prosecutor's Office of Frankfurt am Main",
      createdAt: new Date("2026-04-23T09:15:00"),
    },
    {
      id: "corr-eu-002",
      caseId: "LNS-2026-00150",
      direction: "Inbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      kind: "Text",
      subject: "Clarification — scope of subscriber data request",
      body:
        "Following our review of the original EPOC submission, we would like " +
        "to clarify that the requested subscriber data should include any " +
        "associated payment instrument metadata (last-4 digits and issuer " +
        "country) where present on the account. Content data scope is " +
        "unchanged. Please confirm receipt of this clarification.",
      createdAt: new Date("2026-04-25T14:42:00"),
      followUp: {
        requiredBy: new Date("2026-04-29T17:00:00"),
        note: "Reply to issuing authority confirming scope clarification noted.",
      },
    },
    // Thread C — outbound RFI (root) + inbound PAI reply (linked via
    // inReplyToId). Demonstrates the chat-thread side panel grouping an
    // outbound and its inbound response into a single tab.
    {
      id: "corr-eu-rfi-out-001",
      caseId: "LNS-2026-00150",
      direction: "Outbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      documentKind: "RequestAdditionalInformation",
      subject:
        "Request for Additional Information — payment-instrument metadata scope",
      body:
        "Sehr geehrte Frau Becker,\n\n" +
        "Following your clarification of 25 April regarding payment-instrument " +
        "metadata, we require additional detail before we can release the " +
        "requested data:\n\n" +
        "  1. Confirm whether the payment instrument scope is limited to the " +
        "     two subject mailboxes (cfo@kontoso-de.example, ceo@kontoso-de.example) " +
        "     or extends to any linked corporate billing identifiers held under " +
        "     the same Microsoft 365 tenant (Kontoso GmbH).\n" +
        "  2. Confirm the time window for the payment-instrument metadata. The " +
        "     EPOC's authorisation window is 1 Jan 2026 – 22 Apr 2026; please " +
        "     confirm whether the metadata scope mirrors that window or extends " +
        "     back to account creation.\n\n" +
        "We will hold further production until your reply lands. Per Reg 2023/1543 " +
        "Article 9(6), the IA has 5 days from acknowledgement to provide the " +
        "additional information.\n\n" +
        "Mit freundlichen Grüßen,\n" +
        "Nicole Garcia\n" +
        "Microsoft Response Specialist",
      createdAt: new Date("2026-05-06T10:20:00"),
      // Two demo attachments so the click-to-preview path on the chip
      // can be exercised in the chat thread — one image (inline render)
      // and one text file (renders via the generic preview path).
      attachments: [
        {
          id: "att-eu-rfi-scope-001",
          name: "supplementary-evidence-scope.svg",
          size: SUPPLEMENTARY_EVIDENCE_BYTES,
          type: "image/svg+xml",
          url: SUPPLEMENTARY_EVIDENCE_SVG,
        },
        {
          id: "att-eu-rfi-notes-001",
          name: "rfi-drafting-notes.txt",
          size: RFI_NOTES_TEXT_BYTES,
          type: "text/plain",
          url: RFI_NOTES_TEXT_URL,
        },
      ],
      transmission: {
        status: "Responded",
        sentAt: new Date("2026-05-06T10:20:00"),
        sentBy: "Nicole Garcia",
        deliveredAt: new Date("2026-05-06T10:28:00"),
        deliveryConfirmedBy: "AutoSim",
        acknowledgedAt: new Date("2026-05-06T10:35:00"),
        acknowledgementRef: "STA-FFM-ACK-05-2026-RFI-001",
        respondedAt: new Date("2026-05-08T15:10:00"),
        respondedInboundId: "corr-eu-pai-in-001",
      },
    },
    {
      id: "corr-eu-pai-in-001",
      caseId: "LNS-2026-00150",
      direction: "Inbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      kind: "ProvideAdditionalInformation",
      // Threading: this inbound replies to the outbound above. The chat-
      // thread tab groups them under the RFI root.
      inReplyToId: "corr-eu-rfi-out-001",
      subject:
        "Response to Request for Additional Information — payment metadata scope",
      body:
        "Sehr geehrte Frau Garcia,\n\n" +
        "Bezugnehmend auf Ihre Anfrage vom 6. Mai 2026:\n\n" +
        "  1. Scope: limited to the two named subject mailboxes only " +
        "     (cfo@kontoso-de.example and ceo@kontoso-de.example). No " +
        "     extension to corporate billing identifiers or other tenant " +
        "     payment instruments is required at this stage.\n" +
        "  2. Time window: aligned with the EPOC's authorisation window — " +
        "     1 January 2026 to 22 April 2026 inclusive. No retroactive " +
        "     extension to account creation is required.\n\n" +
        "Please proceed with the production of the payment-instrument " +
        "metadata under this clarified scope. Our reference: STA-FFM-PAI-" +
        "05-2026-0150.\n\n" +
        "Mit freundlichen Grüßen,\n" +
        "Oberstaatsanwältin Anja Becker\n" +
        "Public Prosecutor's Office of Frankfurt am Main",
      createdAt: new Date("2026-05-08T15:10:00"),
    },
  ],

  // Spanish OCA-VA case — see mockCaseDataLENS202600180.ts.
  //
  // Threading shape:
  //   • Thread A — inbound `RequestAdditionalInformation` from the
  //     Audiencia Nacional asking US to clarify our Form 3 response
  //     posture. Renders the inline "Reply with Provide Additional
  //     Information" CTA on the bubble (Gap to demo: bubble Reply CTA
  //     + the composer's PAI auto-attach).
  //   • Thread B — outbound `RequestAdditionalInformation` we sent to
  //     the IA asking about the validating judge's content-data scope
  //     (the question the attorney bounced back to the RS), THEN the
  //     inbound `ProvideAdditionalInformation` reply linked via
  //     `inReplyToId`. The inbound PAI is what triggers the
  //     AwaitingInfoReplyBanner on the case form + the Preview
  //     pane's "ready to resume" pending-action item.
  "LNS-2026-00180": [
    {
      id: "corr-es-rfi-in-001",
      caseId: "LNS-2026-00180",
      direction: "Inbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      kind: "RequestAdditionalInformation",
      subject:
        "Request for clarification — Microsoft response posture before Form 3 decision",
      body:
        "Estimados señores,\n\n" +
        "Following our review of the case file for EPOC reference " +
        "MOSSOS-BCN-2026-CIBER-0180, the Juzgado Central de Instrucción " +
        "requests clarification on two procedural points before we " +
        "consider any response from Microsoft:\n\n" +
        "  1. Confirm whether Microsoft is currently treating the order as " +
        "     addressed to it in its capacity as the service provider " +
        "     (controller) or as the processor of a separate enterprise " +
        "     controller. Our Q1 designation should be unambiguous on this " +
        "     point.\n" +
        "  2. Indicate the timeline within which Microsoft expects to " +
        "     issue either a production response or a Form 3 non-execution " +
        "     response. We need this to coordinate with the requesting " +
        "     officer at the Mossos.\n\n" +
        "Please respond at your earliest convenience. Our reference: " +
        "AN-CI6-2026-RFI-0180.\n\n" +
        "Atentamente,\n" +
        "Letrado de la Administración de Justicia\n" +
        "Juzgado Central de Instrucción nº 6, Audiencia Nacional",
      createdAt: new Date("2026-05-14T08:15:00"),
      followUp: {
        requiredBy: new Date("2026-05-19T17:00:00"),
        note:
          "Reply with Provide Additional Information using the PAI letter " +
          "template — confirm controller posture + Form 3 timeline.",
      },
    },
    // Thread B — RS's outbound RFI to the IA about the validating
    // judge's content-data scope (the question the attorney bounced
    // back). Sent 2026-05-13, after the attorney's
    // `InformationRequested` event (2026-05-12T13:42:00).
    {
      id: "corr-es-rfi-out-001",
      caseId: "LNS-2026-00180",
      direction: "Outbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      documentKind: "RequestAdditionalInformation",
      subject:
        "Request for Additional Information — validating judge's content data scope",
      body:
        "Estimada Magistrada-Jueza Castaño,\n\n" +
        "Further to your validation of EPOC reference " +
        "MOSSOS-BCN-2026-CIBER-0180 (your DJ-AN-2026-0180), we require " +
        "clarification on the scope of the judicial warrant before " +
        "Microsoft can release content data on the named account.\n\n" +
        "Specifically, we ask that you confirm:\n\n" +
        "  1. Whether the validating warrant authorises the extraction of " +
        "     content data (email message bodies, OneDrive document " +
        "     content) in full, or whether it limits Microsoft to the " +
        "     subscriber + traffic-data scope listed in §C of the " +
        "     accompanying EPOC.\n" +
        "  2. The investigative date range within which content data " +
        "     extraction is authorised, if any.\n\n" +
        "Microsoft's outside counsel has flagged this distinction as a " +
        "prerequisite to lawful disclosure. We will hold further " +
        "production until your written clarification lands.\n\n" +
        "Atentamente,\n" +
        "Nicole Garcia\n" +
        "Microsoft Response Specialist\n" +
        "eevidence@microsoft.com",
      createdAt: new Date("2026-05-13T10:05:00"),
      transmission: {
        status: "Responded",
        sentAt: new Date("2026-05-13T10:05:00"),
        sentBy: "Nicole Garcia",
        deliveredAt: new Date("2026-05-13T10:12:00"),
        deliveryConfirmedBy: "AutoSim",
        acknowledgedAt: new Date("2026-05-13T11:30:00"),
        acknowledgementRef: "AN-CI6-2026-ACK-RFI-0180",
        respondedAt: new Date("2026-05-15T09:20:00"),
        respondedInboundId: "corr-es-pai-in-001",
      },
    },
    // Thread B reply — inbound PAI from the Audiencia Nacional with
    // the answer to our RFI. createdAt is AFTER the attorney's
    // `InformationRequested` audit event (2026-05-12T13:42:00) so the
    // `AwaitingInfoReplyBanner` fires on the case form, and the
    // dashboard's Preview pane lists "Authority replied to your
    // information request — ready to resume escalation" in pending
    // actions.
    {
      id: "corr-es-pai-in-001",
      caseId: "LNS-2026-00180",
      direction: "Inbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      kind: "ProvideAdditionalInformation",
      inReplyToId: "corr-es-rfi-out-001",
      subject:
        "Response to Request for Additional Information — validating warrant scope",
      body:
        "Estimada Sra. Garcia,\n\n" +
        "En respuesta a su solicitud de aclaración de 13 de mayo de 2026 " +
        "(DJ-AN-2026-0180):\n\n" +
        "  1. The validating warrant of the Juzgado Central de " +
        "     Instrucción nº 6 (DJ-AN-2026-0180) authorises Microsoft to " +
        "     extract content data — including email message bodies and " +
        "     OneDrive document content — for the named account, under " +
        "     the investigative scope of the underlying EPOC. The " +
        "     warrant is NOT limited to subscriber + traffic-data.\n" +
        "  2. The authorised date range for content data extraction " +
        "     mirrors the EPOC's authorisation window: 1 January 2026 " +
        "     through 10 May 2026, inclusive.\n\n" +
        "We confirm Microsoft may proceed with production under this " +
        "clarified scope. Our reference: AN-CI6-2026-PAI-0180.\n\n" +
        "Atentamente,\n" +
        "Letrado de la Administración de Justicia\n" +
        "Juzgado Central de Instrucción nº 6, Audiencia Nacional",
      createdAt: new Date("2026-05-15T09:20:00"),
    },
  ],

  // German manifest-error case — see mockCaseDataLENS202600190.ts.
  // Seeded with a SENT outbound EPOC Form 3 (Non-Execution Response) that
  // the IA has already acknowledged but has not yet replied to. Per Reg
  // 2023/1543 the IA has 5 days from acknowledgement to issue a reply.
  // Today (2026-05-14) the Form 3 was acknowledged on 2026-05-12, so the
  // queue card surfaces "Form 3 awaiting reply • 3d".
  "LNS-2026-00190": [
    {
      id: "corr-de-form3-out-001",
      caseId: "LNS-2026-00190",
      direction: "Outbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      documentKind: "SignedForm",
      formInstanceId: "fi-de-form3-190",
      subject: "EPOC Form 3 — Non-Execution Response (manifest error)",
      body:
        "Sehr geehrte Damen und Herren,\n\n" +
        "We are unable to execute EPOC reference BKA-WI-2026-CYBER-0190 as " +
        "issued. The Order designates Microsoft as the processor under " +
        "Section g Sub-section D Q2, but the target identifier resolves " +
        "to a Consumer outlook.de account — there is no enterprise " +
        "controller relationship behind it. We are therefore returning a " +
        "Form 3 (Non-Execution Response) citing reason: manifest errors.\n\n" +
        "Please re-issue the EPOC addressed to Microsoft as the controller " +
        "(Section g Sub-section D Q1) if you wish us to proceed.\n\n" +
        "Mit freundlichen Grüßen,\n" +
        "Nicole Garcia\n" +
        "Microsoft Response Specialist",
      createdAt: new Date("2026-05-12T09:00:00"),
      transmission: {
        status: "Acknowledged",
        sentAt: new Date("2026-05-12T09:00:00"),
        sentBy: "Nicole Garcia",
        deliveredAt: new Date("2026-05-12T09:08:00"),
        deliveryConfirmedBy: "AutoSim",
        acknowledgedAt: new Date("2026-05-12T09:16:00"),
        acknowledgementRef: "BKA-WI-ACK-2026-0190-F3",
      },
    },
  ],

  // French controller-notification case — see mockCaseDataLENS202600200.ts.
  // Seeded with an outbound Form 3 the RS composed under the
  // "Attorney Escalation" toggle. The outbound persists as Draft with
  // `pendingAttorneyReview: true`, and the case mock pins its
  // `attorneyEscalation` block to Pending status with this outbound in
  // `relatedOutboundIds`. Queue card surfaces "Attorney review required".
  "LNS-2026-00200": [
    {
      id: "corr-fr-form3-out-001",
      caseId: "LNS-2026-00200",
      direction: "Outbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      documentKind: "SignedForm",
      formInstanceId: "fi-fr-form3-200",
      subject: "EPOC Form 3 — Non-Execution Response (held for attorney)",
      body:
        "Madame, Monsieur,\n\n" +
        "Following our triage of EPOC reference GEND-SR-PARIS-2026-CY-0200, " +
        "we have prepared a Form 3 (Non-Execution Response) on the grounds " +
        "of conflicting controller-notification instructions vs. our " +
        "internal compliance posture for cross-border disclosure under " +
        "Regulation (EU) 2023/1543.\n\n" +
        "This draft is held pending attorney review before transmission. " +
        "The attorney will release, request information, or block the " +
        "outbound from the Attorney Review panel.\n\n" +
        "Cordialement,\n" +
        "Nicole Garcia\n" +
        "Microsoft Response Specialist",
      createdAt: new Date("2026-05-14T08:42:00"),
      transmission: {
        status: "Draft",
        pendingAttorneyReview: true,
      },
    },
  ],

  // Dutch EPOC-PR preservation case — see mockCaseDataLENS202600220.ts.
  // Full lifecycle on this case: Form 2 (preservation order) →
  // Form 5 (production-incoming) → Form 6 (extension) → EndPreservation.
  // Portuguese EPOC-ER — Workflow 8 mid-collection withdrawal demo.
  // Single Withdrawal inbound; on case open the handler cancels pending
  // delivery, starts the 45-day retention clock, flips caseStage to
  // "Withdrawn", and appends EpocWithdrawn audit. See
  // utils/mockCaseDataLENS202600280.ts.
  "LNS-2026-00280": [
    {
      id: "corr-pt-withdrawal-001",
      documentId: "IA-LNS-2026-00280-IN-01",
      caseId: "LNS-2026-00280",
      direction: "Inbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      kind: "Withdrawal",
      subject:
        "EPOC Withdrawal Notice — DIAP-2026-EPOC-ER-0280",
      body:
        "Exmos. Senhores,\n\n" +
        "Nos termos do artigo 9.º, n.º 7 do Regulamento (UE) 2023/1543, " +
        "o Ministério Público — Departamento de Investigação e Ação " +
        "Penal de Lisboa procede à retirada do EPOC com a referência " +
        "DIAP-2026-EPOC-ER-0280, com efeitos a 20 de maio de 2026.\n\n" +
        "A queixa-crime subjacente foi retirada pelo queixoso na " +
        "presente data; o procedimento criminal foi arquivado e a " +
        "presente ordem deixa de ter sustentação legal.\n\n" +
        "Solicita-se ao prestador de serviços que cesse imediatamente " +
        "qualquer entrega pendente e proceda à eliminação dos dados " +
        "preservados ou recolhidos no prazo de 45 dias.\n\n" +
        "Com os melhores cumprimentos,\n" +
        "Procurador Adjunto Ricardo Almeida\n" +
        "Ministério Público — DIAP Lisboa",
      createdAt: new Date("2026-05-20T10:00:00"),
      structuredForm: {
        templateId: "EPOC_WITHDRAWAL",
        values: {
          A_issuingAuthority:
            "Ministério Público — DIAP Lisboa (Portugal)",
          A_issuingFileNumber: "DIAP-2026-EPOC-ER-0280",
          A_dateOfWithdrawal: "2026-05-20",
          B_originalEpocReference: "DIAP-2026-EPOC-ER-0280",
          B_originalEpocType: "EPOC_ER",
          // Anchors the 45-day retention clock. 7 days ago → ~38 days
          // remaining when the case opens today.
          C_effectiveDate: "2026-05-20",
          C_withdrawalReason:
            "Complainant rescinded the underlying criminal complaint; " +
            "the proceeding was archived and the order no longer has " +
            "legal foundation.",
          issuingAuthorityName:
            "Ministério Público — DIAP Lisboa (Portugal)",
        },
      },
    },
  ],

  // Spanish EPOC-PR — Workflow 4 active preservation demo.
  // Single Form 2 inbound; the PreservationOrderActiveBanner renders
  // with the "Acknowledge Receipt" CTA. No extensions, no end yet.
  "LNS-2026-00215": [
    {
      id: "corr-es-form2-001",
      documentId: "IA-LNS-2026-00215-IN-01",
      caseId: "LNS-2026-00215",
      direction: "Inbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      kind: "PreservationOrder",
      subject:
        "Form 2 — Preservation Order (EPOC-PR) AN-2026-EPOC-PR-0215",
      body:
        "Estimados señores,\n\n" +
        "De conformidad con el artículo 6 del Reglamento (UE) 2023/1543, " +
        "la Audiencia Nacional — Juzgado Central de Instrucción emite " +
        "la presente Orden de Conservación (EPOC-PR) con referencia " +
        "AN-2026-EPOC-PR-0215. El prestador de servicios deberá " +
        "conservar los datos identificados en la orden hasta el 25 de " +
        "noviembre de 2026 (vencimiento inicial), a la espera de la " +
        "emisión de una orden de producción europea de seguimiento.\n\n" +
        "Sírvase confirmar la recepción y el inicio de la conservación.\n\n" +
        "Atentamente,\n" +
        "Magistrado Juan Carlos Martínez\n" +
        "Audiencia Nacional — Juzgado Central de Instrucción",
      createdAt: new Date("2026-05-25T10:00:00"),
      structuredForm: {
        templateId: "EPOC_FORM_2",
        values: {
          A_issuingAuthority:
            "Audiencia Nacional — Juzgado Central de Instrucción (Spain)",
          A_issuingFileNumber: "AN-2026-EPOC-PR-0215",
          A_dateOfIssue: "2026-05-24",
          B_preservationOrderReference: "AN-2026-EPOC-PR-0215",
          B_preservationDuration:
            "6 months from issuance (extensible per Art. 6).",
          B_initialPreservationExpiration: "2026-11-25",
          C_offenceCategory:
            "Organised-crime investigation; suspect implicated in " +
            "a transnational financial-fraud network.",
          C_dataDescription:
            "Subscriber + content data for the targeted Microsoft " +
            "consumer identifier within the EPOC's date window.",
          issuingAuthorityName:
            "Audiencia Nacional — Juzgado Central de Instrucción (Spain)",
        },
      },
    },
  ],

  "LNS-2026-00220": [
    // Form 2 — original preservation order. The inbound-event handler
    // appends the PreservationOrderReceived audit on case open so the
    // audit log captures the start of the obligation. The
    // PreservationOrderActiveBanner self-hides because EndPreservation
    // (below) has fired terminally for this lifecycle demo case — see
    // LNS-2026-00215 for the active-banner demo.
    {
      id: "corr-nl-form2-001",
      documentId: "IA-LNS-2026-00220-IN-01",
      caseId: "LNS-2026-00220",
      direction: "Inbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      kind: "PreservationOrder",
      subject:
        "Form 2 — Preservation Order (EPOC-PR) OM-LP-2026-EPOC-PR-0220",
      body:
        "Geachte heer/mevrouw,\n\n" +
        "Pursuant to Regulation (EU) 2023/1543 Article 6, the Openbaar " +
        "Ministerie — Landelijk Parket hereby issues a Preservation " +
        "Order (EPOC-PR) under reference OM-LP-2026-EPOC-PR-0220. The " +
        "service provider is required to preserve the data identified " +
        "in the order until 14 November 2026 (initial expiration), " +
        "pending the issuance of a follow-on European Production Order " +
        "or further notice from this office.\n\n" +
        "Please confirm receipt and the commencement of preservation.\n\n" +
        "Met vriendelijke groet,\n" +
        "Officier van Justitie Joost van der Velde\n" +
        "Openbaar Ministerie — Landelijk Parket",
      createdAt: new Date("2026-05-08T09:30:00"),
      structuredForm: {
        templateId: "EPOC_FORM_2",
        values: {
          A_issuingAuthority:
            "Openbaar Ministerie — Landelijk Parket (Netherlands)",
          A_issuingFileNumber: "OM-LP-2026-EPOC-PR-0220",
          A_dateOfIssue: "2026-05-08",
          B_preservationOrderReference: "OM-LP-2026-EPOC-PR-0220",
          B_preservationDuration:
            "6 months from issuance (extensible per Art. 6).",
          B_initialPreservationExpiration: "2026-11-14",
          C_offenceCategory:
            "Organised cybercrime investigation; suspect's accounts " +
            "implicated in a coordinated phishing campaign targeting " +
            "Dutch financial institutions.",
          C_dataDescription:
            "Subscriber data, authentication logs, traffic data, and " +
            "content data for the targeted Microsoft consumer + " +
            "enterprise identifiers.",
          issuingAuthorityName:
            "Openbaar Ministerie — Landelijk Parket (Netherlands)",
        },
      },
    },
    {
      id: "corr-nl-form5-001",
      caseId: "LNS-2026-00220",
      direction: "Inbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      kind: "Form5_ConfirmationOfIssuance",
      subject:
        "Form 5 — Confirmation of Issuance of EPOC (production order to follow)",
      body:
        "Geachte heer/mevrouw,\n\n" +
        "Pursuant to Regulation (EU) 2023/1543 Article 7(5), the Openbaar " +
        "Ministerie — Landelijk Parket confirms that a European Production " +
        "Order (EPOC) will be issued against the data preserved under our " +
        "Preservation Order reference OM-LP-2026-EPOC-PR-0220 (your case " +
        "LNS-2026-00220).\n\n" +
        "The follow-on EPOC has been transmitted via the Decentralised IT " +
        "System on 14 May 2026 under our reference OM-LP-2026-EPOC-ER-0230.\n\n" +
        "Please continue to preserve the data under the existing PR until " +
        "the production order is executed and confirm receipt of this Form 5.\n\n" +
        "Met vriendelijke groet,\n" +
        "Officier van Justitie Joost van der Velde\n" +
        "Openbaar Ministerie — Landelijk Parket",
      createdAt: new Date("2026-05-14T08:30:00"),
      followUp: {
        requiredBy: new Date("2026-05-16T17:00:00"),
        note:
          "Acknowledge Form 5 receipt; confirm linkage to the incoming " +
          "EPOC-ER (LNS-2026-00230) once it lands in the queue.",
      },
      // Structured payload behind the inbound. Drives the "View authority
      // form" pill on the bubble — clicking opens the EPOC Form 5
      // renderer with these values hydrated as a synthetic instance.
      structuredForm: {
        templateId: "EPOC_FORM_5",
        values: {
          A_issuingAuthority:
            "Openbaar Ministerie — Landelijk Parket (Netherlands)",
          A_issuingFileNumber: "OM-LP-2026-EPOC-PR-0220",
          A_dateOfIssue: "2026-05-14",
          B_preservationOrderReference: "OM-LP-2026-EPOC-PR-0220",
          B_preservationServiceProviderRef: "LNS-2026-00220",
          C_followOnEpocReference: "OM-LP-2026-EPOC-ER-0230",
          C_followOnTransmissionDate: "2026-05-14",
          D_continuePreservation: true,
          D_acknowledgementRequest:
            "Please acknowledge receipt of this Form 5 within 5 business " +
            "days and confirm continued preservation of the data under " +
            "the existing Preservation Order until the follow-on EPOC " +
            "(OM-LP-2026-EPOC-ER-0230) is executed.",
        },
      },
    },
    // Form 6 — Preservation Extension. Roughly a month after Form 5,
    // the IA's trial schedule slipped and they extend preservation
    // case-wide to 2027-08-14. The inbound-event handler picks this up
    // on case open and bumps every identifier's preservation expiry
    // to the new date (idempotent — re-mounting the case does not
    // re-apply because the audit log carries the documentId).
    //
    // Demo sequence on this case: Form 5 (production-incoming) → Form 6
    // (extension) → EndPreservation (obligation closes, retention clock
    // starts). The EndPreservation seed below is deliberately back-dated
    // to a recent past date so the RetentionClockChip lands in an amber
    // urgency state on case open.
    {
      id: "corr-nl-form6-001",
      documentId: "IA-LNS-2026-00220-IN-02",
      caseId: "LNS-2026-00220",
      direction: "Inbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      kind: "PreservationExtension",
      subject:
        "Form 6 — Preservation Extension (revised expiry 14 August 2027)",
      body:
        "Geachte heer/mevrouw,\n\n" +
        "Pursuant to Regulation (EU) 2023/1543 Article 6, the Openbaar " +
        "Ministerie — Landelijk Parket hereby extends the preservation " +
        "obligation imposed by our Preservation Order " +
        "OM-LP-2026-EPOC-PR-0220 (your case LNS-2026-00220).\n\n" +
        "Revised preservation expiration: 14 August 2027.\n\n" +
        "Reason: the related criminal proceedings have been continued by " +
        "the investigating magistrate; additional witness depositions are " +
        "scheduled through Q2 2027 and the follow-on production order may " +
        "issue late in that window.\n\n" +
        "Please confirm that the revised expiration has been applied to " +
        "all identifiers under the preservation order.\n\n" +
        "Met vriendelijke groet,\n" +
        "Officier van Justitie Joost van der Velde\n" +
        "Openbaar Ministerie — Landelijk Parket",
      createdAt: new Date("2026-06-15T10:00:00"),
      followUp: {
        requiredBy: new Date("2026-06-17T17:00:00"),
        note:
          "Confirm extension applied to both identifiers and reply to the " +
          "IA with the updated retention expiry.",
      },
      structuredForm: {
        templateId: "EPOC_FORM_6",
        values: {
          // Required by the handler. ISO-8601 date-only.
          extendedPreservationExpiration: "2027-08-14",
          // Omitted identifierIds → case-wide extension. Handler applies
          // to every identifier on the case.
          extensionReason:
            "Related criminal proceedings continued by the investigating " +
            "magistrate; additional witness depositions scheduled through " +
            "Q2 2027.",
          issuingAuthorityName:
            "Openbaar Ministerie — Landelijk Parket (Netherlands)",
          A_issuingAuthority:
            "Openbaar Ministerie — Landelijk Parket (Netherlands)",
          A_issuingFileNumber: "OM-LP-2026-EPOC-PR-0220",
          A_dateOfIssue: "2026-06-15",
          B_preservationOrderReference: "OM-LP-2026-EPOC-PR-0220",
          B_preservationServiceProviderRef: "LNS-2026-00220",
        },
      },
    },
    // EndPreservation — IA closes the preservation obligation. The
    // inbound-event handler fires on case open: starts the 45-day
    // retention clock anchored to the IA's `preservationEndDate`,
    // appends a "PreservationEnded" audit event, and surfaces the
    // EndPreservationBanner + RetentionClockChip.
    //
    // Date stylised for demo signal — `preservationEndDate` is set 15
    // days in the past so the chip lands in an amber urgency state
    // (~30 days remaining) when the case opens.
    {
      id: "corr-nl-endpres-001",
      documentId: "IA-LNS-2026-00220-IN-03",
      caseId: "LNS-2026-00220",
      direction: "Inbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      kind: "EndPreservation",
      subject: "End of Preservation — preservation obligation closed",
      body:
        "Geachte heer/mevrouw,\n\n" +
        "Pursuant to Regulation (EU) 2023/1543, the Openbaar Ministerie — " +
        "Landelijk Parket hereby notifies you that the preservation " +
        "obligation imposed by our Preservation Order " +
        "OM-LP-2026-EPOC-PR-0220 (your case LNS-2026-00220) is concluded " +
        "effective 12 May 2026.\n\n" +
        "Reason: the related criminal investigation has been closed; the " +
        "follow-on production order will not issue.\n\n" +
        "In accordance with Article 6(7) of the Regulation, Microsoft may " +
        "retain the preserved data for no longer than 45 days from the " +
        "effective date of this notice. After 26 June 2026 the data must " +
        "be deleted.\n\n" +
        "Met vriendelijke groet,\n" +
        "Officier van Justitie Joost van der Velde\n" +
        "Openbaar Ministerie — Landelijk Parket",
      createdAt: new Date("2026-05-12T11:30:00"),
      structuredForm: {
        templateId: "EPOC_END_PRESERVATION",
        values: {
          // Optional — falls back to createdAt when absent. Anchors the
          // 45-day retention clock.
          preservationEndDate: "2026-05-12",
          endReason:
            "Related criminal investigation closed; follow-on production " +
            "order will not issue.",
          issuingAuthorityName:
            "Openbaar Ministerie — Landelijk Parket (Netherlands)",
          A_issuingAuthority:
            "Openbaar Ministerie — Landelijk Parket (Netherlands)",
          A_issuingFileNumber: "OM-LP-2026-EPOC-PR-0220",
          A_dateOfIssue: "2026-05-12",
          B_preservationOrderReference: "OM-LP-2026-EPOC-PR-0220",
          B_preservationServiceProviderRef: "LNS-2026-00220",
        },
      },
    },
  ],

  // Greek eEvidence case — Form3Response-None-EaOverrulesSp scenario.
  // The thread tells the whole story:
  //   1. SP-side Form 3 outbound (Sent, attorney-pre-approved) citing
  //      ConflictWithThirdCountryLaw — composed by Nicole Garcia.
  //   2. EA's inbound GroundsForRefusal message (NoGroundsForRefusal),
  //      rejecting the SP's claim and requiring production.
  // See mockCaseDataLENS202600265.ts for the GFR block + the
  // auto-created attorney escalation that gates the Retract CTA.
  "LNS-2026-00265": [
    {
      id: "corr-gr-form3-out-001",
      caseId: "LNS-2026-00265",
      direction: "Outbound",
      counterparty: "IssuingAuthority",
      channel: "DecentralisedITSystem",
      documentKind: "SignedForm",
      formInstanceId: "fi-gr-form3-265",
      subject: "EPOC Form 3 — Non-Execution Response (Conflict with third-country law)",
      body:
        "Αξιότιμοι κύριοι/κυρίες,\n\n" +
        "In response to EPOC reference PR-ATH-2026-EPOC-ER-0265, " +
        "Microsoft is unable to execute the order in its current form. " +
        "Production of the requested subject data would create a " +
        "compliance conflict with U.S. 18 U.S.C. § 2705 (non-disclosure " +
        "/ gag-order regime) under which a sealed federal court order " +
        "currently restricts disclosure of the same account's records.\n\n" +
        "Per Reg. (EU) 2023/1543 Art. 12(1)(b), we hereby submit a " +
        "Form 3 declaring conflicting obligations arising from the law " +
        "of a third country (United States). Sections D and E of the " +
        "attached signed Form 3 capture the legal grounds, the " +
        "third-country statutory provisions, and the timeline of the " +
        "U.S. order.\n\n" +
        "The Form 3 was reviewed and released by Microsoft Counsel " +
        "(Sophia Reyes) prior to transmission.\n\n" +
        "Sincerely,\n" +
        "Nicole Garcia\n" +
        "Microsoft Response Specialist",
      createdAt: new Date("2026-05-09T13:42:00"),
      transmission: {
        status: "Sent",
        sentAt: new Date("2026-05-09T13:45:00"),
        sentBy: "Nicole Garcia",
        deliveredAt: new Date("2026-05-09T13:46:18"),
        deliveryConfirmedBy: "AutoSim",
        acknowledgedAt: new Date("2026-05-09T13:50:42"),
        acknowledgementRef: "EISAG-PR-ATH-2026-ACK-7791",
      },
    },
    {
      id: "corr-gr-gfr-in-001",
      caseId: "LNS-2026-00265",
      direction: "Inbound",
      counterparty: "EnforcingAuthority",
      channel: "DecentralisedITSystem",
      kind: "GroundsForRefusal",
      inReplyToId: "corr-gr-form3-out-001",
      subject: "Grounds for Refusal — No grounds (review of Form 3)",
      body:
        "Κύριε/Κυρία,\n\n" +
        "Η Εκτελούσα Αρχή εξέτασε τη Φόρμα 3 που υποβλήθηκε από τον " +
        "Πάροχο Υπηρεσίας (αρ. αναφ. PR-ATH-2026-EPOC-ER-0265) και " +
        "διαπιστώνει ότι ο επικαλούμενος λόγος σύγκρουσης με νόμο τρίτης " +
        "χώρας δεν συνιστά λόγο άρνησης κατά την έννοια του άρθρου 12 " +
        "του Καν. (ΕΕ) 2023/1543.\n\n" +
        "Σύμφωνα με το ETSI TS 104 144 Clause 5.5.4, εκδίδεται " +
        "EPOCNoGroundsForRefusalInformation. Ο Πάροχος καλείται να " +
        "ανακαλέσει τη Φόρμα 3 και να συνεχίσει την παραγωγή στο " +
        "πλαίσιο του αρχικού EPOC.\n\n" +
        "Με εκτίμηση,\n" +
        "Διευθύντρια Ελένη Κωνσταντίνου\n" +
        "Υπουργείο Δικαιοσύνης — Διεύθυνση Διεθνούς Συνεργασίας",
      createdAt: new Date("2026-05-13T16:20:00"),
      readAt: undefined,
    },
  ],
};
