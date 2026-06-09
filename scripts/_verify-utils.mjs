/**
 * Shared assertion helper for verify-* scripts.
 *
 * Usage at the bottom of a verifier:
 *
 *   import { Verdict } from "./_verify-utils.mjs";
 *   const verdict = new Verdict("cases-header");
 *   verdict.assert(headerInfo.h1FontSize === "30px",
 *                  `H1 font-size ${headerInfo.h1FontSize} ≠ 30px`);
 *   ...
 *   await browser.close();
 *   verdict.finish();  // prints RESULT: PASS/FAIL and exits 0/1
 *
 * The aggregator (`verify-ui.mjs`) treats the exit code as
 * authoritative; the `RESULT:` line is informational for humans
 * reading the transcript.
 */
export class Verdict {
  constructor(name) {
    this.name = name;
    this.failures = [];
  }

  assert(cond, msg) {
    if (!cond) this.failures.push(msg);
  }

  fail(msg) {
    this.failures.push(msg);
  }

  /** Print RESULT line and exit 0 / 1. */
  finish() {
    console.log("");
    if (this.failures.length === 0) {
      console.log(`RESULT: PASS (${this.name})`);
      process.exit(0);
    }
    console.log(
      `RESULT: FAIL (${this.name}) — ${this.failures.length} failure${this.failures.length === 1 ? "" : "s"}`,
    );
    this.failures.forEach((m) => console.log(`  ✗ ${m}`));
    process.exit(1);
  }
}
