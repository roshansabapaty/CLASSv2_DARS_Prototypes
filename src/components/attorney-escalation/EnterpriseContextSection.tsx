// Enterprise Context section (spec §5.3). Wraps the Tier 3 Organization
// panel and the Tier 2 Target Identifier sub-panels (one per identifier
// the case has data for). Mounted inside the case form when
// `isEnterpriseCase(c) === true`.
//
// Phase 4 adds the enterprise-CTA row at the bottom (Redirect, Concession
// Tracker, Flag Policy / Exec Review, View Prior Tenant History) plus
// the dialog launchers. Each CTA's actual mutation flows through the
// `onCtaAction` callback so the parent (AttorneyReviewWorkspace / the
// case-form host) controls FormData + drawer state.
//
// Fluent v9 + Griffel.

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Badge,
  Button,
  Card,
  CardHeader,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  BuildingMultipleRegular,
  ArrowForwardRegular,
  ShieldCheckmarkRegular,
} from "@fluentui/react-icons";
import { useState } from "react";
import type { FormData } from "../../types/caseTypes";
import {
  getEnterpriseOrgs,
  isMultiTenantCase,
} from "../../utils/caseEscalation";
import { OrgPanel } from "./OrgPanel";
import { UserPanel } from "./UserPanel";
import { RedirectToEnterpriseDialog } from "../enterprise-context/enterprise-ctas/RedirectToEnterpriseDialog";
import { CheckConcessionTrackerDialog } from "../enterprise-context/enterprise-ctas/CheckConcessionTrackerDialog";
import { FlagPolicyReviewButton } from "../enterprise-context/enterprise-ctas/FlagPolicyReviewButton";
import { FlagExecReviewButton } from "../enterprise-context/enterprise-ctas/FlagExecReviewButton";
import { ViewPriorHistoryButton } from "../enterprise-context/enterprise-ctas/ViewPriorHistoryButton";
import type { EnterpriseCtaAction } from "../enterprise-context/enterpriseCtaTypes";

const useStyles = makeStyles({
  card: {
    borderLeftStyle: "solid",
    borderLeftWidth: "4px",
    borderLeftColor: tokens.colorPaletteCornflowerBorderActive,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalM,
  },
  badgeRowSpacer: {
    marginRight: "8px",
  },
  ctaRow: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalM,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    borderTopColor: tokens.colorNeutralStroke2,
    marginTop: tokens.spacingVerticalM,
  },
});

interface Props {
  case: FormData;
  /** Phase 3 — opens the Consumer User Locations drawer per identifier. */
  onSeeLogins?: (identifierId: string) => void;
  /** Phase 4 — receives every enterprise-CTA action so the parent can
   *  mutate `formData.enterpriseContext` + append audit events. When
   *  omitted, the CTA row is hidden (the section reverts to its Phase 2
   *  read-only shape). */
  onCtaAction?: (a: EnterpriseCtaAction) => void;
}

/** Per-identifier account-type lookup. Returns "Enterprise" / "Consumer"
 *  / undefined from either the seeded `checkAccounts.accountType` field
 *  or the wizard-stamped `services.{key}.accountExistence.{enterprise|consumer}Exists`
 *  flags. Enterprise takes precedence per "an account can only be Consumer
 *  OR Enterprise, never both" — the wizard randomizer in Step 1 enforces
 *  the same constraint. Drives UserPanel's consumer-only Last-logon /
 *  IP-resolves gating. */
function getIdentifierAccountType(
  c: FormData,
  identifierId: string,
): "Consumer" | "Enterprise" | undefined {
  const id = c.identifiers?.find((i: any) => i.id === identifierId);
  if (!id) return undefined;
  if (id.checkAccounts?.accountType === "Enterprise") return "Enterprise";
  if (id.checkAccounts?.accountType === "Consumer") return "Consumer";
  const services = id.services;
  if (services) {
    for (const svc of Object.values(services) as any[]) {
      if (svc?.accountExistence?.enterpriseExists) return "Enterprise";
      if (svc?.accountExistence?.consumerExists) return "Consumer";
    }
  }
  return undefined;
}

export function EnterpriseContextSection({
  case: c,
  onSeeLogins,
  onCtaAction,
}: Props) {
  const styles = useStyles();
  const ec = c.enterpriseContext;
  const [redirectOpen, setRedirectOpen] = useState(false);
  const [concessionOpen, setConcessionOpen] = useState(false);
  if (!ec) return null;

  return (
    <Card className={styles.card}>
      <CardHeader
        image={<BuildingMultipleRegular fontSize={24} />}
        header={
          <Text as="h2" weight="semibold" size={500}>
            Enterprise Context
          </Text>
        }
        description={
          <Text size={200}>
            {ec.policyReviewRequired && (
              <Badge
                color="warning"
                appearance="tint"
                className={styles.badgeRowSpacer}
              >
                Policy review required
              </Badge>
            )}
            {ec.execReviewRequired && (
              <Badge
                color="danger"
                appearance="tint"
                className={styles.badgeRowSpacer}
              >
                Exec review required
              </Badge>
            )}
            {ec.derogationCheck && (
              <Badge
                color="success"
                appearance="tint"
                className={styles.badgeRowSpacer}
              >
                Derogation: {ec.derogationCheck.result}
              </Badge>
            )}
            {ec.redirectedToEnterprise && (
              <Badge color="brand" appearance="tint">
                Redirected to enterprise
              </Badge>
            )}
          </Text>
        }
      />

      <Accordion defaultOpenItems={["context"]} collapsible>
        <AccordionItem value="context">
          <AccordionHeader>
            Tier 3 Org + Tier 2 Target Identifier
          </AccordionHeader>
          <AccordionPanel>
            <div className={styles.panel}>
              {(() => {
                // Multi-tenant: render an OrgPanel per tenant. Single-
                // tenant cases (or seeds that haven't migrated to
                // `orgs[]`) get one panel as before. The
                // ViewPriorHistoryButton is wired only to the primary
                // org's tenant — prior-history lookup pivots TPID-aware
                // in a follow-up.
                const orgs = getEnterpriseOrgs(c);
                const multiTenant = isMultiTenantCase(c);
                return orgs.map((org, idx) => (
                  <OrgPanel
                    key={org.tenantId}
                    org={org}
                    case={c}
                    priorHistorySlot={
                      // Only the primary org renders the inline
                      // ViewPriorHistoryButton; otherwise the row
                      // appears multiple times with duplicated buttons.
                      idx === 0 && onCtaAction ? (
                        <ViewPriorHistoryButton
                          case={c}
                          onAction={onCtaAction}
                        />
                      ) : undefined
                    }
                    tenantIndex={multiTenant ? idx + 1 : undefined}
                    tenantCount={multiTenant ? orgs.length : undefined}
                  />
                ));
              })()}
              {ec.users.map((u) => (
                <UserPanel
                  key={u.identifierId}
                  user={u}
                  onSeeLogins={onSeeLogins}
                  accountType={getIdentifierAccountType(c, u.identifierId)}
                />
              ))}

              {onCtaAction && (
                <div className={styles.ctaRow}>
                  <Button
                    appearance="primary"
                    icon={<ArrowForwardRegular />}
                    onClick={() => setRedirectOpen(true)}
                  >
                    Redirect to Enterprise
                  </Button>
                  <Button
                    appearance="outline"
                    icon={<ShieldCheckmarkRegular />}
                    onClick={() => setConcessionOpen(true)}
                  >
                    Check Concession Tracker
                  </Button>
                  <FlagPolicyReviewButton case={c} onAction={onCtaAction} />
                  <FlagExecReviewButton case={c} onAction={onCtaAction} />
                </div>
              )}
            </div>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      {onCtaAction && (
        <>
          <RedirectToEnterpriseDialog
            case={c}
            open={redirectOpen}
            onOpenChange={setRedirectOpen}
            onAction={onCtaAction}
          />
          <CheckConcessionTrackerDialog
            case={c}
            open={concessionOpen}
            onOpenChange={setConcessionOpen}
            onAction={onCtaAction}
          />
        </>
      )}
    </Card>
  );
}
