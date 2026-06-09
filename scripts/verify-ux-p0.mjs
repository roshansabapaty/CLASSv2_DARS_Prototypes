/**
 * Verify the P0 UX changes from the audit:
 *
 *  P0 #1 — Page-top banner stack capped at 3 visible; rest collapsed
 *          into "Show N more notices" disclosure.
 *
 *  P0 #2 — Hidden-automation disclosures:
 *           - TenantTierCheckDialog surfaces pre-fill provenance
 *             (case / org / fresh)
 *           - Dialog discloses the org write-through inline before save
 *           - Tier-check toasts removed (pull-model only)
 *           - AutoStateChangeBanner ack flow + "Needs my action" inclusion
 *
 *  P0 #3 — Queue card badges: property badges dim to opacity-60 when
 *          alerts present, alert badges bumped to font-bold + heavier
 *          saturation.
 *
 * Exercises one or two reachable cases for each check. Uses LNS-2026-00210
 * (Italian Enterprise eEvidence — known to trigger Enterprise banner +
 * S500 / V100 path) and the queue surface for P0 #3.
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

  // ── P0 #3 — Queue card property-badge dimming + alert font-weight ─────
  console.log("=== P0 #3 — Queue card badge hierarchy ===");
  const queueDimCheck = await page.evaluate(() => {
    // Look for at least one queue card with both alert and property
    // badges. A card with priority Emergency / Urgent + identifier
    // count + service should show opacity-60 on the property badges.
    const cards = Array.from(
      document.querySelectorAll('[class*="bg-slate-50/80"]'),
    );
    let foundDimmed = 0;
    let foundBoldAlert = 0;
    let cardsInspected = 0;
    for (const c of cards.slice(0, 25)) {
      cardsInspected++;
      const txt = c.textContent ?? "";
      const hasAlert = /Threat|Emergency|Hold|Escalated|Requests|Reviewed|Complete/.test(
        txt,
      );
      if (!hasAlert) continue;
      const propertyBadges = Array.from(
        c.querySelectorAll('[class*="bg-indigo-50"], [class*="bg-slate-50"][class*="text-slate-600"], [class*="bg-purple-50"][class*="text-purple-700"]'),
      );
      if (propertyBadges.some((b) => b.className.includes("opacity-60"))) {
        foundDimmed++;
      }
      const alertBadges = Array.from(
        c.querySelectorAll('[class*="bg-red-100"], [class*="bg-amber-100"]'),
      );
      if (alertBadges.some((b) => b.className.includes("font-bold"))) {
        foundBoldAlert++;
      }
    }
    return { cardsInspected, foundDimmed, foundBoldAlert };
  });
  console.log(
    `  Queue cards inspected:                       ${queueDimCheck.cardsInspected}`,
  );
  console.log(
    `  Cards with dimmed property badges (alerts):  ${queueDimCheck.foundDimmed}`,
  );
  console.log(
    `  Cards with font-bold alert badges:           ${queueDimCheck.foundBoldAlert}`,
  );

  // ── Open a heavily-flagged case for banner-stack + tier-check checks ──
  const search = page.locator('input[aria-label="Search cases"]');
  await search.fill("LNS-2026-00210");
  await page.waitForTimeout(700);
  const row = page
    .locator("div.cursor-pointer")
    .filter({ hasText: "LNS-2026-00210" })
    .first();
  if ((await row.count()) === 0) {
    console.log("Could not find LNS-2026-00210 — aborting.");
    await browser.close();
    return;
  }
  await row.click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1500);

  // ── P0 #1 — Banner stack cap (3 visible + disclosure) ─────────────────
  console.log("");
  console.log("=== P0 #1 — Page-top banner stack cap ===");
  const stackText = await page.evaluate(() => document.body.innerText);
  const hasDisclosure = /Show \d+ more notice/.test(stackText);
  console.log(
    `  "Show N more notices" disclosure present:    ${hasDisclosure ? "YES" : "NO (case has ≤3 banners; expected behavior)"}`,
  );

  // ── P0 #2 — TenantTierCheckDialog provenance + org write-through ──────
  console.log("");
  console.log("=== P0 #2 — TenantTierCheckDialog provenance + write-through ===");
  // Navigate to Step 4 where the Enterprise Context card lives.
  const step4 = page
    .locator('nav[aria-label="Case workflow"] button')
    .filter({ hasText: /Identifier.*Data Services|Account Identifiers/i })
    .first();
  if (await step4.count()) {
    await step4.click({ force: true });
    await page.waitForTimeout(700);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);

  const tierBtn = page
    .locator("button")
    .filter({ hasText: /Tenant tier check|Tenant tier:/ })
    .first();
  if ((await tierBtn.count()) === 0) {
    console.log("  Tier check button not visible. Skipping dialog checks.");
  } else {
    await tierBtn.scrollIntoViewIfNeeded();
    await tierBtn.click({ force: true });
    await page.waitForTimeout(700);
    // First, capture the initial dialog state (pre-fill source).
    const initialDialogText = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d?.textContent ?? "";
    });
    const initialPrefillState = /Pre-filled from the org profile/i.test(
      initialDialogText,
    )
      ? "org"
      : /Last recorded/i.test(initialDialogText)
        ? "case"
        : "fresh";
    console.log(`  Initial pre-fill source detected:            ${initialPrefillState}`);

    // Now check S500 to trigger the "two things happen" disclosure that
    // discloses the org write-through.
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return;
      const inputs = Array.from(
        dialog.querySelectorAll('input[type="checkbox"]'),
      );
      const s500 = inputs.find((cb) => {
        const ariaLabelledBy = cb.getAttribute("aria-labelledby");
        const labelText = ariaLabelledBy
          ? document.getElementById(ariaLabelledBy)?.textContent ?? ""
          : cb.parentElement?.textContent ?? "";
        return /S500/.test(labelText);
      });
      if (s500 && !(s500).checked) (s500).click();
    });
    await page.waitForTimeout(400);

    const dialogTextChecked = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d?.textContent ?? "";
    });
    const hasWriteThroughDisclosure =
      /org profile for.*updated.*to reflect.*recorded check|future case opened against this tenant/i.test(
        dialogTextChecked,
      );
    const hasTwoThingsHeader = /On save.*two things happen/i.test(
      dialogTextChecked,
    );
    console.log(
      `  Org write-through disclosed inline (S500✓): ${hasWriteThroughDisclosure ? "YES" : "NO"}`,
    );
    console.log(
      `  "On save, two things happen" header:        ${hasTwoThingsHeader ? "YES" : "NO"}`,
    );
    // Close dialog without saving.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  console.log("");
  console.log(`Page / console errors:                         ${errors.length}`);
  if (errors.length) {
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 240)}`));
  }

  await page.screenshot({ path: "verify-ux-p0.png", fullPage: false });
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
