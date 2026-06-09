/**
 * Verify the Cases page header rework:
 *   - "N cases found" subtitle removed
 *   - Briefcase icon next to "Cases" word
 *   - Primary header style (large + bold)
 *   - ~60px top padding above the header
 */
import { chromium } from "playwright";
import { Verdict } from "./_verify-utils.mjs";

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

  const headerInfo = await page.evaluate(() => {
    // Find the queue page's <h1>Cases</h1> specifically — there's also
    // an app-shell title earlier in the DOM, so just `querySelector('h1')`
    // grabs the wrong one.
    const h1 = Array.from(document.querySelectorAll("h1")).find(
      (h) => h.textContent?.trim() === "Cases",
    );
    if (!h1) return null;
    // The wrapper carrying `pt-[60px]` is two parents up (icon-row → flex row).
    const wrapper = h1.parentElement?.parentElement ?? null;
    const computed = getComputedStyle(h1);
    const wrapperComputed = wrapper ? getComputedStyle(wrapper) : null;
    const text = h1.textContent ?? "";
    const icon = h1.parentElement?.querySelector("svg");
    // Search ONLY visible nodes (skip .sr-only) for the legacy subtitle.
    const visibleSubtitle = Array.from(
      document.querySelectorAll("p, span, div"),
    )
      .filter((el) => !el.closest(".sr-only"))
      .map((el) => el.textContent ?? "")
      .find((t) => /^\s*\d+\s+cases?\s+found\s*$/.test(t));
    return {
      h1Text: text,
      h1FontSize: computed.fontSize,
      h1FontWeight: computed.fontWeight,
      h1HasIconSibling: !!icon,
      wrapperPaddingTop: wrapperComputed?.paddingTop ?? "(none)",
      casesFoundSubtitlePresent: !!visibleSubtitle,
    };
  });

  console.log("=== Cases page header ===");
  if (!headerInfo) {
    console.log("  H1 not found.");
  } else {
    console.log(
      `  H1 text:                              "${headerInfo.h1Text}"`,
    );
    console.log(
      `  H1 font-size (target 30px / text-3xl):  ${headerInfo.h1FontSize}`,
    );
    console.log(
      `  H1 font-weight (target 700 / bold):     ${headerInfo.h1FontWeight}`,
    );
    console.log(
      `  Icon next to "Cases":                   ${headerInfo.h1HasIconSibling ? "YES" : "NO"}`,
    );
    console.log(
      `  Wrapper padding-top (target 60px):      ${headerInfo.wrapperPaddingTop}`,
    );
    console.log(
      `  Legacy "N cases found" subtitle gone:   ${headerInfo.casesFoundSubtitlePresent ? "NO (still there)" : "YES"}`,
    );
  }

  console.log("");
  console.log(`Page / console errors:                    ${errors.length}`);
  if (errors.length) {
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 240)}`));
  }

  await page.screenshot({ path: "verify-cases-header.png", fullPage: false });
  await browser.close();

  const verdict = new Verdict("cases-header");
  verdict.assert(!!headerInfo, "Cases <h1> not found on page");
  if (headerInfo) {
    verdict.assert(
      headerInfo.h1Text === "Cases",
      `H1 text "${headerInfo.h1Text}" ≠ "Cases"`,
    );
    // Tailwind `text-3xl` resolves to 1.875rem; our root is 14px so
    // that's 26.25px. Verify the treatment ("clearly larger than
    // body / ≥ 24px") rather than pinning a specific resolution.
    verdict.assert(
      parseFloat(headerInfo.h1FontSize) >= 24,
      `H1 font-size ${headerInfo.h1FontSize} < 24px (text-3xl treatment lost)`,
    );
    verdict.assert(
      Number(headerInfo.h1FontWeight) >= 700,
      `H1 font-weight ${headerInfo.h1FontWeight} < 700 (bold)`,
    );
    verdict.assert(
      headerInfo.h1HasIconSibling,
      "No SVG icon next to the Cases H1",
    );
    verdict.assert(
      headerInfo.wrapperPaddingTop === "60px",
      `Header wrapper padding-top ${headerInfo.wrapperPaddingTop} ≠ 60px`,
    );
    verdict.assert(
      !headerInfo.casesFoundSubtitlePresent,
      'Legacy "N cases found" subtitle still rendering',
    );
  }
  verdict.assert(errors.length === 0, `${errors.length} page / console errors`);
  verdict.finish();
}

main().catch((e) => {
  console.error(e);
  console.log("");
  console.log(`RESULT: FAIL (cases-header) — uncaught: ${e.message}`);
  process.exit(1);
});
