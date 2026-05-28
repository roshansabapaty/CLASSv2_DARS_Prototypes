import { useCallback } from "react";
import type { FormData, SubCategory, TaskStatus } from "../types/caseTypes";
import { generateTaskId, generateJobId } from "../utils/caseFactories";

interface UseServiceHandlersOptions {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  setExpandedServices: React.Dispatch<React.SetStateAction<Record<string, Record<string, boolean>>>>;
  workflowStage: "triage" | "fulfillment" | "collection";
}

/** Apply an update to a single item within categoryGroups using a compound "groupKey:itemKey" key */
function applyItemUpdate(
  categoryGroups: Record<string, Record<string, any>>,
  compoundKey: string,
  updates: Record<string, any>
): Record<string, Record<string, any>> {
  const [gKey, iKey] = compoundKey.split(":");
  return {
    ...categoryGroups,
    [gKey]: {
      ...(categoryGroups[gKey] || {}),
      [iKey]: { ...(categoryGroups[gKey]?.[iKey] || {}), ...updates },
    },
  };
}

export function useServiceHandlers({
  formData,
  setFormData,
  setExpandedServices,
  workflowStage,
}: UseServiceHandlersOptions) {
  const handleServiceToggle = (
    identifierId: string,
    service: string,
    checked: boolean,
    autoExpand: boolean = true
  ) => {
    setFormData((prev) => ({
      ...prev,
      identifiers: prev.identifiers.map((identifier) =>
        identifier.id === identifierId
          ? {
              ...identifier,
              services: {
                ...identifier.services,
                [service]: {
                  ...identifier.services[service as keyof typeof identifier.services],
                  enabled: checked,
                },
              },
            }
          : identifier
      ),
    }));

    if (checked && autoExpand) {
      setExpandedServices((prev) => ({
        ...prev,
        [identifierId]: {
          ...prev[identifierId],
          [service]: true,
        },
      }));
    }
  };

  // subCategory is a compound "groupKey:itemKey" key
  const handleSubCategoryToggle = (
    identifierId: string,
    service: string,
    subCategory: string,
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      identifiers: prev.identifiers.map((identifier) => {
        if (identifier.id !== identifierId) return identifier;
        const svc = (identifier.services as any)[service];
        const [gKey, iKey] = subCategory.split(":");
        const currentItem = svc?.categoryGroups?.[gKey]?.[iKey] || {};
        return {
          ...identifier,
          services: {
            ...identifier.services,
            [service]: {
              ...svc,
              categoryGroups: applyItemUpdate(svc?.categoryGroups || {}, subCategory, {
                enabled: checked,
                taskId: checked
                  ? currentItem.taskId || generateTaskId(service, subCategory)
                  : currentItem.taskId,
                status: checked
                  ? (workflowStage === "fulfillment" ? "In Progress" : "Not started")
                  : currentItem.status,
              }),
            },
          },
        };
      }),
    }));
  };

  // subCategory is a compound "groupKey:itemKey" key
  const handleSubCategoryDateChange = (
    identifierId: string,
    service: string,
    subCategory: string,
    field: "startDate" | "endDate",
    value: Date | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      identifiers: prev.identifiers.map((identifier) => {
        if (identifier.id !== identifierId) return identifier;
        const svc = (identifier.services as any)[service];
        return {
          ...identifier,
          services: {
            ...identifier.services,
            [service]: {
              ...svc,
              categoryGroups: applyItemUpdate(svc?.categoryGroups || {}, subCategory, {
                [field]: value,
              }),
            },
          },
        };
      }),
    }));
  };

  const handleSelectAllCategories = (
    identifierId: string,
    service: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      identifiers: prev.identifiers.map((identifier) => {
        if (identifier.id !== identifierId) return identifier;
        const svc = (identifier.services as any)[service];
        const updatedGroups: Record<string, Record<string, any>> = {};
        Object.entries(svc?.categoryGroups || {}).forEach(([gKey, group]: [string, any]) => {
          updatedGroups[gKey] = {};
          Object.entries(group || {}).forEach(([iKey, item]: [string, any]) => {
            updatedGroups[gKey][iKey] = {
              ...(item as SubCategory),
              enabled: true,
              taskId: (item as SubCategory).taskId || generateTaskId(service, `${gKey}:${iKey}`),
            };
          });
        });
        return {
          ...identifier,
          services: {
            ...identifier.services,
            [service]: { ...svc, categoryGroups: updatedGroups },
          },
        };
      }),
    }));
  };

  const handleDeselectAllCategories = (
    identifierId: string,
    service: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      identifiers: prev.identifiers.map((identifier) => {
        if (identifier.id !== identifierId) return identifier;
        const svc = (identifier.services as any)[service];
        const updatedGroups: Record<string, Record<string, any>> = {};
        Object.entries(svc?.categoryGroups || {}).forEach(([gKey, group]: [string, any]) => {
          updatedGroups[gKey] = {};
          Object.entries(group || {}).forEach(([iKey, item]: [string, any]) => {
            updatedGroups[gKey][iKey] = { ...(item as SubCategory), enabled: false };
          });
        });
        return {
          ...identifier,
          services: {
            ...identifier.services,
            [service]: { ...svc, categoryGroups: updatedGroups },
          },
        };
      }),
    }));
  };

  // categoryKey is a compound "groupKey:itemKey" key
  const handleToggleDataCategory = (
    identifierId: string,
    serviceKey: string,
    categoryKey: string,
    enabled: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      identifiers: prev.identifiers.map((identifier) => {
        if (identifier.id !== identifierId) return identifier;
        const svc = (identifier.services as any)[serviceKey];
        const [gKey, iKey] = categoryKey.split(":");
        const currentItem = svc?.categoryGroups?.[gKey]?.[iKey] || {};
        return {
          ...identifier,
          services: {
            ...identifier.services,
            [serviceKey]: {
              ...svc,
              categoryGroups: applyItemUpdate(svc?.categoryGroups || {}, categoryKey, {
                enabled,
                taskId: enabled
                  ? currentItem.taskId || generateTaskId(serviceKey, categoryKey)
                  : currentItem.taskId,
                status: enabled
                  ? (workflowStage === "fulfillment" ? "In Progress" : "Not started")
                  : currentItem.status,
                ...(enabled &&
                workflowStage === "fulfillment" &&
                (formData.caseStage === "Triage Complete" ||
                  formData.caseStage === "In Review" ||
                  workflowStage === "collection")
                  ? {
                      jobId: currentItem.jobId || generateJobId(),
                      collectionStatus: "Started",
                      publishStatus: "Not Started",
                      deliveryStatus: "Not Started",
                      collectionStatusUpdatedAt: new Date(Date.now() - Math.floor(Math.random() * 3600000)),
                      publishStatusUpdatedAt: undefined,
                      deliveryStatusUpdatedAt: undefined,
                    }
                  : {}),
              }),
            },
          },
        };
      }),
    }));
  };

  // categoryKey is a compound "groupKey:itemKey" key
  const handleUpdateDateRange = (
    identifierId: string,
    serviceKey: string,
    categoryKey: string,
    startDate: Date | undefined,
    endDate: Date | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      identifiers: prev.identifiers.map((identifier) => {
        if (identifier.id !== identifierId) return identifier;
        const svc = (identifier.services as any)[serviceKey];
        return {
          ...identifier,
          services: {
            ...identifier.services,
            [serviceKey]: {
              ...svc,
              categoryGroups: applyItemUpdate(svc?.categoryGroups || {}, categoryKey, {
                startDate,
                endDate,
              }),
            },
          },
        };
      }),
    }));
  };

  return {
    handleServiceToggle,
    handleSubCategoryToggle,
    handleSubCategoryDateChange,
    handleSelectAllCategories,
    handleDeselectAllCategories,
    handleToggleDataCategory,
    handleUpdateDateRange,
  };
}
