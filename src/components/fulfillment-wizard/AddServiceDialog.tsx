/**
 * AddServiceDialog — shared 3-step Add Service flow used by both surfaces:
 *   - per-identifier flow (RS workspace inside an IdentifierAccordion)
 *   - bulk flow (BulkActionsToolbar at the top of Step 2)
 *
 * Steps:
 *   1. Pick services (multi-select, with search + account-type chips +
 *      disabled rows for services incompatible with any identifier in scope)
 *   2. Configure data category groups + items (one Accordion section per
 *      picked service; reuses ServiceConfigPicker)
 *   3. Preview & confirm (per-service summary + which identifiers each will
 *      land on; in per-identifier flow this is a single-row recap)
 *
 * The dialog is "pure": the caller computes routing + alreadyConfigured up-
 * front, and the dialog just walks the user through the picks and emits a
 * single onCommit at the end.
 */

import * as React from "react";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tag,
  Tooltip,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { ArrowLeft } from "lucide-react";
import {
  SearchableServiceSelector,
  type SearchableServiceItem,
} from "./SearchableServiceSelector";
import { ServiceConfigPicker } from "./ServiceConfigPicker";
import type { CategoryGroupConfig } from "../../config/lensServicesConfig";

export interface AddServiceCommit {
  /** Each picked service's group → item picks. */
  picksByService: Record<string, Record<string, string[]>>;
  /** Each picked service's target identifier IDs (already filtered to those
   *  not yet configured for that service). */
  targetsByService: Record<string, string[]>;
}

export interface AddServiceDialogIdentifier {
  id: string;
  label: string;
  accountType?: "Consumer" | "Enterprise" | "N/A";
}

export interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Short, human-readable scope summary (rendered as a chip next to the dialog
   *  title). Examples: `"For analyst@contoso.com (Enterprise)"` or
   *  `"For 2 identifiers (1 Consumer + 1 Enterprise)"`. */
  scopeLabel: string;
  /** Services available to pick. Caller filters out already-added services. */
  services: SearchableServiceItem[];
  /** Category groups per service for the Configure step. */
  availableGroups: Record<string, CategoryGroupConfig[]>;
  /** For each service, identifier IDs in scope that match its account type.
   *  Empty array → service is disabled in the picker. */
  routedTargets: Record<string, string[]>;
  /** For each service, identifier IDs that already have it configured (so the
   *  preview step can mark them as Skip and the commit excludes them). */
  alreadyConfigured?: Record<string, string[]>;
  /** Identifiers in scope (used to render preview rows by label). */
  identifiers: AddServiceDialogIdentifier[];
  /** Service-key → required account type. Drives the chip in each picker row. */
  serviceAccountType?: Record<string, "Consumer" | "Enterprise" | undefined>;
  /** Caller commits the picks. Per-identifier vs bulk diverge in how the picks
   *  flatten into actual selectionState updates. */
  onCommit: (commit: AddServiceCommit) => void;
}

type Step = "pick" | "configure" | "preview";

const useStyles = makeStyles({
  surface: {
    width: "720px",
    maxWidth: "90vw",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
  },
  scopeChip: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground3,
    paddingTop: "2px",
    paddingBottom: "2px",
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    minHeight: "320px",
  },
  stepper: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    paddingBottom: tokens.spacingVerticalXS,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  step: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  stepActive: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  stepDone: {
    color: tokens.colorPaletteGreenForeground1,
  },
  stepNum: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
  },
  stepNumActive: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  stepNumDone: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground1,
  },
  stepDivider: {
    flex: 1,
    height: "1px",
    backgroundColor: tokens.colorNeutralStroke2,
  },
  intro: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    margin: 0,
  },
  pickerWrap: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: "hidden",
  },
  previewList: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  previewRow: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  previewMain: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
  },
  previewName: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  previewMeta: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  previewCountTrigger: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    textUnderlineOffset: "2px",
    cursor: "help",
  },
  tooltipList: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    fontSize: tokens.fontSizeBase200,
    maxWidth: "320px",
  },
  tooltipGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
  },
  tooltipGroupName: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  tooltipItem: {
    paddingLeft: tokens.spacingHorizontalM,
    color: tokens.colorNeutralForeground2,
  },
  previewTargets: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  previewSkip: {
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
  },
  configureWrap: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    maxHeight: "480px",
    overflowY: "auto",
  },
});

interface StepperItemProps {
  num: string;
  label: string;
  active: boolean;
  done: boolean;
}

function StepperItem({ num, label, active, done }: StepperItemProps) {
  const styles = useStyles();
  return (
    <div
      className={`${styles.step} ${active ? styles.stepActive : ""} ${done ? styles.stepDone : ""}`}
    >
      <span
        className={`${styles.stepNum} ${active ? styles.stepNumActive : ""} ${done ? styles.stepNumDone : ""}`}
      >
        {done ? "✓" : num}
      </span>
      <span>{label}</span>
    </div>
  );
}

export function AddServiceDialog({
  open,
  onOpenChange,
  scopeLabel,
  services,
  availableGroups,
  routedTargets,
  alreadyConfigured,
  identifiers,
  serviceAccountType,
  onCommit,
}: AddServiceDialogProps) {
  const styles = useStyles();
  const [step, setStep] = React.useState<Step>("pick");
  const [picked, setPicked] = React.useState<string[]>([]);
  const [picks, setPicks] = React.useState<
    Record<string, Record<string, string[]>>
  >({});

  // Reset on open.
  React.useEffect(() => {
    if (open) {
      setStep("pick");
      setPicked([]);
      setPicks({});
    }
  }, [open]);

  const seedPicks = React.useCallback(
    (svcKeys: string[]) => {
      const seeded: Record<string, Record<string, string[]>> = {};
      for (const svcKey of svcKeys) {
        const groups = availableGroups[svcKey] ?? [];
        const perGroup: Record<string, string[]> = {};
        for (const group of groups) {
          const keys = group.items
            .filter((i) => i.defaultSelected || i.locked)
            .map((i) => i.key);
          if (keys.length > 0) perGroup[group.key] = keys;
        }
        seeded[svcKey] = perGroup;
      }
      return seeded;
    },
    [availableGroups],
  );

  const togglePick = (svcKey: string) => {
    setPicked((prev) =>
      prev.includes(svcKey)
        ? prev.filter((k) => k !== svcKey)
        : [...prev, svcKey],
    );
  };

  const onItemToggle = (svcKey: string, groupKey: string, itemKey: string) => {
    setPicks((prev) => {
      const svc = prev[svcKey] ?? {};
      const cur = svc[groupKey] ?? [];
      const next = cur.includes(itemKey)
        ? cur.filter((k) => k !== itemKey)
        : [...cur, itemKey];
      return { ...prev, [svcKey]: { ...svc, [groupKey]: next } };
    });
  };

  const onGroupToggle = (
    svcKey: string,
    groupKey: string,
    nextChecked: boolean,
  ) => {
    const groups = availableGroups[svcKey] ?? [];
    const group = groups.find((g) => g.key === groupKey);
    if (!group) return;
    setPicks((prev) => {
      const svc = prev[svcKey] ?? {};
      const nextItems = nextChecked
        ? group.items.map((i) => i.key)
        : group.items.filter((i) => i.locked).map((i) => i.key);
      return { ...prev, [svcKey]: { ...svc, [groupKey]: nextItems } };
    });
  };

  const handleNextFromPick = () => {
    setPicks(seedPicks(picked));
    setStep("configure");
  };

  const handleCommit = () => {
    const targetsByService: Record<string, string[]> = {};
    for (const svcKey of picked) {
      const all = routedTargets[svcKey] ?? [];
      const skip = new Set(alreadyConfigured?.[svcKey] ?? []);
      targetsByService[svcKey] = all.filter((id) => !skip.has(id));
    }
    onCommit({ picksByService: picks, targetsByService });
    onOpenChange(false);
  };

  const totalCategoryPicks = picked.reduce(
    (acc, svcKey) =>
      acc +
      Object.values(picks[svcKey] ?? {}).reduce((s, arr) => s + arr.length, 0),
    0,
  );

  const identifierLabel = (id: string) =>
    identifiers.find((i) => i.id === id)?.label ?? id;

  // Decorate picker rows with an account-type Tag in description, and disable
  // services with no matching identifier in scope.
  const decoratedServices: SearchableServiceItem[] = services.map((s) => {
    const at = serviceAccountType?.[s.id];
    const description = at ? `${at}` : undefined;
    return { ...s, description };
  });

  const disabledReason = (svcKey: string): string | null => {
    const targets = routedTargets[svcKey] ?? [];
    if (targets.length === 0) {
      const at = serviceAccountType?.[svcKey];
      if (at) {
        return `Requires a ${at} account; no identifier in scope matches.`;
      }
      return "No identifier in scope is eligible for this service.";
    }
    return null;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(_, d) => onOpenChange(d.open)}
      modalType="modal"
    >
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>
            <div className={styles.titleRow}>
              <span>Add services</span>
              {scopeLabel && (
                <span className={styles.scopeChip}>{scopeLabel}</span>
              )}
            </div>
          </DialogTitle>
          <DialogContent className={styles.content}>
            <div className={styles.stepper}>
              <StepperItem
                num="1"
                label="Pick services"
                active={step === "pick"}
                done={step !== "pick"}
              />
              <span className={styles.stepDivider} aria-hidden="true" />
              <StepperItem
                num="2"
                label="Configure categories"
                active={step === "configure"}
                done={step === "preview"}
              />
              <span className={styles.stepDivider} aria-hidden="true" />
              <StepperItem
                num="3"
                label="Preview & confirm"
                active={step === "preview"}
                done={false}
              />
            </div>

            {step === "pick" && (
              <>
                <p className={styles.intro}>
                  Select one or more Microsoft services to add. Services with
                  no matching identifier in the current scope are disabled.
                </p>
                <div className={styles.pickerWrap}>
                  <SearchableServiceSelector
                    services={decoratedServices}
                    selectedKeys={picked}
                    multiSelect={true}
                    onToggle={togglePick}
                    placeholder="Search services..."
                    disabledReason={disabledReason}
                  />
                </div>
              </>
            )}

            {step === "configure" && (
              <>
                <p className={styles.intro}>
                  Choose which data category and data types to enable for
                  each service. Default items are pre-selected.
                </p>
                <div className={styles.configureWrap}>
                  <Accordion
                    collapsible
                    multiple
                    defaultOpenItems={picked.slice(0, 1)}
                  >
                    {picked.map((svcKey) => {
                      const svc = services.find((s) => s.id === svcKey);
                      const groups = availableGroups[svcKey] ?? [];
                      const itemPicks = picks[svcKey] ?? {};
                      const cnt = Object.values(itemPicks).reduce(
                        (s, arr) => s + arr.length,
                        0,
                      );
                      return (
                        <AccordionItem key={svcKey} value={svcKey}>
                          <AccordionHeader>
                            <span>
                              {svc?.icon ? `${svc.icon} ` : ""}
                              {svc?.name ?? svcKey}
                              <span
                                style={{
                                  marginLeft: tokens.spacingHorizontalS,
                                  color: tokens.colorNeutralForeground3,
                                  fontWeight: tokens.fontWeightRegular,
                                }}
                              >
                                · {cnt} categor{cnt === 1 ? "y" : "ies"}
                              </span>
                            </span>
                          </AccordionHeader>
                          <AccordionPanel>
                            <ServiceConfigPicker
                              groups={groups}
                              selectedKeys={itemPicks}
                              onItemToggle={(g, i) =>
                                onItemToggle(svcKey, g, i)
                              }
                              onGroupToggle={(g, c) =>
                                onGroupToggle(svcKey, g, c)
                              }
                            />
                          </AccordionPanel>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              </>
            )}

            {step === "preview" && (
              <>
                <p className={styles.intro}>
                  Each service will be applied only to identifiers whose
                  account type matches. Identifiers already configured for a
                  service are skipped.
                </p>
                <div className={styles.previewList}>
                  {picked.map((svcKey) => {
                    const svc = services.find((s) => s.id === svcKey);
                    const all = routedTargets[svcKey] ?? [];
                    const skip = new Set(alreadyConfigured?.[svcKey] ?? []);
                    const willAdd = all.filter((id) => !skip.has(id));
                    const itemPicks = picks[svcKey] ?? {};
                    const categoryCount = Object.values(itemPicks).reduce(
                      (s, arr) => s + arr.length,
                      0,
                    );
                    const at = serviceAccountType?.[svcKey];

                    // Resolve picked itemKeys to display names, grouped by
                    // category-group name, for the hover tooltip.
                    const groups = availableGroups[svcKey] ?? [];
                    const groupedPicks = groups
                      .map((g) => {
                        const pickedItemKeys = itemPicks[g.key] ?? [];
                        const itemNames = g.items
                          .filter((it) => pickedItemKeys.includes(it.key))
                          .map((it) => it.name);
                        return { groupName: g.name, itemNames };
                      })
                      .filter((g) => g.itemNames.length > 0);

                    const tooltipContent =
                      categoryCount > 0 ? (
                        <div className={styles.tooltipList}>
                          {groupedPicks.map((g) => (
                            <div
                              key={g.groupName}
                              className={styles.tooltipGroup}
                            >
                              <span className={styles.tooltipGroupName}>
                                {g.groupName}
                              </span>
                              {g.itemNames.map((n) => (
                                <span
                                  key={n}
                                  className={styles.tooltipItem}
                                >
                                  • {n}
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : null;

                    return (
                      <div key={svcKey} className={styles.previewRow}>
                        <div className={styles.previewMain}>
                          <span className={styles.previewName}>
                            {svc?.icon ? `${svc.icon} ` : ""}
                            {svc?.name ?? svcKey}
                          </span>
                          {at && (
                            <Tag size="extra-small" appearance="outline">
                              {at}
                            </Tag>
                          )}
                          {tooltipContent ? (
                            <Tooltip
                              content={tooltipContent}
                              relationship="description"
                              withArrow
                              positioning="above"
                            >
                              <span
                                className={styles.previewCountTrigger}
                                tabIndex={0}
                                aria-label={`${categoryCount} data ${categoryCount === 1 ? "category" : "categories"} configured. Hover for details.`}
                              >
                                · {categoryCount} categor
                                {categoryCount === 1 ? "y" : "ies"}
                              </span>
                            </Tooltip>
                          ) : (
                            <span className={styles.previewMeta}>
                              · {categoryCount} categor
                              {categoryCount === 1 ? "y" : "ies"}
                            </span>
                          )}
                        </div>
                        <div className={styles.previewTargets}>
                          {willAdd.length === 0 ? (
                            <span className={styles.previewSkip}>
                              Skip —{" "}
                              {skip.size > 0
                                ? "already configured on all matching identifiers"
                                : "no matching identifiers"}
                            </span>
                          ) : (
                            <span>
                              Will add to {willAdd.length} identifier
                              {willAdd.length === 1 ? "" : "s"}:{" "}
                              <b>
                                {willAdd
                                  .map(identifierLabel)
                                  .join(", ")}
                              </b>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </DialogContent>
          <DialogActions>
            {step === "pick" && (
              <>
                <Button
                  appearance="secondary"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  appearance="primary"
                  onClick={handleNextFromPick}
                  disabled={picked.length === 0}
                >
                  Configure {picked.length || ""} service
                  {picked.length === 1 ? "" : "s"} →
                </Button>
              </>
            )}
            {step === "configure" && (
              <>
                <Button
                  appearance="secondary"
                  icon={<ArrowLeft size={14} />}
                  onClick={() => setStep("pick")}
                >
                  Back
                </Button>
                <Button
                  appearance="primary"
                  onClick={() => setStep("preview")}
                  disabled={totalCategoryPicks === 0}
                >
                  Preview →
                </Button>
              </>
            )}
            {step === "preview" && (
              <>
                <Button
                  appearance="secondary"
                  icon={<ArrowLeft size={14} />}
                  onClick={() => setStep("configure")}
                >
                  Back
                </Button>
                <Button appearance="primary" onClick={handleCommit}>
                  Add {picked.length} service
                  {picked.length === 1 ? "" : "s"}
                </Button>
              </>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
