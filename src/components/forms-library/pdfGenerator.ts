/**
 * Phase 1 PDF generator — opens a new window with the print-styled HTML
 * of the FormPreviewPanel and triggers window.print(). The browser's
 * native "Save as PDF" handles the actual file. Zero new dependencies.
 *
 * Phase 2+ can swap in pdf-lib for true headless generation if needed.
 */

const PRINT_STYLES = `
  @page { size: letter; margin: 0.75in; }
  html, body {
    margin: 0;
    padding: 0;
    background: white;
    color: #1a1a1a;
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 12px;
    line-height: 1.5;
  }
  [data-form-preview] {
    max-width: none;
    padding: 0;
  }
  h1 { font-size: 22px; margin: 0 0 4px 0; font-weight: 600; }
  h2 {
    font-size: 14px;
    font-weight: 600;
    margin: 18px 0 6px 0;
    padding-bottom: 4px;
    border-bottom: 1px solid #c8c6c4;
  }
  ul { padding-left: 0; list-style: none; margin: 0; }
  ul li { padding: 2px 0; }
  .fl-letterhead {
    border-bottom: 2px solid #323130;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  .fl-product { font-size: 10px; color: #605e5c; text-transform: uppercase; letter-spacing: 0.06em; }
  .fl-anchor { font-size: 10px; color: #605e5c; margin-top: 2px; }
  .fl-section { margin: 18px 0; page-break-inside: avoid; }
  .fl-section-desc { font-size: 10px; color: #605e5c; margin-bottom: 8px; }
  .fl-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 18px;
    row-gap: 10px;
  }
  .fl-grid > .fl-full { grid-column: 1 / -1; }
  .fl-label { font-size: 10px; font-weight: 600; color: #4a4a4a; margin-bottom: 2px; }
  .fl-value { font-size: 11px; white-space: pre-wrap; min-height: 1em; }
  .fl-value.fl-empty { color: #8a8886; font-style: italic; }
  .fl-bullet { padding-left: 10px; }
  .fl-banner {
    border: 1px solid #d29c00;
    background: #fff8d6;
    padding: 10px 12px;
    margin: 12px 0;
    border-radius: 4px;
  }
  .fl-banner-title { font-weight: 600; margin-bottom: 4px; }
  .fl-banner-row { font-size: 11px; padding: 2px 0; }
  .fl-banner-row .fl-level { font-weight: 600; }
  .fl-banner-row .fl-spec { color: #605e5c; margin-left: 6px; }
  .fl-signature {
    margin-top: 32px;
    padding-top: 14px;
    border-top: 1px solid #c8c6c4;
  }
  .fl-signature-rendered {
    font-family: "Segoe Script", "Caveat", cursive;
    font-size: 28px;
    padding: 6px 0;
  }
  .fl-signature-meta { font-size: 10px; color: #605e5c; }
  .fl-signature-pending { font-size: 10px; color: #605e5c; font-style: italic; }
`;

import { format, isValid } from "date-fns";
import type { CaseFormInstance, FormTemplate } from "../../types/formTemplate";
import { collectEscalations, isFieldVisible, isSectionVisible } from "./formEngine";

const LEVEL_LABEL: Record<"Legal" | "LegalPolicy", string> = {
  Legal: "Escalate to Legal",
  LegalPolicy: "Escalate to Legal Policy",
};

function escape(s: unknown): string {
  if (s === undefined || s === null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderValue(field: FormTemplate["fields"][number], value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return `<div class="fl-value fl-empty">—</div>`;
  }
  if (field.type === "date" && typeof value === "string") {
    const d = new Date(value);
    if (isValid(d)) return `<div class="fl-value">${escape(format(d, "MMM d, yyyy"))}</div>`;
    return `<div class="fl-value">${escape(value)}</div>`;
  }
  if (field.type === "radio" || field.type === "select") {
    const opt = field.options?.find((o) => o.value === value);
    return `<div class="fl-value">${escape(opt ? opt.label : String(value))}</div>`;
  }
  if (field.type === "checkbox") {
    return `<div class="fl-value">${value ? "Yes" : "No"}</div>`;
  }
  if (field.type === "multi-checkbox" && field.options) {
    const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
    return `<ul>${field.options
      .map((o) => {
        const checked = selected.includes(o.value);
        return `<li class="${checked ? "fl-checked" : ""}">${checked ? "☑" : "☐"} ${escape(o.label)}</li>`;
      })
      .join("")}</ul>`;
  }
  if (Array.isArray(value)) {
    return `<div class="fl-value">${value
      .map((v) => `<div class="fl-bullet">• ${escape(v)}</div>`)
      .join("")}</div>`;
  }
  return `<div class="fl-value">${escape(value)}</div>`;
}

function renderHtml(template: FormTemplate, instance: CaseFormInstance): string {
  const triggers = collectEscalations(template, instance.values);

  const banner =
    triggers.length === 0
      ? ""
      : `
        <div class="fl-banner">
          <div class="fl-banner-title">${
            triggers.length === 1 ? "Review required before transmission" : `${triggers.length} review items before transmission`
          }</div>
          ${triggers
            .map(
              (t) =>
                `<div class="fl-banner-row"><span class="fl-level">${escape(LEVEL_LABEL[t.level])} —</span> ${escape(t.message)}${
                  t.specRef ? `<span class="fl-spec">(${escape(t.specRef)})</span>` : ""
                }</div>`,
            )
            .join("")}
        </div>`;

  const sectionsHtml = template.sections
    .filter((s) => isSectionVisible(s, instance.values))
    .map((section) => {
      const fields = template.fields
        .filter((f) => f.sectionId === section.id)
        .filter((f) => isFieldVisible(f, instance.values));
      if (fields.length === 0) return "";
      return `
        <section class="fl-section">
          <h2>${escape(section.title)}</h2>
          ${section.description ? `<div class="fl-section-desc">${escape(section.description)}</div>` : ""}
          <div class="fl-grid">
            ${fields
              .map((f) => {
                const cls = f.span === "half" ? "" : "fl-full";
                return `<div class="${cls}"><div class="fl-label">${escape(f.label)}</div>${renderValue(f, instance.values[f.id])}</div>`;
              })
              .join("")}
          </div>
        </section>
      `;
    })
    .join("");

  const sigHtml = instance.signature
    ? `
      <div class="fl-signature">
        <div class="fl-label">Signature</div>
        <div class="fl-signature-rendered">${escape(instance.signature.signerName)}</div>
        <div class="fl-signature-meta">Signed by <strong>${escape(instance.signature.signerName)}</strong> on ${escape(
          format(new Date(instance.signature.signedAt), "MMM d, yyyy 'at' h:mm a"),
        )}</div>
      </div>
    `
    : `
      <div class="fl-signature">
        <div class="fl-label">Signature</div>
        <div class="fl-signature-pending">Pending — this form has not been signed yet.</div>
      </div>
    `;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escape(template.name)} — Case ${escape(instance.caseId)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap"
      rel="stylesheet"
    />
    <style>${PRINT_STYLES}</style>
  </head>
  <body data-form-preview>
    <div class="fl-letterhead">
      <div class="fl-product">${escape(template.category)}</div>
      <h1>${escape(template.name)}</h1>
      ${template.regulatoryAnchor ? `<div class="fl-anchor">${escape(template.regulatoryAnchor)}</div>` : ""}
    </div>
    ${banner}
    ${sectionsHtml}
    ${sigHtml}
    <script>
      // Allow the font to load before printing.
      window.addEventListener("load", function () {
        setTimeout(function () { window.print(); }, 300);
      });
    </script>
  </body>
</html>`;
}

export function generateFormPdf(template: FormTemplate, instance: CaseFormInstance): void {
  const html = renderHtml(template, instance);
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
  if (!win) {
    // Popup blocked — fall back to data-URL which the user can save.
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.location.assign(url);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
