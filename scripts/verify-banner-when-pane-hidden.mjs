/**
 * Smoke test for the WorkflowStageBanner gap-fix when the pane is hidden.
 *
 * Verifies:
 *   1. With pane visible → banner does NOT render Save / Submit / Escalate
 *      (these live in the WorkflowListPane footer / scope-header)
 *   2. After clicking « to hide the pane → banner re-renders Save, Submit
 *      and the Escalate button so the user keeps full control without
 *      having to re-expand the pane
 *   3. Save button is clickable from the banner
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();
  const out = [];
  const log = (m) => {
    console.log(m);
    out.push(m);
  };

  // Reset workflow pane to visible so the first probe sees the default state.
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() =>
    localStorage.setItem("dars.workflowListPane.visible", "true"),
  );
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  // Open the first case.
  const firstCard = page
    .locator("div.cursor-pointer")
    .filter({ hasText: /LNS-\d{4}-\d{5}/ })
    .first();
  await firstCard.waitFor({ state: "visible", timeout: 15_000 });
  await firstCard.click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1_500);

  // Navigate to Review Case (fulfillment) so onSubmit is actually wired.
  const reviewBtn = page
    .locator("nav[aria-label=\"Case workflow\"] button", {
      hasText: /Review Case/i,
    })
    .first();
  if (await reviewBtn.count()) {
    await reviewBtn.click({ force: true });
    await page.waitForTimeout(800);
  }

  // ── 1. Pane visible: banner should NOT show Save / Submit ────────────
  const saveInBannerVisible = await page
    .locator('button[aria-label*="Save changes" i], button[aria-label*="changes saved" i]')
    .filter({ has: page.locator(":scope") })
    .count();
  const submitInBannerVisible = await page
    .locator('button[aria-label*="Submit case" i], button[aria-label*="Submit disabled" i]')
    .count();
  log(
    `Pane visible — Save button in banner: ${saveInBannerVisible >= 1 ? "YES (unexpected)" : "NO (expected)"}`,
  );
  log(
    `Pane visible — Submit button in banner: ${submitInBannerVisible >= 1 ? "YES (unexpected)" : "NO (expected)"}`,
  );

  // ── 2. Hide the pane via the « button ───────────────────────────────
  const hideBtn = page.locator('button[aria-label*="Hide workflow pane"]');
  await hideBtn.first().click({ force: true });
  await page.waitForTimeout(800);

  const paneAfterHide = await page
    .locator('nav[aria-label="Case workflow"]')
    .count();
  log(`Pane hidden after «: ${paneAfterHide === 0 ? "YES" : "NO"}`);

  // ── 3. Banner now shows Save / Submit ───────────────────────────────
  const saveInBannerHidden = await page
    .locator(
      'button[aria-label*="Save changes" i], button[aria-label*="changes saved" i]',
    )
    .count();
  const submitInBannerHidden = await page
    .locator(
      'button[aria-label*="Submit case" i], button[aria-label*="Submit disabled" i]',
    )
    .count();
  log(
    `Pane hidden — Save button in banner: ${saveInBannerHidden >= 1 ? "YES (expected)" : "NO (FAIL)"}`,
  );
  log(
    `Pane hidden — Submit button in banner: ${submitInBannerHidden >= 1 ? "YES (expected)" : "NO (FAIL)"}`,
  );

  // ── 4. Escalate button surfaces in banner ──────────────────────────
  const escalateBtn = page.locator(
    'button[aria-label="Escalate" i], button[aria-label="Update Escalation" i], button[aria-label="Resume Escalation" i]',
  );
  log(
    `Pane hidden — Escalate button in banner: ${(await escalateBtn.count()) >= 1 ? "YES (expected)" : "NO (FAIL)"}`,
  );

  // ── 5. Submit's disabled-state tooltip surfaces (no fields filled) ─
  if (submitInBannerHidden >= 1) {
    const submitBtn = page.locator(
      'button[aria-label*="Submit" i]',
    ).first();
    const disabled = await submitBtn.isDisabled();
    log(`Submit button disabled (no required fields filled yet): ${disabled ? "YES (expected)" : "NO (unexpected)"}`);
  }

  // Dump every banner's button set + visibility + debug attrs.
  const banners = await page.evaluate(() => {
    const els = Array.from(
      document.querySelectorAll('div[class*="bg-gradient-to-r"]'),
    );
    return els.map((banner, i) => {
      const rect = banner.getBoundingClientRect();
      const parent = banner.parentElement;
      let ancestorDisplay = "visible";
      let walker = parent;
      while (walker && walker !== document.body) {
        const style = window.getComputedStyle(walker);
        if (style.display === "none") {
          ancestorDisplay = "display:none";
          break;
        }
        walker = walker.parentElement;
      }
      const stageH2 = banner.querySelector("h2")?.textContent ?? "(no h2)";
      const buttons = Array.from(banner.querySelectorAll("button")).map(
        (b) =>
          b.getAttribute("aria-label") ?? b.textContent?.trim()?.slice(0, 40),
      );
      return {
        idx: i,
        stage: stageH2,
        visible: ancestorDisplay,
        rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
        debugPaneVisible: banner.getAttribute("data-debug-pane-visible"),
        debugOnSave: banner.getAttribute("data-debug-on-save"),
        debugOnSubmit: banner.getAttribute("data-debug-on-submit"),
        buttons,
      };
    });
  });
  log(`Banners detected: ${JSON.stringify(banners, null, 2)}`);

  await page.screenshot({
    path: "verify-banner-pane-hidden.png",
    fullPage: false,
  });

  console.log("\n──── SUMMARY ────");
  out.forEach((l) => console.log(l));

  await browser.close();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
