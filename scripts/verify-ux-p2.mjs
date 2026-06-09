/**
 * Verify the P2 UX changes:
 *
 *   #10 — BadgeFilterPopover: Any/All toggle is always visible.
 *         When ≤1 badge selected, it's disabled with helper text;
 *         when ≥2 selected, it's interactive.
 *
 *   #9  — Semantic color tier tokens generate working CSS via Tailwind
 *         v4 @theme inline + globals.css :root.
 *         Operational badges (GFR / escalation / correspondence) now
 *         use `bg-danger-bg / bg-warn-amber-bg / bg-attention-bg`
 *         etc. — should render with the same visible hex but via
 *         centralized tokens.
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

  // ── P2 #9 — Color tokens generate working CSS ─────────────────────────
  console.log("=== P2 #9 — Semantic color tokens render ===");
  // Visit a case-form page, then back to queue, and check that the
  // expected operational badge colors resolve.
  const tokenCheck = await page.evaluate(() => {
    // Construct a test element with the new semantic classes and
    // read the computed background color. If Tailwind picked up the
    // tokens, getComputedStyle will return a non-empty value matching
    // the hex defined in globals.css.
    const probe = document.createElement("div");
    probe.className = "bg-danger-bg";
    probe.style.position = "fixed";
    probe.style.top = "-100px";
    probe.style.width = "10px";
    probe.style.height = "10px";
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).backgroundColor;
    document.body.removeChild(probe);
    return computed;
  });
  // #fde7e9 == rgb(253, 231, 233)
  const tokenWorks = /253.*231.*233|fde7e9/i.test(tokenCheck);
  console.log(
    `  bg-danger-bg resolves to expected color:     ${tokenWorks ? "YES" : "NO"} (got: ${tokenCheck})`,
  );

  // Verify an escalation badge in the queue uses the new token class.
  const badgeUsesToken = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("[class]"));
    const escBadge = els.find((el) =>
      /Attorney (Escalated|Requests|Reviewed|Escalation Complete)/.test(
        el.textContent ?? "",
      ),
    );
    if (!escBadge) return null;
    const cls = escBadge.className;
    return {
      usesSemanticBg:
        /bg-(danger|warn-amber|warn-orange|attention|success|info-purple)-bg/.test(
          cls,
        ),
      usesRawHex: /bg-\[#[0-9a-fA-F]{6}\]/.test(cls),
      classes: cls.slice(0, 250),
    };
  });
  if (!badgeUsesToken) {
    console.log("  No escalation badge in initial queue render.");
  } else {
    console.log(
      `  Escalation badge uses semantic tokens:        ${badgeUsesToken.usesSemanticBg ? "YES" : "NO"}`,
    );
    console.log(
      `  Escalation badge no longer uses raw hex:      ${badgeUsesToken.usesRawHex ? "NO (still has raw hex)" : "YES"}`,
    );
  }

  // ── P2 #10 — BadgeFilterPopover Any/All toggle visibility ────────────
  console.log("");
  console.log("=== P2 #10 — Any/All toggle visibility ===");
  // Open the "+ Add filter" menu → "Operational badges" filter.
  const addFilterBtn = page
    .locator("button")
    .filter({ hasText: /Add filter/i })
    .first();
  if ((await addFilterBtn.count()) === 0) {
    console.log("  Could not locate '+ Add filter' button.");
  } else {
    await addFilterBtn.click({ force: true });
    await page.waitForTimeout(400);
    // Click "Operational badges" in the menu — that adds the chip and
    // auto-opens its popover (defaultOpen={newlyAddedFilterId === id}).
    const badgesMenuItem = page
      .locator('[role="menuitem"], button, div')
      .filter({ hasText: /Operational badges/i })
      .first();
    if ((await badgesMenuItem.count()) > 0) {
      await badgesMenuItem.click({ force: true });
      await page.waitForTimeout(700);
    } else {
      console.log("  (could not find 'Operational badges' menu item)");
    }
    // Toggle visibility check — the BadgeFilterPopover may have opened
    // automatically because of `defaultOpen` for the just-added chip.
    // Look for the radiogroup labelled "Badge filter match mode".
    const toggleVisible = await page.evaluate(() => {
      const rg = document.querySelector(
        '[role="radiogroup"][aria-label*="match mode" i]',
      );
      if (!rg) return { visible: false };
      const disabled = rg.getAttribute("aria-disabled") === "true";
      const helperText = rg.parentElement?.querySelector("p")?.textContent ?? "";
      return {
        visible: true,
        disabled,
        helperText: helperText.slice(0, 100),
      };
    });
    if (!toggleVisible.visible) {
      console.log(
        "  Match mode toggle NOT visible (popover may not be open).",
      );
    } else {
      console.log(
        `  Match mode toggle visible (before any selection): YES`,
      );
      console.log(
        `  Toggle disabled when ≤1 selection:               ${toggleVisible.disabled ? "YES" : "NO"}`,
      );
      console.log(
        `  Helper text explains what it does:                "${toggleVisible.helperText}"`,
      );
    }
  }

  console.log("");
  console.log(`Page / console errors:                         ${errors.length}`);
  if (errors.length) {
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 240)}`));
  }

  await page.screenshot({ path: "verify-ux-p2.png", fullPage: false });
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
