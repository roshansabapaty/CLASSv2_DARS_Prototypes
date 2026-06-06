/**
 * TenantTierCheckDialog — Enterprise-context CTA that lets the
 * Attorney / RS / TS record whether the tenant appears on the S500
 * or V100 strategic-account lists. Independent flags: a tenant can
 * be on the S500 list only, the V100 list only, both, or neither.
 *
 * This is a recorded list-lookup, not a personal attestation — the
 * S500 / V100 lists are maintained by partner teams (strategic
 * accounts, concession tracker, CLASS Org Profile). The user is
 * recording what they found when they cross-checked, plus when /
 * who / which role did the lookup.
 *
 * Replaces the prior single-toggle "Flag for Exec Review" button.
 * The action remains a gate on executive review — recording either
 * flag auto-stamps `enterpriseContext.execReviewRequired = true` in
 * the parent handler — but the user now records WHICH list the
 * tenant was found on, instead of a label-less exec-review flag.
 *
 * The handler writes through to MOCK_ORGS so the org's `isS500` /
 * `isV100` reflect the recorded result across future cases on the
 * same tenant. Per-case record lives on
 * `enterpriseContext.tenantTierCheck` so audit + provenance
 * (who / when / role) survives independently of the org write-through.
 */

import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { CURRENT_USER } from "../../../constants/caseConstants";
import type {
  EscalationRole,
  FormData,
} from "../../../types/caseTypes";
import { getPrimaryOrg } from "../../../utils/caseEscalation";
import type { EnterpriseCtaAction } from "../enterpriseCtaTypes";

const useStyles = makeStyles({
  body: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalM,
    minWidth: "460px",
  },
  helper: {
    color: tokens.colorNeutralForeground3,
  },
  reviewNote: {
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorSubtleBackground,
    borderLeftStyle: "solid",
    borderLeftWidth: "3px",
    borderLeftColor: tokens.colorPaletteRedBorderActive,
    fontSize: tokens.fontSizeBase200,
  },
  reviewNoteNeutral: {
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorSubtleBackground,
    borderLeftStyle: "solid",
    borderLeftWidth: "3px",
    borderLeftColor: tokens.colorNeutralStroke1,
    fontSize: tokens.fontSizeBase200,
  },
  // Provenance strip — surfaces when the dialog pre-fills checkboxes
  // from the org profile (CLASS Org seed) rather than from a prior
  // recorded check on this case. Amber treatment so the user can
  // tell the boxes weren't user-recorded — they came from a partner
  // team's seed and need to be verified before confirming.
  provenanceStrip: {
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorPaletteYellowBackground1,
    borderLeftStyle: "solid",
    borderLeftWidth: "3px",
    borderLeftColor: tokens.colorPaletteYellowBorderActive,
    fontSize: tokens.fontSizeBase200,
  },
  // Last-recorded strip — used when this case ALREADY has a recorded
  // check (the dialog is being re-opened to edit). Shows who recorded
  // it and when, so the user has full provenance before they overwrite.
  lastRecordedStrip: {
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorSubtleBackground,
    borderLeftStyle: "solid",
    borderLeftWidth: "3px",
    borderLeftColor: tokens.colorBrandStroke2,
    fontSize: tokens.fontSizeBase200,
  },
});

interface Props {
  case: FormData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (a: EnterpriseCtaAction) => void;
  /** Role of the actor recording the list-lookup result. Stamped onto
   *  both the audit event and `tenantTierCheck.checkedRole` so the
   *  cross-surface display can distinguish RS / TS / Attorney recorded
   *  checks. */
  actorRole: EscalationRole;
}

export function TenantTierCheckDialog({
  case: c,
  open,
  onOpenChange,
  onAction,
  actorRole,
}: Props) {
  const styles = useStyles();
  const ec = c.enterpriseContext;
  const primaryOrg = getPrimaryOrg(c);

  // Pre-fill from the case's last recorded check if present; otherwise
  // from the org's seeded `isS500` / `isV100` so the dialog reflects
  // the system-known state on first open and the user can confirm or
  // correct it.
  const initialS500 =
    ec?.tenantTierCheck?.isS500 ?? primaryOrg?.isS500 ?? false;
  const initialV100 =
    ec?.tenantTierCheck?.isV100 ?? primaryOrg?.isV100 ?? false;

  // Provenance of the initial values — drives the inline disclosure
  // strip so the user knows the boxes weren't pre-checked by a prior
  // user action on this case. "case" = a tenantTierCheck was recorded
  // on this case before; "org" = boxes seeded from the org profile
  // (CLASS / partner-team list) and need verification; "fresh" = no
  // pre-fill, both unchecked. Pull-model principle: surface the source
  // explicitly, never let the user confirm a value whose origin is
  // hidden.
  const prefillSource: "case" | "org" | "fresh" = ec?.tenantTierCheck
    ? "case"
    : primaryOrg?.isS500 || primaryOrg?.isV100
      ? "org"
      : "fresh";

  // Formatted "last recorded by" line used in the case-source strip.
  const lastRecordedAt = ec?.tenantTierCheck?.checkedAt
    ? new Date(ec.tenantTierCheck.checkedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  const [isS500, setIsS500] = useState(initialS500);
  const [isV100, setIsV100] = useState(initialV100);

  // Re-sync local state when the dialog opens (so it picks up checks
  // recorded since the dialog was last mounted).
  useEffect(() => {
    if (open) {
      setIsS500(initialS500);
      setIsV100(initialV100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const willTriggerExecReview = isS500 || isV100;
  const isClearing =
    !isS500 && !isV100 && (initialS500 || initialV100);

  const save = () => {
    const now = new Date();
    const tenantLabel = primaryOrg?.tenantDisplayName ?? "this tenant";
    const flagsLabel = (() => {
      if (isS500 && isV100) return "S500 + V100";
      if (isS500) return "S500";
      if (isV100) return "V100";
      return "Not on lists";
    })();

    onAction({
      kind: "setTenantTier",
      isS500,
      isV100,
      audit: {
        id: `audit-tenant-tier-${Date.now().toString(36)}`,
        kind: isClearing ? "TenantTierCleared" : "TenantTierChecked",
        actor: CURRENT_USER,
        actorRole,
        performedAt: now,
        note: `${tenantLabel} recorded as ${flagsLabel} (via Enterprise Context tier-check CTA).`,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Tenant tier check (S500 / V100)</DialogTitle>
          <DialogContent className={styles.body}>
            <Text size={200} className={styles.helper}>
              Record whether{" "}
              <strong>{primaryOrg?.tenantDisplayName ?? "this tenant"}</strong>
              {" "}appears on the S500 or V100 strategic-account lists.
              These lists are maintained by the strategic-accounts and
              concession-tracker teams — cross-check the latest list
              (or ask the owning team) before saving. The recorded
              result drives the executive review gate and is persisted
              across future cases on this tenant.
            </Text>

            {/* Pull-model provenance disclosure (audit P0 #2):
                surface the source of the pre-filled checkboxes so the
                user never confirms a value whose origin is hidden.
                Three states:
                  - prefillSource === "case"  → strip shows the prior
                    recorded check's actor + timestamp so the user
                    knows what they may be about to overwrite
                  - prefillSource === "org"   → amber strip flags that
                    the boxes were seeded from the org profile (CLASS /
                    partner-team list), not from a user action on this
                    case. Verify with the source team before saving.
                  - prefillSource === "fresh" → no strip; the boxes
                    started unchecked, no disclosure needed. */}
            {prefillSource === "case" && ec?.tenantTierCheck && (
              <div className={styles.lastRecordedStrip}>
                <Text weight="semibold" size={200}>
                  Last recorded:
                </Text>{" "}
                <Text size={200}>
                  {(() => {
                    const flags: string[] = [];
                    if (ec.tenantTierCheck.isS500) flags.push("S500");
                    if (ec.tenantTierCheck.isV100) flags.push("V100");
                    const label =
                      flags.length === 0 ? "Not on lists" : flags.join(" + ");
                    return `${label} — by ${ec.tenantTierCheck.checkedBy} (${ec.tenantTierCheck.checkedRole})${lastRecordedAt ? ` on ${lastRecordedAt}` : ""}.`;
                  })()}{" "}
                  Saving here will overwrite this record.
                </Text>
              </div>
            )}
            {prefillSource === "org" && (
              <div className={styles.provenanceStrip}>
                <Text weight="semibold" size={200}>
                  Pre-filled from the org profile.
                </Text>{" "}
                <Text size={200}>
                  These checkboxes reflect the strategic-account flags
                  on{" "}
                  <strong>
                    {primaryOrg?.tenantDisplayName ?? "the org"}
                  </strong>{" "}
                  set by the strategic-accounts / concession-tracker
                  team, not a prior recorded check on this case. Verify
                  with the owning team and save to record on this case.
                </Text>
              </div>
            )}

            <Field label="Tenant found on list">
              <Checkbox
                checked={isS500}
                onChange={(_, d) => setIsS500(d.checked === true)}
                label="S500 — Strategic Top-500 list"
              />
              <Checkbox
                checked={isV100}
                onChange={(_, d) => setIsV100(d.checked === true)}
                label="V100 — High-value Top-100 list"
              />
            </Field>

            {willTriggerExecReview ? (
              <div className={styles.reviewNote}>
                <Text weight="semibold" size={200}>
                  On save, two things happen automatically:
                </Text>
                <Text size={200} as="p" block style={{ marginTop: 4 }}>
                  1. This case is marked for executive review.
                </Text>
                <Text size={200} as="p" block>
                  2. The org profile for{" "}
                  <strong>
                    {primaryOrg?.tenantDisplayName ?? "this tenant"}
                  </strong>{" "}
                  is updated to reflect the recorded check, so any
                  future case opened against this tenant starts with
                  the same flags set.
                </Text>
              </div>
            ) : (
              <div className={styles.reviewNoteNeutral}>
                <Text weight="semibold" size={200}>
                  On save:
                </Text>
                <Text size={200} as="p" block style={{ marginTop: 4 }}>
                  Recording neither list as a match. Executive review
                  is not auto-required by this check. The org profile
                  is still updated so future cases on this tenant
                  start with the same recorded state.
                </Text>
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Cancel</Button>
            </DialogTrigger>
            <Button appearance="primary" onClick={save}>
              {isClearing ? "Clear recorded check" : "Save recorded check"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
