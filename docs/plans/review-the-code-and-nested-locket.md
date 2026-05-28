# Plan — Reduce vertical space on Enterprise Request card (Phase 1)

## Context

The **Enterprise Request** card (ETSI UnderlyingConditions — IA-provided addressed-to flow + Microsoft notification obligation) is mounted as the first card under **Step 4 — Identifier & Data Services** of the case form. Today it consumes ~300px of vertical space even when only two checkbox rows + the always-rendered Notification Details nested section are showing, dominating the step before the user reaches the identifier list.

The card is also stylistically inconsistent with its sibling **Authorization Details** card on the Sender Authority step: it uses Fluent v9 `Subtitle2 / Body1 / Caption1` typography on top of `makeStyles` design tokens, while Authorization Details uses Tailwind `text-xl / text-sm font-semibold` with hex colours. The two cards sit one step apart in the same form and should feel like one product.

**Phase 1 goal**: tighten typography + spacing to bring this card's information density in line with Authorization Details, *without* removing any IA-provided answer rows or restructuring the data. Subsequent phases (column-header relocation, two-up grid layout, nested-section flattening) can be evaluated once Phase 1 lands.

**File to modify** (single file change):
- [src/components/enterprise-request/EnterpriseRequestCard.tsx](c:/R/DARS_eEvidence/src/components/enterprise-request/EnterpriseRequestCard.tsx)

---

## Reference — Authorization Details typography baseline

From [src/components/tabs/SenderAuthorityTab.tsx](c:/R/DARS_eEvidence/src/components/tabs/SenderAuthorityTab.tsx):

| Element | Authorization Details | Today's Enterprise Request |
|---|---|---|
| Card title | `<h3 className="text-xl font-semibold text-[#323130]">` (20px) | `<Subtitle2>` (16px) |
| Field label | `<Label className="text-sm font-semibold text-[#323130]">` (14px semibold) | `<Body1>` + `fontWeightSemibold` (14px semibold) — already aligned |
| Helper / caption | `text-xs text-[#605e5c]` (12px) | `Caption1` (12px) — already aligned |
| Body / value text | `text-[#323130]` (14px regular) | `Body1` (14px regular) — already aligned |

Net: the **field-level typography is already a near-match**. The remaining gap is at the **card title** (16px Fluent vs 20px Tailwind) and the use of an additional descriptive `Caption1` subtitle under the title — which Authorization Details does not have.

---

## Phase 1 — three changes, single file

### 1. Card-title typography alignment

Replace the `Subtitle2` title with a styled `h3` so it matches Authorization Details exactly:

```jsx
// Before
<div className={styles.header}>
  <Subtitle2>Enterprise Request</Subtitle2>
  <Caption1 className={styles.helper}>
    ETSI UnderlyingConditions — IA-provided addressed-to flow and
    Microsoft notification obligation.
  </Caption1>
</div>

// After
<div className={styles.header}>
  <h3 className="text-xl font-semibold text-[#323130] m-0">
    Enterprise Request
  </h3>
</div>
```

This removes the `Subtitle2` dependency for the title and aligns weight + size + colour with Authorization Details' `h3`.

### 2. Caption removal — the descriptive subtitle under the title

The line **"ETSI UnderlyingConditions — IA-provided addressed-to flow and Microsoft notification obligation."** describes the card but is redundant with the title plus the IA-provided column header below it. Authorization Details has no equivalent subtitle. Drop it.

Saves ~20px (Caption1 line height ~16px + rowGap + bottom of header block).

Two follow-on cleanups while we're in the header block:
- Tighten `header.marginBottom` from `spacingVerticalM` (12px) → `spacingVerticalS` (8px) — saves 4px.
- `header.rowGap` becomes irrelevant (single-line header now). Can be removed.

### 3. Tighten card + row + nested-section padding

All edits are inside the `useStyles` block — no JSX changes beyond #1 / #2 above.

| Style key | Property | Today | Target | Δ per card |
|---|---|---|---|---|
| `card` | `paddingTop` / `paddingBottom` | `spacingVerticalL` (16px each) | `spacingVerticalM` (12px each) | −8px |
| `checkboxField` | `paddingTop` / `paddingBottom` | `spacingVerticalS` (8px each) | `spacingVerticalXS` (4px each) | −8px × N rows |
| `level` | `marginTop` | `spacingVerticalM` (12px) | `spacingVerticalS` (8px) | −4px × N levels |
| `level` | `paddingTop` / `paddingBottom` | `spacingVerticalS` (8px each) | `spacingVerticalXS` (4px each) | −8px × N levels |
| `levelHeader` | `marginBottom` | `spacingVerticalXS` (4px) | `spacingVerticalXXS` (2px) | −2px × N levels |
| `columnHeaderRow` | `paddingBottom` | `spacingVerticalXS` (4px) | `spacingVerticalXXS` (2px) | −2px |

### 4. Caption removal — read-only textareas (Justification / Relevant Information)

The Caption1 line **"Provided by the Issuing Authority · read-only"** appears under both the Justification and Relevant Information labels when those textareas render. The same provenance is already communicated by the column header *and* by the `readOnly` chrome on the Textarea itself.

Drop both captions; the `Body1` label sits flush against the textarea. Saves ~16px per textarea when present.

This also lets us delete the unused `iaProvided` style key from `useStyles`.

---

## Estimated impact

For a typical render with **Q1 + Q2 rows + Notification Details nested section (2 rows) + no textareas**:

- Header: −24px (caption removal + tighter margin)
- Card padding: −8px
- 4 checkbox rows × −8px: −32px
- 1 nested level × (−4 marginTop + −8 padding + −2 levelHeader marginBottom): −14px
- Column header row paddingBottom: −2px

**Total: ~80px reduction** (from ~300px → ~220px), without touching the underlying data model or hiding any IA-provided fields.

When Justification or Relevant Information textareas render, add **~16px each** in additional savings from the per-textarea caption removal.

---

## Files touched

**Modified**:
- [src/components/enterprise-request/EnterpriseRequestCard.tsx](c:/R/DARS_eEvidence/src/components/enterprise-request/EnterpriseRequestCard.tsx) — three localised changes inside `useStyles` + the header JSX + the two textarea blocks. No prop changes, no caller updates.

**Removed imports** (now unused after Phase 1):
- `Subtitle2` from `@fluentui/react-components` (only consumer was the card title — now an `h3`).
- `Caption1` is *still* used by the column-header row and helper text and stays.

---

## Verification

1. **Step 4 of an eEvidence case** (e.g. `LNS-2026-00200` or any case with `requestType === "eEvidence"` and an Enterprise flag set): navigate to Identifier & Data Services. Confirm:
   - Card title now visually matches the `Authorization Details` card title on the prior step (size, weight, colour).
   - The descriptive subtitle line is gone.
   - The two checkbox rows + Notification Details block are visibly tighter (~80px shorter end-to-end).
   - Column-header alignment over the two-column grid is unchanged.
2. **eEvidence case with IA-provided Justification + Relevant Information prose**: confirm the textareas render flush under their `Body1` label, with no intermediate "Provided by the Issuing Authority · read-only" caption.
3. **Non-eEvidence case**: card still hidden entirely — no regression in the gating predicate.
4. **Triage and Review Case both render the same**: since `DataEntryForm.tsx` powers both, a single change covers both pages.

---

## What stays the same

- All IA-provided answer rows (Q1, Q2, processor-reason sub-rows, Notification Details) render exactly as today, in the same order, with the same paper-form grid layout.
- The `ReadOnlyAnswerRow` component, the `Checkbox` indicator-only styling, the column-header row, and the nested `level` block visual treatment (left border + indent) are preserved.
- No prop changes, no caller updates, no type changes.
- Phase 2 / 3 ideas (column-header relocation to first-row inline, two-up grid, flattening Notification Details into siblings, swapping the textareas to single-line on collapse) are deferred and explicitly out of scope.
