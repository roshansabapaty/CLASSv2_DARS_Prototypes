import React, { useMemo } from "react";
import { FormData } from "./DataEntryForm";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { CopyableText } from "./CopyButton";
import { CopyableIdentifier } from "./CopyableIdentifier";
import { getServiceDisplayName } from "../config/microsoftServices";
import { LENS_SERVICES, getGroupName, getItemName } from "../config/lensServicesConfig";
import {
  Database,
  Package,
  Truck,
  User,
  Building2,
  ArrowRight,
  Archive,
} from "lucide-react";
import { cn } from "./ui/utils";
import { isEpocPrCase } from "../utils/eEvidenceHelpers";

interface PipelineStatusMatrixProps {
  formData: FormData;
}

type PipelineStage =
  | "Not Started"
  | "Started"
  | "Complete"
  | "No Data"
  | "Failed"
  // eEvidence-only: WISP `/eevidence/deliverystatus` "Received"
  // callback — the IA has acknowledged receipt of the delivered
  // package. Treated as the terminal positive state for eEvidence;
  // other request types keep `Complete` as the terminal.
  | "DeliveryAcknowledged";

interface MatrixRow {
  identifierId: string;
  identifierValue: string;
  identifierType: string;
  taskId: string;
  serviceKey: string;
  serviceName: string;
  categoryKey: string;
  categoryName: string;
  accountType: "consumer" | "enterprise";
  jobId: string | null;
  collectionStatus: PipelineStage;
  publishStatus: PipelineStage;
  deliveryStatus: PipelineStage;
}

const formatCategoryName = (categoryKey: string) => {
  if (categoryKey.includes(":")) {
    const [gKey, iKey] = categoryKey.split(":");
    return `${getGroupName(gKey)} — ${getItemName(gKey, iKey)}`;
  }
  return categoryKey
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const StatusDot = ({
  status,
  stage,
}: {
  status: string;
  stage: "collection" | "publish" | "delivery";
}) => {
  const getColor = () => {
    switch (status) {
      case "DeliveryAcknowledged":
        // Acknowledged is the BEST eEvidence outcome — slightly
        // deeper green than Complete + a ring so it reads as
        // "terminal positive."
        return "bg-[#0b6a0b] ring-[#0b6a0b]/30";
      case "Complete":
        return "bg-[#107c10] ring-[#107c10]/20";
      case "Started":
        return "bg-[#0078d4] ring-[#0078d4]/20 animate-pulse";
      case "Failed":
        return "bg-[#a4262c] ring-[#a4262c]/20";
      case "No Data":
        return "bg-[#ca5010] ring-[#ca5010]/20";
      default:
        return "bg-[#c8c6c4] ring-[#c8c6c4]/20";
    }
  };

  const getLabel = () => {
    if (status === "Not Started") return "—";
    if (status === "DeliveryAcknowledged") return "✓✓";
    if (status === "Complete") return "✓";
    if (status === "Started") return "⋯";
    if (status === "Failed") return "✕";
    if (status === "No Data") return "∅";
    return "—";
  };

  const getTitle = () => {
    const stageLabel = stage.charAt(0).toUpperCase() + stage.slice(1);
    if (status === "DeliveryAcknowledged") {
      return `${stageLabel}: Acknowledged — IA confirmed receipt (WISP "Received" callback)`;
    }
    if (status === "Failed") {
      return `${stageLabel}: Failed — WISP returned an error. Retry from the banner or per-row action.`;
    }
    return `${stageLabel}: ${status}`;
  };

  return (
    <div
      className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] ring-2",
        getColor()
      )}
      title={getTitle()}
    >
      {getLabel()}
    </div>
  );
};

export function PipelineStatusMatrix({ formData }: PipelineStatusMatrixProps) {
  // EPOC-PR (preservation) cases skip Packaging + Delivery — the matrix
  // collapses to a single Collection column, summary counters drop the
  // Packaged + Delivered tiles, and the per-row Package / Deliver cells
  // are not rendered.
  const collectionOnly = isEpocPrCase(formData);

  const matrixData = useMemo(() => {
    const rows: MatrixRow[] = [];

    formData.identifiers.forEach((identifier) => {
      Object.entries(identifier.services).forEach(
        ([serviceKey, service]: [string, any]) => {
          const showConsumer = service.includeConsumerAccount !== false;
          const showEnterprise = service.includeEnterpriseAccount === true;

          const lensService = LENS_SERVICES.find((s) => s.key === serviceKey);
          const resolvedServiceName = lensService?.name || getServiceDisplayName(serviceKey);

          Object.entries(service.categoryGroups || {}).forEach(([gKey, group]: [string, any]) => {
            Object.entries(group || {}).forEach(([iKey, category]: [string, any]) => {
              if (!category.enabled) return;
              const categoryKey = `${gKey}:${iKey}`;

              const accountTypes: Array<"consumer" | "enterprise"> = [];
              if (showConsumer) accountTypes.push("consumer");
              if (showEnterprise) accountTypes.push("enterprise");
              if (accountTypes.length === 0) accountTypes.push("consumer");

              accountTypes.forEach((accountType) => {
                const jobIdSuffix =
                  accountType === "enterprise" ? "-ENT" : "";
                const jobId = category.jobId
                  ? `${category.jobId}${jobIdSuffix}`
                  : null;

                rows.push({
                  identifierId: identifier.id,
                  identifierValue: identifier.value || "N/A",
                  identifierType: identifier.type || "N/A",
                  taskId: identifier.taskId || "N/A",
                  serviceKey,
                  serviceName: resolvedServiceName,
                  categoryKey,
                  categoryName: formatCategoryName(categoryKey),
                  accountType,
                  jobId,
                  collectionStatus:
                    (category.collectionStatus as PipelineStage) ||
                    "Not Started",
                  publishStatus:
                    (category.publishStatus as PipelineStage) || "Not Started",
                  deliveryStatus:
                    (category.deliveryStatus as PipelineStage) || "Not Started",
                });

                // Additional jobs (duplicate jobs with different date ranges)
                if (category.additionalJobs && category.additionalJobs.length > 0) {
                  category.additionalJobs.forEach((addJob: any) => {
                    const addJobId = addJob.jobId ? `${addJob.jobId}${jobIdSuffix}` : null;
                    rows.push({
                      identifierId: identifier.id,
                      identifierValue: identifier.value || "N/A",
                      identifierType: identifier.type || "N/A",
                      taskId: identifier.taskId || "N/A",
                      serviceKey,
                      serviceName: resolvedServiceName,
                      categoryKey,
                      categoryName: formatCategoryName(categoryKey),
                      accountType,
                      jobId: addJobId,
                      collectionStatus: (addJob.collectionStatus as PipelineStage) || "Not Started",
                      publishStatus: (addJob.publishStatus as PipelineStage) || "Not Started",
                      deliveryStatus: (addJob.deliveryStatus as PipelineStage) || "Not Started",
                    });
                  });
                }
              });
            });
          });
        }
      );
    });

    return rows;
  }, [formData]);

  // Group by identifier
  const groupedByIdentifier = useMemo(() => {
    const map = new Map<
      string,
      { identifier: { id: string; value: string; type: string; taskId: string }; rows: MatrixRow[] }
    >();

    matrixData.forEach((row) => {
      if (!map.has(row.identifierId)) {
        map.set(row.identifierId, {
          identifier: {
            id: row.identifierId,
            value: row.identifierValue,
            type: row.identifierType,
            taskId: row.taskId,
          },
          rows: [],
        });
      }
      map.get(row.identifierId)!.rows.push(row);
    });

    return Array.from(map.values());
  }, [matrixData]);

  // Summary stats
  const summary = useMemo(() => {
    let total = matrixData.length;
    let collectionComplete = 0;
    let collectionFailed = 0;
    let collectionNoData = 0;
    let publishComplete = 0;
    let deliveryComplete = 0;

    matrixData.forEach((row) => {
      if (row.collectionStatus === "Complete") collectionComplete++;
      if (row.collectionStatus === "Failed") collectionFailed++;
      if (row.collectionStatus === "No Data") collectionNoData++;
      if (row.publishStatus === "Complete") publishComplete++;
      if (row.deliveryStatus === "Complete") deliveryComplete++;
    });

    return {
      total,
      collectionComplete,
      collectionFailed,
      collectionNoData,
      publishComplete,
      deliveryComplete,
    };
  }, [matrixData]);

  return (
    <div className="space-y-6">
      {/* Summary Header — collapses to a single Collection tile on
          EPOC-PR (preservation) cases since Packaging and Delivery are
          skipped entirely. */}
      <div
        className={cn(
          "grid gap-4",
          collectionOnly ? "grid-cols-1" : "grid-cols-3",
        )}
      >
        <div className="p-3 bg-[#f3f9fd] border border-[#c7e0f4] rounded-lg text-center">
          {collectionOnly ? (
            <Archive className="w-5 h-5 text-[#0078d4] mx-auto mb-1" />
          ) : (
            <Database className="w-5 h-5 text-[#0078d4] mx-auto mb-1" />
          )}
          <div className="text-2xl font-bold text-[#323130]">
            {summary.collectionComplete}
            <span className="text-sm font-normal text-[#605e5c]">
              {" "}
              / {summary.total}
            </span>
          </div>
          <div className="text-xs text-[#605e5c]">
            {collectionOnly ? "Preserved" : "Collected"}
          </div>
        </div>
        {!collectionOnly && (
          <div className="p-3 bg-[#f3faf3] border border-[#c6e0c6] rounded-lg text-center">
            <Package className="w-5 h-5 text-[#107c10] mx-auto mb-1" />
            <div className="text-2xl font-bold text-[#323130]">
              {summary.publishComplete}
              <span className="text-sm font-normal text-[#605e5c]">
                {" "}
                / {summary.collectionComplete}
              </span>
            </div>
            <div className="text-xs text-[#605e5c]">Packaged</div>
          </div>
        )}
        {!collectionOnly && (
          <div className="p-3 bg-[#fef9f5] border border-[#f7ddc9] rounded-lg text-center">
            <Truck className="w-5 h-5 text-[#ca5010] mx-auto mb-1" />
            <div className="text-2xl font-bold text-[#323130]">
              {summary.deliveryComplete}
              <span className="text-sm font-normal text-[#605e5c]">
                {" "}
                / {summary.publishComplete}
              </span>
            </div>
            <div className="text-xs text-[#605e5c]">Delivered</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 bg-[#faf9f8] rounded border border-[#edebe9]">
        <span className="text-xs font-semibold text-[#605e5c] uppercase tracking-wide">
          Legend:
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#107c10]" />
          <span className="text-xs text-[#605e5c]">Complete</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#0078d4]" />
          <span className="text-xs text-[#605e5c]">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ca5010]" />
          <span className="text-xs text-[#605e5c]">No Data</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#a4262c]" />
          <span className="text-xs text-[#605e5c]">Failed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#c8c6c4]" />
          <span className="text-xs text-[#605e5c]">Pending</span>
        </div>
      </div>

      {/* Per-Identifier Matrix Tables */}
      {groupedByIdentifier.map(({ identifier, rows }) => {
        // Compute identifier summary
        const idCollected = rows.filter(
          (r) => r.collectionStatus === "Complete"
        ).length;
        const idPublished = rows.filter(
          (r) => r.publishStatus === "Complete"
        ).length;
        const idDelivered = rows.filter(
          (r) => r.deliveryStatus === "Complete"
        ).length;
        const idFailed = rows.filter(
          (r) => r.collectionStatus === "Failed"
        ).length;

        // Group rows by service for visual grouping
        const serviceGroups = new Map<string, MatrixRow[]>();
        rows.forEach((row) => {
          if (!serviceGroups.has(row.serviceKey)) {
            serviceGroups.set(row.serviceKey, []);
          }
          serviceGroups.get(row.serviceKey)!.push(row);
        });

        return (
          <Card key={identifier.id} className="overflow-hidden">
            {/* Identifier Header */}
            <div className="px-4 py-3 bg-[#faf9f8] border-b border-[#edebe9] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CopyableIdentifier value={identifier.value} copyLabel="Copy identifier" className="text-sm font-medium text-[#323130]" />
                    <Badge
                      variant="outline"
                      className="bg-white text-[#605e5c] border-[#8a8886] text-xs"
                    >
                      {identifier.type}
                    </Badge>
                  </div>
                  <CopyableText
                    text={identifier.taskId}
                    copyLabel="Copy task ID"
                  >
                    <span className="text-xs font-mono text-[#605e5c]">
                      {identifier.taskId}
                    </span>
                  </CopyableText>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Mini pipeline summary for this identifier — EPOC-PR
                    shows only the preservation (collection) progress. */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[#0078d4] font-medium">
                    {idCollected}/{rows.length}
                  </span>
                  {!collectionOnly && (
                    <>
                      <ArrowRight className="w-3 h-3 text-[#8a8886]" />
                      <span className="text-[#107c10] font-medium">
                        {idPublished}/{idCollected}
                      </span>
                      <ArrowRight className="w-3 h-3 text-[#8a8886]" />
                      <span className="text-[#ca5010] font-medium">
                        {idDelivered}/{idPublished}
                      </span>
                    </>
                  )}
                </div>
                {idFailed > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-[#fde7e9] text-[#a4262c] border-[#a4262c] text-xs"
                  >
                    {idFailed} failed
                  </Badge>
                )}
              </div>
            </div>

            {/* Matrix Table — native HTML `<table>` so browser column-
                alignment handles the layout. Added: `scope="col"` on
                every `<th>` for screen-reader header-cell association,
                an `aria-label` on the `<table>` so the matrix's purpose
                is announced, and `sticky top-0` on the header so it
                pins when the dialog scrolls long lists. */}
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                aria-label={`Pipeline status matrix for identifier ${identifier.value}`}
              >
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-[#edebe9]">
                    <th scope="col" className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase tracking-wide">
                      Service
                    </th>
                    <th scope="col" className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase tracking-wide">
                      Category
                    </th>
                    <th scope="col" className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase tracking-wide">
                      Account
                    </th>
                    <th scope="col" className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase tracking-wide">
                      Job ID
                    </th>
                    <th scope="col" className="text-center px-4 py-2.5 text-xs font-semibold text-[#0078d4] uppercase tracking-wide">
                      <div className="flex items-center justify-center gap-1">
                        {collectionOnly ? (
                          <Archive className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <Database className="w-3 h-3" aria-hidden="true" />
                        )}
                        {collectionOnly ? "Preserve" : "Collect"}
                      </div>
                    </th>
                    {!collectionOnly && (
                      <th scope="col" className="text-center px-4 py-2.5 text-xs font-semibold text-[#107c10] uppercase tracking-wide">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="w-3 h-3" aria-hidden="true" />
                          Package
                        </div>
                      </th>
                    )}
                    {!collectionOnly && (
                      <th scope="col" className="text-center px-4 py-2.5 text-xs font-semibold text-[#ca5010] uppercase tracking-wide">
                        <div className="flex items-center justify-center gap-1">
                          <Truck className="w-3 h-3" aria-hidden="true" />
                          Deliver
                        </div>
                      </th>
                    )}
                  </tr>
                </thead>
                {Array.from(serviceGroups.entries()).map(
                  ([serviceKey, serviceRows], groupIdx) => (
                    <tbody key={serviceKey} className={groupIdx > 0 ? "border-t border-[#edebe9]" : ""}>
                      {serviceRows.map((row, rowIdx) => (
                        <tr
                          key={`${row.categoryKey}-${row.accountType}`}
                          className={cn(
                            "border-b border-[#f3f2f1] hover:bg-[#faf9f8] transition-colors",
                            row.collectionStatus === "Failed" &&
                              "bg-[#fef6f6]"
                          )}
                        >
                          {rowIdx === 0 ? (
                            <th
                              scope="rowgroup"
                              className="text-left px-4 py-2.5 text-sm font-medium text-[#323130] align-top"
                              rowSpan={serviceRows.length}
                            >
                              {row.serviceName}
                            </th>
                          ) : null}
                          <td className="px-4 py-2.5 text-sm text-[#323130]">
                            {row.categoryName}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                row.accountType === "enterprise"
                                  ? "bg-[#fef9f5] text-[#ca5010] border-[#ca5010]"
                                  : "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
                              )}
                            >
                              {row.accountType === "enterprise" ? (
                                <Building2 className="w-3 h-3 mr-1" />
                              ) : (
                                <User className="w-3 h-3 mr-1" />
                              )}
                              {row.accountType === "enterprise"
                                ? "Ent"
                                : "Con"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            {row.jobId ? (
                              <CopyableText
                                text={row.jobId}
                                copyLabel="Copy"
                              >
                                <span className="text-xs font-mono text-[#605e5c]">
                                  {row.jobId}
                                </span>
                              </CopyableText>
                            ) : (
                              <span className="text-xs text-[#a19f9d] italic">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex justify-center">
                              <StatusDot
                                status={row.collectionStatus}
                                stage="collection"
                              />
                            </div>
                          </td>
                          {!collectionOnly && (
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex justify-center">
                                <StatusDot
                                  status={row.publishStatus}
                                  stage="publish"
                                />
                              </div>
                            </td>
                          )}
                          {!collectionOnly && (
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex justify-center">
                                <StatusDot
                                  status={row.deliveryStatus}
                                  stage="delivery"
                                />
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  )
                )}
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}