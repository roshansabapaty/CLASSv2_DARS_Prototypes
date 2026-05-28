/**
 * ResultsHeader — top section of the LoginLocationPanel drawer. Shows
 * the identifier value, query range, issuing-authority context, and the
 * cross-border / indeterminate / in-jurisdiction counts with their
 * status badges. Surfaces the impossible-travel warning when at least
 * one pair was flagged.
 *
 * Phase 3 of the prototype-to-prod merge — ported from the prototype's
 * `src/components/cross-border/ResultsHeader.tsx`.
 */

import {
  Badge,
  Body1,
  Subtitle1,
  Title3,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  GlobeProhibitedFilled,
  QuestionCircleFilled,
  WarningFilled,
} from "@fluentui/react-icons";
import type { CrossBorderQueryResult } from "../../types/crossBorder";

const useStyles = makeStyles({
  wrap: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
  },
  meta: {
    color: tokens.colorNeutralForeground3,
  },
  warn: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    color: tokens.colorPaletteRedForeground1,
    marginTop: tokens.spacingVerticalXS,
  },
  jurisdictionRow: {
    display: "flex",
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: tokens.spacingVerticalS,
  },
  ratio: {
    fontWeight: tokens.fontWeightSemibold,
  },
});

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function flagEmoji(cc: string): string {
  if (cc.length !== 2) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + cc.charCodeAt(0) - 65,
    A + cc.charCodeAt(1) - 65,
  );
}

export function ResultsHeader({
  result,
}: {
  result: CrossBorderQueryResult;
}) {
  const styles = useStyles();
  const countries = result.countrySummaries.length;
  const agency = result.issuingAgency;

  return (
    <div className={styles.wrap}>
      <Title3 as="h2">{result.identifier}</Title3>
      <Subtitle1 as="p">
        {result.totalEvents} login{result.totalEvents === 1 ? "" : "s"} from{" "}
        {countries} countr{countries === 1 ? "y" : "ies"}
      </Subtitle1>
      <Body1 as="p" className={styles.meta}>
        Range {fmtDate(result.rangeStart)} → {fmtDate(result.rangeEnd)}
      </Body1>

      {agency && result.totalEvents > 0 && (
        <div className={styles.jurisdictionRow}>
          <Body1 as="p">
            Issuing authority:{" "}
            <strong>
              <span aria-hidden="true">{flagEmoji(agency.countryCode)} </span>
              {agency.shortName}
            </strong>{" "}
            ({agency.country})
          </Body1>
          <Badge
            appearance={result.crossBorderCount > 0 ? "filled" : "outline"}
            color={result.crossBorderCount > 0 ? "warning" : "informative"}
            icon={<GlobeProhibitedFilled />}
            aria-label={`${result.crossBorderCount} cross-border events`}
          >
            <span className={styles.ratio}>{result.crossBorderCount}</span>
            &nbsp;cross-border
          </Badge>
          {result.indeterminateCount > 0 && (
            <Badge
              appearance="outline"
              color="subtle"
              icon={<QuestionCircleFilled />}
              aria-label={`${result.indeterminateCount} indeterminate events`}
            >
              <span className={styles.ratio}>{result.indeterminateCount}</span>
              &nbsp;indeterminate
            </Badge>
          )}
          <Badge
            appearance="outline"
            color="success"
            aria-label={`${result.inJurisdictionCount} in-jurisdiction events`}
          >
            <span className={styles.ratio}>{result.inJurisdictionCount}</span>
            &nbsp;in-jurisdiction
          </Badge>
        </div>
      )}

      {result.impossibleEventIds.length > 0 && (
        <div className={styles.warn} role="alert">
          <WarningFilled aria-hidden="true" />
          <Body1 as="p">
            <strong>{result.impossibleEventIds.length}</strong>{" "}
            impossible-travel event
            {result.impossibleEventIds.length === 1 ? "" : "s"} flagged — review
            the timeline.
          </Body1>
        </div>
      )}
    </div>
  );
}
