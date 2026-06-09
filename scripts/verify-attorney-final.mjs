/**
 * Final pass: Attorney Dashboard width-stretch + preview-pane column
 * alignment.
 */
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
await page.waitForTimeout(1500);

// Navigate to Attorney Dashboard via rail
await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const attyBtn = buttons.find((b) =>
    /Attorney Dashboard/i.test(b.getAttribute("aria-label") ?? ""),
  );
  if (attyBtn) (attyBtn).click();
});
await page.waitForTimeout(1500);

// ── 1. Width-stretch check ──────────────────────────────────────────
console.log("=== Attorney Dashboard width ===");
const widthInfo = await page.evaluate(() => {
  const h1 = Array.from(document.querySelectorAll("h1")).find(
    (h) => /Attorney Dashboard/.test(h.textContent ?? ""),
  );
  if (!h1) return null;
  // Walk up to find the PageContainer (it has both max-w + px-* tokens).
  let el = h1.parentElement;
  while (el && !/max-w-\[var\(--page-max-w\)\]/.test(el.className ?? "")) {
    el = el.parentElement;
  }
  if (!el) return { found: false };
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return {
    found: true,
    width: Math.round(rect.width),
    maxWidth: cs.maxWidth,
    paddingLeft: cs.paddingLeft,
    paddingRight: cs.paddingRight,
  };
});
if (!widthInfo?.found) {
  console.log("  PageContainer not found.");
} else {
  console.log(`  PageContainer rendered width:  ${widthInfo.width}px (target near viewport - 96px)`);
  console.log(`  Max-width style:               ${widthInfo.maxWidth}`);
  console.log(`  Padding L / R:                 ${widthInfo.paddingLeft} / ${widthInfo.paddingRight}`);
}

// ── 2. Switch to preview mode + check column alignment ─────────────
console.log("");
console.log("=== Preview-pane column alignment ===");
// Click the preview view toggle.
await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const previewBtn = buttons.find((b) =>
    /preview|split.*view|preview pane/i.test(
      b.getAttribute("aria-label") ?? b.textContent ?? "",
    ),
  );
  if (previewBtn) (previewBtn).click();
});
await page.waitForTimeout(1000);

const colAlignment = await page.evaluate(() => {
  // Find the preview list's header row and first data row, then
  // compare the grid-template-columns and the actual column-edge
  // positions of each cell.
  const grid = document.querySelector('[role="grid"][aria-label*="preview"]');
  if (!grid) return null;
  const headerRow = grid.querySelector('[role="row"]');
  const dataRows = Array.from(grid.querySelectorAll('[role="row"]')).slice(1, 4);
  if (!headerRow || dataRows.length === 0) return { found: false };
  // Grid-template-columns string from the header row.
  const headerTemplate = getComputedStyle(headerRow).gridTemplateColumns;
  const rowTemplate = getComputedStyle(dataRows[0]).gridTemplateColumns;
  // Compare cell positions: for each row, find the right-edge of each
  // direct child cell, then compare to the header's positions.
  const cellRights = (row) =>
    Array.from(row.children).map((c) =>
      Math.round(c.getBoundingClientRect().right),
    );
  const headerEdges = cellRights(headerRow);
  const rowEdges = dataRows.map((r) => cellRights(r));
  // Worst-case misalignment: max abs(rowEdge - headerEdge) across all
  // cells and all data rows.
  let worstDiff = 0;
  for (const row of rowEdges) {
    for (let i = 0; i < Math.min(headerEdges.length, row.length); i++) {
      const diff = Math.abs(row[i] - headerEdges[i]);
      if (diff > worstDiff) worstDiff = diff;
    }
  }
  return {
    found: true,
    headerTemplate,
    rowTemplate,
    templatesIdentical: headerTemplate === rowTemplate,
    headerEdges,
    rowEdges,
    worstDiff,
  };
});
if (!colAlignment?.found) {
  console.log("  Preview list grid not found.");
} else {
  console.log(`  Header / row template strings identical: ${colAlignment.templatesIdentical ? "YES" : "NO"}`);
  console.log(`  Worst column-edge mismatch (any cell):   ${colAlignment.worstDiff}px (target < 2)`);
  if (colAlignment.worstDiff < 2) {
    console.log("  ✓ All cells align with their header columns.");
  } else {
    console.log(`  Header edges: ${JSON.stringify(colAlignment.headerEdges.slice(0, 8))}`);
    console.log(`  Row[0] edges: ${JSON.stringify(colAlignment.rowEdges[0].slice(0, 8))}`);
  }
}

console.log("");
console.log(`Page / console errors: ${errors.length}`);
await page.screenshot({ path: "verify-attorney-final.png", fullPage: false });
await browser.close();
