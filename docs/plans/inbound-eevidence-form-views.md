# Inbound eEvidence Form Views

**Status:** Phases 1–3 implemented (prototype)
**Owner:** DARS eEvidence
**Last updated:** 2026-06-15

## Goal

Let users review the **inbound forms the IA (and, later, EA) submit** to Microsoft as the *legal demand* for an eEvidence case, via the existing **open-docs / review-legal-demands** surfaces — rendered as a completed form populated from the ETSI API fields the authority submitted.

- **EPOC-ER (production)** case → render **EPOC Form 1 — Production Order**.
- **EPOC-PR (preservation)** case → render **EPOC Form 2 — Preservation Order**.

For eEvidence cases these EPOC forms ARE the legal-demand equivalent (vs. the warrant / subpoena / NDO documents used for non-eEvidence request types).

## Scope (v1)

- **Forms:** Form 1 + Form 2 only. (Form 5 / 6 / Withdrawal and EA documents — GFR decision, Form 4 authorization-status update — are deferred.)
- **Surfaces:** a single shared renderer mounted in **both**:
  - RS open-docs **`DocumentViewerPanel`** (Ctrl+Shift+D, in `DataEntryForm`).
  - Attorney **`LegalDemandSnapshot`** pane (in `AttorneyReviewWorkspace`).

## Current state / gap (pre-work)

- The legal-demand surfaces render **static** seed docs (`DEFAULT_AVAILABLE_DOCUMENTS`: warrant / subpoena / NDO) — not the EPOC forms.
- **No `EPOC_FORM_1` template existed** (Forms 2/3/5/6/withdrawal/end-preservation did).
- Inbound EPOC forms only surfaced inside correspondence threads (a "View Form 2" pill → `hydrateInboundInstance` → `FormPreviewPanel`).
- `FormPreviewPanel` is a mature read-only renderer (handles all field types + arrays→bullets) — no renderer work needed.
- The ETSI envelope data already lives on `FormData` (authorities, identifiers, per-identifier services/categories/date ranges, offence, dates, enterprise request, emergency justification).

## Phase 1 — implemented (this change)

1. **`EPOC_FORM_1` template** — `src/config/formTemplates.ts` (registered in `FORM_TEMPLATES`).
   Sections A–K, using only renderer-supported field types; conditional sections (B Validating / C Competent authority, I Enterprise, J Emergency, K Additional info) gated on builder-set control flags (`_hasValidatingAuthority`, `_hasCompetentAuthority`, `_isEnterprise`, `_isEmergency`, `_hasAdditionalInfo`).
2. **`buildLegalDemandInstance(formData)`** — `src/utils/legalDemandForm.ts`.
   Returns a read-only `CaseFormInstance` (status `Signed`, signed by the IA, dated `dateOfIssuance`). Picks Form 1 vs Form 2 by `requestSubType` (`*PR*` → Form 2). Builds `values` directly — pre-formatting the per-identifier services × categories × date ranges into multi-line strings — because the template autofill resolver (`resolveAutofill`) can only walk scalar dot-paths, not the per-identifier arrays.
3. **`LegalDemandFormView`** — `src/components/forms-library/LegalDemandFormView.tsx`.
   Shared component: calls the builder, renders `FormPreviewPanel`, empty-state for non-eEvidence cases. This is the single piece mounted in both surfaces in Phases 2–3.

## Phase 2 — attorney Legal Demand pane (implemented)

`src/components/attorney-escalation/LegalDemandSnapshot.tsx` now reads its `case` prop (already passed as `case={formData}` from `AttorneyReviewWorkspace`) and, when `hasLegalDemandForm(caseData)`, renders `<LegalDemandFormView>` in place of the static warrant/subpoena/NDO docs — keeping the same top bar + "Open in full editor" CTA. Non-eEvidence cases unchanged.

## Phase 3 — RS open-docs viewer (implemented)

`src/components/DocumentViewerPanel.tsx` takes a new `legalDemandFormData` prop (threaded from `DataEntryForm` as `legalDemandFormData={formData}`). When `hasLegalDemandForm(...)`, the panel's content area renders `<LegalDemandFormView>` instead of the static document tabs/selector; the header subtitle adapts. Opened via the Docs toggle / Ctrl+Shift+D. Non-eEvidence cases keep the existing verify/reject document flow.

## Rendering conventions — apply to ALL inbound EPOC form types

These are standing rules for every inbound IA/EA form we render (today Form 1 + Form 2; **apply the same to Form 5, Form 6, Withdrawal, End-of-Preservation, and any future inbound EPOC form** as those types are built):

1. **Read-only "document" styling.** Render via `<FormPreviewPanel variant="legalDemand">` — label as a muted uppercase caption (the form's question) above the IA's answer in a subtly filled, hairline-bordered box (mirrors `authority-details/AuthorityDetailsBlocks.tsx` `ReadOnlyValue` → Fluent `Field` + read-only `Input`).
2. **Full skeleton — show the whole form.** Every section and field is always visible (no `visibleWhen` applicability gates). Anything the IA left blank renders as **"—"** (absence), never hidden. The builder must SET every field (`?? ""` for strings; booleans pass through so `true → Yes`, `false → No`, `undefined → "—"`).
3. **Empty lists show "—" too.** `FormPreviewPanel` treats an empty array as absent (fixed) so list fields (e.g. target identifiers) don't render a blank box.
4. **One field per question.** Don't collapse multiple Q&A pairs into a single summary textarea — each question is its own labeled field so the caption+box styling and the "—" absence marker apply per question.

Implementation pattern to copy: `src/utils/legalDemandForm.ts` (`buildForm1Values` builds a flat values map setting every field) + the `EPOC_FORM_1` template in `formTemplates.ts` (all sections/fields, no `visibleWhen`).

## Verification

Run the app (`npm run dev`, :3001) and confirm completed-form rendering in both surfaces:
- `LNS-2026-00130` (Workflow 1 production) → Form 1.
- `LNS-2026-00215` / `LNS-2026-00220` (preservation) → Form 2.
- A non-eEvidence case (e.g. a subpoena) → still shows the static legal docs.

## Open questions / flags

> **⚠️ Backend contract required — LENS-CMS (production blocker for faithful Form 1).**
> In this prototype, **Form 1 has no raw "as-submitted" ETSI payload** on the case — unlike Forms 2/5/6, which can arrive as correspondence items carrying a `structuredForm.values` bag. The Form 1 view is therefore **derived from the normalized `FormData` envelope**, which is faithful to *what* the IA submitted but is a reconstruction, not a byte-for-byte copy of the WISP/ETSI XML.
>
> **To render the Form 1 document accurately in production we must set up a contract with the LENS-CMS backend** so DARS can retrieve the appropriate raw ETSI fields (per ETSI TS 104 144 Annex I) the IA submitted, and render the legal demand directly from those fields rather than the reconstructed envelope. This includes: the exact authority blocks, the verbatim requested-data/category structure + per-category date ranges, file/reference numbers, and any envelope fields DARS does not currently persist on `FormData`. `LegalDemandFormView` would then point at that retrieved payload; the builder becomes a thin adapter.

- **Form 2 source preference (Phase 2 refinement):** when a Form 2 arrived as an inbound correspondence item, prefer its `structuredForm.values` (authoritative IA submission) over the FormData-derived values. Phase 1 derives from `FormData` for determinism.
- **EA-submitted documents (deferred):** Grounds for Refusal decision and the IA authorization-status ("Form 4") update should also be reviewable as documents in a later pass.
- **Pre-existing type error (unrelated):** `formTemplates.ts` has a pre-existing `outboundDocumentKind: "PreservationAcknowledged"` type error in `EPOC_PRESERVATION_ACK` (not introduced here; part of the repo's existing typecheck baseline).
