/**
 * AuthorityDetailsBlocks — read-only display of the four eEvidence
 * approver blocks (Issuing / Validating / Competent / Enforcing) under
 * Authorization Details.
 *
 * Each block renders a definition-list of the captured envelope metadata.
 * IA / VA / CA share the same field shape and same row layout; the EA
 * has a lighter shape (no approver, no approval-role enum).
 *
 * Visibility rules:
 *   - IssuingAuthority — when `eevidenceIssuingAuthority` is set.
 *   - ValidatingAuthority — when `eevidenceValidatingAuthority` is set
 *     (the IA's `approvalRole === "OtherCompetentAuthority"` is the
 *     typical trigger, but the block surfaces whenever it's seeded).
 *   - CompetentAuthority — when `eevidenceCompetentAuthority` is set.
 *   - EnforcingAuthority — always (falls back to the Microsoft-side
 *     default from `config/eevidenceEnforcingAuthority.ts`).
 *
 * Designed for the current SenderAuthorityTab visual conventions (shadcn
 * Labels + neutral key/value rows). Read-only — no edit affordance for
 * the prototype.
 */

import * as React from "react";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { AlertCircle, Info } from "lucide-react";
import type {
  EEvidenceAuthorityApprover,
  EEvidenceEnforcingAuthority,
  EEvidenceIssuingAuthority,
  EEvidenceValidatingAuthority,
  EEvidenceCompetentAuthority,
  EEvidenceApprovalRole,
  EEvidenceApproverType,
} from "../../types/caseTypes";
import {
  EEVIDENCE_APPROVER_TYPE_LABELS,
  EEVIDENCE_APPROVER_TYPE_DESCRIPTIONS,
} from "../../types/caseTypes";

/** Section header that pairs the authority role title with an Info
 *  tooltip explaining what that role actually does — anchors the
 *  reader on the IA / VA / CA distinction without leaving the form. */
function ApproverSectionHeader({
  title,
  approverType,
  subtitle,
}: {
  title: string;
  approverType: EEvidenceApproverType;
  subtitle: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5">
        <h3 className="text-[#323130] font-semibold text-lg">{title}</h3>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`What does the ${title} do?`}
                className="inline-flex items-center justify-center text-[#605e5c] hover:text-[#0078d4] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0078d4] rounded"
              >
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {EEVIDENCE_APPROVER_TYPE_DESCRIPTIONS[approverType]}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-sm text-[#605e5c] mt-1">{subtitle}</p>
    </div>
  );
}

function approvalRoleLabel(role: EEvidenceApprovalRole): string {
  switch (role) {
    case "JudgeCourtOrInvestigatingJudge":
      return "Judge / Court / Investigating Judge";
    case "PublicProsecutor":
      return "Public Prosecutor";
    case "OtherCompetentAuthority":
      return "Other Competent Authority";
    default:
      return role;
  }
}

function ReadOnlyValue({ value }: { value: React.ReactNode }) {
  return (
    <div className="w-full min-h-[2.5rem] px-3 py-2 border border-[#edebe9] bg-[#f3f2f1] rounded-md flex items-start text-[#323130] whitespace-pre-wrap">
      {value || "Not set"}
    </div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: React.ReactNode;
  helper?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[#323130] font-semibold">{label}</Label>
      {children}
      {helper && (
        <p className="text-[#605e5c] text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {helper}
        </p>
      )}
    </div>
  );
}

function ReferenceNumberList({ refs }: { refs: string[] }) {
  if (refs.length === 0) {
    return <ReadOnlyValue value="Not set" />;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {refs.map((ref) => (
        <Badge key={ref} variant="outline" className="font-mono text-xs">
          {ref}
        </Badge>
      ))}
    </div>
  );
}

function ApproverBlock({
  title,
  approver,
  issuingAuthorityRole,
}: {
  title: string;
  approver: EEvidenceAuthorityApprover | undefined;
  /** Optional Issuing Authority role — surfaced inside this block (after the
   *  approver's Name) only when provided. Used for the IA approver; VA and
   *  Central Authority approvers omit it. */
  issuingAuthorityRole?: string;
}) {
  if (!approver) return null;
  return (
    <div className="mt-4">
      <h4 className="text-[#323130] font-semibold mb-2">{title}</h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
        <Field label="Name">
          <ReadOnlyValue value={approver.name} />
        </Field>
        {issuingAuthorityRole !== undefined && (
          <Field label="Issuing Authority Role">
            <ReadOnlyValue value={issuingAuthorityRole || "Not set"} />
          </Field>
        )}
        <Field label="Email">
          <ReadOnlyValue value={approver.email ?? "Not set"} />
        </Field>
        <Field label="Address" helper="Street address of the approver's office.">
          <ReadOnlyValue value={approver.address ?? "Not set"} />
        </Field>
        <Field label="Languages Spoken">
          <ReadOnlyValue value={approver.languagesSpoken ?? "Not set"} />
        </Field>
        <Field label="Tel No (with country + area code)">
          <ReadOnlyValue value={approver.tel ?? "Not set"} />
        </Field>
        <Field label="Fax No (with country + area code)">
          <ReadOnlyValue value={approver.fax ?? "Not set"} />
        </Field>
      </div>
    </div>
  );
}

/** Shared row layout for IA / VA / CA blocks. Surfaces the new
 *  "Approver Type" discriminator at the top so the RS can tell which
 *  kind of authority block they're reading without scanning the title.
 *  "Authority Type" was renamed to "Approver Role" — points at the
 *  same `approvalRole` enum but uses the language the rest of the
 *  form uses for approver-side metadata. */
function ApproverBlockRows({
  approverType,
  idNumber,
  name,
  countryName,
  approvalRole,
  approvalReferenceNumbers,
}: {
  approverType: EEvidenceApproverType;
  idNumber: string | undefined;
  name: string | undefined;
  countryName: string | undefined;
  approvalRole: EEvidenceApprovalRole;
  approvalReferenceNumbers: string[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
      <Field label="Approver Type">
        <ReadOnlyValue
          value={EEVIDENCE_APPROVER_TYPE_LABELS[approverType]}
        />
      </Field>
      <Field label="ID Number">
        <ReadOnlyValue value={idNumber ?? "Not set"} />
      </Field>
      <Field label="Name of the Authority">
        <ReadOnlyValue value={name ?? "Not set"} />
      </Field>
      <Field label="Country">
        <ReadOnlyValue value={countryName ?? "Not set"} />
      </Field>
      <Field label="Approver Role">
        <ReadOnlyValue value={approvalRoleLabel(approvalRole)} />
      </Field>
      <Field label="Approval Reference Number(s)">
        <ReferenceNumberList refs={approvalReferenceNumbers} />
      </Field>
    </div>
  );
}

export function IssuingAuthorityDetails({
  ia,
}: {
  ia: EEvidenceIssuingAuthority | undefined;
}) {
  if (!ia) return null;
  return (
    <section
      className="pt-4 border-t border-[#edebe9]"
      data-section="eevidence-issuing-authority"
    >
      <ApproverSectionHeader
        title="Issuing Authority"
        approverType="IssuingAuthority"
        subtitle="Court / Prosecutor / Other Competent Authority that issued the EPOC."
      />

      <ApproverBlockRows
        approverType={ia.approverType ?? "IssuingAuthority"}
        idNumber={ia.idNumber}
        name={ia.name}
        countryName={ia.country?.countryName}
        approvalRole={ia.approvalRole}
        approvalReferenceNumbers={ia.approvalReferenceNumbers}
      />

      <ApproverBlock
        title="Approver"
        approver={ia.approver}
        issuingAuthorityRole={ia.issuingAuthorityRole}
      />

      {ia.centralAuthorityContact && (
        <ApproverBlock
          title="Central Authority Contact (when different from the Issuing Authority)"
          approver={ia.centralAuthorityContact}
        />
      )}
    </section>
  );
}

export function ValidatingAuthorityDetails({
  va,
}: {
  va: EEvidenceValidatingAuthority | undefined;
}) {
  if (!va) return null;
  return (
    <section
      className="pt-4 border-t border-[#edebe9]"
      data-section="eevidence-validating-authority"
    >
      <ApproverSectionHeader
        title="Validating Authority"
        approverType="ValidatingAuthority"
        subtitle="Judge / Prosecutor who validated the order when the Issuing Authority is an &quot;Other Competent Authority&quot;."
      />

      <ApproverBlockRows
        approverType={va.approverType ?? "ValidatingAuthority"}
        idNumber={va.idNumber}
        name={va.name}
        countryName={va.country?.countryName}
        approvalRole={va.approvalRole}
        approvalReferenceNumbers={va.approvalReferenceNumbers}
      />

      <ApproverBlock title="Approver" approver={va.approver} />
    </section>
  );
}

export function CompetentAuthorityDetails({
  ca,
}: {
  ca: EEvidenceCompetentAuthority | undefined;
}) {
  if (!ca) return null;
  return (
    <section
      className="pt-4 border-t border-[#edebe9]"
      data-section="eevidence-competent-authority"
    >
      <ApproverSectionHeader
        title="Competent Authority"
        approverType="CompetentAuthority"
        subtitle="Additional authority with competence over the order — e.g., an appellate court or ministry-level body acting alongside the IA."
      />

      <ApproverBlockRows
        approverType={ca.approverType ?? "CompetentAuthority"}
        idNumber={ca.idNumber}
        name={ca.name}
        countryName={ca.country?.countryName}
        approvalRole={ca.approvalRole}
        approvalReferenceNumbers={ca.approvalReferenceNumbers}
      />

      <ApproverBlock title="Approver" approver={ca.approver} />
    </section>
  );
}

export function EnforcingAuthorityDetails({
  ea,
}: {
  ea: EEvidenceEnforcingAuthority | undefined;
}) {
  if (!ea) return null;
  return (
    <section
      className="pt-4 border-t border-[#edebe9]"
      data-section="eevidence-enforcing-authority"
    >
      <div className="mb-4">
        <h3 className="text-[#323130] font-semibold text-lg">Enforcing Authority</h3>
        <p className="text-sm text-[#605e5c] mt-1">
          Microsoft-side receiving authority for all eEvidence cases — same
          default across every EPOC, NOT transmitted in Form 1.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
        <Field label="Name of the Authority">
          <ReadOnlyValue value={ea.name} />
        </Field>
      </div>

      {/* Contact sub-block — parallel to IA/VA/CA's Approver sub-block so the
          four authority blocks share a visual rhythm. */}
      <div className="mt-4">
        <h4 className="text-[#323130] font-semibold mb-2">Contact</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Name">
            <ReadOnlyValue value={ea.contactName ?? "Not set"} />
          </Field>
          <Field label="Email">
            <ReadOnlyValue value={ea.email ?? "Not set"} />
          </Field>
          <Field label="Address">
            <ReadOnlyValue value={ea.address ?? "Not set"} />
          </Field>
          <Field label="Tel No (with country + area code)">
            <ReadOnlyValue value={ea.tel ?? "Not set"} />
          </Field>
          <Field label="Fax No (with country + area code)">
            <ReadOnlyValue value={ea.fax ?? "Not set"} />
          </Field>
        </div>
      </div>
    </section>
  );
}
