/**
 * NotifyUserNoticeBanner — surfaced on Step 4 ("Identifier & Data
 * Services") when the case is NOT an eEvidence / COPO Order request and
 * Check Accounts has identified at least one Consumer account. Points
 * the Response Specialist at the User Notification tab in Step 5, where
 * the LE / User notification dates and responses are tracked.
 *
 * The banner is purely advisory — it does not gate any UI. It mirrors
 * the InformControllerNoticeBanner so the post-Check-Accounts CTA flow
 * is symmetric (Enterprise → Controller; Consumer → User).
 */

import * as React from "react";
import { User } from "lucide-react";
import type { AccountIdentifier, FormData } from "../../types/caseTypes";

/** Selector — true when the case is non-eEvidence / non-COPO AND at
 *  least one identifier resolved to a Consumer account. */
export function shouldShowNotifyUserNotice(formData: FormData): boolean {
  const reqType = formData.requestType;
  if (reqType === "eEvidence" || reqType === "COPO Order") return false;
  return (formData.identifiers ?? []).some(
    (id: AccountIdentifier) =>
      id.accountExistenceStatus === "success" &&
      id.checkAccounts?.accountType === "Consumer",
  );
}

function getConsumerIdentifierValues(formData: FormData): string[] {
  return (formData.identifiers ?? [])
    .filter(
      (id: AccountIdentifier) =>
        id.accountExistenceStatus === "success" &&
        id.checkAccounts?.accountType === "Consumer",
    )
    .map((id) => id.value);
}

export interface NotifyUserNoticeBannerProps {
  formData: FormData;
  /** Optional — invoked when the RS clicks "Manage user notification".
   *  Lifts the user up to Step 5 with the User Notification tab
   *  pre-selected. */
  onManageNotification?: () => void;
}

export function NotifyUserNoticeBanner({
  formData,
  onManageNotification,
}: NotifyUserNoticeBannerProps) {
  if (!shouldShowNotifyUserNotice(formData)) return null;

  const consumerIdentifiers = getConsumerIdentifierValues(formData);

  return (
    <div
      role="status"
      className="rounded-md border border-[#107c10]/40 bg-[#f3faf2] p-4 flex items-start gap-3"
    >
      <User
        className="w-5 h-5 text-[#107c10] flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex-1 space-y-2">
        <div className="font-semibold text-[#0a5d0a]">
          User Notification available
        </div>
        <p className="text-sm text-[#605e5c]">
          Check Accounts identified
          {consumerIdentifiers.length > 0 && (
            <>
              {" "}
              <b>{consumerIdentifiers.length}</b> Consumer account
              {consumerIdentifiers.length === 1 ? "" : "s"} (
              {consumerIdentifiers.slice(0, 2).join(", ")}
              {consumerIdentifiers.length > 2
                ? `, +${consumerIdentifiers.length - 2} more`
                : ""}
              )
            </>
          )}
          . Direct user notification is permitted for{" "}
          <b>{formData.requestType || "this request type"}</b> — track the
          LE-response and user-notification dates in the next step.
        </p>
        {onManageNotification && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onManageNotification}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm bg-[#107c10] hover:bg-[#0a5d0a] text-white transition-colors"
            >
              <User className="w-3.5 h-3.5" aria-hidden="true" />
              Manage user notification →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
