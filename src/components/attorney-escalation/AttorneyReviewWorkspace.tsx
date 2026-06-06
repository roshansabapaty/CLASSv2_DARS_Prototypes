/**
 * AttorneyReviewWorkspace — focused case view for attorneys.
 *
 * Composes the new attorney-review surfaces (tri-pane summary, enterprise
 * context, attorney review panel with disclosure section + heat strip,
 * audit thread) into a single page. Distinct from the RS-facing
 * DataEntryForm which is workflow-heavy and form-driven.
 *
 * Stage A (this PR): renders standalone; the "Show DARS Request View"
 * button is a placeholder. Stage B will add a re-resizable split that
 * embeds DataEntryForm on the right when the button is toggled on.
 *
 * Routing: hosted by App.tsx when `activeApp === "attorneyCaseView"`.
 * Reached via "Open case to take action" on the Attorney Dashboard.
 */

import * as React from "react";
import { Resizable } from "re-resizable";
import {
  Button,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowLeftRegular,
  ChatMultipleRegular,
  DismissRegular,
  DocumentBriefcaseRegular,
  GavelRegular,
  PanelRightRegular,
  ScalesRegular,
} from "@fluentui/react-icons";
import { CaseRequestSnapshot } from "./CaseRequestSnapshot";
import { LegalDemandSnapshot } from "./LegalDemandSnapshot";
import { CorrespondencePanel } from "../correspondence/CorrespondencePanel";
import { IdentifierTable } from "../identifier-table";
import { LoginLocationPanel } from "../cross-border/LoginLocationPanel";
import { PriorTenantHistoryPanel } from "../enterprise-context/PriorTenantHistoryPanel";
import { PriorCaseDetailPanel } from "../enterprise-context/PriorCaseDetailPanel";
import type { EnterpriseCtaAction } from "../enterprise-context/enterpriseCtaTypes";
import { AuthoritySignalSimulator } from "./AuthoritySignalSimulator";
import { getPriorCasesForTenant } from "../../utils/priorTenantLookup";
import {
  applyAttorneyAction,
  getPrimaryOrg,
} from "../../utils/caseEscalation";
import { MOCK_ORGS } from "../../data/mockOrgs";
import type { SignalScope } from "../../types/caseTypes";
import type {
  AttorneyAction,
  AttorneyEscalation,
  CaseNote,
  EscalationAuditEvent,
  FormData,
} from "../../types/caseTypes";
import type {
  CorrespondenceItem,
  OutboundCorrespondenceItem,
} from "../../types/correspondence";
import {
  getCaseFormDataById,
  setCaseFormDataInRegistry,
} from "../../utils/caseDataRegistry";
import {
  get as getCorrespondenceForCase,
  set as setCorrespondenceForCase,
} from "../../state/correspondenceStore";
import { isEnterpriseCase } from "../../utils/attorneyEscalationHelpers";
import { AttorneyReviewPanel } from "../escalation/AttorneyReviewPanel";
import { EnterpriseTriPaneSummary } from "./EnterpriseTriPaneSummary";
import { EnterpriseContextSection } from "./EnterpriseContextSection";
import { EscalationReasonBadges } from "./EscalationReasonBadges";
import { EscalationNotesCard } from "./EscalationNotesCard";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground3,
  },
  splitBody: {
    flex: 1,
    display: "flex",
    flexDirection: "row",
    overflow: "hidden",
    minHeight: 0,
    // Anchor for the CorrespondencePanel, which mounts as an
    // absolutely-positioned overlay on the right edge of this body
    // when `rightPane === "correspondence"`. The spacer div below
    // shrinks `attorneyPane` so the panel doesn't paint over content.
    position: "relative",
  },
  attorneyPane: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
  },
  darsPane: {
    height: "100%",
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: tokens.colorNeutralStroke2,
    columnGap: tokens.spacingHorizontalM,
    flexWrap: "wrap",
    rowGap: tokens.spacingVerticalXS,
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXS,
    flexWrap: "wrap",
  },
  caseId: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase500,
  },
  attorneyChip: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "4px",
    paddingLeft: "8px",
    paddingRight: "8px",
    paddingTop: "2px",
    paddingBottom: "2px",
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    backgroundColor: "#f3f0fa",
    color: "#5c2d91",
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
  },
  scroll: {
    flex: 1,
    overflowY: "auto",
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    paddingLeft: tokens.spacingHorizontalXXL,
    paddingRight: tokens.spacingHorizontalXXL,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalL,
    maxWidth: "1100px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  notFound: {
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
});

export interface AttorneyReviewWorkspaceProps {
  caseId: string;
  onBackToDashboard: () => void;
  /** Called when the attorney clicks "Open in full editor" from the
   *  DARS Request View snapshot. Routes to the activeApp="queue" RS
   *  case form. */
  onOpenDarsRequestView: () => void;
}

const RIGHT_PANE_DEFAULT_WIDTH = 560;
const RIGHT_PANE_MIN_WIDTH = 360;
const RIGHT_PANE_MAX_WIDTH = 880;

/** Which auxiliary surface is mounted in the right pane. Mutually
 *  exclusive — toggling one closes the other. */
type RightPaneKind = "none" | "dars" | "correspondence" | "legalDemand";

export function AttorneyReviewWorkspace({
  caseId,
  onBackToDashboard,
  onOpenDarsRequestView,
}: AttorneyReviewWorkspaceProps) {
  const styles = useStyles();

  // Phase 3 cross-border merge — drawer state for the LoginLocationPanel.
  // Opened from the Logins button on any identifier row.
  const [loginPanelIdentifierId, setLoginPanelIdentifierId] = React.useState<
    string | null
  >(null);

  // Phase 4 — stacked drawers for the prior-tenant-history flow.
  // `priorHistoryTenantId` opens the list drawer; clicking a row in the
  // list pushes `priorCaseDetailId` onto the stack, which opens the
  // second drawer over the first.
  //
  // Multi-tenant rollup — when the case has multiple tenants under one
  // parent TPID, the workspace also tracks `priorHistoryTpid` so the
  // drawer aggregates across child tenants instead of filtering to a
  // single tenantId. Display labels travel alongside for the drawer
  // subtitle.
  const [priorHistoryTenantId, setPriorHistoryTenantId] = React.useState<
    string | null
  >(null);
  const [priorHistoryTpid, setPriorHistoryTpid] = React.useState<
    string | null
  >(null);
  const [
    priorHistoryTpidDisplayName,
    setPriorHistoryTpidDisplayName,
  ] = React.useState<string | null>(null);
  const [
    priorHistoryTenantDisplayName,
    setPriorHistoryTenantDisplayName,
  ] = React.useState<string | null>(null);
  const [priorCaseDetailId, setPriorCaseDetailId] = React.useState<
    string | null
  >(null);

  const closePriorHistoryDrawer = () => {
    setPriorHistoryTenantId(null);
    setPriorHistoryTpid(null);
    setPriorHistoryTpidDisplayName(null);
    setPriorHistoryTenantDisplayName(null);
  };

  // Pinned follow-up #2 — Authority Signal Simulator. Lets the demoer
  // fire IA Form 4 + EA GFR mutations through the unified write
  // helpers without a real Decentralised IT System inbound.
  const [authoritySimulatorOpen, setAuthoritySimulatorOpen] =
    React.useState(false);

  // Right pane state. `none` = workspace fills the body fullwidth.
  // `dars` = CaseRequestSnapshot in the right pane.
  // `correspondence` = writeable CorrespondencePanel overlay.
  // `legalDemand` = LegalDemandSnapshot in the right pane.
  const [rightPane, setRightPane] = React.useState<RightPaneKind>("none");
  const [rightPaneWidth, setRightPaneWidth] = React.useState<number>(
    RIGHT_PANE_DEFAULT_WIDTH,
  );

  const toggleRightPane = (next: RightPaneKind) => {
    setRightPane((prev) => (prev === next ? "none" : next));
  };

  // Local copy of FormData so attorney actions taken here re-render the
  // page; we also push the new value into the registry cache so other
  // surfaces pick it up on next read.
  const [formData, setFormData] = React.useState<FormData | undefined>(() =>
    getCaseFormDataById(caseId),
  );

  // Re-sync when navigating between cases (caseId prop changes).
  React.useEffect(() => {
    setFormData(getCaseFormDataById(caseId));
  }, [caseId]);

  if (!formData) {
    return (
      <div className={styles.root}>
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <Button
              appearance="subtle"
              icon={<ArrowLeftRegular />}
              onClick={onBackToDashboard}
            >
              Back to Attorney Dashboard
            </Button>
          </div>
        </div>
        <div className={styles.notFound}>
          <Text>Case "{caseId}" not found in the registry.</Text>
        </div>
      </div>
    );
  }

  const handleAttorneyAction: React.ComponentProps<
    typeof AttorneyReviewPanel
  >["onAttorneyAction"] = ({ action, auditEvent, statusPatch }) => {
    setFormData((prev) => {
      if (!prev) return prev;
      // Derive scope from the audit event's identifierId tag:
      //   - tagged → per-identifier action (scope=some, single id)
      //   - untagged → case-wide action (scope=all). The helper
      //     enforces the hybrid-storage rule and mirrors to the
      //     case-level field for scope=all so legacy reads still
      //     resolve correctly.
      const scope: SignalScope = auditEvent.identifierId
        ? { kind: "some", identifierIds: [auditEvent.identifierId] }
        : { kind: "all" };
      const next = applyAttorneyAction(prev, scope, {
        action,
        statusPatch,
        auditEvent,
      });
      setCaseFormDataInRegistry(prev.caseId, next);
      return next;
    });
  };

  // Suppress lint warning on unused vars from the typed destructure helper.
  void ({} as AttorneyAction);
  void ({} as EscalationAuditEvent);

  // Attorney-view sort: float rows that need attorney action to the top.
  // "Needs action" = per-identifier escalation in a non-terminal state
  // (Pending / InformationRequested) OR taskStatus === "AttorneyReview".
  // Stable within each group via index-tiebreak so re-renders don't
  // shuffle order.
  const sortedIdentifiersForAttorney = React.useMemo(() => {
    const list = formData.identifiers ?? [];
    const needsAction = (id: (typeof list)[number]) => {
      const status = id.attorneyEscalation?.status;
      if (status === "Pending" || status === "InformationRequested") return true;
      if (id.taskStatus === "AttorneyReview") return true;
      return false;
    };
    return list
      .map((id, index) => ({ id, index, needs: needsAction(id) }))
      .sort((a, b) => {
        if (a.needs !== b.needs) return a.needs ? -1 : 1;
        return a.index - b.index;
      })
      .map((entry) => entry.id);
  }, [formData.identifiers]);

  // Phase 4 — enterprise CTA action handler. Translates each
  // `EnterpriseCtaAction` from the 5 CTAs into a FormData mutation +
  // an audit event. Mutations also flow into the registry so other
  // surfaces pick them up on next read.
  const handleEnterpriseCtaAction = React.useCallback(
    (a: EnterpriseCtaAction) => {
      setFormData((prev) => {
        if (!prev) return prev;
        const ec = prev.enterpriseContext;
        let nextEc = ec;
        let extraCorrespondence: CorrespondenceItem[] | null = null;

        switch (a.kind) {
          case "redirectToEnterprise": {
            // Append a Draft outbound correspondence item carrying the
            // composed redirect letter. The actual transmission happens
            // when the RS / attorney opens the Correspondence Hub and
            // hits Send on the draft.
            const redirectItem: OutboundCorrespondenceItem = {
              id: `corr-redirect-${Date.now().toString(36)}`,
              direction: "Outbound",
              subject: "Redirect to Enterprise — production letter",
              kind: "Letter",
              counterparty: "IssuingAuthority",
              createdAt: new Date(),
              createdBy: "Attorney Review",
              body: a.correspondenceBody,
              transmission: { status: "Draft" },
            } as unknown as OutboundCorrespondenceItem;
            extraCorrespondence = [
              ...(prev.correspondence ?? []),
              redirectItem,
            ];
            if (ec) {
              nextEc = {
                ...ec,
                redirectedToEnterprise: {
                  at: new Date(),
                  by: "Attorney Review",
                  correspondenceId: redirectItem.id,
                },
              };
            }
            break;
          }
          case "recordDerogationCheck":
            if (ec) nextEc = { ...ec, derogationCheck: a.result };
            break;
          case "flagPolicyReview":
            if (ec) nextEc = { ...ec, policyReviewRequired: true };
            break;
          case "clearPolicyReview":
            if (ec) nextEc = { ...ec, policyReviewRequired: false };
            break;
          case "flagExecReview":
            if (ec) nextEc = { ...ec, execReviewRequired: true };
            break;
          case "clearExecReview":
            if (ec) nextEc = { ...ec, execReviewRequired: false };
            break;
          case "setTenantTier": {
            // Recorded S500 / V100 list-lookup result. Independent
            // booleans. Stamps `tenantTierCheck` on the EC for the
            // case-scoped audit record, auto-sets
            // `execReviewRequired` when either flag is true, and
            // writes through to MOCK_ORGS so future cases on this
            // tenant inherit the recorded tier (matches the "Both —
            // case + org" persistence decision).
            if (ec) {
              const primary = getPrimaryOrg(prev);
              const tierCheck = {
                isS500: a.isS500,
                isV100: a.isV100,
                checkedAt: a.audit.performedAt,
                checkedBy: a.audit.actor,
                checkedRole: a.audit.actorRole ?? "Attorney",
              } as const;
              const patchOrg = <T extends { tenantId: string }>(o: T): T => {
                if (primary && o.tenantId === primary.tenantId) {
                  return { ...o, isS500: a.isS500, isV100: a.isV100 } as T;
                }
                return o;
              };
              nextEc = {
                ...ec,
                tenantTierCheck: tierCheck,
                execReviewRequired:
                  a.isS500 || a.isV100 ? true : ec.execReviewRequired,
                org: patchOrg(ec.org),
                orgs: ec.orgs ? ec.orgs.map(patchOrg) : undefined,
              };
              // Write-through to the shared mock-org catalogue so the
              // next case opened on this tenant starts with the
              // recorded tier already set. Mutates in place since the
              // catalogue is a module-scope record.
              if (primary && MOCK_ORGS[primary.tenantId]) {
                MOCK_ORGS[primary.tenantId].isS500 = a.isS500;
                MOCK_ORGS[primary.tenantId].isV100 = a.isV100;
              }
            }
            break;
          }
          case "viewPriorTenantHistory":
            // Pure side-effect — opens the drawer. No FormData
            // mutation beyond the audit event. When the payload carries
            // a `tpid`, the drawer opens in TPID-rollup mode and
            // aggregates prior cases across child tenants; otherwise
            // tenant-scoped lookup.
            setPriorHistoryTenantId(a.tenantId);
            setPriorHistoryTpid(a.tpid ?? null);
            setPriorHistoryTpidDisplayName(a.tpidDisplayName ?? null);
            setPriorHistoryTenantDisplayName(a.tenantDisplayName ?? null);
            break;
        }

        const next: FormData = {
          ...prev,
          enterpriseContext: nextEc,
          escalationAuditEvents: [
            ...(prev.escalationAuditEvents ?? []),
            a.audit,
          ],
          ...(extraCorrespondence
            ? { correspondence: extraCorrespondence }
            : {}),
        };
        setCaseFormDataInRegistry(prev.caseId, next);
        return next;
      });
    },
    [],
  );

  // Add a free-form escalation note (from the EscalationNotesCard
  // compose area). Appends to `formData.notes` so the new note appears
  // both on the escalation thread and on the Case Notes timeline that
  // RS sees in DataEntryForm. Mirrored to the registry so other
  // surfaces pick it up on next read.
  const handleAddEscalationNote = React.useCallback((note: CaseNote) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const next: FormData = {
        ...prev,
        notes: [...(prev.notes ?? []), note],
      };
      setCaseFormDataInRegistry(prev.caseId, next);
      return next;
    });
  }, []);

  // Send outbound correspondence from the attorney workspace. The
  // attorney is already the senior reviewer here, so we skip the
  // RS-side "hold for attorney review" branch DataEntryForm uses —
  // attorneys send directly. We still update both the
  // correspondenceStore (cross-case mirror) and the registry copy of
  // FormData (so other surfaces see the new item on next read).
  const handleSendOutbound = React.useCallback(
    (
      item: OutboundCorrespondenceItem,
      _opts: { attorneyEscalation: boolean },
    ) => {
      void _opts;
      const caseIdLocal = formData.caseId;
      const sentItem: OutboundCorrespondenceItem = {
        ...item,
        transmission: {
          ...item.transmission,
          status: "Sent",
          sentAt: item.transmission.sentAt ?? new Date(),
          sentBy: item.transmission.sentBy ?? "Attorney Review",
        },
      };
      const current = getCorrespondenceForCase(caseIdLocal);
      const nextItems: CorrespondenceItem[] = [...current, sentItem];
      setCorrespondenceForCase(caseIdLocal, nextItems);
      setFormData((prev) => {
        if (!prev) return prev;
        const next: FormData = { ...prev, correspondence: nextItems };
        setCaseFormDataInRegistry(prev.caseId, next);
        return next;
      });
    },
    [formData.caseId],
  );

  return (
    <div className={styles.root}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <Button
            appearance="subtle"
            icon={<ArrowLeftRegular />}
            onClick={onBackToDashboard}
          >
            Back to Attorney Dashboard
          </Button>
          <Text className={styles.caseId}>{formData.caseId}</Text>
          <span className={styles.attorneyChip}>
            <ScalesRegular fontSize={14} />
            Attorney Review
          </span>
          <EscalationReasonBadges case={formData} />
        </div>
        <div className={styles.topBarRight}>
          <Button
            appearance={rightPane === "dars" ? "primary" : "outline"}
            icon={
              rightPane === "dars" ? (
                <DismissRegular />
              ) : (
                <PanelRightRegular />
              )
            }
            onClick={() => toggleRightPane("dars")}
          >
            {rightPane === "dars"
              ? "Hide DARS Request View"
              : "Show DARS Request View"}
          </Button>
          <Button
            appearance={rightPane === "correspondence" ? "primary" : "outline"}
            icon={
              rightPane === "correspondence" ? (
                <DismissRegular />
              ) : (
                <ChatMultipleRegular />
              )
            }
            onClick={() => toggleRightPane("correspondence")}
          >
            {rightPane === "correspondence"
              ? "Hide Correspondence Hub"
              : "Show Correspondence Hub"}
          </Button>
          <Button
            appearance={rightPane === "legalDemand" ? "primary" : "outline"}
            icon={
              rightPane === "legalDemand" ? (
                <DismissRegular />
              ) : (
                <DocumentBriefcaseRegular />
              )
            }
            onClick={() => toggleRightPane("legalDemand")}
          >
            {rightPane === "legalDemand"
              ? "Hide Legal Demand"
              : "Show Legal Demand"}
          </Button>
          {/* Pinned follow-up #2 — Authority signal simulator. Dev
              affordance until real IA Form 4 / EA GFR inbound flows
              land. Subtle styling so it sits visually behind the
              primary right-pane toggles. */}
          <Button
            appearance="subtle"
            icon={<GavelRegular />}
            onClick={() => setAuthoritySimulatorOpen(true)}
            title="Simulate an IA Form 4 status update or an EA GFR decision (prototype affordance)."
          >
            Simulate authority signal
          </Button>
        </div>
      </div>

      {/* Body: attorney-pane on the left, optional DARS snapshot on the
          right when darsViewOpen. Right pane is resizable via re-resizable
          (same lib DataEntryForm's document panel uses). */}
      <div className={styles.splitBody}>
        <div className={styles.attorneyPane}>
          <div className={styles.scroll}>
            <div className={styles.content}>
              {/* Tri-pane summary — the case-at-a-glance scannable card.
                  `onSeeLogins` opens the cross-border drawer for the
                  active Target Identifier tab. The two `prior*` props
                  surface the tenant's prior LNS cases as inline links
                  in the LE & Order stripe and route clicks straight
                  into the stacked PriorCaseDetailPanel. */}
              <EnterpriseTriPaneSummary
                case={formData}
                onSeeLogins={(id) => setLoginPanelIdentifierId(id)}
                getPriorCasesForTenant={getPriorCasesForTenant}
                onOpenPriorCaseDetail={(priorCaseId) =>
                  setPriorCaseDetailId(priorCaseId)
                }
              />

          {/* Attorney decision surface — case-level read. Per-identifier
              decisions surface inline inside the IdentifierTable below
              (each escalated row hosts its own AttorneyReviewPanel). */}
          <AttorneyReviewPanel
            formData={formData}
            onAttorneyAction={handleAttorneyAction}
          />

          {/* Per-identifier table. Threading `formData` + `onAttorneyAction`
              activates the row's attorney context: escalated rows get
              the red left accent + an inline AttorneyReviewPanel on
              expand; non-escalated rows dim. Read-only here — attorneys
              don't add / edit / delete identifiers.

              Attorney-view sort: rows that need attorney action (active
              per-identifier escalation in Pending / InformationRequested
              OR taskStatus === "AttorneyReview") float to the top;
              everything else follows. Stable within each group. */}
          {(formData.identifiers?.length ?? 0) > 0 && (
            <IdentifierTable
              identifiers={sortedIdentifiersForAttorney}
              readOnly
              requestType={formData.requestType}
              requestSubType={formData.requestSubType}
              formData={formData}
              onAttorneyAction={handleAttorneyAction}
              onOpenLoginLocation={(id) => setLoginPanelIdentifierId(id)}
            />
          )}

          {/* Enterprise context — Tier 3 org + nested Target Identifier
              panel(s). Positioned AFTER the IdentifierTable because its
              data is downstream of Check Accounts (the IA-resolved
              Enterprise tenant + per-user telemetry). Renders only on
              cases with enterprise context. */}
          {isEnterpriseCase(formData) && formData.enterpriseContext && (
            <EnterpriseContextSection
              case={formData}
              onSeeLogins={(id) => setLoginPanelIdentifierId(id)}
              onCtaAction={handleEnterpriseCtaAction}
            />
          )}

              {/* 5. Escalation Notes — original RS escalation reason +
                  chronological list of attorney action notes + free-form
                  notes added via the compose area. Header badge declares
                  whether the case is currently "de-escalated" (Release /
                  ApproveWithConditions / Block) so RS/TS can see at a
                  glance that no further attorney action is pending. Also
                  covers the empty state. */}
              <EscalationNotesCard
                case={formData}
                currentUser="Attorney Review"
                onAddNote={handleAddEscalationNote}
              />
            </div>
          </div>
        </div>

        {/* Right pane — auxiliary surface (DARS Request View or
            Legal Demand Preview). Mutually exclusive; each top-bar
            toggle swaps which surface is mounted. Resizable from the
            left edge.

            Correspondence is special-cased below because the real
            CorrespondencePanel ships its own absolute-positioned
            Resizable shell — we keep its existing UX rather than
            re-wrapping it. */}
        {(rightPane === "dars" || rightPane === "legalDemand") && (
          <Resizable
            className={styles.darsPane}
            size={{ width: rightPaneWidth, height: "100%" }}
            minWidth={RIGHT_PANE_MIN_WIDTH}
            maxWidth={RIGHT_PANE_MAX_WIDTH}
            enable={{ left: true }}
            onResizeStop={(_e, _direction, _ref, d) => {
              setRightPaneWidth((w) => w + d.width);
            }}
            handleStyles={{
              left: {
                left: 0,
                width: "6px",
                cursor: "col-resize",
              },
            }}
          >
            {rightPane === "dars" && (
              <CaseRequestSnapshot
                case={formData}
                onOpenInFullEditor={onOpenDarsRequestView}
              />
            )}
            {rightPane === "legalDemand" && (
              <LegalDemandSnapshot
                case={formData}
                onOpenInFullEditor={onOpenDarsRequestView}
              />
            )}
          </Resizable>
        )}

        {/* Spacer — keeps the attorney pane from being painted over by
            the absolutely-positioned CorrespondencePanel below. Its
            width tracks the panel's own width so drag-resize stays
            visually consistent. */}
        {rightPane === "correspondence" && (
          <div
            style={{ width: rightPaneWidth, flexShrink: 0 }}
            aria-hidden="true"
          />
        )}

        {/* Correspondence Hub — the real writeable panel (composer +
            thread management). Mounts as an absolute overlay anchored
            to splitBody's right edge; the spacer above shrinks the
            attorney pane so content isn't covered. */}
        <CorrespondencePanel
          open={rightPane === "correspondence"}
          onClose={() => setRightPane("none")}
          caseId={formData.caseId}
          caseFormData={formData}
          items={formData.correspondence}
          panelWidth={rightPaneWidth}
          panelMinWidth={RIGHT_PANE_MIN_WIDTH}
          panelMaxWidth={RIGHT_PANE_MAX_WIDTH}
          onResize={setRightPaneWidth}
          onSend={handleSendOutbound}
        />
      </div>

      {/* Cross-border login activity drawer (Phase 3). Opened from any
          identifier row's Logins button. Mounted at the workspace root
          so it floats above all panes. */}
      <LoginLocationPanel
        open={loginPanelIdentifierId !== null}
        onClose={() => setLoginPanelIdentifierId(null)}
        caseFormData={formData}
        identifierId={loginPanelIdentifierId ?? undefined}
      />

      {/* Prior tenant history drawer (Phase 4). Opened by the
          ViewPriorHistoryButton in the OrgPanel or the CTA row. */}
      <PriorTenantHistoryPanel
        open={priorHistoryTenantId !== null}
        onClose={closePriorHistoryDrawer}
        tenantId={priorHistoryTenantId ?? undefined}
        tpid={priorHistoryTpid ?? undefined}
        tpidDisplayName={priorHistoryTpidDisplayName ?? undefined}
        tenantDisplayName={priorHistoryTenantDisplayName ?? undefined}
        onOpenPriorCaseDetail={(priorCaseId) =>
          setPriorCaseDetailId(priorCaseId)
        }
      />

      {/* Pinned follow-up #2 — Authority signal simulator dialog. */}
      <AuthoritySignalSimulator
        open={authoritySimulatorOpen}
        onOpenChange={setAuthoritySimulatorOpen}
        case={formData}
        onCommit={(next) => setFormData(next)}
      />

      {/* Prior case detail drawer — stacks over the history list.
          Closing this one returns to the list (if still open) via the
          "Back to prior history" affordance. Closing the parent list
          while the detail is up also dismisses the detail. */}
      <PriorCaseDetailPanel
        open={priorCaseDetailId !== null}
        onClose={() => setPriorCaseDetailId(null)}
        priorCaseId={priorCaseDetailId ?? undefined}
        onBack={
          priorHistoryTenantId !== null
            ? () => setPriorCaseDetailId(null)
            : undefined
        }
      />
    </div>
  );
}
