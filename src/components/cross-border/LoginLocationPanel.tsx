/**
 * LoginLocationPanel — overlay drawer that surfaces the cached IP
 * History lookup for a Consumer identifier.
 *
 * Phase 3 of the prototype-to-prod merge. After the rework, the panel
 * is purely a viewer:
 *   - The lookup itself runs inside Check Accounts (the case-wide
 *     handler in `useCaseWorkflow.checkAccountsForIdentifiers`), with a
 *     30-day window ending today. No per-identifier "Look up" button
 *     and no From/To date controls inside the panel.
 *   - Results are read from `ipHistoryStore` keyed by
 *     `AccountIdentifier.id`. The user opens this panel to see the
 *     cached results.
 *   - The empty state points the user back at Check Accounts when no
 *     lookup has been performed yet.
 *
 * Title is conditional on the identifier's account type:
 *   - Consumer → "Consumer User Locations"
 *   - anything else → falls back to the generic title (Enterprise
 *     identifiers don't have entry points to open this panel, so this
 *     fallback is defensive).
 *
 * The `Hide in-jurisdiction` toggle stays — it's a display filter on
 * the cached timeline, not a query control.
 */

import {
  Button,
  Divider,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  OverlayDrawer,
  Switch,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { DismissRegular, GlobeLocationRegular } from "@fluentui/react-icons";
import { useMemo, useState, useSyncExternalStore } from "react";
import { queryLogins } from "../../services/loginQuery";
import {
  getAllSnapshot as getIpHistorySnapshot,
  subscribe as subscribeIpHistoryStore,
} from "../../state/ipHistoryStore";
import { ResultsHeader } from "./ResultsHeader";
import { CountrySummaryCards } from "./CountrySummaryCards";
import { LoginTimeline } from "./LoginTimeline";
import type {
  CrossBorderAgency,
  TimelineDay,
} from "../../types/crossBorder";
import type { FormData } from "../../types/caseTypes";

const useStyles = makeStyles({
  body: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalM,
  },
  controls: {
    display: "flex",
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalS,
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  empty: {
    paddingTop: "24px",
    textAlign: "center",
  },
  preQueryPanel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    rowGap: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalXL,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
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
    textAlign: "center",
  },
  preQueryIcon: {
    color: tokens.colorBrandForeground1,
  },
  preQueryHint: {
    color: tokens.colorNeutralForeground3,
    maxWidth: "440px",
  },
  queriedCaption: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

function caseAsAgency(c: FormData): CrossBorderAgency {
  return {
    id: c.caseId,
    name: c.agency ?? "",
    shortName: c.agency ?? "",
    countryCode: c.agencyCountryCode ?? "",
    country: c.country ?? "",
    type:
      c.requestType === "eEvidence" ? "Judicial Authority" : "Law Enforcement",
  };
}

function filterTimeline(
  timeline: TimelineDay[],
  hideInJurisdiction: boolean,
): TimelineDay[] {
  if (!hideInJurisdiction) return timeline;
  return timeline
    .map((day) => ({
      ...day,
      events: day.events.filter((e) => e.jurisdiction !== "in_jurisdiction"),
    }))
    .filter((day) => day.events.length > 0);
}

export interface LoginLocationPanelProps {
  open: boolean;
  onClose: () => void;
  /** The case under review. Drives the issuing-authority context. */
  caseFormData?: FormData;
  /** Internal AccountIdentifier.id (NOT the value string) — used to
   *  resolve the identifier within `caseFormData.identifiers`. */
  identifierId?: string;
}

export function LoginLocationPanel({
  open,
  onClose,
  caseFormData,
  identifierId,
}: LoginLocationPanelProps) {
  const styles = useStyles();

  const c = caseFormData;
  const identifier = c?.identifiers?.find((id) => id.id === identifierId);
  const isConsumer = identifier?.checkAccounts?.accountType === "Consumer";

  const [hideInJurisdiction, setHideInJurisdiction] = useState(false);

  // Subscribe to the cross-surface store so the panel reflects the
  // latest Check Accounts run live. When the store has no entry for
  // this identifier yet, render the empty state.
  const snapshot = useSyncExternalStore(
    subscribeIpHistoryStore,
    getIpHistorySnapshot,
  );
  const lookup = identifier ? snapshot.get(identifier.id) : undefined;

  // Re-derive the full enriched query result from the cached range so
  // the panel can render ResultsHeader / CountrySummaryCards / Timeline
  // without re-running the search. The cached `lastEvent` alone isn't
  // enough — the panel needs the full timeline + country aggregates.
  const result = useMemo(() => {
    if (!c || !identifier || !lookup) return null;
    return queryLogins({
      identifier: identifier.value,
      rangeStart: lookup.rangeStart,
      rangeEnd: lookup.rangeEnd,
      issuingAgency: caseAsAgency(c),
    });
  }, [c, identifier, lookup]);

  const impossibleSet = useMemo(
    () => new Set(result?.impossibleEventIds ?? []),
    [result?.impossibleEventIds],
  );

  const visibleTimeline = useMemo(
    () => filterTimeline(result?.timeline ?? [], hideInJurisdiction),
    [result?.timeline, hideInJurisdiction],
  );

  const title = isConsumer
    ? "Consumer User Locations"
    : "Login Location History";

  return (
    <OverlayDrawer
      position="end"
      open={open}
      onOpenChange={(_, d) => !d.open && onClose()}
      size="large"
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              icon={<DismissRegular />}
              onClick={onClose}
              aria-label="Close"
            />
          }
        >
          {title}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        {!c || !identifier ? (
          <div className={styles.empty}>
            <Text>Identifier not found.</Text>
          </div>
        ) : !result ? (
          <div className={styles.preQueryPanel}>
            <GlobeLocationRegular
              fontSize={48}
              className={styles.preQueryIcon}
            />
            <Text weight="semibold" size={400}>
              No location data for {identifier.value}
            </Text>
            <Text className={styles.preQueryHint} size={200}>
              {isConsumer
                ? "Consumer User Locations is populated as part of Check " +
                  "Accounts. Click Check Accounts on the identifier table " +
                  "to look up the last 30 days of login locations for " +
                  "this identifier."
                : "Run Check Accounts on the identifier table to populate " +
                  "location data for this identifier."}
            </Text>
          </div>
        ) : (
          <div className={styles.body}>
            <div className={styles.controls}>
              <Text className={styles.queriedCaption}>
                Queried {lookup?.queriedAt.toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" · "}window {lookup?.rangeStart} → {lookup?.rangeEnd}
              </Text>
              <Switch
                checked={hideInJurisdiction}
                onChange={(_, d) => setHideInJurisdiction(d.checked)}
                label="Hide in-jurisdiction"
                labelPosition="before"
              />
            </div>

            <ResultsHeader result={result} />

            {result.countrySummaries.length > 0 && (
              <>
                <Divider>By country</Divider>
                <CountrySummaryCards summaries={result.countrySummaries} />
              </>
            )}

            <Divider>Timeline</Divider>
            <LoginTimeline
              timeline={visibleTimeline}
              impossibleEventIds={impossibleSet}
            />
          </div>
        )}
      </DrawerBody>
    </OverlayDrawer>
  );
}
