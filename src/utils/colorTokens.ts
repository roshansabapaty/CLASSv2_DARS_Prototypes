/**
 * colorTokens — semantic color palette used across DARS banner, badge,
 * and chip surfaces. Centralizes the inline hex values that were
 * scattered across components (e.g. `bg-[#fde7e9] text-[#a4262c]`)
 * before audit P2 #9 consolidation.
 *
 * Three consumer paths:
 *
 *   1. **Tailwind classes (preferred for shadcn / Tailwind components):**
 *      Use the semantic Tailwind tokens defined in
 *      `src/styles/globals.css → @theme inline`. E.g.:
 *
 *        <Badge className="bg-danger-bg text-danger-fg border-danger-border" />
 *
 *      Tailwind generates the underlying CSS at build time. Tokens are
 *      single source of truth — change the palette in globals.css and
 *      every consumer updates.
 *
 *   2. **Griffel makeStyles (Fluent v9 components):**
 *      Reference Fluent's own palette tokens via
 *      `@fluentui/react-components` → `tokens.colorPaletteRed*` etc.
 *      The Fluent web theme tokens (e.g. `colorPaletteRedBackground1`)
 *      resolve to the same hex values as the Tailwind tokens below
 *      because both trace back to Microsoft's Fluent 2 palette.
 *
 *   3. **Inline `style={{...}}` or raw JS string composition:**
 *      Import from this module. Each entry exposes `bg / fg / border`
 *      hex strings so any code path can opt in without re-deriving the
 *      values:
 *
 *        import { COLOR_TIER } from "../utils/colorTokens";
 *        <span style={{ color: COLOR_TIER.danger.fg }}>…</span>
 *
 * Add a new tier here AND in globals.css (`:root` block + `@theme
 * inline` block) so all three consumer paths get the new value.
 */

export type ColorTierName =
  | "danger"
  | "warnAmber"
  | "warnOrange"
  | "attention"
  | "success"
  | "infoBlue"
  | "infoPurple";

export interface ColorTier {
  /** Background hex — used for `bg-*-bg` / fill / chip surface. */
  bg: string;
  /** Foreground / text hex — readable on `bg`. */
  fg: string;
  /** Border hex — at full opacity. Use border-{TIER}-border/40 or
   *  /60 when a softer border is needed (matches the existing
   *  `border-[#xxx]/40` pattern across the codebase). */
  border: string;
  /** One-line semantic — when to use this tier. */
  semantic: string;
  /** Matching Tailwind class set — drop in as a className segment. */
  tailwind: { bg: string; fg: string; border: string };
}

export const COLOR_TIER: Record<ColorTierName, ColorTier> = {
  danger: {
    bg: "#fde7e9",
    fg: "#a4262c",
    border: "#a4262c",
    semantic: "Legal veto, blocked, exec review required",
    tailwind: {
      bg: "bg-danger-bg",
      fg: "text-danger-fg",
      border: "border-danger-border",
    },
  },
  warnAmber: {
    bg: "#fff4ce",
    fg: "#7a4f00",
    border: "#a26a00",
    semantic: "Info requested, RFI overdue, conditions",
    tailwind: {
      bg: "bg-warn-amber-bg",
      fg: "text-warn-amber-fg",
      border: "border-warn-amber-border",
    },
  },
  warnOrange: {
    bg: "#fff4e6",
    fg: "#7a3a00",
    border: "#ca5010",
    semantic: "Redirect requested, partial GFR",
    tailwind: {
      bg: "bg-warn-orange-bg",
      fg: "text-warn-orange-fg",
      border: "border-warn-orange-border",
    },
  },
  attention: {
    bg: "#fcd5b5",
    fg: "#7a3a00",
    border: "#ca5010",
    semantic:
      "Reviewed pickup — attorney decision drafted, RS / TS to act",
    tailwind: {
      bg: "bg-attention-bg",
      fg: "text-attention-fg",
      border: "border-attention-border",
    },
  },
  success: {
    bg: "#dff6dd",
    fg: "#0b6a0b",
    border: "#107c10",
    semantic: "GFR cleared, escalation complete (unack'd), derogation absent",
    tailwind: {
      bg: "bg-success-bg",
      fg: "text-success-fg",
      border: "border-success-border",
    },
  },
  infoBlue: {
    bg: "#deecf9",
    fg: "#004578",
    border: "#0078d4",
    semantic: "Informational, peer review fallback",
    tailwind: {
      bg: "bg-info-blue-bg",
      fg: "text-info-blue-fg",
      border: "border-info-blue-border",
    },
  },
  infoPurple: {
    bg: "#f3f0fa",
    fg: "#5c2d91",
    border: "#8764b8",
    semantic: "Tier 3 enterprise context, peer-tier neutral",
    tailwind: {
      bg: "bg-info-purple-bg",
      fg: "text-info-purple-fg",
      border: "border-info-purple-border",
    },
  },
};

/**
 * Convenience: a pre-composed `bg + fg + border/40` class string ready
 * to drop into a `className=`. Matches the inline pattern that was
 * previously scattered as `bg-[#fde7e9] text-[#a4262c] border-[#a4262c]/40`.
 */
export function tierClasses(tier: ColorTierName, borderOpacity: 40 | 60 = 40): string {
  const t = COLOR_TIER[tier];
  return `${t.tailwind.bg} ${t.tailwind.fg} ${t.tailwind.border}/${borderOpacity}`;
}
