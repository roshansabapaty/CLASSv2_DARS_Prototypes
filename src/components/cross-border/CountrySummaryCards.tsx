/**
 * CountrySummaryCards — country-keyed grid of login counts surfaced in
 * the LoginLocationPanel. Each card carries a left-border accent for
 * its jurisdiction status (green = in-jurisdiction, orange =
 * cross-border, neutral = indeterminate) and any VPN / Tor flags.
 *
 * Phase 3 of the prototype-to-prod merge — ported from the prototype's
 * `src/components/cross-border/CountrySummaryCards.tsx` with Griffel
 * shorthand borders expanded per [docs/UI_LIBRARY_POLICY.md](C:/R/DARS_eEvidence/docs/UI_LIBRARY_POLICY.md).
 */

import {
  Badge,
  Body1,
  Caption1,
  Subtitle2,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from "@fluentui/react-components";
import {
  GlobeProhibitedFilled,
  QuestionCircleFilled,
} from "@fluentui/react-icons";
import { useId } from "react";
import type { CountrySummary } from "../../types/crossBorder";

const useStyles = makeStyles({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalM,
    listStyleType: "none",
    paddingLeft: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  card: {
    paddingTop: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    paddingBottom: tokens.spacingHorizontalL,
    paddingLeft: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "4px",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusLarge,
    borderTopRightRadius: tokens.borderRadiusLarge,
    borderBottomLeftRadius: tokens.borderRadiusLarge,
    borderBottomRightRadius: tokens.borderRadiusLarge,
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
  },
  cardInJurisdiction: {
    borderLeftColor: tokens.colorPaletteGreenBorder2,
  },
  cardCrossBorder: {
    borderLeftColor: tokens.colorPaletteDarkOrangeBorder2,
    backgroundColor: tokens.colorPaletteDarkOrangeBackground1,
  },
  cardIndeterminate: {
    borderLeftColor: tokens.colorNeutralStroke1,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    columnGap: tokens.spacingHorizontalS,
  },
  flag: {
    fontSize: "28px",
    lineHeight: 1,
  },
  badges: {
    display: "flex",
    columnGap: tokens.spacingHorizontalXS,
    rowGap: tokens.spacingVerticalXS,
    flexWrap: "wrap",
  },
  meta: {
    color: tokens.colorNeutralForeground3,
  },
  count: {
    fontSize: "32px",
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: 1,
    color: tokens.colorBrandForeground1,
  },
});

function flagEmoji(cc: string): string {
  if (cc.length !== 2) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + cc.charCodeAt(0) - 65,
    A + cc.charCodeAt(1) - 65,
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface Props {
  summaries: CountrySummary[];
}

export function CountrySummaryCards({ summaries }: Props) {
  const styles = useStyles();
  const baseId = useId();

  return (
    <ul className={styles.grid} aria-label="Login counts by country">
      {summaries.map((s) => {
        const cardClass = mergeClasses(
          styles.card,
          s.jurisdiction === "in_jurisdiction" && styles.cardInJurisdiction,
          s.jurisdiction === "cross_border" && styles.cardCrossBorder,
          s.jurisdiction === "indeterminate" && styles.cardIndeterminate,
        );
        const descId = `${baseId}-${s.countryCode}-desc`;
        return (
          <li
            key={s.countryCode}
            className={cardClass}
            aria-describedby={descId}
          >
            <div className={styles.header}>
              <div>
                <Subtitle2 as="h3">
                  <span className={styles.flag} aria-hidden="true">
                    {flagEmoji(s.countryCode)}
                  </span>{" "}
                  {s.country}
                </Subtitle2>
                <Caption1 as="p" className={styles.meta}>
                  {s.cities.join(", ")}
                </Caption1>
              </div>
              <div className={styles.badges}>
                {s.jurisdiction === "cross_border" && (
                  <Tooltip
                    content="Apparent country is outside the issuing authority's jurisdiction"
                    relationship="description"
                  >
                    <Badge
                      appearance="filled"
                      color="warning"
                      icon={<GlobeProhibitedFilled />}
                    >
                      Cross-border
                    </Badge>
                  </Tooltip>
                )}
                {s.jurisdiction === "indeterminate" && (
                  <Tooltip
                    content="True location unclear (VPN/Tor/unknown)"
                    relationship="description"
                  >
                    <Badge
                      appearance="outline"
                      color="subtle"
                      icon={<QuestionCircleFilled />}
                    >
                      Indeterminate
                    </Badge>
                  </Tooltip>
                )}
                {s.jurisdiction === "in_jurisdiction" && (
                  <Badge appearance="outline" color="success">
                    In-jurisdiction
                  </Badge>
                )}
                {s.hasVpn && (
                  <Badge appearance="filled" color="warning">
                    VPN
                  </Badge>
                )}
                {s.hasTor && (
                  <Badge appearance="filled" color="danger">
                    Tor
                  </Badge>
                )}
              </div>
            </div>

            <p aria-label={`${s.loginCount} logins`} style={{ margin: 0 }}>
              <span className={styles.count} aria-hidden="true">
                {s.loginCount}
              </span>
              <Body1 as="span" style={{ display: "block" }}>
                logins
              </Body1>
            </p>

            <Caption1 as="p" id={descId} className={styles.meta}>
              {fmtDate(s.firstSeen)} → {fmtDate(s.lastSeen)}
              <br />
              {s.uniqueIps.length} unique IP
              {s.uniqueIps.length === 1 ? "" : "s"}
            </Caption1>
          </li>
        );
      })}
    </ul>
  );
}
