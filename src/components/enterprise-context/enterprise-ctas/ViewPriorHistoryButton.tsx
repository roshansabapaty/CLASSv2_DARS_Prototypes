/**
 * ViewPriorHistoryButton — opens the PriorTenantHistoryPanel for the
 * active case's tenant. Surfaced in the OrgPanel "Prior LNS history"
 * row and the EnterpriseContextSection CTA row.
 *
 * Phase 4 of the prototype-to-prod merge.
 */

import { Badge, Button } from "@fluentui/react-components";
import { HistoryRegular } from "@fluentui/react-icons";
import { CURRENT_USER } from "../../../constants/caseConstants";
import {
  summarizePriorHistory,
  summarizePriorHistoryForTpid,
} from "../../../utils/priorTenantLookup";
import { isMultiTenantCase } from "../../../utils/caseEscalation";
import type { FormData } from "../../../types/caseTypes";
import type { EnterpriseCtaAction } from "../enterpriseCtaTypes";

interface Props {
  case: FormData;
  onAction: (a: EnterpriseCtaAction) => void;
}

export function ViewPriorHistoryButton({ case: c, onAction }: Props) {
  const org = c.enterpriseContext?.org;
  if (!org) return null;
  const tenantId = org.tenantId;
  const tpid = org.parentTpid;
  const multiTenant = isMultiTenantCase(c);

  // Multi-tenant cases pivot to a TPID-aware rollup so the attorney
  // sees prior cases across every child tenant on the case (not just
  // the primary tenant). Single-tenant cases stay on the tenant-only
  // lookup as before.
  const useTpidRollup = multiTenant && Boolean(tpid);

  const { count, redirected, tenantCount } = useTpidRollup
    ? summarizePriorHistoryForTpid(tpid!)
    : { ...summarizePriorHistory(tenantId), tenantCount: 1 };

  const handleClick = () => {
    onAction({
      kind: "viewPriorTenantHistory",
      tenantId,
      // Carry the TPID alongside the tenantId when this is a rollup
      // case — the workspace + drawer fall back to tenant-scoped when
      // tpid is absent.
      tpid: useTpidRollup ? tpid : undefined,
      tpidDisplayName: useTpidRollup ? org.parentTpidDisplayName : undefined,
      tenantDisplayName: org.tenantDisplayName,
      audit: {
        id: `audit-prior-history-${Date.now().toString(36)}`,
        kind: "PriorTenantHistoryViewed",
        actor: CURRENT_USER,
        actorRole: "Attorney",
        performedAt: new Date(),
        note: useTpidRollup
          ? `Opened prior-tenant history (TPID rollup — ${count} cases across ${tenantCount} tenants).`
          : `Opened prior-tenant history (${count} cases).`,
      },
    });
  };

  return (
    <Button
      icon={<HistoryRegular />}
      onClick={handleClick}
      appearance="outline"
    >
      View Prior Tenant History
      <Badge
        appearance="filled"
        color={count > 0 ? "informative" : "subtle"}
        style={{ marginLeft: 8 }}
      >
        {count}
      </Badge>
      {useTpidRollup && (
        <Badge
          appearance="tint"
          color="brand"
          style={{ marginLeft: 4 }}
        >
          TPID rollup · {tenantCount} tenants
        </Badge>
      )}
      {redirected > 0 && (
        <Badge
          appearance="tint"
          color="warning"
          style={{ marginLeft: 4 }}
        >
          {redirected} redirected
        </Badge>
      )}
    </Button>
  );
}
