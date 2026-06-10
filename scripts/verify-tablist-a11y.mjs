/**
 * Verify the quick-filter tablist a11y wiring on both Cases page and
 * Attorney Dashboard:
 *
 *   1. Every tab carries `id="quick-filter-tab-{key}"`,
 *      `role="tab"`, `aria-controls="quick-filter-panel"`.
 *   2. Roving tabIndex: exactly one tab has `tabindex="0"` (the
 *      active one) and the rest have `tabindex="-1"`.
 *   3. A single `#quick-filter-panel` exists with
 *      `role="tabpanel"` and `aria-labelledby` pointing at the
 *      currently-active tab's id.
 *   4. ArrowRight on the focused active tab moves activation +
 *      focus to the next tab, wrapping at the end.
 *   5. ArrowLeft wraps at the start.
 *   6. Home jumps to the first tab; End jumps to the last.
 *   7. The aria-labelledby on #quick-filter-panel updates to match
 *      the new active tab after a key press.
 *
 * Runs the checks against Cases page first, then navigates to the
 * Attorney Dashboard and runs the equivalent set with the AD
 * tablist's own id namespace.
 */
import { chromium } from "playwright";
import { Verdict } from "./_verify-utils.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const verdict = new Verdict("tablist-a11y");

async function readTablistState(page) {
  return await page.evaluate(() => {
    const tablist = document.querySelector('[role="tablist"]');
    if (!tablist) return null;
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]')).map(
      (t) => ({
        id: t.id,
        ariaControls: t.getAttribute("aria-controls"),
        ariaSelected: t.getAttribute("aria-selected"),
        tabIndex: t.getAttribute("tabindex"),
      }),
    );
    const panel = document.getElementById("quick-filter-panel");
    return {
      tabs,
      panel: panel
        ? {
            role: panel.getAttribute("role"),
            ariaLabelledBy: panel.getAttribute("aria-labelledby"),
          }
        : null,
    };
  });
}

function assertCommonShape(label, state) {
  if (!state) {
    verdict.fail(`${label}: tablist not found`);
    return;
  }
  // Every tab has the id, aria-controls, and a tabindex
  for (const t of state.tabs) {
    verdict.assert(
      /^quick-filter-tab-/.test(t.id ?? ""),
      `${label}: tab id "${t.id}" doesn't match quick-filter-tab-*`,
    );
    verdict.assert(
      t.ariaControls === "quick-filter-panel",
      `${label}: tab "${t.id}" aria-controls is "${t.ariaControls}", expected "quick-filter-panel"`,
    );
  }
  // Roving tabIndex: exactly one tab has tabindex="0", others "-1"
  const activeTabs = state.tabs.filter((t) => t.tabIndex === "0");
  const inactiveTabs = state.tabs.filter((t) => t.tabIndex === "-1");
  verdict.assert(
    activeTabs.length === 1,
    `${label}: roving tabIndex broken — ${activeTabs.length} tabs have tabindex="0" (expected 1)`,
  );
  verdict.assert(
    inactiveTabs.length === state.tabs.length - 1,
    `${label}: roving tabIndex broken — ${inactiveTabs.length} tabs have tabindex="-1" (expected ${state.tabs.length - 1})`,
  );
  // The tabindex=0 tab is the aria-selected=true tab
  const activeSelectedConsistent =
    activeTabs[0]?.ariaSelected === "true";
  verdict.assert(
    activeSelectedConsistent,
    `${label}: the tabindex=0 tab is not aria-selected=true`,
  );
  // Panel exists with the right wiring
  verdict.assert(
    state.panel !== null,
    `${label}: #quick-filter-panel not found`,
  );
  verdict.assert(
    state.panel?.role === "tabpanel",
    `${label}: #quick-filter-panel role is "${state.panel?.role}", expected "tabpanel"`,
  );
  // aria-labelledby points at the active tab's id
  const activeTabId = activeTabs[0]?.id;
  verdict.assert(
    state.panel?.ariaLabelledBy === activeTabId,
    `${label}: panel aria-labelledby is "${state.panel?.ariaLabelledBy}", expected "${activeTabId}"`,
  );
}

async function pressKeyAndReadActive(page, key) {
  await page.keyboard.press(key);
  await page.waitForTimeout(150);
  return await page.evaluate(() => {
    const t = document.querySelector('[role="tab"][tabindex="0"]');
    return t?.id ?? null;
  });
}

async function runFor(page, label, navigatePath) {
  if (navigatePath) {
    await page.evaluate((pred) => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const target = buttons.find((b) =>
        new RegExp(pred, "i").test(b.getAttribute("aria-label") ?? ""),
      );
      if (target) target.click();
    }, navigatePath);
    await page.waitForTimeout(1500);
  }

  console.log("");
  console.log(`=== ${label} ===`);

  // 1–3. Shape
  let state = await readTablistState(page);
  assertCommonShape(label, state);
  console.log(`  Tabs: ${state?.tabs.length}`);
  console.log(`  Active: ${state?.tabs.find((t) => t.tabIndex === "0")?.id}`);
  console.log(`  Panel aria-labelledby: ${state?.panel?.ariaLabelledBy}`);

  if (!state || state.tabs.length < 2) return;

  // Focus the active tab via keyboard navigation through Tab. We just
  // call .focus() directly via the DOM since Playwright's Tab cycle
  // can be unstable across builds.
  await page.evaluate(() => {
    const t = document.querySelector(
      '[role="tab"][tabindex="0"]',
    );
    (t)?.focus();
  });
  await page.waitForTimeout(150);

  // 4. ArrowRight cycles forward
  const initialActive = state.tabs.find((t) => t.tabIndex === "0")?.id;
  const initialIdx = state.tabs.findIndex((t) => t.id === initialActive);
  const expectedAfterRight = state.tabs[(initialIdx + 1) % state.tabs.length].id;
  const afterRight = await pressKeyAndReadActive(page, "ArrowRight");
  console.log(`  ArrowRight: ${initialActive} → ${afterRight}`);
  verdict.assert(
    afterRight === expectedAfterRight,
    `${label}: ArrowRight produced "${afterRight}", expected "${expectedAfterRight}"`,
  );

  // 5. Home jumps to first
  const firstId = state.tabs[0].id;
  const afterHome = await pressKeyAndReadActive(page, "Home");
  console.log(`  Home → ${afterHome}`);
  verdict.assert(
    afterHome === firstId,
    `${label}: Home produced "${afterHome}", expected "${firstId}"`,
  );

  // 6. ArrowLeft from first wraps to last
  const lastId = state.tabs[state.tabs.length - 1].id;
  const afterLeftWrap = await pressKeyAndReadActive(page, "ArrowLeft");
  console.log(`  ArrowLeft (from first → wrap to last): ${afterLeftWrap}`);
  verdict.assert(
    afterLeftWrap === lastId,
    `${label}: ArrowLeft wrap produced "${afterLeftWrap}", expected "${lastId}"`,
  );

  // 7. End jumps to last (already there — verify it's stable)
  const afterEnd = await pressKeyAndReadActive(page, "End");
  verdict.assert(
    afterEnd === lastId,
    `${label}: End produced "${afterEnd}", expected "${lastId}"`,
  );

  // 8. Panel aria-labelledby tracks the new active tab
  state = await readTablistState(page);
  verdict.assert(
    state?.panel?.ariaLabelledBy === lastId,
    `${label}: after End, panel aria-labelledby is "${state?.panel?.ariaLabelledBy}", expected "${lastId}"`,
  );

  // Reset to "all" / first tab for the next test surface so we don't
  // poison cross-surface state via sessionStorage autosave.
  await page.evaluate(() => {
    const first = document.querySelector('[role="tab"]');
    (first)?.click();
  });
  await page.waitForTimeout(300);
}

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
  await page.addInitScript(() => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {
      /* may be blocked */
    }
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // ── Cases page ─────────────────────────────────────────────────────
  await runFor(page, "Cases page", null);

  // ── Attorney Dashboard ─────────────────────────────────────────────
  await runFor(page, "Attorney Dashboard", "Attorney Dashboard");

  console.log("");
  console.log(`Page / console errors: ${errors.length}`);
  errors.slice(0, 5).forEach((e) => console.log(`  • ${e.slice(0, 200)}`));

  await page.screenshot({
    path: "verify-tablist-a11y.png",
    fullPage: false,
  });
  await browser.close();
  verdict.assert(errors.length === 0, `${errors.length} page / console errors`);
  verdict.finish();
}

main().catch((e) => {
  console.error(e);
  console.log("");
  console.log(`RESULT: FAIL (tablist-a11y) — uncaught: ${e.message}`);
  process.exit(1);
});
