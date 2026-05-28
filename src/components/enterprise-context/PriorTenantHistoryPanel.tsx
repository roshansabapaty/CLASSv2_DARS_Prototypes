/**
 * PriorTenantHistoryPanel — overlay drawer listing prior LNS cases
 * filed against the active tenant. Phase 4 of the prototype-to-prod
 * merge.
 *
 * Controlled component (DARS_eEvidence doesn't have the prototype's
 * `useCaseStore` pattern): the parent owns `open`, `tenantId`, the
 * close handler, and the click-through that opens a stacked
 * `PriorCaseDetailPanel` for a specific prior case.
 *
 * Empty state copy mirrors the prototype: "No prior LNS cases on
 * file for this tenant." The summary surfaced on the trigger button
 * (count + redirected count) is computed by the caller via
 * `summarizePriorHistory(tenantId)`.
 */

import {
  Badge,
  Button,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Link,
  OverlayDrawer,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { DismissRegular } from "@fluentui/react-icons";
import {
  getPriorCasesForTenant,
  getPriorCasesForTpid,
} from "../../utils/priorTenantLookup";
import type { PriorCase } from "../../types/caseTypes";

const useStyles = makeStyles({
  empty: {
    paddingTop: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalXL,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
});

function resolutionBadge(s: PriorCase["resolutionStatus"]) {
  if (s === "redirected")
    return <Badge color="warning" appearance="tint">Redirected</Badge>;
  if (s === "info_provided")
    return <Badge color="success" appearance="tint">Info Provided</Badge>;
  if (s === "blocked")
    return <Badge color="danger" appearance="tint">Blocked</Badge>;
  if (s === "withdrawn")
    return <Badge color="subtle" appearance="tint">Withdrawn</Badge>;
  return <Badge color="informative" appearance="tint">In Progress</Badge>;
}

export interface PriorTenantHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  /** EnterpriseOrgContext.tenantId for the active case. Drives the
   *  lookup; undefined when the case has no enterprise context. */
  tenantId?: string;
  /** Parent TPID for a multi-tenant rollup. When set, the drawer
   *  aggregates prior cases across every child tenant under this TPID
   *  instead of filtering to a single tenantId. Takes precedence over
   *  `tenantId` when both are supplied. */
  tpid?: string;
  /** Display label for the TPID (e.g. "Contoso Holdings"). Falls back
   *  to the raw `tpid` string when omitted. */
  tpidDisplayName?: string;
  /** Display label for the tenant (e.g. "Iberia Corp S.A."). Surfaced
   *  in the drawer subtitle for clearer single-tenant context. */
  tenantDisplayName?: string;
  /** Clicking a row's case-id link bubbles back up so the parent can
   *  open the stacked PriorCaseDetailPanel. */
  onOpenPriorCaseDetail: (priorCaseId: string) => void;
}

export function PriorTenantHistoryPanel({
  open,
  onClose,
  tenantId,
  tpid,
  tpidDisplayName,
  tenantDisplayName,
  onOpenPriorCaseDetail,
}: PriorTenantHistoryPanelProps) {
  const styles = useStyles();
  // TPID rollup takes precedence over tenantId — multi-tenant cases
  // pass both for context, and the rollup view is the more inclusive
  // one. Single-tenant cases pass only tenantId and fall back to the
  // tenant-scoped lookup.
  const prior = tpid
    ? getPriorCasesForTpid(tpid)
    : tenantId
      ? getPriorCasesForTenant(tenantId)
      : [];
  const subtitleLabel = tpid
    ? `${tpidDisplayName ?? tpid} · aggregated across child tenants`
    : tenantDisplayName ?? tenantId;

  return (
    <OverlayDrawer
      position="end"
      open={open}
      onOpenChange={(_, d) => !d.open && onClose()}
      size="medium"
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              icon={<DismissRegular />}
              onClick={onClose}
              aria-label="Close"
            />
          }
        >
          Prior Tenant History
          {tpid && (
            <>
              {" "}
              <Badge
                appearance="tint"
                color="brand"
                size="small"
                style={{ verticalAlign: "middle", marginLeft: 6 }}
              >
                TPID rollup
              </Badge>
            </>
          )}
        </DrawerHeaderTitle>
        {subtitleLabel && (
          <Text size={200} style={{ marginTop: 4, opacity: 0.75 }}>
            {subtitleLabel}
          </Text>
        )}
      </DrawerHeader>
      <DrawerBody>
        {prior.length === 0 ? (
          <div className={styles.empty}>
            <Text>
              {tpid
                ? "No prior LNS cases on file for any child tenant under this TPID."
                : "No prior LNS cases on file for this tenant."}
            </Text>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Case</TableHeaderCell>
                <TableHeaderCell>Date served</TableHeaderCell>
                <TableHeaderCell>Submitter</TableHeaderCell>
                <TableHeaderCell>Resolution</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prior.map((p) => (
                <TableRow key={p.caseId}>
                  <TableCell>
                    <Link
                      as="button"
                      onClick={() => onOpenPriorCaseDetail(p.caseId)}
                    >
                      {p.caseId}
                    </Link>
                  </TableCell>
                  <TableCell>{p.dateServed}</TableCell>
                  <TableCell>
                    {p.submitter.agency}
                    {p.submitter.person ? ` — ${p.submitter.person}` : ""}
                  </TableCell>
                  <TableCell>{resolutionBadge(p.resolutionStatus)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DrawerBody>
    </OverlayDrawer>
  );
}
