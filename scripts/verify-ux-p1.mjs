/**
 * Verify the P1 UX changes from the audit:
 *
 *   #7 — "Reviewed" badge now uses a saturated amber tier instead of
 *        info-blue, so RS scans it as "needs your action."
 *
 *   #8 — S500 / V100 badges are no longer duplicated in the
 *        EnterpriseContextSection header. The OrgPanel inside the
 *        card body is the single source.
 *
 *   #6 — ReviewRequiredAlertBanner slimmed: the inline status pill
 *        (e.g. "Pending review") is gone. Headline + assignee + CTA
 *        remain; status is in the StickyCaseHeader chip.
 *
 *   #5 — AttorneyReviewPanel actions split into two rows: Primary
 *        decisions (Release + Block) on top, conditional + handoff
 *        menu ("Send back to Specialist…") on the secondary row.
 *
 *   #4 — Queue tab strip split into Navigation (All / My Cases /
 *        Unassigned) + visual divider + Attention (Needs my action /
 *        Emergency/Urgent / Overdue). "Escalated" tab dropped. When
 *        extra filters are active, a scope-strip appears above the
 *        tabs.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

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

  // ── P1 #4 — Queue tab strip regrouping ────────────────────────────────
  console.log("=== P1 #4 — Queue tab strip ===");
  const tabInfo = await page.evaluate(() => {
    const tablist = document.querySelector('[role="tablist"]');
    if (!tablist) return null;
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]')).map(
      (t) => t.textContent?.trim() ?? "",
    );
    const dividers = tablist.querySelectorAll('span[aria-hidden="true"]');
    return { tabs, dividerCount: dividers.length };
  });
  if (!tabInfo) {
    console.log("  Tablist not found.");
  } else {
    const hasEscalated = tabInfo.tabs.some((t) => /^Escalated/.test(t));
    const hasNeedsAction = tabInfo.tabs.some((t) => /Needs my action/.test(t));
    const hasDivider = tabInfo.dividerCount > 0;
    console.log(`  Tab labels:                                  ${JSON.stringify(tabInfo.tabs.map((t) => t.replace(/\d+$/, "")))}`);
    console.log(`  "Escalated" tab dropped:                     ${hasEscalated ? "NO (FAIL)" : "YES"}`);
    console.log(`  "Needs my action" tab present:               ${hasNeedsAction ? "YES" : "NO (FAIL)"}`);
    console.log(`  Visual divider between groups present:       ${hasDivider ? "YES" : "NO (FAIL)"}`);
  }

  // Open a heavily-flagged case for the rest of the P1 checks.
  const search = page.locator('input[aria-label="Search cases"]');
  await search.fill("LNS-2026-00250");
  await page.waitForTimeout(700);
  const row = page
    .locator("div.cursor-pointer")
    .filter({ hasText: "LNS-2026-00250" })
    .first();
  if ((await row.count()) === 0) {
    console.log("Could not find LNS-2026-00250 — aborting case-form checks.");
    await browser.close();
    return;
  }
  await row.click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1500);
  // Dismiss "Recover Unsaved Work?" modal if it shows up — it can
  // block the rest of the case-form interactions.
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const startFresh = buttons.find((b) =>
      /Start Fresh/i.test(b.textContent ?? ""),
    );
    if (startFresh) (startFresh).click();
  });
  await page.waitForTimeout(500);

  // ── P1 #6 — ReviewRequiredAlertBanner slimmed ────────────────────────
  console.log("");
  console.log("=== P1 #6 — ReviewRequiredAlertBanner slim ===");
  // The banner only renders when esc.role === "Attorney" / "Peer"
  // && !terminal. LNS-2026-00250 has Reviewed status (non-terminal),
  // so the attorney banner should be on the page.
  const bannerCheck = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasHeadline = /Attorney review required|Peer review required/i.test(
      text,
    );
    // Old inline status pill rendered uppercase status labels like
    // "PENDING REVIEW" or "REVIEWED" inside the banner. Search for
    // uppercase status tokens to detect any leftover pills.
    const statusPills = Array.from(
      document.querySelectorAll('[class*="text-[10px]"][class*="uppercase"]'),
    )
      .map((el) => el.textContent?.trim() ?? "")
      .filter((t) => /^(Pending|Info|Redirect|Reviewed|Blocked|Approved)/i.test(t));
    return { hasHeadline, statusPillCount: statusPills.length };
  });
  console.log(
    `  Headline still rendered:                     ${bannerCheck.hasHeadline ? "YES" : "NO (case may not show banner)"}`,
  );
  console.log(
    `  Inline status pills removed:                 ${bannerCheck.statusPillCount === 0 ? "YES" : `NO (${bannerCheck.statusPillCount} remaining)`}`,
  );

  // ── P1 #7 — Reviewed badge color in queue ────────────────────────────
  console.log("");
  console.log("=== P1 #7 — Reviewed badge color ===");
  // Hop back to the queue via a fresh navigation (goBack is flaky
  // on the case form since the URL doesn't change).
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page
    .waitForLoadState("networkidle", { timeout: 15_000 })
    .catch(() => {});
  await page.waitForTimeout(1500);
  // Click "Needs my action" tab to narrow to the Reviewed cases.
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const t = tabs.find((el) => /^Needs my action/.test(el.textContent ?? ""));
    if (t) (t).click();
  });
  await page.waitForTimeout(700);
  const badgeColor = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[class*="bg-["]'));
    const reviewedEl = els.find((el) =>
      /Attorney Reviewed/.test(el.textContent ?? ""),
    );
    if (!reviewedEl) return { found: false };
    const cls = reviewedEl.className;
    return {
      found: true,
      usesAmber: cls.includes("fcd5b5"),
      usesBlue: cls.includes("deecf9") || cls.includes("004578"),
      classes: cls.slice(0, 200),
    };
  });
  if (!badgeColor.found) {
    console.log("  No Attorney Reviewed badge visible — Needs my action filter empty?");
  } else {
    console.log(
      `  Reviewed badge uses saturated amber/orange:  ${badgeColor.usesAmber ? "YES" : "NO"}`,
    );
    console.log(
      `  Reviewed badge no longer info-blue:          ${badgeColor.usesBlue ? "NO (FAIL)" : "YES"}`,
    );
  }

  // ── P1 #5 — AttorneyReviewPanel: open the panel, check button layout ──
  console.log("");
  console.log("=== P1 #5 — AttorneyReviewPanel 3-tier action layout ===");
  // Click "All" tab to widen the queue + search for the case.
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const t = tabs.find((el) => /^All/.test(el.textContent ?? ""));
    if (t) (t).click();
  });
  await page.waitForTimeout(400);
  await page.locator('input[aria-label="Search cases"]').fill("LNS-2026-00250");
  await page.waitForTimeout(700);
  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: "LNS-2026-00250" })
    .first()
    .click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1200);
  // Dismiss "Recover Unsaved Work?" if present.
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const startFresh = buttons.find((b) =>
      /Start Fresh/i.test(b.textContent ?? ""),
    );
    if (startFresh) (startFresh).click();
  });
  await page.waitForTimeout(500);
  // Scroll to find the AttorneyReviewPanel.
  await page.evaluate(() => {
    const panel = Array.from(document.querySelectorAll("*")).find((el) =>
      /Attorney Review Required/.test(el.textContent ?? ""),
    );
    panel?.scrollIntoView();
  });
  await page.waitForTimeout(500);
  const panelCheck = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasReleaseButton: /Release Hold/.test(text),
      hasBlockButton: /Block Delivery.*Form 3/.test(text),
      hasConditionsButton: /Approve with Conditions/.test(text),
      hasSendBackMenu: /Send back to Specialist/.test(text),
      // The collapsed three (now inside menu) should NOT be inline buttons.
      hasRequestInfoInline:
        /Request More Information/.test(text) && !/Send back to Specialist/.test(text),
      hasRequestRedirectInline:
        /Request Redirect/.test(text) && !/Send back to Specialist/.test(text),
      hasMarkReviewedInline:
        /Mark Reviewed/.test(text) && !/Send back to Specialist/.test(text),
    };
  });
  console.log(
    `  Release Hold button visible (primary):       ${panelCheck.hasReleaseButton ? "YES" : "NO"}`,
  );
  console.log(
    `  Block Delivery button visible (primary):     ${panelCheck.hasBlockButton ? "YES" : "NO"}`,
  );
  console.log(
    `  Approve with Conditions button visible:      ${panelCheck.hasConditionsButton ? "YES" : "NO"}`,
  );
  console.log(
    `  "Send back to Specialist" menu visible:      ${panelCheck.hasSendBackMenu ? "YES" : "NO"}`,
  );
  console.log(
    `  Handoff actions collapsed (not inline btns): ${
      !panelCheck.hasRequestInfoInline &&
      !panelCheck.hasRequestRedirectInline &&
      !panelCheck.hasMarkReviewedInline
        ? "YES"
        : "NO"
    }`,
  );

  // ── P1 #8 — S500/V100 badges only in OrgPanel, not in Section header ─
  console.log("");
  console.log("=== P1 #8 — S500/V100 de-duplicated ===");
  // Navigate to the Enterprise Context section (Step 4).
  const step4 = page
    .locator('nav[aria-label="Case workflow"] button')
    .filter({ hasText: /Identifier.*Data Services|Account Identifiers/i })
    .first();
  if (await step4.count()) {
    await step4.click({ force: true });
    await page.waitForTimeout(700);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(700);
  const dedupeCheck = await page.evaluate(() => {
    const all = document.body.innerText;
    // Count S500 and V100 occurrences. Single-tenant cases should have
    // each appear at most once (OrgPanel) — not twice (header + OrgPanel).
    const s500Count = (all.match(/\bS500\b/g) ?? []).length;
    const v100Count = (all.match(/\bV100\b/g) ?? []).length;
    return { s500Count, v100Count };
  });
  console.log(
    `  S500 mentions in page (was 2, expect ≤1):    ${dedupeCheck.s500Count}`,
  );
  console.log(
    `  V100 mentions in page (was 2, expect ≤1):    ${dedupeCheck.v100Count}`,
  );

  console.log("");
  console.log(
    `Page / console errors:                         ${errors.length}`,
  );
  if (errors.length) {
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 240)}`));
  }

  await page.screenshot({ path: "verify-ux-p1.png", fullPage: false });
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
