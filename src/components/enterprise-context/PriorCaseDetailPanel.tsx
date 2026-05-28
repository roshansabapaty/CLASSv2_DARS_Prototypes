/**
 * PriorCaseDetailPanel — stacked drawer that sits on top of the
 * PriorTenantHistoryPanel (or opens directly from the tri-pane
 * Prior LNS inline links) to render a single prior case's details.
 *
 * Phase 4 of the prototype-to-prod merge — ported from the prototype.
 * Controlled component: parent owns `open`, `priorCaseId`, `onClose`,
 * and an optional `onBack` to return to the parent history list.
 */

import {
  Badge,
  Button,
  Card,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  OverlayDrawer,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowLeftRegular,
  BuildingRegular,
  CalendarLtrRegular,
  DismissRegular,
  GavelRegular,
  MailRegular,
  PersonChatRegular,
  ScalesRegular,
} from "@fluentui/react-icons";
import {
  getPriorCaseById,
  getPriorCaseOriginOrg,
} from "../../utils/priorTenantLookup";
import type { PriorCase } from "../../types/caseTypes";

const useStyles = makeStyles({
  body: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalM,
  },
  headerCard: {
    paddingTop: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    paddingBottom: tokens.spacingHorizontalL,
    paddingLeft: tokens.spacingHorizontalL,
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
    borderLeftWidth: "4px",
    borderLeftStyle: "solid",
    borderLeftColor: tokens.colorBrandStroke1,
  },
  caseId: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase600,
  },
  badgeRow: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: tokens.spacingHorizontalXS,
    rowGap: tokens.spacingVerticalXS,
  },
  section: {
    paddingTop: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    paddingBottom: tokens.spacingHorizontalL,
    paddingLeft: tokens.spacingHorizontalL,
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalS,
    color: tokens.colorNeutralForeground2,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalXS,
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  resolutionNote: {
    marginTop: tokens.spacingVerticalS,
    paddingTop: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingHorizontalM,
    paddingLeft: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    fontStyle: "italic",
  },
  notFound: {
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
});

function resolutionBadge(s: PriorCase["resolutionStatus"]) {
  if (s === "redirected")
    return <Badge color="warning" appearance="filled">Redirected</Badge>;
  if (s === "info_provided")
    return <Badge color="success" appearance="filled">Info Provided</Badge>;
  if (s === "blocked")
    return <Badge color="danger" appearance="filled">Blocked</Badge>;
  if (s === "withdrawn")
    return <Badge color="subtle" appearance="filled">Withdrawn</Badge>;
  return <Badge color="informative" appearance="filled">In Progress</Badge>;
}

export interface PriorCaseDetailPanelProps {
  open: boolean;
  onClose: () => void;
  /** Prior case to render. `undefined` shows the not-found state. */
  priorCaseId?: string;
  /** When set, renders a "Back to prior history" affordance. The
   *  parent decides what going back means (typically: close this
   *  drawer and leave the PriorTenantHistoryPanel open underneath). */
  onBack?: () => void;
}

export function PriorCaseDetailPanel({
  open,
  onClose,
  priorCaseId,
  onBack,
}: PriorCaseDetailPanelProps) {
  const styles = useStyles();
  const prior = priorCaseId ? getPriorCaseById(priorCaseId) : undefined;

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
          {onBack && (
            <Button
              appearance="subtle"
              icon={<ArrowLeftRegular />}
              onClick={onBack}
              style={{ marginRight: 8 }}
            >
              Back to prior history
            </Button>
          )}
          Prior Case Detail
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        {!prior ? (
          <div className={styles.notFound}>
            <Text>Prior case not found.</Text>
          </div>
        ) : (() => {
          // Resolve the originating tenant — useful when the case
          // opened from a TPID-rollup list where the attorney is
          // looking at multiple child tenants stacked together. Badge
          // surfaces "From {tenant display name}" so they can tell at
          // a glance which child the case sits under.
          const origin = getPriorCaseOriginOrg(prior.caseId);
          const originLabel =
            origin?.tenantDisplayName ?? origin?.tenantPrimaryDomain;
          return (
          <div className={styles.body}>
            <Card className={styles.headerCard}>
              <Text className={styles.caseId}>{prior.caseId}</Text>
              <div className={styles.badgeRow}>
                {resolutionBadge(prior.resolutionStatus)}
                {prior.requestType && (
                  <Badge appearance="tint" color="brand">
                    {prior.requestType === "eEvidence"
                      ? "eEvidence"
                      : "Standard LNS"}
                  </Badge>
                )}
                {prior.legalDemandType && (
                  <Badge appearance="tint">{prior.legalDemandType}</Badge>
                )}
                {originLabel && (
                  <Badge
                    appearance="outline"
                    color="brand"
                    icon={<BuildingRegular />}
                    title={`Originating tenant: ${originLabel}`}
                  >
                    From {originLabel}
                  </Badge>
                )}
              </div>
              <Text size={300}>
                {prior.submitter.agency}
                {prior.agencyCountry ? ` · ${prior.agencyCountry}` : ""}
                {prior.jurisdiction ? ` · ${prior.jurisdiction}` : ""}
              </Text>
            </Card>

            <Card className={styles.section}>
              <div className={styles.sectionTitle}>
                <ScalesRegular fontSize={18} />
                <Text weight="semibold">Order &amp; Authority</Text>
              </div>
              <div className={styles.grid}>
                <Text className={styles.label}>Submitter</Text>
                <Text>
                  {prior.submitter.agency}
                  {prior.submitter.person
                    ? ` — ${prior.submitter.person}`
                    : ""}
                </Text>

                <Text className={styles.label}>Issuing authority</Text>
                <Text>{prior.issuingAuthority ?? "—"}</Text>

                <Text className={styles.label}>Nature of crime</Text>
                <Text>{prior.natureOfCrime ?? "—"}</Text>
              </div>
            </Card>

            <Card className={styles.section}>
              <div className={styles.sectionTitle}>
                <MailRegular fontSize={18} />
                <Text weight="semibold">Identifier Targeted</Text>
              </div>
              <Text>{prior.identifierTargeted ?? "—"}</Text>
            </Card>

            <Card className={styles.section}>
              <div className={styles.sectionTitle}>
                <CalendarLtrRegular fontSize={18} />
                <Text weight="semibold">Timeline</Text>
              </div>
              <div className={styles.grid}>
                <Text className={styles.label}>Date served</Text>
                <Text>{prior.dateServed}</Text>
                <Text className={styles.label}>Date resolved</Text>
                <Text>{prior.dateResolved ?? "—"}</Text>
              </div>
            </Card>

            <Card className={styles.section}>
              <div className={styles.sectionTitle}>
                <GavelRegular fontSize={18} />
                <Text weight="semibold">Resolution</Text>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {resolutionBadge(prior.resolutionStatus)}
                {prior.attorneyName && (
                  <Text size={200}>
                    <PersonChatRegular
                      fontSize={14}
                      style={{ verticalAlign: "middle" }}
                    />{" "}
                    Attorney: {prior.attorneyName}
                  </Text>
                )}
              </div>
              {prior.resolutionNote && (
                <div className={styles.resolutionNote}>
                  <Text>"{prior.resolutionNote}"</Text>
                </div>
              )}
            </Card>
          </div>
          );
        })()}
      </DrawerBody>
    </OverlayDrawer>
  );
}
