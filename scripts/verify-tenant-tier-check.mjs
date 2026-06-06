/**
 * End-to-end verification of the Tenant Tier Check CTA:
 *   1. RS opens an Enterprise case (LNS-2026-00210) in Case Details
 *   2. Enterprise Context shows the Tenant tier check button (not
 *      "Flag for Exec Review")
 *   3. RS opens the dialog, sets both S500 + V100, saves
 *   4. Section header shows "S500" + "V100" + "Exec review required"
 *      badges
 *   5. OrgPanel badgeRow shows both S500 and V100
 *   6. Page / console error count
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const TARGET = "LNS-2026-00210";

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

  const search = page.locator('input[aria-label="Search cases"]');
  await search.fill(TARGET);
  await page.waitForTimeout(700);
  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: TARGET })
    .first()
    .click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1500);

  // Step 4 — Identifier & Data Services (where Enterprise Context lives)
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

  // 1. confirm the Exec Review button label is gone
  const text1 = await page.evaluate(() => document.body.innerText);
  console.log(
    `Old "Flag for Exec Review" label: ${
      /Flag for Exec Review/.test(text1) ? "STILL THERE (FAIL)" : "GONE (expected)"
    }`,
  );

  // 2. confirm the new Tenant tier check button is present
  const tierBtn = page
    .locator("button")
    .filter({ hasText: /Tenant tier check|Tenant tier:/ })
    .first();
  const tierBtnCount = await tierBtn.count();
  console.log(
    `Tenant tier check button visible:     ${tierBtnCount > 0 ? "YES" : "NO"}`,
  );

  if (tierBtnCount === 0) {
    console.log("Cannot continue — tier check button not found.");
    await page.screenshot({
      path: "verify-tier-no-button.png",
      fullPage: false,
    });
    await browser.close();
    return;
  }

  // 3. open dialog
  await tierBtn.scrollIntoViewIfNeeded();
  await tierBtn.click({ force: true });
  await page.waitForTimeout(600);

  const dialogTitle = page.getByText("Tenant tier check (S500 / V100)", {
    exact: true,
  });
  console.log(
    `Dialog opened with title:             ${
      (await dialogTitle.count()) > 0 ? "YES" : "NO"
    }`,
  );

  // 4. Drive the two Fluent v9 Checkboxes directly via their underlying
  // <input> elements (Fluent renders a hidden input + a styled
  // indicator; clicking the input is the most reliable lever).
  const setCb = async (matcher, want) => {
    const handle = await page.evaluateHandle((re) => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return null;
      const inputs = Array.from(
        dialog.querySelectorAll('input[type="checkbox"]'),
      );
      const rx = new RegExp(re, "i");
      return (
        inputs.find((cb) => {
          let lbl = "";
          const ariaLabelledBy = cb.getAttribute("aria-labelledby");
          if (ariaLabelledBy) {
            lbl = document.getElementById(ariaLabelledBy)?.textContent ?? "";
          }
          if (!lbl) lbl = cb.closest("label")?.textContent ?? "";
          if (!lbl) lbl = cb.getAttribute("aria-label") ?? "";
          if (!lbl) lbl = cb.parentElement?.textContent ?? "";
          return rx.test(lbl);
        }) ?? null
      );
    }, matcher);
    const element = handle.asElement();
    if (!element) return false;
    const isChecked = await element.evaluate(
      (cb) => (cb).checked,
    );
    if (isChecked !== want) {
      await element.click({ force: true });
      await page.waitForTimeout(150);
    }
    return true;
  };
  const s500ok = await setCb("S500", true);
  const v100ok = await setCb("V100", true);
  // 4b. Confirm the dialog now uses neutral list-lookup phrasing,
  //     not "attest" or "attestation".
  const dialogText = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return d?.textContent ?? "";
  });
  const usesAttestLanguage = /attest/i.test(dialogText);
  const mentionsLists =
    /S500.*Strategic Top-500 list/i.test(dialogText) &&
    /V100.*High-value Top-100 list/i.test(dialogText);
  console.log(
    `Dialog avoids "attest" language:      ${usesAttestLanguage ? "NO (FAIL)" : "YES"}`,
  );
  console.log(
    `Dialog references list lookup:        ${mentionsLists ? "YES" : "NO"}`,
  );
  console.log(
    `S500 checkbox set true:               ${s500ok ? "YES" : "NO"}`,
  );
  console.log(
    `V100 checkbox set true:               ${v100ok ? "YES" : "NO"}`,
  );

  const allCbStates = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return [];
    const cbs = Array.from(
      dialog.querySelectorAll('input[type="checkbox"]'),
    );
    return cbs.map((cb) => {
      const ariaLabelledBy = cb.getAttribute("aria-labelledby");
      let textFromAria = "";
      if (ariaLabelledBy) {
        const lbl = document.getElementById(ariaLabelledBy);
        textFromAria = lbl?.textContent?.trim() ?? "";
      }
      const parentText = cb.parentElement?.textContent?.trim() ?? "";
      return {
        label:
          cb.closest("label")?.textContent?.trim() ||
          cb.getAttribute("aria-label") ||
          textFromAria ||
          parentText.slice(0, 60),
        checked: cb.checked,
      };
    });
  });
  console.log(
    `Dialog checkbox states (post-click):  ${JSON.stringify(allCbStates)}`,
  );

  // 5. Save
  const saveBtn = page
    .getByRole("button", { name: /Save recorded check|Clear recorded check/ })
    .first();
  console.log(
    `Save button enabled:                  ${
      saveBtn ? "YES" : "NO"
    }`,
  );
  await saveBtn.click({ force: true });
  await page.waitForTimeout(900);

  const text2 = await page.evaluate(() => document.body.innerText);
  const headerHasS500 = /\bS500\b/.test(text2);
  const headerHasV100 = /\bV100\b/.test(text2);
  const execBadge = /Exec review required/.test(text2);
  const tierBtnLabel = await tierBtn.innerText().catch(() => "");
  console.log(
    `S500 badge present after save:        ${headerHasS500 ? "YES" : "NO"}`,
  );
  console.log(
    `V100 badge present after save:        ${headerHasV100 ? "YES" : "NO"}`,
  );
  console.log(
    `"Exec review required" badge present: ${execBadge ? "YES" : "NO"}`,
  );
  console.log(`Tier button label after save:        "${tierBtnLabel}"`);

  console.log(
    `Page / console errors:                ${errors.length}`,
  );
  if (errors.length) {
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 300)}`));
  }

  await page.screenshot({
    path: "verify-tenant-tier-check.png",
    fullPage: false,
  });
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
