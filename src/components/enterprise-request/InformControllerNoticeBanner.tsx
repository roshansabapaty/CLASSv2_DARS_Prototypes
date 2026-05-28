/**
 * InformControllerNoticeBanner — surfaced on Step 4 ("Identifier & Data
 * Services") when the IA's eEvidence envelope set
 * `processorShallInformController = YES` (and the opposite flag
 * `processorShallNotInformController = NO`).
 *
 * The IA has explicitly instructed Microsoft to notify the controller
 * about the disclosure. The banner points the Response Specialist at the
 * Tenant Admin contact pulled from the Enterprise Tenant Profile captured
 * during the account-existence check — that's the address the controller
 * notification email should go to.
 *
 * The banner is purely advisory — it does not gate any UI. It only renders
 * once the RS has run Check Accounts and the Enterprise Tenant Profile
 * returned at least a tenant admin email.
 */

import * as React from "react";
import { Mail, Copy } from "lucide-react";
import type { AccountIdentifier, FormData } from "../../types/caseTypes";

interface TenantAdminReference {
  identifierValue: string;
  tenantPrimaryDomain?: string;
  tenantAdminName?: string;
  tenantAdminEmail: string;
  tenantAdminPhone?: string;
}

function getTenantAdminReferences(formData: FormData): TenantAdminReference[] {
  return (formData.identifiers ?? [])
    .filter(
      (id: AccountIdentifier) =>
        // Only surface tenant admin contacts after Check Accounts has
        // actually run — mirrors the gating on the manifest-error banner.
        id.accountExistenceStatus === "success" &&
        id.checkAccounts?.accountType === "Enterprise" &&
        !!id.checkAccounts?.tenantAdminEmail,
    )
    .map((id) => ({
      identifierValue: id.value,
      tenantPrimaryDomain: id.checkAccounts?.tenantPrimaryDomain,
      tenantAdminName: id.checkAccounts?.tenantAdminName,
      tenantAdminEmail: id.checkAccounts?.tenantAdminEmail as string,
      tenantAdminPhone: id.checkAccounts?.tenantAdminPhone,
    }));
}

/** Selector — true when the IA's envelope explicitly set
 *  `processorShallInformController === true` AND at least one Enterprise
 *  identifier has a tenant admin email to display. */
export function shouldShowInformControllerNotice(
  formData: FormData,
): boolean {
  const e = formData.eevidenceEnterpriseRequest;
  if (e?.processorShallInformController !== true) return false;
  return getTenantAdminReferences(formData).length > 0;
}

export interface InformControllerNoticeBannerProps {
  formData: FormData;
  /** Optional — invoked when the RS clicks "Compose Email". Wire to the
   *  outbound correspondence compose flow with the tenant admin's email
   *  pre-filled in the To: field. */
  onComposeControllerEmail?: (toEmail: string) => void;
  /** Optional — invoked when the RS clicks "Manage controller notification".
   *  Lifts the user up to Step 5 with the Controller Notification tab
   *  pre-selected. */
  onManageNotification?: () => void;
}

export function InformControllerNoticeBanner({
  formData,
  onComposeControllerEmail,
  onManageNotification,
}: InformControllerNoticeBannerProps) {
  if (!shouldShowInformControllerNotice(formData)) return null;

  const references = getTenantAdminReferences(formData);

  const handleCopy = async (email: string) => {
    try {
      await navigator.clipboard?.writeText(email);
    } catch {
      // Clipboard API can fail in test / insecure contexts — silently
      // ignore. The banner remains visible so the RS can still read +
      // copy the address manually.
    }
  };

  return (
    <div
      role="status"
      className="rounded-md border border-[#0078d4]/40 bg-[#deecf9] p-4 flex items-start gap-3"
    >
      <Mail
        className="w-5 h-5 text-[#0078d4] flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex-1 space-y-2">
        <div className="font-semibold text-[#004578]">
          Notify the Controller — Email required
        </div>
        <p className="text-sm text-[#605e5c]">
          The Issuing Authority instructed Microsoft to{" "}
          <b>inform the Controller</b> about this disclosure
          (Section&nbsp;g Sub-section&nbsp;D —{" "}
          <code className="text-xs">processorShallInformController</code>{" "}
          = Yes). Send the controller notification email to the EntraId
          tenant admin captured below.
        </p>
        {onManageNotification && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onManageNotification}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm bg-[#0078d4] hover:bg-[#106ebe] text-white transition-colors"
            >
              <Mail className="w-3.5 h-3.5" aria-hidden="true" />
              Manage controller notification →
            </button>
          </div>
        )}
        <ul className="space-y-2 pt-1">
          {references.map((ref) => (
            <li
              key={`${ref.identifierValue}-${ref.tenantAdminEmail}`}
              className="rounded border border-[#0078d4]/30 bg-white p-3 text-sm"
            >
              <div className="text-xs text-[#605e5c]">
                Target identifier:{" "}
                <span className="font-mono text-[#323130]">
                  {ref.identifierValue}
                </span>
                {ref.tenantPrimaryDomain && (
                  <>
                    {" · Tenant: "}
                    <span className="font-mono text-[#323130]">
                      {ref.tenantPrimaryDomain}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {ref.tenantAdminName && (
                  <span className="text-[#323130]">{ref.tenantAdminName}</span>
                )}
                <a
                  href={`mailto:${ref.tenantAdminEmail}`}
                  className="font-mono text-[#0078d4] underline"
                >
                  {ref.tenantAdminEmail}
                </a>
                {ref.tenantAdminPhone && (
                  <span className="text-[#605e5c]">{ref.tenantAdminPhone}</span>
                )}
                <button
                  type="button"
                  onClick={() => handleCopy(ref.tenantAdminEmail)}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs text-[#0078d4] hover:bg-[#deecf9] border border-transparent hover:border-[#0078d4]/40 transition-colors"
                  aria-label={`Copy ${ref.tenantAdminEmail} to clipboard`}
                >
                  <Copy className="w-3 h-3" aria-hidden="true" />
                  Copy
                </button>
                {onComposeControllerEmail && (
                  <button
                    type="button"
                    onClick={() =>
                      onComposeControllerEmail(ref.tenantAdminEmail)
                    }
                    className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs bg-[#0078d4] hover:bg-[#106ebe] text-white transition-colors"
                  >
                    <Mail className="w-3 h-3" aria-hidden="true" />
                    Compose Email
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
