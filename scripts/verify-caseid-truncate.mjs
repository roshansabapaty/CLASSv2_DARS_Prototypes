/**
 * Verify the Case ID column truncates cleanly when the preview pane
 * is stretched wide and the list narrows.
 *
 * Strategy:
 *   1. Open the Cases page and switch to "Preview" view mode so the
 *      list + preview pane split is active.
 *   2. Programmatically shrink the list's container width by
 *      lifting the preview pane width to ~1100px (well past the
 *      default 480px), so the list ends up around 250-300px wide.
 *   3. Read every Case ID cell's geometry and the geometry of the
 *      cell immediately to its right; assert no overlap.
 *   4. Also confirm the Case ID span's scrollWidth > clientWidth
 *      (i.e. truncation is active) at the narrow width.
 */
import { chromium } from "playwright";
import { Verdict } from "./_verify-utils.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const verdict = new Verdict("caseid-truncate");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page
    .waitForLoadState("networkidle", { timeout: 15_000 })
    .catch(() => {});
  await page.waitForTimeout(1500);

  // Switch to preview view mode.
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const previewBtn = buttons.find((b) =>
      /preview/i.test(b.getAttribute("aria-label") ?? ""),
    );
    if (previewBtn) (previewBtn).click();
  });
  await page.waitForTimeout(800);

  // Confirm the preview list grid mounted.
  const initialGridFound = await page.evaluate(
    () =>
      !!document.querySelector('[role="grid"][aria-label*="preview" i]'),
  );
  console.log(`Preview-mode grid mounted:                 ${initialGridFound ? "YES" : "NO"}`);
  if (!initialGridFound) {
    console.log("  Can't continue without the preview grid.");
    verdict.fail("Preview-mode grid never mounted");
    await browser.close();
    verdict.finish();
    return;
  }

  // Stretch the preview pane: directly resize the list container by
  // shrinking its right-side margin (which the parent flex layout uses
  // to reserve space for the preview pane). The pane width prop lives
  // on `marginRight` of the list wrapper, so bumping that to 1100px
  // narrows the list to roughly 1400px viewport - 1100px = 300px usable.
  await page.evaluate(() => {
    const grid = document.querySelector(
      '[role="grid"][aria-label*="preview" i]',
    );
    // Walk up to the list wrapper (the one with marginRight inline).
    let el = grid?.parentElement;
    while (el && !el.style.marginRight) el = el.parentElement;
    if (el) el.style.marginRight = "1100px";
  });
  await page.waitForTimeout(400);

  // Now inspect the geometry.
  console.log("");
  console.log("=== Case ID column geometry under stretched preview pane ===");
  const overlapInfo = await page.evaluate(() => {
    const grid = document.querySelector(
      '[role="grid"][aria-label*="preview" i]',
    );
    if (!grid) return null;
    const rows = Array.from(grid.querySelectorAll('[role="row"]'));
    // First row is the header. Sample rows: skip header, take a few.
    const dataRows = rows.slice(1, 6);
    const samples = [];
    for (const row of dataRows) {
      const cells = Array.from(row.children);
      // Case ID is the first content cell — after the checkbox cell
      // when bulkSelectable, else first.
      const caseIdCell = cells.find((c) => {
        const span = c.querySelector("span.font-mono");
        return span && /^LNS-/.test(span.textContent ?? "");
      });
      if (!caseIdCell) continue;
      const idx = cells.indexOf(caseIdCell);
      const nextCell = cells[idx + 1] ?? null;
      const caseIdRect = caseIdCell.getBoundingClientRect();
      const nextRect = nextCell?.getBoundingClientRect();
      const span = caseIdCell.querySelector("span.font-mono");
      const spanScrollW = span ? span.scrollWidth : 0;
      const spanClientW = span ? span.clientWidth : 0;
      samples.push({
        caseId: span?.textContent ?? "",
        caseIdRight: Math.round(caseIdRect.right),
        nextLeft: nextRect ? Math.round(nextRect.left) : null,
        overlap: nextRect ? caseIdRect.right - nextRect.left : 0,
        spanScrollW,
        spanClientW,
        truncating: spanScrollW > spanClientW + 1,
      });
    }
    return samples;
  });

  if (!overlapInfo || overlapInfo.length === 0) {
    console.log("  No Case ID rows sampled.");
    verdict.fail("No Case ID rows sampled under stretched preview pane");
  } else {
    let worstOverlap = 0;
    let truncCount = 0;
    for (const s of overlapInfo) {
      if (s.overlap > worstOverlap) worstOverlap = s.overlap;
      if (s.truncating) truncCount++;
    }
    overlapInfo.forEach((s, i) =>
      console.log(
        `  Row ${i + 1} — ${s.caseId.padEnd(15)} caseIdRight=${s.caseIdRight}px nextLeft=${s.nextLeft}px overlap=${Math.round(s.overlap)}px truncating=${s.truncating}`,
      ),
    );
    console.log("");
    console.log(`  Worst overlap (target ≤ 0px):           ${Math.round(worstOverlap)}px`);
    console.log(`  Rows with active truncation:            ${truncCount} of ${overlapInfo.length}`);
    // 1px tolerance for sub-pixel rounding between getBoundingClientRect
    // and the actual rendered track edge.
    verdict.assert(
      worstOverlap <= 1,
      `Case ID column overlaps next column by ${Math.round(worstOverlap)}px under stretched preview pane`,
    );
    verdict.assert(
      truncCount > 0,
      "No Case ID cell is truncating — column never narrowed below content width",
    );
  }

  // ── Tooltip on hover surfaces the full Case ID ──────────────────────
  console.log("");
  console.log("=== Hover tooltip shows the full Case ID when clipped ===");
  // Find the first truncated Case ID button and hover it via
  // Playwright's native hover (synthetic events don't reliably
  // trigger Radix's pointer-event listeners).
  const expectedId = await page.evaluate(() => {
    const grid = document.querySelector(
      '[role="grid"][aria-label*="preview" i]',
    );
    const rows = Array.from(grid?.querySelectorAll('[role="row"]') ?? []).slice(1);
    const span = rows
      .map((r) => r.querySelector("span.font-mono"))
      .find((s) => s && /^LNS-/.test(s.textContent ?? ""));
    return span?.textContent ?? null;
  });
  if (!expectedId) {
    console.log("  No Case ID span found.");
    verdict.fail("No Case ID span available to hover");
  } else {
    const target = page
      .locator(`button[aria-label="${expectedId}"]`)
      .first();
    if ((await target.count()) === 0) {
      console.log(
        `  No CopyableText button with aria-label="${expectedId}" found.`,
      );
      verdict.fail(
        `CopyableText button aria-label="${expectedId}" missing — hover tooltip wiring broken`,
      );
    } else {
      await target.hover({ force: true });
      // Wait past Radix's 700ms default delay.
      await page.waitForTimeout(900);
      const tooltipInfo = await page.evaluate((expected) => {
        const tooltips = Array.from(
          document.querySelectorAll('[role="tooltip"]'),
        );
        const matching = tooltips.find((t) =>
          t.textContent?.includes(expected),
        );
        return {
          tooltipCount: tooltips.length,
          tooltipHasFullId: !!matching,
          sampleTooltipText:
            matching?.textContent ?? tooltips[0]?.textContent ?? "",
        };
      }, expectedId);
      console.log(`  Expected Case ID:                     "${expectedId}"`);
      console.log(
        `  Visible tooltip mount count:          ${tooltipInfo.tooltipCount}`,
      );
      console.log(
        `  Tooltip carries the full Case ID:     ${tooltipInfo.tooltipHasFullId ? "YES" : "NO"}`,
      );
      console.log(
        `  Sample tooltip text:                  "${tooltipInfo.sampleTooltipText.slice(0, 80)}"`,
      );
      verdict.assert(
        tooltipInfo.tooltipHasFullId,
        `Hover tooltip on Case ID "${expectedId}" did not surface the full ID`,
      );
    }
  }

  console.log("");
  console.log(`Page / console errors:                    ${errors.length}`);
  if (errors.length)
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 240)}`));

  await browser.close();
  verdict.assert(errors.length === 0, `${errors.length} page / console errors`);
  verdict.finish();
}

main().catch((e) => {
  console.error(e);
  console.log("");
  console.log(`RESULT: FAIL (caseid-truncate) — uncaught: ${e.message}`);
  process.exit(1);
});
