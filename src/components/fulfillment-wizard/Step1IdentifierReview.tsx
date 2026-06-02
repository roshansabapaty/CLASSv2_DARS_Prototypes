/**
 * Step 1: Identifier Review Component
 * Allows review and management of target identifiers for fulfillment
 */

import React, { useState } from "react";
import { Card } from "../ui/card";
import { IdentifierTable } from "../identifier-table";
import type { AddIdentifierData } from "../identifier-table";
import { LoginLocationPanel } from "../cross-border/LoginLocationPanel";
import { toast } from "sonner@2.0.3";
import { MICROSOFT_SERVICES_CONFIG } from "../../config/microsoftServices";
import { CURRENT_USER } from "../../constants/caseConstants";
import { createWizardIdentifier, generateTaskId } from "../../utils/fulfillmentWizardHelpers";
import type { Step1Props } from "../../types/fulfillmentWizardTypes";

export function Step1IdentifierReview({ 
  identifiers, 
  onUpdateIdentifiers, 
  formData, 
  announce, 
  accountCheckResults, 
  onUpdateAccountCheckResults 
}: Step1Props) {
  const [isCheckingAccounts, setIsCheckingAccounts] = useState(false);
  const [accountCheckProgress, setAccountCheckProgress] = useState(0);
  // Phase 3 cross-border merge — IP History drawer state, scoped to
  // this wizard step so opening it doesn't affect the parent case form.
  const [ipHistoryIdentifierId, setIpHistoryIdentifierId] = useState<
    string | null
  >(null);

  // handleAdd via AddIdentifierDialog data
  const handleAddFromDialog = (data: AddIdentifierData) => {
    const newIdentifier = createWizardIdentifier();
    newIdentifier.value = data.value;
    newIdentifier.type = data.type;
    newIdentifier.createdBy = data.isSupplemental ? `Supplemental ${CURRENT_USER}` : CURRENT_USER;
    if (data.isSupplemental && data.linkedIdentifierId) {
      newIdentifier.linkedIdentifierId = data.linkedIdentifierId;
    }
    // Pre-populate the Account Check column for supplementals so the
    // user doesn't have to re-run Check Accounts just for the new row.
    if (data.isSupplemental) {
      // accountExistenceStatus="success" + no accountType → "Not Found"
      // per AccountCheckCell's `success && !hasAccount` branch.
      newIdentifier.accountExistenceStatus = "success";
      if (data.accountFound) {
        newIdentifier.checkAccounts = {
          ...(newIdentifier.checkAccounts ?? {}),
          accountType: data.accountType ?? "Consumer",
        };
      }
    }

    // Enable selected service with data categories
    if (data.service && (newIdentifier.services as any)[data.service]) {
      (newIdentifier.services as any)[data.service].enabled = true;
      // Map LE-requested category labels to per-service item keys. For Teams
      // services, "Content" maps to both new split items (Audio/Video + Chats)
      // so an LE Content request generates two independent jobs.
      const isTeamsService = data.service === "teamsForBusiness" || data.service === "teamsForLife";
      const categoryKeyMap: Record<string, Array<{ groupKey: string; itemKey: string }>> = {
        "Basic Subscriber": [{ groupKey: "subscriberData", itemKey: "genericAttributes" }],
        "Authentication Logs": [{ groupKey: "authenticationLogs", itemKey: "genericAttributes" }],
        "Service Telemetry": [{ groupKey: "trafficData", itemKey: "genericAttributes" }],
        "Content": isTeamsService
          ? [
              { groupKey: "contentData", itemKey: "genericAttributesAudioVideo" },
              { groupKey: "contentData", itemKey: "genericAttributesChats" },
            ]
          : [{ groupKey: "contentData", itemKey: "genericAttributes" }],
        "Transactional Logs": [{ groupKey: "subscriberData", itemKey: "paymentInformation" }],
      };
      data.dataCategories.forEach((cat) => {
        const mappings = categoryKeyMap[cat];
        if (!mappings) return;
        mappings.forEach((mapping) => {
          const svc = (newIdentifier.services as any)[data.service];
          const item = svc?.categoryGroups?.[mapping.groupKey]?.[mapping.itemKey];
          if (item) {
            item.enabled = true;
            item.taskId = generateTaskId(data.service, `${mapping.groupKey}:${mapping.itemKey}`);
          }
        });
      });
    }

    onUpdateIdentifiers([...identifiers, newIdentifier]);
    const serviceLabel = data.service
      ? MICROSOFT_SERVICES_CONFIG[data.service as keyof typeof MICROSOFT_SERVICES_CONFIG]?.name || data.service
      : "";
    const supplementalMsg = data.isSupplemental && data.linkedIdentifierId
      ? ` (linked to ${identifiers.find(id => id.id === data.linkedIdentifierId)?.value})`
      : "";
    const successMsg = `Identifier added successfully with ${serviceLabel}${supplementalMsg}`;
    toast.success(successMsg);
    announce?.(successMsg);
  };

  // Account check counts
  const step1CheckedCount = Object.keys(accountCheckResults).length;
  const step1FoundCount = Object.values(accountCheckResults).filter((r: any) => r.exists).length;
  const step1NotFoundCount = Object.values(accountCheckResults).filter((r: any) => r.checked && !r.exists).length;

  // Account check — delegates to the authoritative path used by the
  // case-form Triage stage so seeded `checkAccounts.accountType` is
  // honoured and the Consumer User Location Summary column populates
  // deterministically (demo cases like LNS-2026-00265 surface their
  // Athens / NYC logins as documented).
  //
  // Previously this handler used `Math.random()` to roll Consumer vs
  // Enterprise, which silently overwrote the seed and made IP-history
  // population a coin flip per run.
  const handleCheckAllAccounts = async () => {
    setIsCheckingAccounts(true);
    setAccountCheckProgress(0);

    const { runAccountExistenceCheck, applyAccountExistenceResults } =
      await import("../../utils/accountExistenceCheck");
    const { isEpocPrCase } = await import("../../utils/eEvidenceHelpers");
    const { queryLogins } = await import("../../services/loginQuery");
    const { setLastLogon } = await import("../../state/ipHistoryStore");

    const { resultsMap, successCount } = await runAccountExistenceCheck(
      identifiers,
      formData?.caseStage ?? "In Progress",
      "fulfillment",
      isEpocPrCase((formData ?? {}) as any),
    );
    setAccountCheckProgress(100);

    const updatedIdentifiers = applyAccountExistenceResults(
      identifiers,
      resultsMap,
    );

    // Mirror outcomes to the wizard-level `accountCheckResults` map so
    // the IdentifierTable's checked / found / not-found counters stay
    // accurate. The map's shape matters only for those counters — the
    // table reads `accountType` from each identifier directly.
    const wizardResults: Record<string, any> = { ...accountCheckResults };
    for (const id of updatedIdentifiers) {
      const accountType = id.checkAccounts?.accountType;
      wizardResults[id.id] = {
        checked: true,
        exists: accountType === "Consumer" || accountType === "Enterprise",
      };
    }
    onUpdateAccountCheckResults(wizardResults);
    onUpdateIdentifiers(updatedIdentifiers);

    // Phase 3 cross-border — populate IP History for Consumer
    // identifiers (30-day window ending today). Mirrors the
    // useCaseWorkflow.checkAccountsForIdentifiers loop so every Check
    // Accounts surface produces the same column data.
    const today = new Date();
    const rangeEnd = today.toISOString().slice(0, 10);
    const rangeStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const issuingAgency = {
      id: formData?.caseId ?? "",
      name: formData?.agency ?? "",
      shortName: formData?.agency ?? "",
      countryCode: formData?.agencyCountryCode ?? "",
      country: formData?.country ?? "",
      type:
        formData?.requestType === "eEvidence"
          ? ("Judicial Authority" as const)
          : ("Law Enforcement" as const),
    };
    for (const id of updatedIdentifiers) {
      if (id.checkAccounts?.accountType !== "Consumer") continue;
      const q = queryLogins({
        identifier: id.value,
        rangeStart,
        rangeEnd,
        issuingAgency,
      });
      const latest =
        q.events.length > 0 ? q.events[q.events.length - 1] : null;
      setLastLogon(id.id, {
        lastEvent: latest,
        totalEvents: q.totalEvents,
        queriedAt: new Date(),
        rangeStart,
        rangeEnd,
      });
    }

    setIsCheckingAccounts(false);

    const msg = `Account check complete: ${successCount} of ${identifiers.length} accounts found`;
    toast.success(msg);
    announce?.(msg);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-[#e1dfdd] bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-semibold text-[#323130]">
              Identifier Review
            </h3>
            <p className="text-sm text-[#605e5c]">
              Review and manage the target identifiers for this fulfillment request
            </p>
          </div>
        </div>
      </Card>

      {/* Consolidated IdentifierTable */}
      <IdentifierTable
        identifiers={identifiers}
        readOnly={false}
        requestType={formData?.requestType}
        onUpdateIdentifiers={onUpdateIdentifiers}
        onAddIdentifier={handleAddFromDialog}
        onCheckAllAccounts={handleCheckAllAccounts}
        checkingAccounts={isCheckingAccounts}
        checkProgress={accountCheckProgress}
        accountCheckCounts={{
          checked: step1CheckedCount,
          found: step1FoundCount,
          notFound: step1NotFoundCount,
          total: identifiers.length,
        }}
        announce={announce}
        onOpenLoginLocation={(id) => setIpHistoryIdentifierId(id)}
      />

      <LoginLocationPanel
        open={ipHistoryIdentifierId !== null}
        onClose={() => setIpHistoryIdentifierId(null)}
        caseFormData={formData}
        identifierId={ipHistoryIdentifierId ?? undefined}
      />
    </div>
  );
}
