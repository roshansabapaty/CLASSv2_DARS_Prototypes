/**
 * EscalateToAttorneyDialog — Specialist-side dialog for opening (or
 * updating / resuming) an escalation. Captures three inputs:
 *
 *  - Role    (required) — Attorney / LENS Lead/Manager / Response
 *            Specialist / Triage Specialist
 *  - Assignee (optional) — specific person in the directory matching
 *            the chosen role; defaults to "Any [role]"
 *  - Reason  (required, ≥ 10 chars) — Specialist's note explaining
 *            why they need a reviewer's eyes on this case
 *
 * The dialog operates in two modes:
 *  - "create"    → fresh escalation. Submit appends an `Escalated` audit
 *                   event and sets `attorneyEscalation` with status =
 *                   "Pending".
 *  - "resume"    → re-opens an existing escalation after the case bounced
 *                   back via "Request More Information". Submit flips
 *                   `status` to "Pending" and appends a `Resumed` event.
 *
 * Despite its filename, the dialog is the entry point for ALL roles, not
 * just Attorney. Filename kept for code-greppability.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { AlertCircle, Scale } from "lucide-react";
import {
  ESCALATION_DIRECTORY,
  ESCALATION_ROLES,
  CURRENT_USER,
} from "../../constants/caseConstants";
import type {
  AccountIdentifier,
  AttorneyEscalation,
  EscalationAuditEvent,
  EscalationRole,
  SignalScope,
} from "../../types/caseTypes";

export type EscalateDialogMode = "create" | "resume";

export interface EscalateToAttorneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  mode: EscalateDialogMode;
  /** Existing escalation (if any). Pre-fills role + assignee when mode === "resume". */
  current?: AttorneyEscalation;
  /** Pre-select a role when opening the dialog (e.g. Enterprise-banner
   *  CTA opens it with `Attorney` preselected). */
  defaultRole?: EscalationRole;
  /** Phase 1 write migration — identifier list used to populate the
   *  scope picker. When omitted the picker hides and the dialog
   *  submits with `scope: { kind: "all" }` (case-wide) for back-compat. */
  identifiers?: AccountIdentifier[];
  /** Submit handler — caller writes the resulting escalation + audit event
   *  to FormData. The `scope` payload encodes whether the action targets
   *  every task on the case (all), specific tasks (some), or is
   *  administrative (none, audit-only). */
  onSubmit: (next: {
    escalation: AttorneyEscalation;
    auditEvent: EscalationAuditEvent;
    scope: SignalScope;
  }) => void;
}

const MIN_REASON_LENGTH = 10;

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function EscalateToAttorneyDialog({
  open,
  onOpenChange,
  caseId,
  mode,
  current,
  defaultRole,
  identifiers,
  onSubmit,
}: EscalateToAttorneyDialogProps) {
  const initialRole: EscalationRole =
    current?.role ?? defaultRole ?? "Attorney";
  const [role, setRole] = React.useState<EscalationRole>(initialRole);
  const [assigneeId, setAssigneeId] = React.useState<string>(
    current?.assignedAttorneyId ?? "",
  );
  const [reason, setReason] = React.useState<string>(
    mode === "resume" ? "" : current?.reason ?? "",
  );
  const [touched, setTouched] = React.useState(false);
  // Phase 1 write migration — scope picker. Encoded as a single string
  // value so the dropdown can mix the fixed entries (all / some / none)
  // with dynamically-computed tenant + tpid entries derived from the
  // case's identifier mix:
  //
  //    "all"                  → SignalScope { kind: "all" }
  //    "tenant:<tenantId>"    → SignalScope { kind: "tenant", tenantId }
  //    "tpid:<tpid>"          → SignalScope { kind: "tpid", tpid }
  //    "some"                 → SignalScope { kind: "some", identifierIds }
  //    "none"                 → SignalScope { kind: "none" }
  const [scopeValue, setScopeValue] = React.useState<string>("all");
  const [selectedIdentifierIds, setSelectedIdentifierIds] = React.useState<
    string[]
  >([]);
  const showScopePicker = (identifiers?.length ?? 0) > 0;

  // Derive the tenant + TPID groupings from the identifier list. Each
  // option only surfaces when it actually addresses a meaningful
  // subset — single-tenant cases hide the tenant variant; cases where
  // a TPID covers only one tenant hide the TPID variant.
  const { tenantOptions, tpidOptions } = React.useMemo(() => {
    const tenantMap = new Map<
      string,
      { label: string; identifierIds: string[] }
    >();
    const tpidMap = new Map<
      string,
      { label: string; tenantIds: Set<string>; identifierIds: string[] }
    >();
    for (const id of identifiers ?? []) {
      const ca = id.checkAccounts;
      if (!ca) continue;
      const tenantId = ca.tenantId;
      const tpid = ca.parentTpid;
      if (tenantId) {
        const tenantLabel =
          ca.tenantPrimaryDomain ?? tenantId.replace(/^tenant-/, "");
        const existing =
          tenantMap.get(tenantId) ??
          { label: tenantLabel, identifierIds: [] };
        existing.identifierIds.push(id.id);
        tenantMap.set(tenantId, existing);
      }
      if (tpid && tenantId) {
        const tpidLabel = tpid.replace(/^TPID-/, "TPID-");
        const existing =
          tpidMap.get(tpid) ??
          { label: tpidLabel, tenantIds: new Set(), identifierIds: [] };
        existing.tenantIds.add(tenantId);
        existing.identifierIds.push(id.id);
        tpidMap.set(tpid, existing);
      }
    }
    // Only surface tenant options when 2+ distinct tenants on the case.
    const tenants = Array.from(tenantMap.entries());
    const tenantOpts =
      tenants.length >= 2
        ? tenants.map(([tenantId, v]) => ({
            tenantId,
            label: v.label,
            identifierCount: v.identifierIds.length,
          }))
        : [];
    // Only surface TPID options when 2+ tenants share the same TPID.
    const tpidOpts = Array.from(tpidMap.entries())
      .filter(([, v]) => v.tenantIds.size >= 2)
      .map(([tpid, v]) => ({
        tpid,
        label: v.label,
        identifierCount: v.identifierIds.length,
        tenantCount: v.tenantIds.size,
      }));
    return { tenantOptions: tenantOpts, tpidOptions: tpidOpts };
  }, [identifiers]);

  // Reset when dialog re-opens.
  React.useEffect(() => {
    if (open) {
      setRole(current?.role ?? defaultRole ?? "Attorney");
      setAssigneeId(current?.assignedAttorneyId ?? "");
      setReason(mode === "resume" ? "" : current?.reason ?? "");
      setTouched(false);
      setScopeValue("all");
      setSelectedIdentifierIds([]);
    }
  }, [open, current, defaultRole, mode]);

  const toggleIdentifier = (id: string) => {
    setSelectedIdentifierIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const isSomeScope = scopeValue === "some";
  // Picking scope=some without any selected identifiers is invalid —
  // the submit button surfaces this as an error.
  const scopeError =
    touched && isSomeScope && selectedIdentifierIds.length === 0
      ? "Pick at least one task for a partial escalation."
      : undefined;

  const directoryForRole = React.useMemo(
    () => ESCALATION_DIRECTORY.filter((d) => d.role === role),
    [role],
  );

  const reasonTrimmed = reason.trim();
  const reasonError =
    touched && reasonTrimmed.length < MIN_REASON_LENGTH
      ? `Please provide a reason (at least ${MIN_REASON_LENGTH} characters).`
      : undefined;
  const canSubmit =
    reasonTrimmed.length >= MIN_REASON_LENGTH &&
    (!isSomeScope || selectedIdentifierIds.length > 0);

  const titleText =
    mode === "resume" ? "Resume Escalation" : current ? "Update Escalation" : "Escalate to Attorney";
  const submitText =
    mode === "resume" ? "Resume" : current ? "Update" : "Escalate";
  const eventKind: EscalationAuditEvent["kind"] =
    mode === "resume" ? "Resumed" : "Escalated";

  const handleSubmit = () => {
    setTouched(true);
    if (!canSubmit) return;

    const now = new Date();
    const escalation: AttorneyEscalation = current
      ? {
          ...current,
          role,
          assignedAttorneyId: assigneeId || undefined,
          reason: reasonTrimmed,
          status: "Pending",
        }
      : {
          role,
          assignedAttorneyId: assigneeId || undefined,
          reason: reasonTrimmed,
          escalatedAt: now,
          escalatedBy: CURRENT_USER,
          status: "Pending",
          actions: [],
        };

    // Decode the picker string into a SignalScope. `tenant:<id>` and
    // `tpid:<id>` carry their target id after the colon; the helper
    // `resolveTargetIdentifiers` derives the affected identifier list
    // at write time, so the dialog doesn't need to enumerate it here.
    const scope: SignalScope = (() => {
      if (scopeValue === "all") return { kind: "all" };
      if (scopeValue === "some") {
        return { kind: "some", identifierIds: selectedIdentifierIds };
      }
      if (scopeValue === "none") return { kind: "none" };
      if (scopeValue.startsWith("tenant:")) {
        return { kind: "tenant", tenantId: scopeValue.slice("tenant:".length) };
      }
      if (scopeValue.startsWith("tpid:")) {
        return { kind: "tpid", tpid: scopeValue.slice("tpid:".length) };
      }
      // Fallback — defensive default.
      return { kind: "all" };
    })();

    const auditEvent: EscalationAuditEvent = {
      id: genId("audit"),
      kind: eventKind,
      actor: CURRENT_USER,
      performedAt: now,
      note: (() => {
        const totalIds = identifiers?.length ?? 0;
        if (scope.kind === "some") {
          return `${reasonTrimmed}\n\nScope: specific task${
            selectedIdentifierIds.length === 1 ? "" : "s"
          } — ${selectedIdentifierIds.length} of ${totalIds}.`;
        }
        if (scope.kind === "none") {
          return `${reasonTrimmed}\n\nScope: administrative (audit only — no task gating).`;
        }
        if (scope.kind === "tenant") {
          const opt = tenantOptions.find((t) => t.tenantId === scope.tenantId);
          const label = opt?.label ?? scope.tenantId;
          return `${reasonTrimmed}\n\nScope: all identifiers in tenant ${label} (${
            opt?.identifierCount ?? "?"
          } of ${totalIds}).`;
        }
        if (scope.kind === "tpid") {
          const opt = tpidOptions.find((t) => t.tpid === scope.tpid);
          const label = opt?.label ?? scope.tpid;
          return `${reasonTrimmed}\n\nScope: all identifiers under ${label} — covers ${
            opt?.tenantCount ?? "?"
          } tenants (${opt?.identifierCount ?? "?"} of ${totalIds}).`;
        }
        return reasonTrimmed;
      })(),
      // When scope=some + exactly one identifier, stamp it on the
      // event so per-identifier-tagged filters in the AuditThread can
      // route the event to the right row. Tenant / tpid scopes resolve
      // to multiple identifiers, so we don't stamp a single id here —
      // the per-identifier writes inside `applyAttorneyAction` carry
      // their own per-row context.
      identifierId:
        scope.kind === "some" && selectedIdentifierIds.length === 1
          ? selectedIdentifierIds[0]
          : undefined,
    };

    onSubmit({ escalation, auditEvent, scope });
    onOpenChange(false);
  };

  const roleLabel =
    ESCALATION_ROLES.find((r) => r.value === role)?.label ?? role;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] !top-[5rem] !translate-y-0 !z-[60]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#5c2d91]" />
            {titleText}
          </DialogTitle>
          <DialogDescription>
            {mode === "resume"
              ? `Resume the escalation on Case ${caseId} after replying to the reviewer's information request.`
              : `Escalate Case ${caseId} to a reviewer. The targeted role's review panel appears on the case until the escalation is resolved.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Role */}
          <div className="space-y-2">
            <Label className="text-[#323130] font-semibold">
              Role <span className="text-[#d13438]">*</span>
            </Label>
            <Select value={role} onValueChange={(v) => {
              setRole(v as EscalationRole);
              setAssigneeId(""); // reset assignee when role changes
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role…" />
              </SelectTrigger>
              <SelectContent className="!z-[70]">
                {ESCALATION_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[#605e5c]">
              Only the <b>Attorney</b> role surfaces the 4-action review
              panel. Other roles get an Acknowledge / Reassign panel.
            </p>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-[#323130] font-semibold">
              Specific assignee <span className="text-[#605e5c]">(optional)</span>
            </Label>
            <Select
              value={assigneeId || "any"}
              onValueChange={(v) => setAssigneeId(v === "any" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="!z-[70]">
                <SelectItem value="any">Any {roleLabel}</SelectItem>
                {directoryForRole.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scope — Phase 1 write migration. Hidden when the caller
              didn't pass `identifiers` (legacy invocation). Defaults to
              "all" so existing flows submit the same case-wide
              escalation they did before the picker existed. Tenant + TPID
              options surface dynamically when the case spans multiple
              tenants (tenant variant) or multiple tenants share a parent
              TPID (tpid variant). */}
          {showScopePicker && (
            <div className="space-y-2">
              <Label className="text-[#323130] font-semibold">
                Apply to <span className="text-[#d13438]">*</span>
              </Label>
              <Select
                value={scopeValue}
                onValueChange={(v) => setScopeValue(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="!z-[70]">
                  <SelectItem value="all">
                    All identifiers (case-wide)
                  </SelectItem>
                  {tpidOptions.map((opt) => (
                    <SelectItem
                      key={`tpid:${opt.tpid}`}
                      value={`tpid:${opt.tpid}`}
                    >
                      All under {opt.label} — covers {opt.tenantCount} tenants ({opt.identifierCount} identifiers)
                    </SelectItem>
                  ))}
                  {tenantOptions.map((opt) => (
                    <SelectItem
                      key={`tenant:${opt.tenantId}`}
                      value={`tenant:${opt.tenantId}`}
                    >
                      All in tenant {opt.label} ({opt.identifierCount} identifiers)
                    </SelectItem>
                  ))}
                  <SelectItem value="some">Specific identifiers</SelectItem>
                  <SelectItem value="none">
                    Administrative (audit only)
                  </SelectItem>
                </SelectContent>
              </Select>
              {isSomeScope && (
                <div className="space-y-1 rounded-md border border-[#e1dfdd] p-3 bg-[#faf9f8]">
                  <p className="text-xs text-[#605e5c]">
                    Pick the tasks this escalation applies to. Other
                    identifiers on the case continue normally.
                  </p>
                  {(identifiers ?? []).map((id) => (
                    <label
                      key={id.id}
                      className="flex items-center gap-2 text-sm py-1 cursor-pointer hover:bg-white px-2 -mx-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIdentifierIds.includes(id.id)}
                        onChange={() => {
                          toggleIdentifier(id.id);
                          if (!touched) setTouched(true);
                        }}
                        className="accent-[#5c2d91]"
                      />
                      <span className="font-mono text-xs text-[#605e5c]">
                        {id.taskId ?? "—"}
                      </span>
                      <span className="text-[#323130]">{id.value}</span>
                      <span className="text-xs text-[#a19f9d]">
                        ({id.type})
                      </span>
                    </label>
                  ))}
                  {scopeError && (
                    <p
                      className="text-[#d13438] text-sm flex items-center gap-1.5 mt-2"
                      role="alert"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {scopeError}
                    </p>
                  )}
                </div>
              )}
              {scopeValue === "none" && (
                <p className="text-xs text-[#605e5c]">
                  Records the escalation in the audit thread without
                  gating any task. Use for administrative reviews that
                  don't block production on a specific identifier.
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label className="text-[#323130] font-semibold">
              {mode === "resume" ? "Reply to reviewer" : "Reason for escalation"}{" "}
              <span className="text-[#d13438]">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (!touched) setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              placeholder={
                mode === "resume"
                  ? "Provide the additional information the reviewer requested…"
                  : "Briefly explain what the reviewer should focus on…"
              }
              className="min-h-[100px] border-[#c8c6c4] focus:border-[#8764b8] transition-colors bg-white resize-y"
            />
            {reasonError && (
              <p className="text-[#d13438] text-sm flex items-center gap-1.5" role="alert">
                <AlertCircle className="w-3.5 h-3.5" />
                {reasonError}
              </p>
            )}
          </div>

          {/* Help banner */}
          {mode === "create" && (
            <div className="rounded-md bg-[#f3f0fa] border border-[#8764b8]/30 p-3 text-xs text-[#5c2d91]">
              An <b>ATTORNEY REVIEW REQUIRED</b> (or REVIEW REQUESTED for
              non-Attorney roles) chip will appear on this case until a
              reviewer closes the escalation. Every action you and the
              reviewer take is logged in the case's Audit Thread.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#edebe9]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10"
          >
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="h-10 bg-[#5c2d91] hover:bg-[#4b1f78] text-white disabled:opacity-50"
          >
            <Scale className="w-4 h-4 mr-2" />
            {submitText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
