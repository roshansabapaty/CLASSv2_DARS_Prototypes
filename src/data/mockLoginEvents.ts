/**
 * Login events seeded for every identifier across the attorney-flow
 * mock cases. Each identifier carries a deliberate narrative so the
 * cross-border drill-down panel renders meaningful stories end-to-end.
 *
 * Phase 3 of the prototype-to-prod merge — comprehensive seeding (all
 * 8 attorney-flow cases) so the Cross-Border reason badge, the
 * impossible-travel chip, the VPN indeterminate path, and the empty-
 * state copy all have at least one real demo path.
 *
 * Phase 4 add-on: LNS-2026-00270 (Swedish phishing operation) — a
 * deliberately simple Stockholm-only narrative so the Consumer User
 * Location Summary column AND the Consumer User Locations drilldown
 * panel light up with real city + country data right after Check
 * Accounts runs, without any cross-border noise.
 *
 * Conventions:
 *   - `identifier` here is the AccountIdentifier.value string (email /
 *     phone / address) — not the internal UUID. The lookup in
 *     `services/loginQuery.ts` filters by exact string match.
 *   - Timestamps are UTC ISO8601 so day-bucketing in `queryLogins` lines
 *     up cleanly across timezones.
 *   - Each story leaves a window of activity ~30 days prior to the
 *     case's `dateServed`, which is the implicit query window used by
 *     `hasCrossBorderLogins` when no explicit range is supplied.
 *
 * Narratives:
 *   LNS-2026-00180 — Spanish enterprise (Madrid/Barcelona + a FR business
 *     trip). In-jurisdiction Spain; cross-border counts on the FR days.
 *   LNS-2026-00150 — Kontoso GmbH enterprise (Munich/Berlin baseline,
 *     occasional Paris). Mostly in-jurisdiction DE.
 *   LNS-2026-00160 — UK consumer CSE-exempt (London only — kept
 *     in-jurisdiction so the CSE narrative isn't muddied with
 *     cross-border noise).
 *   LNS-2026-00200 — French Contoso enterprise (Paris baseline + one
 *     London trip).
 *   LNS-2026-00250 — Polish multi-identifier:
 *       LDID-100001 (witness)   — Warsaw only.
 *       LDID-100002 (journalist) — Warsaw + Brussels + Berlin, IMPOSSIBLE
 *           TRAVEL pair Warsaw 09:30 → Tokyo 11:45 same day, and a single
 *           ProtonVPN session (indeterminate) — anchors the press-freedom
 *           cross-border story.
 *       LDID-100003 (phone)     — Warsaw + Kraków, in-jurisdiction.
 *   LNS-2026-00265 — Greek consumer (Athens + a US (NYC) trip, supports
 *     the Form 3 third-country-conflict story).
 *   LNS-2025-00142 — US Threat to Life:
 *       victim.contact@outlook.com — Recent SF/Oakland trail until the
 *           night of the abduction (last login from a Miami IP — captures
 *           the abductor-controlled session signal).
 *       phone +1 415 555 0167 — Same SF baseline with one Miami event.
 *       address (no events — addresses don't generate logins; surfaces
 *           the empty-state path).
 *   LNS-2025-00125 — UK preservation (Globex UK treasury mailbox —
 *     London only, in-jurisdiction).
 */

import type { LoginEvent } from "../types/crossBorder";

const ua = {
  win: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15",
  iOS: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36",
};

let _id = 0;
const mk = (
  identifier: string,
  timestamp: string,
  ip: string,
  device: string,
  outcome: LoginEvent["outcome"] = "success",
): LoginEvent => ({
  id: `lev-${++_id}`,
  identifier,
  timestamp,
  ip,
  userAgent: device.includes("iPhone")
    ? ua.iOS
    : device.includes("Android")
      ? ua.android
      : device.includes("Mac")
        ? ua.mac
        : ua.win,
  device,
  outcome,
});

export const LOGIN_EVENTS: LoginEvent[] = [
  // ═══ LNS-2026-00180 (Spain, dateServed 2026-05-10) ═════════════════
  // subject-es@corp-iberia.example — Madrid baseline + Barcelona, one
  // FR business trip. In-jurisdiction story with mild cross-border.
  mk("subject-es@corp-iberia.example", "2026-04-13T07:30:00Z", "88.27.142.10", "Windows laptop"),
  mk("subject-es@corp-iberia.example", "2026-04-15T18:14:00Z", "88.27.142.10", "iPhone 15"),
  mk("subject-es@corp-iberia.example", "2026-04-18T09:22:00Z", "80.58.205.66", "Windows laptop"),
  mk("subject-es@corp-iberia.example", "2026-04-22T08:11:00Z", "88.27.142.10", "Windows laptop"),
  mk("subject-es@corp-iberia.example", "2026-04-25T14:33:00Z", "90.84.122.18", "iPhone 15"),
  mk("subject-es@corp-iberia.example", "2026-04-26T09:08:00Z", "90.84.122.18", "Windows laptop"),
  mk("subject-es@corp-iberia.example", "2026-04-29T08:42:00Z", "88.27.142.10", "Windows laptop"),
  mk("subject-es@corp-iberia.example", "2026-05-04T07:55:00Z", "88.27.142.10", "Windows laptop"),
  mk("subject-es@corp-iberia.example", "2026-05-09T08:30:00Z", "88.27.142.10", "Windows laptop"),

  // ═══ LNS-2026-00150 (Germany, dateServed 2026-04-22) ═══════════════
  // Kontoso GmbH — two enterprise mailboxes. Munich + Berlin + a couple
  // Paris days. In-jurisdiction DE story with mild cross-border.
  // cfo@kontoso-de.example
  mk("cfo@kontoso-de.example", "2026-03-24T07:42:00Z", "91.45.198.77", "Windows laptop"),
  mk("cfo@kontoso-de.example", "2026-03-26T18:20:00Z", "91.45.198.77", "iPhone 15"),
  mk("cfo@kontoso-de.example", "2026-03-30T09:11:00Z", "84.158.61.200", "Windows laptop"),
  mk("cfo@kontoso-de.example", "2026-04-02T08:33:00Z", "91.45.198.77", "Windows laptop"),
  mk("cfo@kontoso-de.example", "2026-04-06T14:55:00Z", "90.84.122.18", "Windows laptop"),
  mk("cfo@kontoso-de.example", "2026-04-07T09:18:00Z", "90.84.122.18", "iPhone 15"),
  mk("cfo@kontoso-de.example", "2026-04-12T08:30:00Z", "91.45.198.77", "Windows laptop"),
  mk("cfo@kontoso-de.example", "2026-04-18T08:14:00Z", "91.45.198.77", "Windows laptop"),
  mk("cfo@kontoso-de.example", "2026-04-21T09:30:00Z", "84.158.61.200", "Windows laptop"),
  // ceo@kontoso-de.example — Berlin-heavy
  mk("ceo@kontoso-de.example", "2026-03-25T07:30:00Z", "84.158.61.200", "Mac"),
  mk("ceo@kontoso-de.example", "2026-03-28T18:14:00Z", "84.158.61.200", "iPhone 15"),
  mk("ceo@kontoso-de.example", "2026-04-01T09:22:00Z", "84.158.61.200", "Mac"),
  mk("ceo@kontoso-de.example", "2026-04-05T08:11:00Z", "84.158.61.200", "Mac"),
  mk("ceo@kontoso-de.example", "2026-04-10T14:33:00Z", "84.158.61.200", "Mac"),
  mk("ceo@kontoso-de.example", "2026-04-15T08:42:00Z", "93.214.55.18", "Mac"),
  mk("ceo@kontoso-de.example", "2026-04-19T08:55:00Z", "84.158.61.200", "Mac"),
  mk("ceo@kontoso-de.example", "2026-04-21T08:30:00Z", "84.158.61.200", "Mac"),

  // ═══ LNS-2026-00160 (UK CSE-exempt, dateServed roughly 2026-05-05) ═
  // subject-uk@outlook.com — London only. In-jurisdiction; the CSE
  // policy story is the focus, not cross-border noise.
  mk("subject-uk@outlook.com", "2026-04-06T08:14:00Z", "82.132.244.10", "Windows laptop"),
  mk("subject-uk@outlook.com", "2026-04-09T17:30:00Z", "82.132.244.10", "iPhone 15"),
  mk("subject-uk@outlook.com", "2026-04-13T09:22:00Z", "82.132.244.10", "Windows laptop"),
  mk("subject-uk@outlook.com", "2026-04-18T11:33:00Z", "82.132.244.10", "Windows laptop"),
  mk("subject-uk@outlook.com", "2026-04-23T14:55:00Z", "82.132.244.10", "iPhone 15"),
  mk("subject-uk@outlook.com", "2026-04-28T08:14:00Z", "82.132.244.10", "Windows laptop"),
  mk("subject-uk@outlook.com", "2026-05-02T09:30:00Z", "82.132.244.10", "Windows laptop"),

  // ═══ LNS-2026-00200 (France, dateServed 2026-05-14) ════════════════
  // j.dupont@contoso-fr.com — Paris baseline + one London business trip.
  mk("j.dupont@contoso-fr.com", "2026-04-16T07:42:00Z", "90.84.122.18", "Windows laptop"),
  mk("j.dupont@contoso-fr.com", "2026-04-19T18:20:00Z", "90.84.122.18", "iPhone 15"),
  mk("j.dupont@contoso-fr.com", "2026-04-22T09:11:00Z", "82.66.111.49", "Windows laptop"),
  mk("j.dupont@contoso-fr.com", "2026-04-25T08:33:00Z", "90.84.122.18", "Windows laptop"),
  mk("j.dupont@contoso-fr.com", "2026-04-28T14:55:00Z", "82.132.244.10", "Windows laptop"),
  mk("j.dupont@contoso-fr.com", "2026-04-29T09:18:00Z", "82.132.244.10", "iPhone 15"),
  mk("j.dupont@contoso-fr.com", "2026-05-02T08:30:00Z", "90.84.122.18", "Windows laptop"),
  mk("j.dupont@contoso-fr.com", "2026-05-07T08:14:00Z", "90.84.122.18", "Windows laptop"),
  mk("j.dupont@contoso-fr.com", "2026-05-12T09:30:00Z", "90.84.122.18", "Windows laptop"),

  // ═══ LNS-2026-00250 (Poland, dateServed 2026-05-10) ════════════════
  // Three identifiers. The journalist (LDID-100002) carries the cross-
  // border + impossible-travel + VPN narrative; the other two are in-
  // jurisdiction baselines so the IdentifierTable shows distinct rows.

  // LDID-100001 — witness.observer@outlook.com — Warsaw only
  mk("witness.observer@outlook.com", "2026-04-13T08:14:00Z", "83.21.128.42", "Windows laptop"),
  mk("witness.observer@outlook.com", "2026-04-17T17:30:00Z", "83.21.128.42", "iPhone 15"),
  mk("witness.observer@outlook.com", "2026-04-21T09:22:00Z", "83.21.128.42", "Windows laptop"),
  mk("witness.observer@outlook.com", "2026-04-26T11:33:00Z", "83.21.128.42", "Windows laptop"),
  mk("witness.observer@outlook.com", "2026-05-03T14:55:00Z", "83.21.128.42", "iPhone 15"),
  mk("witness.observer@outlook.com", "2026-05-08T08:14:00Z", "83.21.128.42", "Windows laptop"),

  // LDID-100002 — j.nowak.reporter@dziennik.example — multi-geo +
  // IMPOSSIBLE TRAVEL Warsaw 09:30 → Tokyo 11:45 same day + ProtonVPN
  mk("j.nowak.reporter@dziennik.example", "2026-04-12T08:14:00Z", "83.21.128.42", "Mac"),
  mk("j.nowak.reporter@dziennik.example", "2026-04-14T17:30:00Z", "83.21.128.42", "iPhone 15"),
  // Brussels reporting trip
  mk("j.nowak.reporter@dziennik.example", "2026-04-18T08:33:00Z", "81.246.122.91", "Mac"),
  mk("j.nowak.reporter@dziennik.example", "2026-04-19T14:11:00Z", "81.246.122.91", "iPhone 15"),
  mk("j.nowak.reporter@dziennik.example", "2026-04-20T09:22:00Z", "81.246.122.91", "Mac"),
  // Berlin
  mk("j.nowak.reporter@dziennik.example", "2026-04-24T08:55:00Z", "84.158.61.200", "Mac"),
  mk("j.nowak.reporter@dziennik.example", "2026-04-26T17:22:00Z", "84.158.61.200", "Mac"),
  // Back to Warsaw
  mk("j.nowak.reporter@dziennik.example", "2026-04-30T08:14:00Z", "83.21.128.42", "Mac"),
  // Warsaw 09:30 → Tokyo 11:45 same day — IMPOSSIBLE TRAVEL
  mk("j.nowak.reporter@dziennik.example", "2026-05-04T09:30:00Z", "83.21.128.42", "Mac"),
  mk("j.nowak.reporter@dziennik.example", "2026-05-04T11:45:00Z", "153.232.18.77", "Mac"),
  // One ProtonVPN session — indeterminate
  mk("j.nowak.reporter@dziennik.example", "2026-05-06T22:14:00Z", "45.83.220.15", "Mac"),
  mk("j.nowak.reporter@dziennik.example", "2026-05-09T08:30:00Z", "83.21.128.42", "Mac"),

  // LDID-100003 — +48 502 173 491 — Warsaw + Kraków baseline
  mk("+48 502 173 491", "2026-04-13T08:30:00Z", "83.21.128.42", "Android"),
  mk("+48 502 173 491", "2026-04-19T17:14:00Z", "83.21.128.42", "Android"),
  mk("+48 502 173 491", "2026-04-24T09:22:00Z", "89.207.142.18", "Android"),
  mk("+48 502 173 491", "2026-04-30T11:33:00Z", "83.21.128.42", "Android"),
  mk("+48 502 173 491", "2026-05-07T08:14:00Z", "83.21.128.42", "Android"),

  // ═══ LNS-2026-00265 (Greece, dateServed roughly 2026-05-05) ════════
  // subject.athens@outlook.com — Athens + one NYC trip. Supports the
  // Form 3 third-country-conflict story (cross-border to the US).
  mk("subject.athens@outlook.com", "2026-04-08T07:30:00Z", "94.66.34.108", "Windows laptop"),
  mk("subject.athens@outlook.com", "2026-04-11T18:14:00Z", "94.66.34.108", "iPhone 15"),
  mk("subject.athens@outlook.com", "2026-04-15T09:22:00Z", "85.74.211.46", "Windows laptop"),
  mk("subject.athens@outlook.com", "2026-04-18T08:11:00Z", "94.66.34.108", "Windows laptop"),
  // NYC trip
  mk("subject.athens@outlook.com", "2026-04-22T14:33:00Z", "172.58.122.4", "iPhone 15"),
  mk("subject.athens@outlook.com", "2026-04-23T09:08:00Z", "172.58.122.4", "Windows laptop"),
  mk("subject.athens@outlook.com", "2026-04-25T17:42:00Z", "172.58.122.4", "Windows laptop"),
  // Back to Athens
  mk("subject.athens@outlook.com", "2026-04-29T08:55:00Z", "94.66.34.108", "Windows laptop"),
  mk("subject.athens@outlook.com", "2026-05-03T08:30:00Z", "94.66.34.108", "Windows laptop"),

  // ═══ LNS-2025-00142 (US Threat to Life, dateServed 2025-01-19) ═════
  // victim.contact@outlook.com — SF/Oakland trail until abduction
  // 2025-01-18 22:00 local. Last login is from a Miami IP on the day of
  // the incident — captures the abductor-controlled-session signal.
  mk("victim.contact@outlook.com", "2025-01-02T15:30:00Z", "73.222.14.88", "iPhone 15"),
  mk("victim.contact@outlook.com", "2025-01-05T11:22:00Z", "73.222.14.88", "Mac"),
  mk("victim.contact@outlook.com", "2025-01-08T18:14:00Z", "73.222.14.88", "Mac"),
  mk("victim.contact@outlook.com", "2025-01-11T09:33:00Z", "76.102.30.91", "iPhone 15"),
  mk("victim.contact@outlook.com", "2025-01-13T17:45:00Z", "73.222.14.88", "Mac"),
  mk("victim.contact@outlook.com", "2025-01-16T08:30:00Z", "73.222.14.88", "Mac"),
  mk("victim.contact@outlook.com", "2025-01-18T19:55:00Z", "73.222.14.88", "iPhone 15"),
  // Last login — after the abduction window, Miami IP
  mk("victim.contact@outlook.com", "2025-01-19T06:22:00Z", "67.84.218.40", "iPhone 15"),

  // +1 415 555 0167 — burner phone, mostly SF baseline + one Miami event
  mk("+1 415 555 0167", "2025-01-05T22:14:00Z", "73.222.14.88", "Android"),
  mk("+1 415 555 0167", "2025-01-10T19:30:00Z", "73.222.14.88", "Android"),
  mk("+1 415 555 0167", "2025-01-14T22:55:00Z", "73.222.14.88", "Android"),
  mk("+1 415 555 0167", "2025-01-18T23:11:00Z", "73.222.14.88", "Android"),
  // Burner pings from Miami the morning after — same suspect device
  mk("+1 415 555 0167", "2025-01-19T08:14:00Z", "67.84.218.40", "Android"),

  // 2715 Mission St address — intentionally no events. Addresses don't
  // generate logins; the panel renders its empty state here, which is
  // the realistic UX path for non-account identifiers.

  // ═══ LNS-2025-00125 (UK preservation, dateServed 2025-01-15) ═══════
  // treasury.ops@globex-uk.example — London only. In-jurisdiction
  // enterprise mailbox; no cross-border story here.
  mk("treasury.ops@globex-uk.example", "2024-12-18T07:42:00Z", "82.132.244.10", "Windows laptop"),
  mk("treasury.ops@globex-uk.example", "2024-12-23T18:20:00Z", "82.132.244.10", "Mac"),
  mk("treasury.ops@globex-uk.example", "2024-12-30T09:11:00Z", "82.132.244.10", "Windows laptop"),
  mk("treasury.ops@globex-uk.example", "2025-01-03T08:33:00Z", "82.132.244.10", "Windows laptop"),
  mk("treasury.ops@globex-uk.example", "2025-01-07T14:55:00Z", "82.132.244.10", "Windows laptop"),
  mk("treasury.ops@globex-uk.example", "2025-01-10T08:30:00Z", "82.132.244.10", "Windows laptop"),
  mk("treasury.ops@globex-uk.example", "2025-01-14T09:14:00Z", "82.132.244.10", "Windows laptop"),

  // ═══ LNS-2026-00270 (Sweden, dateServed 2026-05-15) ════════════════
  // Stockholm-only narrative. Single-country in-jurisdiction story so
  // the Consumer User Location Summary column lights up with city +
  // country data and the Consumer User Locations drilldown shows a
  // populated timeline + country summary card without any cross-border
  // complexity. Three IPs total:
  //   - 78.69.142.10  Telia (home)
  //   - 213.114.155.42 Telenor (mobile)
  //   - 90.230.88.117 Comhem  (occasional)
  // Events seeded in May 14 – June 1 so they fall inside the lookup's
  // 30-day window relative to the prototype's "today" (2026-06-02).
  //
  // phisher.target@hotmail.com — LE-provided target (id1). Baseline
  // Stockholm activity across the full window.
  mk("phisher.target@hotmail.com", "2026-05-14T07:42:00Z", "78.69.142.10", "Windows laptop"),
  mk("phisher.target@hotmail.com", "2026-05-15T18:20:00Z", "213.114.155.42", "iPhone 15"),
  mk("phisher.target@hotmail.com", "2026-05-17T09:11:00Z", "78.69.142.10", "Windows laptop"),
  mk("phisher.target@hotmail.com", "2026-05-19T08:33:00Z", "78.69.142.10", "Windows laptop"),
  mk("phisher.target@hotmail.com", "2026-05-21T14:55:00Z", "90.230.88.117", "Windows laptop"),
  mk("phisher.target@hotmail.com", "2026-05-23T09:18:00Z", "213.114.155.42", "iPhone 15"),
  mk("phisher.target@hotmail.com", "2026-05-25T08:30:00Z", "78.69.142.10", "Windows laptop"),
  mk("phisher.target@hotmail.com", "2026-05-28T08:14:00Z", "78.69.142.10", "Windows laptop"),
  mk("phisher.target@hotmail.com", "2026-05-30T19:42:00Z", "213.114.155.42", "iPhone 15"),
  mk("phisher.target@hotmail.com", "2026-06-01T09:30:00Z", "78.69.142.10", "Windows laptop"),

  // phisher.alias@outlook.com — Supplemental alias (id1a). Recent
  // activity only, surfaces the alias is in active use from the same
  // Stockholm base as the LE target.
  mk("phisher.alias@outlook.com", "2026-05-20T11:22:00Z", "78.69.142.10", "Windows laptop"),
  mk("phisher.alias@outlook.com", "2026-05-23T16:45:00Z", "78.69.142.10", "Mac"),
  mk("phisher.alias@outlook.com", "2026-05-26T09:11:00Z", "213.114.155.42", "iPhone 15"),
  mk("phisher.alias@outlook.com", "2026-05-29T20:08:00Z", "78.69.142.10", "Mac"),
  mk("phisher.alias@outlook.com", "2026-06-01T08:42:00Z", "78.69.142.10", "Windows laptop"),

  // gamer.redeemer@outlook.com — Supplemental MSA resolved via XBOX
  // gift-card-registry lookup (id2a). Same Stockholm baseline as the
  // primary target, supporting the demo's "phishing operation funneled
  // micro-payments via XBOX gift cards" narrative.
  mk("gamer.redeemer@outlook.com", "2026-05-16T20:15:00Z", "90.230.88.117", "Windows laptop"),
  mk("gamer.redeemer@outlook.com", "2026-05-19T21:30:00Z", "90.230.88.117", "Windows laptop"),
  mk("gamer.redeemer@outlook.com", "2026-05-22T19:45:00Z", "78.69.142.10", "Windows laptop"),
  mk("gamer.redeemer@outlook.com", "2026-05-25T22:08:00Z", "90.230.88.117", "Windows laptop"),
  mk("gamer.redeemer@outlook.com", "2026-05-28T20:33:00Z", "78.69.142.10", "Windows laptop"),
  mk("gamer.redeemer@outlook.com", "2026-05-31T21:50:00Z", "90.230.88.117", "Windows laptop"),
];
