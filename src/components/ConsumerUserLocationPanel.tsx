/**
 * ConsumerUserLocationPanel — displays Scenario 8 (30-day summary) and
 * Scenario 7 (detailed login events) data for consumer identifiers.
 *
 * Summary view shows:
 *   - Consistency indicator badge (Consistent / Multiple)
 *   - Dominant country with login count
 *   - Most recent login with country + timestamp
 *   - Per-country breakdown with login counts (expandable)
 *
 * Detail view (drill-down from summary):
 *   - Full event list with IP, country, timestamp
 *   - Sortable by date
 */

import * as React from "react";
import {
  Badge,
  Button,
  Tag,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ChevronDownRegular,
  ChevronUpRegular,
  GlobeRegular,
  ArrowLeftRegular,
  CheckmarkCircleRegular,
  WarningRegular,
  ClockRegular,
} from "@fluentui/react-icons";
import type {
  ConsumerLocationSummary,
  ConsumerLocationDetail,
  CountrySummary,
} from "../types/caseTypes";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  summaryCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    paddingTop: tokens.spacingVerticalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalM,
  },
  summaryHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: tokens.spacingVerticalS,
  },
  summaryTitle: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  windowText: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalS,
  },
  metricCard: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    paddingTop: tokens.spacingVerticalXS,
    paddingRight: tokens.spacingHorizontalS,
    paddingBottom: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalS,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTopLeftRadius: tokens.borderRadiusSmall,
    borderTopRightRadius: tokens.borderRadiusSmall,
    borderBottomLeftRadius: tokens.borderRadiusSmall,
    borderBottomRightRadius: tokens.borderRadiusSmall,
  },
  metricLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    fontWeight: tokens.fontWeightSemibold,
  },
  metricValue: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  metricSubtext: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  countriesSection: {
    marginTop: tokens.spacingVerticalXS,
  },
  countrySectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: tokens.spacingVerticalXS,
  },
  countrySectionTitle: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  countryRow: {
    display: "grid",
    gridTemplateColumns: "1fr 80px auto",
    alignItems: "center",
    paddingTop: "4px",
    paddingRight: tokens.spacingHorizontalS,
    paddingBottom: "4px",
    paddingLeft: tokens.spacingHorizontalS,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke3,
    fontSize: tokens.fontSizeBase200,
  },
  countryName: {
    fontWeight: tokens.fontWeightSemibold,
  },
  loginCount: {
    textAlign: "right" as const,
    color: tokens.colorNeutralForeground3,
  },
  expandButton: {
    minWidth: "auto",
    height: "20px",
    paddingLeft: tokens.spacingHorizontalXS,
    paddingRight: tokens.spacingHorizontalXS,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorBrandForeground1,
  },
  loginsList: {
    paddingLeft: tokens.spacingHorizontalL,
    paddingTop: "2px",
    paddingBottom: tokens.spacingVerticalXS,
  },
  loginEntry: {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    paddingTop: "1px",
    paddingBottom: "1px",
  },
  detailTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: tokens.fontSizeBase200,
  },
  detailTh: {
    textAlign: "left" as const,
    paddingTop: "6px",
    paddingRight: tokens.spacingHorizontalS,
    paddingBottom: "6px",
    paddingLeft: tokens.spacingHorizontalS,
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke1,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  detailTd: {
    paddingTop: "4px",
    paddingRight: tokens.spacingHorizontalS,
    paddingBottom: "4px",
    paddingLeft: tokens.spacingHorizontalS,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke3,
  },
  backButton: {
    minWidth: "auto",
    alignSelf: "flex-start",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalL,
    paddingRight: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    paddingLeft: tokens.spacingVerticalL,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  dominantList: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: tokens.spacingHorizontalXS,
  },
});

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ConsistencyBadge({
  indicator,
}: {
  indicator?: "Consistent" | "Multiple";
}) {
  if (indicator === "Consistent") {
    return (
      <Badge
        appearance="filled"
        color="success"
        size="medium"
        icon={<CheckmarkCircleRegular />}
      >
        Consistent
      </Badge>
    );
  }
  if (indicator === "Multiple") {
    return (
      <Badge
        appearance="filled"
        color="warning"
        size="medium"
        icon={<WarningRegular />}
      >
        Multiple Countries
      </Badge>
    );
  }
  return null;
}

function CountryBreakdown({ countries }: { countries: CountrySummary[] }) {
  const styles = useStyles();
  const [expandedCountry, setExpandedCountry] = React.useState<string | null>(
    null
  );

  return (
    <div className={styles.countriesSection}>
      <div className={styles.countrySectionHeader}>
        <span className={styles.countrySectionTitle}>
          Country Breakdown ({countries.length}{" "}
          {countries.length === 1 ? "country" : "countries"})
        </span>
      </div>
      {countries.map((c) => (
        <React.Fragment key={c.country}>
          <div className={styles.countryRow}>
            <span className={styles.countryName}>{c.country}</span>
            <span className={styles.loginCount}>
              {c.loginCount} login{c.loginCount !== 1 ? "s" : ""}
            </span>
            <Button
              appearance="subtle"
              size="small"
              className={styles.expandButton}
              icon={
                expandedCountry === c.country ? (
                  <ChevronUpRegular fontSize={12} />
                ) : (
                  <ChevronDownRegular fontSize={12} />
                )
              }
              onClick={() =>
                setExpandedCountry((prev) =>
                  prev === c.country ? null : c.country
                )
              }
              aria-expanded={expandedCountry === c.country}
              aria-label={
                expandedCountry === c.country
                  ? `Collapse ${c.country} logins`
                  : `Expand ${c.country} logins`
              }
            />
          </div>
          {expandedCountry === c.country && (
            <div className={styles.loginsList}>
              {c.logins.map((login, i) => (
                <div key={i} className={styles.loginEntry}>
                  <span>{formatDate(login.date)}</span>
                  <span>{formatTimestamp(login.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export interface ConsumerUserLocationPanelProps {
  summary?: ConsumerLocationSummary;
  detail?: ConsumerLocationDetail;
  identifierValue: string;
}

export function ConsumerUserLocationPanel({
  summary,
  detail,
  identifierValue,
}: ConsumerUserLocationPanelProps) {
  const styles = useStyles();
  const [showDetail, setShowDetail] = React.useState(false);

  if (!summary && !detail) {
    return (
      <div className={styles.emptyState}>
        <GlobeRegular fontSize={32} />
        <span>No consumer user location data available</span>
        <span>
          Run Check Accounts to retrieve login location data for consumer
          identifiers
        </span>
      </div>
    );
  }

  // Detail view (Scenario 7 drill-down)
  if (showDetail && detail) {
    return (
      <div className={styles.root}>
        <Button
          appearance="subtle"
          size="small"
          className={styles.backButton}
          icon={<ArrowLeftRegular />}
          onClick={() => setShowDetail(false)}
        >
          Back to Summary
        </Button>

        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <div className={styles.summaryTitle}>
              <GlobeRegular />
              Detailed Login Events — {identifierValue}
            </div>
            <span className={styles.windowText}>
              {formatDate(detail.window.startDateTimeUtc)} –{" "}
              {formatDate(detail.window.endDateTimeUtc)}
            </span>
          </div>

          <table className={styles.detailTable}>
            <thead>
              <tr>
                <th className={styles.detailTh}>Date & Time</th>
                <th className={styles.detailTh}>Country</th>
                <th className={styles.detailTh}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {detail.events.map((event, i) => (
                <tr key={i}>
                  <td className={styles.detailTd}>
                    {formatTimestamp(event.dateTimeChangedUtc)}
                  </td>
                  <td className={styles.detailTd}>{event.country}</td>
                  <td className={styles.detailTd}>
                    <code>{event.ipAddress}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Summary view (Scenario 8)
  if (!summary) return null;

  const totalLogins = summary.countries.reduce(
    (sum, c) => sum + c.loginCount,
    0
  );

  return (
    <div className={styles.root}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <div className={styles.summaryTitle}>
            <GlobeRegular />
            Consumer User Location Summary
          </div>
          <span className={styles.windowText}>
            {formatDate(summary.window.startDate)} –{" "}
            {formatDate(summary.window.endDate)} (30-day window)
          </span>
        </div>

        {/* Metrics row */}
        <div className={styles.metricsRow}>
          {/* Consistency */}
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Geographic Pattern</span>
            <ConsistencyBadge indicator={summary.consistencyIndicator} />
          </div>

          {/* Dominant Country */}
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Dominant Country</span>
            <div className={styles.dominantList}>
              {summary.dominantCountry.map((dc) => (
                <Tooltip
                  key={dc.country}
                  content={`${dc.loginCount} logins`}
                  relationship="description"
                >
                  <Tag size="small" appearance="brand" shape="circular">
                    {dc.country}
                  </Tag>
                </Tooltip>
              ))}
            </div>
            <span className={styles.metricSubtext}>
              {totalLogins} total login{totalLogins !== 1 ? "s" : ""} across{" "}
              {summary.countries.length} countr
              {summary.countries.length === 1 ? "y" : "ies"}
            </span>
          </div>

          {/* Most Recent */}
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Most Recent Login</span>
            {summary.mostRecentLogin ? (
              <>
                <span className={styles.metricValue}>
                  {summary.mostRecentLogin.country}
                </span>
                <span className={styles.metricSubtext}>
                  <ClockRegular fontSize={12} />{" "}
                  {formatTimestamp(summary.mostRecentLogin.timestamp)}
                </span>
              </>
            ) : (
              <span className={styles.metricSubtext}>
                No logins in window
              </span>
            )}
          </div>
        </div>

        {/* Per-country breakdown */}
        <CountryBreakdown countries={summary.countries} />

        {/* Drill-down button */}
        {detail && (
          <div style={{ marginTop: tokens.spacingVerticalS }}>
            <Button
              appearance="outline"
              size="small"
              icon={<GlobeRegular />}
              onClick={() => setShowDetail(true)}
            >
              View Detailed Login Events ({detail.events.length} events)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
