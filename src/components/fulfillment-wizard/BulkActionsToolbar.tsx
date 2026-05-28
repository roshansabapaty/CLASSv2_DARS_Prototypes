/**
 * BulkActionsToolbar — Fluent v9 toolbar for bulk operations across identifiers.
 *
 * The "Add service" flow is multi-select with smart routing by account type:
 * the user checks one or more services, the preview dialog shows per-service
 * routing (Exchange Enterprise → 1 Enterprise identifier, etc.), and Apply
 * commits each service to ONLY the matching identifiers.
 */

import React, { useMemo, useState } from "react";
import {
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Button,
  Checkbox,
  Tag,
  TagGroup,
  Field,
  Input,
  Radio,
  RadioGroup,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogActions,
  DialogContent,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Plus, Calendar, RotateCcw, ShieldCheck } from "lucide-react";
import {
  LENS_SERVICES,
  LENS_SERVICE_MAP,
  getServiceCategoryGroups,
  getServiceName,
} from "../../config/lensServicesConfig";
import type { ItemSelectionState } from "../../utils/categoryUtils";
import { type LEBaseline, routeServicesByAccountType } from "./leBaseline";
import { formatDateToMMM } from "../../utils/fulfillmentWizardHelpers";
import { AddServiceDialog } from "./AddServiceDialog";
import { isSkippedFromSubmission } from "../../utils/identifierRejection";

const useStyles = makeStyles({
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    gap: tokens.spacingHorizontalM,
    flexWrap: "wrap",
  },
  scopeBlock: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  scopeLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  actionsRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },
  dialogBody: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
});

export type BulkScope = "all" | "selected";

export interface BulkAddServicesItem {
  serviceKey: string;
  targetIds: string[];
  /** User-picked groups → items from the Configure dialog. When undefined,
   *  consumers fall back to the service's defaultSelected items. */
  selectedItems?: Record<string, string[]>;
}

export interface BulkActionsToolbarProps {
  identifiers: any[];
  selectedIdentifierIds: Set<string>;
  onToggleSelectAll: (checked: boolean) => void;

  /** Current wizard per-identifier selection state */
  perIdentifierItems: Record<string, ItemSelectionState>;

  /** LE baseline (read-only) */
  leBaseline: LEBaseline;

  /** Called when user confirms a multi-service bulk-add. Each item routes to ONLY
   *  the matching identifiers based on account type. */
  onBulkAddServices: (params: { scope: BulkScope; items: BulkAddServicesItem[] }) => void;

  /** Called when user confirms a bulk-set-date-range action */
  onBulkSetDateRange: (params: { scope: BulkScope; start: string; end: string; targetIds: string[] }) => void;

  /** Called when user resets selected identifiers back to the LE baseline */
  onResetToLEBaseline: (params: { targetIds: string[] }) => void;

  /** Bulk Check Accounts action (Phase 5b.4a) — runs the account-existence
   *  check across the bulk scope (all eligible OR currently selected). When
   *  undefined, the bulk Check Accounts button is hidden. */
  onCheckAccounts?: (params: { targetIds: string[] }) => void | Promise<void>;
}

export function BulkActionsToolbar({
  identifiers,
  selectedIdentifierIds,
  onToggleSelectAll,
  perIdentifierItems,
  leBaseline,
  onBulkAddServices,
  onBulkSetDateRange,
  onResetToLEBaseline,
  onCheckAccounts,
}: BulkActionsToolbarProps) {
  const styles = useStyles();

  // Add Service dialog state — single dialog handles Pick → Configure → Preview.
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Date-range dialog state — supports two ways to set the start date:
  //   "days-back"  → user types a number of days back (or "All") relative to
  //                  the chosen End Date; start date is computed.
  //   "start-date" → user picks the start date directly with a date input.
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);
  const [pendingEnd, setPendingEnd] = useState("");
  const [pendingMode, setPendingMode] = useState<"days-back" | "start-date">(
    "days-back",
  );
  const [pendingDaysBack, setPendingDaysBack] = useState<string>("");
  const [pendingStartDirect, setPendingStartDirect] = useState<string>("");
  // Per-identifier targeting inside the dialog. Defaults to whatever the
  // toolbar-scope produced (all eligible or row-selected), and the user
  // can refine the list before applying. Empty Set = "none selected, can't
  // Apply".
  const [dialogTargetIds, setDialogTargetIds] = useState<Set<string>>(new Set());

  const pendingStart = useMemo(() => {
    if (!pendingEnd) return "";
    if (pendingMode === "start-date") {
      // Direct-pick mode: trust the user's chosen start date as-is.
      return pendingStartDirect || "";
    }
    // Days-back shortcut mode.
    const trimmed = pendingDaysBack.trim();
    if (!trimmed) return "";
    if (trimmed.toLowerCase() === "all") return "1990-01-01";
    const days = parseInt(trimmed, 10);
    if (isNaN(days) || days < 1) return "";
    const endD = new Date(pendingEnd);
    if (isNaN(endD.getTime())) return "";
    const startD = new Date(endD);
    startD.setDate(startD.getDate() - days);
    return startD.toISOString().split("T")[0];
  }, [pendingEnd, pendingMode, pendingDaysBack, pendingStartDirect]);

  // Whichever mode is active, the input must produce a non-empty start date
  // that is on/before the end date.
  const pendingInputValid = (() => {
    if (!pendingStart || !pendingEnd) return false;
    return pendingStart <= pendingEnd;
  })();

  // Identifiers in any terminal per-identifier state (rejected, invalid,
  // ETSI Cancelled / Withdrawn, taskStatus already terminal) are excluded
  // from bulk-action scope and from the Select-all-N tally.
  const eligibleIdentifiers = useMemo(
    () => identifiers.filter((id) => !isSkippedFromSubmission(id)),
    [identifiers]
  );
  const eligibleCount = eligibleIdentifiers.length;
  const selectedEligibleCount = useMemo(
    () => eligibleIdentifiers.filter((id) => selectedIdentifierIds.has(id.id)).length,
    [eligibleIdentifiers, selectedIdentifierIds]
  );
  const allSelected = selectedEligibleCount === eligibleCount && eligibleCount > 0;
  const someSelected = selectedEligibleCount > 0 && !allSelected;

  // Scope is derived purely from identifier selection state.
  const effectiveScope: BulkScope = someSelected ? "selected" : "all";
  const scopedIdentifiers = useMemo(() => {
    if (effectiveScope === "selected") return eligibleIdentifiers.filter((id) => selectedIdentifierIds.has(id.id));
    return eligibleIdentifiers;
  }, [effectiveScope, selectedIdentifierIds, eligibleIdentifiers]);
  const targetIds = useMemo(() => scopedIdentifiers.map((id) => id.id), [scopedIdentifiers]);

  // Smart routing: for every LENS service, compute which scoped identifiers it can apply to
  const routedTargets = useMemo(() => {
    const allKeys = LENS_SERVICES.map((s) => s.key);
    return routeServicesByAccountType(
      allKeys,
      scopedIdentifiers,
      (svcKey) => LENS_SERVICE_MAP[svcKey]?.accountType,
    );
  }, [scopedIdentifiers]);

  // Menu list: only services with ≥1 matching identifier in scope
  const eligibleServices = useMemo(() => {
    return LENS_SERVICES.filter((s) => (routedTargets[s.key]?.length ?? 0) > 0);
  }, [routedTargets]);

  // Already-configured by service: identifiers in scope that already have a
  // given service set. Drives the AddServiceDialog preview's "Skip" rendering
  // and excludes those identifiers from commit.
  const alreadyConfigured = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const svcKey of Object.keys(routedTargets)) {
      out[svcKey] = (routedTargets[svcKey] ?? []).filter(
        (id) => !!perIdentifierItems[id]?.[svcKey],
      );
    }
    return out;
  }, [routedTargets, perIdentifierItems]);

  // Service-key → required account type, used by the dialog for picker chips.
  const serviceAccountType = useMemo(() => {
    const out: Record<string, "Consumer" | "Enterprise" | undefined> = {};
    for (const s of LENS_SERVICES) {
      out[s.key] = LENS_SERVICE_MAP[s.key]?.accountType;
    }
    return out;
  }, []);

  // Identifiers in scope shaped for the dialog preview rows.
  const dialogIdentifiers = useMemo(
    () =>
      scopedIdentifiers.map((id: any) => ({
        id: id.id,
        label: id.value,
        accountType: id.checkAccounts?.accountType as
          | "Consumer"
          | "Enterprise"
          | "N/A"
          | undefined,
      })),
    [scopedIdentifiers],
  );

  // Scope chip — "For 2 identifiers (1 Consumer + 1 Enterprise)" or
  // "For analyst@contoso.com (Enterprise)" when the scope is a single ID.
  const scopeLabel = useMemo(() => {
    if (dialogIdentifiers.length === 1) {
      const at = dialogIdentifiers[0].accountType;
      return `For ${dialogIdentifiers[0].label}${at && at !== "N/A" ? ` (${at})` : ""}`;
    }
    let consumer = 0;
    let enterprise = 0;
    let na = 0;
    for (const id of dialogIdentifiers) {
      if (id.accountType === "Consumer") consumer++;
      else if (id.accountType === "Enterprise") enterprise++;
      else na++;
    }
    const parts: string[] = [];
    if (consumer) parts.push(`${consumer} Consumer`);
    if (enterprise) parts.push(`${enterprise} Enterprise`);
    if (na) parts.push(`${na} N/A`);
    return `For ${dialogIdentifiers.length} identifiers${parts.length ? ` (${parts.join(" + ")})` : ""}`;
  }, [dialogIdentifiers]);

  // Per-service availableGroups for the dialog Configure step.
  const dialogAvailableGroups = useMemo(() => {
    const out: Record<string, ReturnType<typeof getServiceCategoryGroups>> = {};
    for (const s of eligibleServices) {
      out[s.key] = getServiceCategoryGroups(s.key);
    }
    return out;
  }, [eligibleServices]);

  /** AddServiceDialog → commit. Routes each service to the matching identifier
   *  IDs (already filtered to those not yet configured) and emits a
   *  BulkAddServicesItem[] via onBulkAddServices. */
  const handleAddDialogCommit = (commit: {
    picksByService: Record<string, Record<string, string[]>>;
    targetsByService: Record<string, string[]>;
  }) => {
    const items: BulkAddServicesItem[] = Object.entries(commit.picksByService)
      .filter(([svcKey]) => (commit.targetsByService[svcKey] ?? []).length > 0)
      .map(([svcKey, picks]) => ({
        serviceKey: svcKey,
        targetIds: commit.targetsByService[svcKey],
        selectedItems: picks,
      }));
    if (items.length === 0) return;
    onBulkAddServices({ scope: effectiveScope, items });
  };

  // ── LE-requested date-range context for the dialog ────────────────────
  // Aggregate each service's LE-requested categoryDates into a single
  // {start,end} per service (min start, max end across categories), then
  // collapse to ONE global row when every service has the same range.
  // Pure read-only — used to inform the bulk-set decision, never edited.
  const dialogLeRequestedContext = useMemo(() => {
    const perService = new Map<string, { start: string; end: string }>();
    const selectedList = identifiers.filter((id) => dialogTargetIds.has(id.id));
    selectedList.forEach((id) => {
      const baseline = leBaseline?.[id.id];
      const catDates = baseline?.categoryDates;
      if (!catDates) return;
      Object.entries(catDates).forEach(([key, range]) => {
        if (!range?.start || !range?.end) return;
        const svcKey = key.split(":")[0];
        const existing = perService.get(svcKey);
        if (!existing) {
          perService.set(svcKey, { start: range.start, end: range.end });
        } else {
          perService.set(svcKey, {
            start: range.start < existing.start ? range.start : existing.start,
            end: range.end > existing.end ? range.end : existing.end,
          });
        }
      });
    });
    if (perService.size === 0) return { mode: "none" as const };
    // Collapse-to-global check: every service has the identical
    // {start,end} pair. Use a Set of stringified tuples for O(n).
    const tuples = new Set<string>();
    perService.forEach((r) => tuples.add(`${r.start}|${r.end}`));
    if (tuples.size === 1) {
      const [{ start, end }] = Array.from(perService.values()).slice(0, 1);
      return { mode: "global" as const, start, end };
    }
    return {
      mode: "per-service" as const,
      entries: Array.from(perService.entries())
        .map(([svcKey, r]) => ({ svcKey, ...r }))
        .sort((a, b) => getServiceName(a.svcKey).localeCompare(getServiceName(b.svcKey))),
    };
  }, [identifiers, leBaseline, dialogTargetIds]);

  const handleConfirmSetDateRange = () => {
    if (!pendingInputValid) return;
    // Use the dialog's per-identifier checklist (not the toolbar scope)
    // so the user can refine which identifiers receive the bulk change.
    const dialogIds = Array.from(dialogTargetIds);
    if (dialogIds.length === 0) return;
    // Scope tag stays informational: "selected" when the dialog list is
    // a strict subset of the eligible pool, "all" otherwise.
    const dialogScope: BulkScope =
      dialogIds.length === eligibleCount ? "all" : "selected";
    onBulkSetDateRange({
      scope: dialogScope,
      start: pendingStart,
      end: pendingEnd,
      targetIds: dialogIds,
    });
    setDateRangeDialogOpen(false);
    setPendingEnd("");
    setPendingDaysBack("");
    setPendingStartDirect("");
    setPendingMode("days-back");
  };

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.scopeBlock}>
          <Checkbox
            checked={allSelected ? true : someSelected ? "mixed" : false}
            onChange={(_, data) => onToggleSelectAll(!!data.checked)}
            disabled={eligibleCount === 0}
            label={`Select all ${eligibleCount} identifier${eligibleCount !== 1 ? "s" : ""}`}
          />
          <ToolbarDivider />
          <span className={styles.scopeLabel}>Apply bulk actions to:</span>
          <TagGroup size="small">
            <Tag appearance={effectiveScope === "all" ? "brand" : "outline"}>
              All ({eligibleCount})
            </Tag>
            <Tag
              appearance={effectiveScope === "selected" ? "brand" : "outline"}
              style={{ opacity: selectedEligibleCount === 0 ? 0.5 : 1 }}
            >
              Selected ({selectedEligibleCount})
            </Tag>
          </TagGroup>
        </div>

        <Toolbar size="small" className={styles.actionsRow}>
          <ToolbarButton
            icon={<Plus size={16} />}
            appearance="primary"
            onClick={() => setAddDialogOpen(true)}
            disabled={eligibleServices.length === 0}
          >
            Add service
          </ToolbarButton>

          <ToolbarButton
            icon={<Calendar size={16} />}
            onClick={() => {
              // Seed the per-identifier checklist from the toolbar scope
              // (all eligible OR currently row-selected). The user can
              // refine inside the dialog.
              setDialogTargetIds(new Set(targetIds));
              setDateRangeDialogOpen(true);
            }}
          >
            Set date range
          </ToolbarButton>

          {onCheckAccounts && (
            <ToolbarButton
              icon={<ShieldCheck size={16} />}
              onClick={() => onCheckAccounts({ targetIds })}
              disabled={targetIds.length === 0}
            >
              Check Accounts
            </ToolbarButton>
          )}

          <ToolbarDivider />

          <ToolbarButton
            icon={<RotateCcw size={16} />}
            onClick={() => onResetToLEBaseline({ targetIds })}
            disabled={targetIds.length === 0}
          >
            Reset to LE
          </ToolbarButton>
        </Toolbar>
      </div>

      {/* Shared 3-step Add Service dialog */}
      <AddServiceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        scopeLabel={scopeLabel}
        services={eligibleServices.map((s) => ({
          id: s.key,
          name: s.name,
          icon: s.icon,
        }))}
        availableGroups={dialogAvailableGroups}
        routedTargets={routedTargets}
        alreadyConfigured={alreadyConfigured}
        identifiers={dialogIdentifiers}
        serviceAccountType={serviceAccountType}
        onCommit={handleAddDialogCommit}
      />

      {/* Dialog for Set date range — End Date + (days-back OR direct start-date) */}
      <Dialog open={dateRangeDialogOpen} onOpenChange={(_, d) => setDateRangeDialogOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              Set date range for {dialogTargetIds.size} identifier{dialogTargetIds.size !== 1 ? "s" : ""}
            </DialogTitle>
            <DialogContent className={styles.dialogBody}>
              {/* 1. Pick the identifiers the bulk change applies to.
                  Seeded from the toolbar scope (all eligible OR row-
                  selected) and refinable here so the user can carve out
                  one or two identifiers without re-doing row selection. */}
              <Field
                label={`1. Apply to (${dialogTargetIds.size} of ${eligibleCount} identifier${eligibleCount !== 1 ? "s" : ""})`}
                required
                hint="Uncheck any identifier that should NOT receive this date range."
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: tokens.spacingVerticalXXS,
                    maxHeight: "180px",
                    overflowY: "auto",
                    padding: tokens.spacingVerticalXS,
                    border: `1px solid ${tokens.colorNeutralStroke2}`,
                    borderRadius: tokens.borderRadiusMedium,
                  }}
                >
                  <Checkbox
                    checked={
                      dialogTargetIds.size === eligibleCount
                        ? true
                        : dialogTargetIds.size === 0
                          ? false
                          : "mixed"
                    }
                    onChange={(_, data) =>
                      setDialogTargetIds(
                        data.checked
                          ? new Set(eligibleIdentifiers.map((id) => id.id))
                          : new Set(),
                      )
                    }
                    label={`Select all ${eligibleCount}`}
                  />
                  {eligibleIdentifiers.map((id: any) => {
                    const accountType = id.checkAccounts?.accountType;
                    const accountSuffix =
                      accountType && accountType !== "N/A"
                        ? ` (${accountType})`
                        : "";
                    return (
                      <Checkbox
                        key={id.id}
                        checked={dialogTargetIds.has(id.id)}
                        onChange={(_, data) => {
                          setDialogTargetIds((prev) => {
                            const next = new Set(prev);
                            if (data.checked) next.add(id.id);
                            else next.delete(id.id);
                            return next;
                          });
                        }}
                        label={`${id.value}${accountSuffix}`}
                      />
                    );
                  })}
                </div>
              </Field>

              {/* 2. LE-requested date-range reference. Collapsed to a
                  single row when every service shares the same LE
                  request, expanded into a per-service breakdown when
                  they diverge. Reads from leBaseline for whatever
                  identifiers are currently checked above. */}
              {dialogLeRequestedContext.mode !== "none" && (
                <div
                  style={{
                    padding: tokens.spacingVerticalS,
                    backgroundColor: tokens.colorNeutralBackground3,
                    borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
                    borderRadius: tokens.borderRadiusSmall,
                    fontSize: tokens.fontSizeBase200,
                  }}
                >
                  {dialogLeRequestedContext.mode === "global" ? (
                    <>
                      <div
                        style={{
                          color: tokens.colorNeutralForeground3,
                          marginBottom: tokens.spacingVerticalXXS,
                        }}
                      >
                        LE requested date range (all services)
                      </div>
                      <div
                        style={{
                          color: tokens.colorNeutralForeground1,
                          fontWeight: tokens.fontWeightSemibold,
                        }}
                      >
                        {formatDateToMMM(dialogLeRequestedContext.start)} &nbsp;→&nbsp;{" "}
                        {formatDateToMMM(dialogLeRequestedContext.end)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          color: tokens.colorNeutralForeground3,
                          marginBottom: tokens.spacingVerticalXS,
                        }}
                      >
                        LE requested different date ranges per service
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: tokens.spacingVerticalXXS,
                        }}
                      >
                        {dialogLeRequestedContext.entries.map((e) => (
                          <div
                            key={e.svcKey}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: tokens.spacingHorizontalM,
                            }}
                          >
                            <span style={{ color: tokens.colorNeutralForeground2 }}>
                              {getServiceName(e.svcKey)}
                            </span>
                            <span
                              style={{
                                color: tokens.colorNeutralForeground1,
                                fontWeight: tokens.fontWeightSemibold,
                              }}
                            >
                              {formatDateToMMM(e.start)} → {formatDateToMMM(e.end)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <Field
                label="2. Select End Date"
                required
                hint="The last date of data you want to collect"
              >
                <Input type="date" value={pendingEnd} onChange={(_, d) => setPendingEnd(d.value)} />
              </Field>
              <Field label="3. How do you want to set the start date?" required>
                <RadioGroup
                  value={pendingMode}
                  onChange={(_, data) =>
                    setPendingMode(data.value as "days-back" | "start-date")
                  }
                >
                  <Radio
                    value="days-back"
                    label="Use a days-back shortcut from the end date"
                  />
                  <Radio
                    value="start-date"
                    label="Pick a specific start date"
                  />
                </RadioGroup>
              </Field>
              {pendingMode === "days-back" ? (
                <Field
                  label="Days back"
                  required
                  hint="Enter a number (e.g. 30, 60, 90) — or type 'All' for Jan 1, 1990"
                >
                  <Input
                    type="text"
                    placeholder="e.g. 30, 60, 90, or 'All'"
                    value={pendingDaysBack}
                    onChange={(_, d) => setPendingDaysBack(d.value)}
                  />
                </Field>
              ) : (
                <Field
                  label="Start Date"
                  required
                  hint="The first date of data you want to collect"
                  validationState={
                    pendingStartDirect && pendingEnd && pendingStartDirect > pendingEnd
                      ? "error"
                      : undefined
                  }
                  validationMessage={
                    pendingStartDirect && pendingEnd && pendingStartDirect > pendingEnd
                      ? "Start date must be on or before the end date."
                      : undefined
                  }
                >
                  <Input
                    type="date"
                    value={pendingStartDirect}
                    onChange={(_, d) => setPendingStartDirect(d.value)}
                  />
                </Field>
              )}
              {pendingEnd && pendingStart && pendingInputValid && (
                <div
                  style={{
                    padding: tokens.spacingVerticalS,
                    backgroundColor: tokens.colorNeutralBackground3,
                    borderRadius: tokens.borderRadiusMedium,
                    fontSize: tokens.fontSizeBase200,
                  }}
                >
                  <div style={{ color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalXXS }}>
                    {pendingMode === "days-back" ? "Computed date range" : "Selected date range"}
                  </div>
                  <div style={{ color: tokens.colorNeutralForeground1, fontWeight: tokens.fontWeightSemibold }}>
                    {formatDateToMMM(pendingStart)} &nbsp;→&nbsp; {formatDateToMMM(pendingEnd)}
                  </div>
                </div>
              )}
              <p style={{ fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2 }}>
                Will apply to every currently-selected category across {dialogTargetIds.size} identifier{dialogTargetIds.size !== 1 ? "s" : ""}.
              </p>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDateRangeDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={handleConfirmSetDateRange}
                disabled={!pendingInputValid || dialogTargetIds.size === 0}
              >
                Apply
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}
