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

  // Simulate account check for all identifiers
  const handleCheckAllAccounts = async () => {
    setIsCheckingAccounts(true);
    setAccountCheckProgress(0);

    const results: Record<string, any> = { ...accountCheckResults };
    const totalSteps = identifiers.length;

    for (let i = 0; i < identifiers.length; i++) {
      const identifier = identifiers[i];

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Randomly assign account existence (80% success rate for demo)
      // An account can only be Consumer OR Enterprise, never both
      const exists = Math.random() > 0.2;
      const accountRoll = exists ? Math.random() : -1;
      const hasConsumer = accountRoll >= 0 && accountRoll < 0.55;
      const hasEnterprise = accountRoll >= 0.55;

      results[identifier.id] = {
        checked: true,
        exists,
        accountTypes: [
          ...(hasConsumer ? ["Consumer"] : []),
          ...(hasEnterprise ? ["Enterprise"] : []),
        ],
        consumer: hasConsumer ? {
          storageLocation: ["US-West", "US-East", "EU-West"][Math.floor(Math.random() * 3)],
          primaryId: identifier.type === "Email address" ? identifier.value : `consumer_${identifier.value.substring(0, 8)}@outlook.com`,
          relatedIdentifiers: ["alias1@outlook.com"],
        } : null,
        enterprise: hasEnterprise ? {
          storageLocation: ["EU-West", "US-Central", "Asia-East"][Math.floor(Math.random() * 3)],
          primaryId: identifier.type === "Email address" ? identifier.value : `ent_${identifier.value.substring(0, 8)}@contoso.com`,
          relatedIdentifiers: ["work.alias@company.com"],
          organizationId: "org-" + Math.random().toString(36).substring(7),
        } : null,
      };

      setAccountCheckProgress(Math.round(((i + 1) / totalSteps) * 100));
    }

    // Write results to wizard-level accountCheckResults
    onUpdateAccountCheckResults(results);

    // Also write back to identifier objects so the Account Check column renders them
    const updatedIdentifiers = identifiers.map((identifier) => {
      const r = results[identifier.id];
      if (!r) return identifier;

      const updatedServices = { ...identifier.services };
      // Stamp accountExistence on first enabled service (or first service)
      const serviceKeys = Object.keys(updatedServices);
      if (serviceKeys.length > 0) {
        const firstKey = serviceKeys[0];
        updatedServices[firstKey] = {
          ...updatedServices[firstKey],
          accountExistence: {
            consumerExists: !!r.consumer,
            consumerStorageLocation: r.consumer?.storageLocation || null,
            consumerPrimaryId: r.consumer?.primaryId || null,
            consumerRelatedIdentifiers: r.consumer?.relatedIdentifiers || [],
            enterpriseExists: !!r.enterprise,
            enterpriseStorageLocation: r.enterprise?.storageLocation || null,
            enterprisePrimaryId: r.enterprise?.primaryId || null,
            enterpriseRelatedIdentifiers: r.enterprise?.relatedIdentifiers || [],
            enterpriseOrganizationId: r.enterprise?.organizationId || null,
          },
        };
      }

      return {
        ...identifier,
        accountExistenceStatus: r.exists ? "success" : "not-found",
        services: updatedServices,
      };
    });

    onUpdateIdentifiers(updatedIdentifiers);

    // Phase 3 cross-border merge — populate IP History store for
    // Consumer-tagged identifiers. 30-day window ending today.
    const { queryLogins } = await import("../../services/loginQuery");
    const { setLastLogon } = await import("../../state/ipHistoryStore");
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
      const r = results[id.id];
      if (!r?.consumer) continue;
      const q = queryLogins({
        identifier: id.value,
        rangeStart,
        rangeEnd,
        issuingAgency,
      });
      const latest = q.events.length > 0 ? q.events[q.events.length - 1] : null;
      setLastLogon(id.id, {
        lastEvent: latest,
        totalEvents: q.totalEvents,
        queriedAt: new Date(),
        rangeStart,
        rangeEnd,
      });
    }

    setIsCheckingAccounts(false);

    const foundCount = Object.values(results).filter((r: any) => r.exists).length;
    const msg = `Account check complete: ${foundCount} of ${identifiers.length} accounts found`;
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
