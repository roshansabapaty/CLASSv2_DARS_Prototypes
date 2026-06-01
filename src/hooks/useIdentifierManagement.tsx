import { useState, useCallback } from "react";
import { toast } from "sonner@2.0.3";
import type { FormData, AccountIdentifier, TaskStatus } from "../types/caseTypes";
import {
  CURRENT_USER,
} from "../constants/caseConstants";
import { getTaskStatusConfig, validateIdentifierFormat } from "../utils/caseHelpers";
import { createNewIdentifier, generateTaskId } from "../utils/caseFactories";

interface UseIdentifierManagementOptions {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

export function useIdentifierManagement({ formData, setFormData }: UseIdentifierManagementOptions) {
  // New identifier form state
  const [newIdentifierValue, setNewIdentifierValue] = useState("");
  const [newIdentifierType, setNewIdentifierType] = useState("Email Address");
  const [newIdentifierTypeOpen, setNewIdentifierTypeOpen] = useState(false);
  const [newIdentifierIsSupplemental, setNewIdentifierIsSupplemental] = useState(true);
  const [newIdentifierServices, setNewIdentifierServices] = useState<string[]>([]);
  const [newIdentifierServicesOpen, setNewIdentifierServicesOpen] = useState(false);
  const [showServiceCategoryOptions, setShowServiceCategoryOptions] = useState(false);

  // Supplemental identifier configuration
  const [supplementalLinkedIdentifierId, setSupplementalLinkedIdentifierId] = useState<string>("");
  const [supplementalLinkedIdentifierOpen, setSupplementalLinkedIdentifierOpen] = useState(false);
  const [supplementalService, setSupplementalService] = useState<string>("");
  const [supplementalServiceOpen, setSupplementalServiceOpen] = useState(false);
  const [supplementalDataCategory, setSupplementalDataCategory] = useState<string[]>([]);
  const [supplementalDataCategoryOpen, setSupplementalDataCategoryOpen] = useState(false);

  // Existence check & display state
  const [checkingExistence, setCheckingExistence] = useState(false);
  const [displayFrozen, setDisplayFrozen] = useState(false);
  const [expandedIdentifiers, setExpandedIdentifiers] = useState<Record<string, boolean>>({});
  const [expandedServices, setExpandedServices] = useState<Record<string, Record<string, boolean>>>({});
  const [showBackgroundData, setShowBackgroundData] = useState<Record<string, Record<string, boolean>>>({});
  const [backgroundDataPanelOpen, setBackgroundDataPanelOpen] = useState(false);
  const [selectedIdentifierForBackground, setSelectedIdentifierForBackground] = useState<string | null>(null);

  // Identifier view/edit state
  const [identifierSearchTerm, setIdentifierSearchTerm] = useState("");
  const [identifierViewMode, setIdentifierViewMode] = useState<"summary" | "detailed" | "fulfillment">("summary");
  const [selectedIdentifierId, setSelectedIdentifierId] = useState<string | null>(null);
  const [editingIdentifierId, setEditingIdentifierId] = useState<string | null>(null);
  const [editIdentifierValue, setEditIdentifierValue] = useState("");
  const [editIdentifierType, setEditIdentifierType] = useState("");
  const [identifierPanelOpen, setIdentifierPanelOpen] = useState(false);
  const [fulfillmentInitialStep, setFulfillmentInitialStep] = useState<1 | 2 | 3>(1);
  const [expandedNotFoundIdentifiers, setExpandedNotFoundIdentifiers] = useState<Record<string, boolean>>({});

  // Add identifier handler
  const handleAddIdentifier = () => {
    if (!newIdentifierValue || !newIdentifierType) {
      toast.error("Please enter both identifier value and type");
      return;
    }

    // Validate supplemental fields if supplemental is selected
    if (newIdentifierIsSupplemental) {
      if (!supplementalLinkedIdentifierId) {
        toast.error("Please select an LE-provided identifier to link to");
        return;
      }
      if (!supplementalService) {
        toast.error("Please select an associated service");
        return;
      }
      if (supplementalDataCategory.length === 0) {
        toast.error("Please select at least one data type");
        return;
      }
    }

    // Validate format if applicable
    const validation = validateIdentifierFormat(newIdentifierValue, newIdentifierType);
    if (!validation.valid) {
      toast.error(`Invalid format: ${validation.message}`);
      return;
    }

    const newIdentifier = createNewIdentifier(formData.requestType);
    newIdentifier.value = newIdentifierValue;
    newIdentifier.type = newIdentifierType;
    newIdentifier.createdBy = newIdentifierIsSupplemental ? `Supplemental ${CURRENT_USER}` : CURRENT_USER;

    // Enable selected services with all their data categories
    newIdentifierServices.forEach(serviceKey => {
      const svc = (newIdentifier.services as any)[serviceKey];
      if (svc) {
        svc.enabled = true;
        Object.entries(svc.categoryGroups || {}).forEach(([gKey, group]: [string, any]) => {
          Object.keys(group || {}).forEach(iKey => {
            const item = svc.categoryGroups[gKey][iKey];
            if (item) {
              item.enabled = true;
              item.taskId = generateTaskId(serviceKey, `${gKey}:${iKey}`);
            }
          });
        });
      }
    });

    setFormData((prev) => ({
      ...prev,
      identifiers: [...prev.identifiers, newIdentifier],
    }));

    setNewIdentifierValue("");
    setNewIdentifierType("Email Address");
    setNewIdentifierIsSupplemental(true);
    setNewIdentifierServices([]);
    setShowServiceCategoryOptions(false);

    // Reset supplemental fields
    setSupplementalLinkedIdentifierId("");
    setSupplementalService("");
    setSupplementalDataCategory([]);

    const serviceMsg = newIdentifierServices.length > 0
      ? ` with ${newIdentifierServices.length} service${newIdentifierServices.length !== 1 ? 's' : ''}`
      : '';

    const supplementalMsg = newIdentifierIsSupplemental && supplementalLinkedIdentifierId
      ? ` (linked to ${formData.identifiers.find(id => id.id === supplementalLinkedIdentifierId)?.value})`
      : '';

    toast.success(`Identifier added successfully${serviceMsg}${supplementalMsg}`);
  };

  // Quick add identifier handler (for Enter key)
  const handleQuickAddIdentifier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddIdentifier();
    }
  };

  // Add alias as a supplemental identifier (copying services/categories from parent)
  const handleAddAliasAsIdentifier = useCallback((
    aliasValue: string,
    aliasType: "Consumer" | "Enterprise",
    sourceIdentifier: AccountIdentifier
  ) => {
    const aliasExists = formData.identifiers.some(id =>
      id.value.toLowerCase() === aliasValue.toLowerCase()
    );

    if (aliasExists) {
      toast.error("This alias already exists as an identifier");
      return;
    }

    const newIdentifier = createNewIdentifier(formData.requestType);
    newIdentifier.value = aliasValue;
    newIdentifier.type = "Email Address";
    newIdentifier.createdBy = `Supplemental from ${sourceIdentifier.value}`;

    // Copy services and their settings from source identifier
    Object.keys(sourceIdentifier.services).forEach(serviceKey => {
      const sourceService = sourceIdentifier.services[serviceKey as keyof typeof sourceIdentifier.services];
      const newService = newIdentifier.services[serviceKey as keyof typeof newIdentifier.services];

      if (sourceService.enabled) {
        newService.enabled = true;
        newService.startDate = sourceService.startDate;
        newService.endDate = sourceService.endDate;
        newService.timeZone = sourceService.timeZone;

        const srcGroups = (sourceService as any).categoryGroups;
        const newGroups = (newService as any).categoryGroups;
        if (srcGroups && newGroups) {
          Object.keys(srcGroups).forEach(gKey => {
            if (!newGroups[gKey]) return;
            Object.keys(srcGroups[gKey] || {}).forEach(iKey => {
              if (newGroups[gKey][iKey] && srcGroups[gKey][iKey]) {
                newGroups[gKey][iKey].selected = srcGroups[gKey][iKey].selected;
              }
            });
          });
        }
      }
    });

    setFormData((prev) => ({
      ...prev,
      identifiers: [...prev.identifiers, newIdentifier],
    }));

    toast.success(
      <div>
        <p className="font-semibold">Alias added as identifier</p>
        <p className="text-xs mt-1">Copied services and categories from {sourceIdentifier.value}</p>
      </div>
    );
  }, [formData.identifiers]);

  // Add alias to specific categories of the parent identifier
  const handleAddAliasToCategory = useCallback((
    aliasValue: string,
    aliasType: "Consumer" | "Enterprise",
    sourceIdentifier: AccountIdentifier,
    selectedServices: Set<string>,
    selectedCategories: Record<string, Set<string>>
  ) => {
    const existingIdentifier = formData.identifiers.find(id =>
      id.value.toLowerCase() === aliasValue.toLowerCase()
    );

    let supplementalIdentifierId: string;

    if (existingIdentifier) {
      supplementalIdentifierId = existingIdentifier.id;
    } else {
      const newIdentifier = createNewIdentifier(formData.requestType);
      newIdentifier.value = aliasValue;
      newIdentifier.type = "Email Address";
      newIdentifier.createdBy = `Supplemental from ${sourceIdentifier.value}`;

      supplementalIdentifierId = newIdentifier.id;

      setFormData((prev) => ({
        ...prev,
        identifiers: [...prev.identifiers, newIdentifier],
      }));
    }

    // Update the source identifier's data categories with the supplemental identifier ID
    setFormData((prev) => ({
      ...prev,
      identifiers: prev.identifiers.map(identifier => {
        if (identifier.id === sourceIdentifier.id) {
          const updatedIdentifier = { ...identifier };

          selectedServices.forEach(serviceKey => {
            const categoryKeys = selectedCategories[serviceKey];
            if (categoryKeys && categoryKeys.size > 0) {
              const service = updatedIdentifier.services[serviceKey as keyof typeof updatedIdentifier.services];
              if (service && (service as any).categoryGroups) {
                const updatedGroups: any = {};
                Object.entries((service as any).categoryGroups).forEach(([gKey, group]: [string, any]) => {
                  updatedGroups[gKey] = {};
                  Object.entries(group || {}).forEach(([iKey, item]: [string, any]) => {
                    const compoundKey = `${gKey}:${iKey}`;
                    updatedGroups[gKey][iKey] = { ...item };
                    if (categoryKeys.has(compoundKey)) {
                      updatedGroups[gKey][iKey].identifierId = supplementalIdentifierId;
                    }
                  });
                });
                (service as any).categoryGroups = updatedGroups;
              }
            }
          });

          return updatedIdentifier;
        }
        return identifier;
      }),
    }));

    toast.success(
      <div>
        <p className="font-semibold">Supplemental identifier linked</p>
        <p className="text-xs mt-1">{aliasValue} linked to selected categories for {sourceIdentifier.value}</p>
      </div>
    );
  }, [formData.identifiers]);

  const handleRemoveIdentifier = useCallback((identifierId: string) => {
    setFormData((prev) => ({
      ...prev,
      identifiers: prev.identifiers.filter((id) => id.id !== identifierId),
    }));
    toast.info("Identifier removed");
  }, []);

  const handleEditIdentifier = useCallback((identifierId: string) => {
    const identifier = formData.identifiers.find(id => id.id === identifierId);
    if (identifier) {
      setEditingIdentifierId(identifierId);
      setEditIdentifierValue(identifier.value);
      setEditIdentifierType(identifier.type);
      if (identifierViewMode === "summary") {
        setIdentifierViewMode("detailed");
        setSelectedIdentifierId(identifierId);
        setExpandedIdentifiers((prev) => ({ ...prev, [identifierId]: true }));
      }
    }
  }, [formData.identifiers, identifierViewMode]);

  const handleSaveEditIdentifier = useCallback(() => {
    if (!editingIdentifierId || !editIdentifierValue.trim() || !editIdentifierType) {
      toast.error("Please provide both identifier value and type");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      identifiers: prev.identifiers.map((id) =>
        id.id === editingIdentifierId
          ? {
              ...id,
              value: editIdentifierValue.trim(),
              type: editIdentifierType,
              accountExistenceStatus: "not-checked" as const,
              accountExistenceError: undefined,
            }
          : id
      ),
    }));

    setEditingIdentifierId(null);
    setEditIdentifierValue("");
    setEditIdentifierType("");
    toast.success("Identifier updated successfully");
  }, [editingIdentifierId, editIdentifierValue, editIdentifierType]);

  const handleCancelEditIdentifier = useCallback(() => {
    setEditingIdentifierId(null);
    setEditIdentifierValue("");
    setEditIdentifierType("");
  }, []);

  // Update identifier task status
  const handleUpdateTaskStatus = useCallback((identifierId: string, newStatus: TaskStatus) => {
    setFormData((prev) => ({
      ...prev,
      identifiers: prev.identifiers.map((id) =>
        id.id === identifierId
          ? { ...id, taskStatus: newStatus }
          : id
      ),
    }));
    toast.success(`Task status updated to "${getTaskStatusConfig(newStatus).label}"`);
  }, []);

  return {
    // New identifier form state
    newIdentifierValue, setNewIdentifierValue,
    newIdentifierType, setNewIdentifierType,
    newIdentifierTypeOpen, setNewIdentifierTypeOpen,
    newIdentifierIsSupplemental, setNewIdentifierIsSupplemental,
    newIdentifierServices, setNewIdentifierServices,
    newIdentifierServicesOpen, setNewIdentifierServicesOpen,
    showServiceCategoryOptions, setShowServiceCategoryOptions,

    // Supplemental configuration
    supplementalLinkedIdentifierId, setSupplementalLinkedIdentifierId,
    supplementalLinkedIdentifierOpen, setSupplementalLinkedIdentifierOpen,
    supplementalService, setSupplementalService,
    supplementalServiceOpen, setSupplementalServiceOpen,
    supplementalDataCategory, setSupplementalDataCategory,
    supplementalDataCategoryOpen, setSupplementalDataCategoryOpen,

    // Existence check & display
    checkingExistence, setCheckingExistence,
    displayFrozen, setDisplayFrozen,
    expandedIdentifiers, setExpandedIdentifiers,
    expandedServices, setExpandedServices,
    showBackgroundData, setShowBackgroundData,
    backgroundDataPanelOpen, setBackgroundDataPanelOpen,
    selectedIdentifierForBackground, setSelectedIdentifierForBackground,

    // View/edit state
    identifierSearchTerm, setIdentifierSearchTerm,
    identifierViewMode, setIdentifierViewMode,
    selectedIdentifierId, setSelectedIdentifierId,
    editingIdentifierId, setEditingIdentifierId,
    editIdentifierValue, setEditIdentifierValue,
    editIdentifierType, setEditIdentifierType,
    identifierPanelOpen, setIdentifierPanelOpen,
    fulfillmentInitialStep, setFulfillmentInitialStep,
    expandedNotFoundIdentifiers, setExpandedNotFoundIdentifiers,

    // Handlers
    handleAddIdentifier,
    handleQuickAddIdentifier,
    handleAddAliasAsIdentifier,
    handleAddAliasToCategory,
    handleRemoveIdentifier,
    handleEditIdentifier,
    handleSaveEditIdentifier,
    handleCancelEditIdentifier,
    handleUpdateTaskStatus,
  };
}