/**
 * ControllerNotificationStrip — read-only context the AttorneyReviewPanel
 * renders above its action buttons when the case is Enterprise. Surfaces
 * the IA's controller-notification intent so the attorney can see at a
 * glance how the IA wants the disclosure routed, without having to scroll
 * up to the Enterprise Request card.
 *
 * The strip does NOT gate any action — the attorney makes the call.
 *
 * Tint variants:
 *   green  → IA set `processorShallInformController = true`
 *   amber  → IA set `processorShallNotInformController = true`
 *   slate  → neither flag is set (no instruction from the IA)
 *   red    → both flags are set (conflicting envelope — flag for review)
 */

import * as React from "react";
import { Mail, MailX, ShieldQuestion, AlertOctagon } from "lucide-react";
import { cn } from "../ui/utils";
import type { FormData } from "../../types/caseTypes";

export interface ControllerNotificationStripProps {
  formData: FormData;
}

type Tint = "green" | "amber" | "slate" | "red";

interface StripCopy {
  tint: Tint;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: string }>;
  title: string;
  body: string;
}

function pickCopy(formData: FormData): StripCopy {
  const e = formData.eevidenceEnterpriseRequest;
  const inform = e?.processorShallInformController === true;
  const noInform = e?.processorShallNotInformController === true;

  if (inform && noInform) {
    return {
      tint: "red",
      Icon: AlertOctagon,
      title: "Conflicting controller-notification flags",
      body:
        "The IA submitted BOTH 'inform' and 'do not inform' as true. " +
        "Treat as ambiguous and review with Legal before acting.",
    };
  }
  if (inform) {
    return {
      tint: "green",
      Icon: Mail,
      title: "IA instructed Microsoft to inform the controller",
      body:
        "After disclosure, the controller (the enterprise customer hosting " +
        "the data) is to be notified. Tenant admin contact lives in Step 5 " +
        "→ Controller Notification tab.",
    };
  }
  if (noInform) {
    return {
      tint: "amber",
      Icon: MailX,
      title: "IA instructed Microsoft to NOT inform the controller",
      body:
        "The IA has expressly told us not to notify the enterprise " +
        "customer after disclosure. Withhold the controller notification " +
        "email and document the rationale in the case audit.",
    };
  }
  return {
    tint: "slate",
    Icon: ShieldQuestion,
    title: "No controller-notification instruction from the IA",
    body:
      "The IA didn't tick either 'inform' or 'do not inform' on the " +
      "envelope. Use your standard playbook and confirm with Legal before " +
      "deciding whether to notify the controller.",
  };
}

const tintClasses: Record<Tint, { wrap: string; title: string; icon: string }> =
  {
    green: {
      wrap: "border-[#107c10]/40 bg-[#f3faf2]",
      title: "text-[#0a5d0a]",
      icon: "text-[#107c10]",
    },
    amber: {
      wrap: "border-[#ca5010]/40 bg-[#fff4e6]",
      title: "text-[#7a3a00]",
      icon: "text-[#ca5010]",
    },
    slate: {
      wrap: "border-[#8a8886]/40 bg-[#f3f2f1]",
      title: "text-[#323130]",
      icon: "text-[#605e5c]",
    },
    red: {
      wrap: "border-[#c50f1f]/40 bg-[#fef0f0]",
      title: "text-[#c50f1f]",
      icon: "text-[#c50f1f]",
    },
  };

export function ControllerNotificationStrip({
  formData,
}: ControllerNotificationStripProps) {
  const copy = pickCopy(formData);
  const cls = tintClasses[copy.tint];
  return (
    <div
      role="note"
      className={cn(
        "mb-4 rounded-md border p-3 flex items-start gap-2",
        cls.wrap,
      )}
    >
      <copy.Icon
        className={cn("w-4 h-4 mt-0.5 flex-shrink-0", cls.icon)}
        aria-hidden="true"
      />
      <div className="space-y-0.5">
        <div className={cn("text-sm font-semibold", cls.title)}>
          {copy.title}
        </div>
        <p className="text-xs text-[#605e5c]">{copy.body}</p>
      </div>
    </div>
  );
}
