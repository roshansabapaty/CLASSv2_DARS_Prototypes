/**
 * LoginTimeline — day-bucketed list of enriched login events. Each event
 * shows time, geo, ISP, device, outcome, jurisdiction, VPN / Tor flags,
 * and an impossible-travel badge when flagged.
 *
 * Phase 3 of the prototype-to-prod merge — ported from the prototype's
 * `src/components/cross-border/LoginTimeline.tsx` with Griffel shorthand
 * borders expanded.
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
  CheckmarkCircleFilled,
  DismissCircleFilled,
  GlobeProhibitedFilled,
  QuestionCircleFilled,
  ShieldKeyholeFilled,
  WarningFilled,
} from "@fluentui/react-icons";
import type {
  EnrichedLoginEvent,
  TimelineDay,
} from "../../types/crossBorder";

const useStyles = makeStyles({
  wrap: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXL,
    listStyleType: "none",
    paddingLeft: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  day: {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    columnGap: tokens.spacingHorizontalL,
  },
  dayLabel: {
    position: "sticky",
    top: 0,
    paddingTop: tokens.spacingVerticalXS,
  },
  dateText: {
    fontWeight: tokens.fontWeightSemibold,
  },
  dateMeta: {
    color: tokens.colorNeutralForeground3,
  },
  events: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
    borderLeftStyle: "solid",
    borderLeftWidth: "2px",
    borderLeftColor: tokens.colorNeutralStroke2,
    paddingLeft: tokens.spacingHorizontalL,
    position: "relative",
    listStyleType: "none",
    marginTop: 0,
    marginBottom: 0,
  },
  event: {
    display: "grid",
    gridTemplateColumns: "80px 1fr auto",
    columnGap: tokens.spacingHorizontalM,
    alignItems: "center",
    paddingTop: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingHorizontalM,
    paddingLeft: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
  },
  eventFlagged: {
    borderTopColor: tokens.colorPaletteRedBorder2,
    borderRightColor: tokens.colorPaletteRedBorder2,
    borderBottomColor: tokens.colorPaletteRedBorder2,
    borderLeftColor: tokens.colorPaletteRedBorder2,
    borderLeftWidth: "4px",
  },
  time: {
    fontVariantNumeric: "tabular-nums",
    color: tokens.colorNeutralForeground2,
  },
  location: {
    display: "flex",
    flexDirection: "column",
    rowGap: "2px",
  },
  meta: {
    color: tokens.colorNeutralForeground3,
  },
  badges: {
    display: "flex",
    columnGap: tokens.spacingHorizontalXS,
    rowGap: tokens.spacingVerticalXS,
    alignItems: "center",
    flexWrap: "wrap",
  },
  daySummary: {
    display: "flex",
    columnGap: tokens.spacingHorizontalXS,
    rowGap: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalXS,
    flexWrap: "wrap",
  },
  empty: {
    paddingTop: tokens.spacingHorizontalXXL,
    paddingRight: tokens.spacingHorizontalXXL,
    paddingBottom: tokens.spacingHorizontalXXL,
    paddingLeft: tokens.spacingHorizontalXXL,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
});

function fmtFullDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
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

function OutcomeIcon({ ev }: { ev: EnrichedLoginEvent }) {
  if (ev.outcome === "success") {
    return (
      <Tooltip content="Successful login" relationship="label">
        <CheckmarkCircleFilled
          aria-label="Successful login"
          style={{ color: tokens.colorPaletteGreenForeground1, fontSize: 20 }}
        />
      </Tooltip>
    );
  }
  if (ev.outcome === "failure") {
    return (
      <Tooltip content="Failed login" relationship="label">
        <DismissCircleFilled
          aria-label="Failed login"
          style={{ color: tokens.colorPaletteRedForeground1, fontSize: 20 }}
        />
      </Tooltip>
    );
  }
  return (
    <Tooltip content="MFA challenge" relationship="label">
      <ShieldKeyholeFilled
        aria-label="MFA challenge"
        style={{ color: tokens.colorPaletteYellowForeground1, fontSize: 20 }}
      />
    </Tooltip>
  );
}

interface Props {
  timeline: TimelineDay[];
  impossibleEventIds: Set<string>;
}

export function LoginTimeline({ timeline, impossibleEventIds }: Props) {
  const styles = useStyles();

  if (timeline.length === 0) {
    return (
      <div className={styles.empty} role="status">
        <Subtitle2 as="p">No login events in the selected range.</Subtitle2>
      </div>
    );
  }

  return (
    <ol className={styles.wrap} aria-label="Login events grouped by day">
      {timeline.map((day) => (
        <li key={day.date} className={styles.day}>
          <header className={styles.dayLabel}>
            <h3
              className={styles.dateText}
              style={{ margin: 0, fontSize: "1rem" }}
            >
              {fmtFullDate(day.date)}
            </h3>
            <Caption1 as="p" className={styles.dateMeta}>
              {day.events.length} event{day.events.length === 1 ? "" : "s"}
            </Caption1>
            <div className={styles.daySummary}>
              {day.countries.map((c) => (
                <Badge key={c} appearance="outline" size="small">
                  {c}
                </Badge>
              ))}
              {day.hasImpossibleTravel && (
                <Badge
                  appearance="filled"
                  color="danger"
                  size="small"
                  icon={<WarningFilled />}
                >
                  Impossible travel
                </Badge>
              )}
            </div>
          </header>

          <ol
            className={styles.events}
            aria-label={`Events on ${fmtFullDate(day.date)}`}
          >
            {day.events.map((ev) => {
              const flagged = impossibleEventIds.has(ev.id);
              return (
                <li
                  key={ev.id}
                  className={mergeClasses(
                    styles.event,
                    flagged && styles.eventFlagged,
                  )}
                >
                  <time className={styles.time} dateTime={ev.timestamp}>
                    {fmtTime(ev.timestamp)}
                  </time>

                  <div className={styles.location}>
                    <Body1 as="p" style={{ margin: 0 }}>
                      <span
                        style={{ fontSize: 18, marginRight: 6 }}
                        aria-hidden="true"
                      >
                        {flagEmoji(ev.geo.countryCode)}
                      </span>
                      {ev.geo.city}, {ev.geo.country}
                    </Body1>
                    <Caption1 as="p" className={styles.meta}>
                      <span aria-label={`IP address ${ev.ip}`}>{ev.ip}</span>
                      {" · "}
                      <span>{ev.geo.isp}</span>
                      {" · "}
                      <span>{ev.device}</span>
                    </Caption1>
                  </div>

                  <div className={styles.badges}>
                    {ev.jurisdiction === "cross_border" && (
                      <Tooltip
                        content="Apparent country differs from issuing authority's country"
                        relationship="description"
                      >
                        <Badge
                          appearance="filled"
                          color="warning"
                          size="small"
                          icon={<GlobeProhibitedFilled />}
                        >
                          Cross-border
                        </Badge>
                      </Tooltip>
                    )}
                    {ev.jurisdiction === "indeterminate" && (
                      <Tooltip
                        content="VPN/Tor or unknown — true location can't be confirmed"
                        relationship="description"
                      >
                        <Badge
                          appearance="outline"
                          color="subtle"
                          size="small"
                          icon={<QuestionCircleFilled />}
                        >
                          Indeterminate
                        </Badge>
                      </Tooltip>
                    )}
                    {ev.geo.isVpn && (
                      <Badge appearance="filled" color="warning" size="small">
                        VPN
                      </Badge>
                    )}
                    {ev.geo.isTor && (
                      <Badge appearance="filled" color="danger" size="small">
                        Tor
                      </Badge>
                    )}
                    {flagged && (
                      <Tooltip
                        content="Distance from previous login exceeds plausible travel speed"
                        relationship="description"
                      >
                        <Badge
                          appearance="filled"
                          color="danger"
                          size="small"
                          icon={<WarningFilled />}
                        >
                          Impossible travel
                        </Badge>
                      </Tooltip>
                    )}
                    <OutcomeIcon ev={ev} />
                  </div>
                </li>
              );
            })}
          </ol>
        </li>
      ))}
    </ol>
  );
}
