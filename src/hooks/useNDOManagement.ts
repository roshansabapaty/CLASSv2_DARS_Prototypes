import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner@2.0.3";
import type { FormData, NonDisclosureOrder } from "../types/caseTypes";
import { createNewNDO, generateNDOId } from "../utils/caseFactories";

export interface NDOFormState {
  name: string;
  status: string;
  statusReason: string;
  exclusionReason: string;
  temporaryNDO: boolean;
  startDate: Date | undefined;
  expirationDate: Date | undefined;
  relatedCases: string;
  notes: string;
}

const EMPTY_NDO_FORM: NDOFormState = {
  name: "",
  status: "",
  statusReason: "",
  exclusionReason: "",
  temporaryNDO: false,
  startDate: undefined,
  expirationDate: undefined,
  relatedCases: "",
  notes: "",
};

interface UseNDOManagementOptions {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

export function useNDOManagement({ formData, setFormData }: UseNDOManagementOptions) {
  // NDO UI state
  const [ndoViewMode, setNdoViewMode] = useState<"summary" | "detailed">("summary");
  const [showAddNDO, setShowAddNDO] = useState(false);
  const [editingNDOId, setEditingNDOId] = useState<string | null>(null);
  const [expandedNDOs, setExpandedNDOs] = useState<Record<string, boolean>>({});
  const [currentNDO, setCurrentNDO] = useState<NDOFormState>(EMPTY_NDO_FORM);

  // Auto-calculate NDO status based on expiration date
  useEffect(() => {
    if (currentNDO.expirationDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const expirationDate = new Date(currentNDO.expirationDate);
      expirationDate.setHours(0, 0, 0, 0);
      
      if (expirationDate < today && currentNDO.status !== "Expired") {
        setCurrentNDO((prev) => ({
          ...prev,
          status: "Expired",
          statusReason: prev.statusReason || "Automatically expired based on expiration date"
        }));
      }
    }
  }, [currentNDO.expirationDate]);

  const handleAddNDO = useCallback(() => {
    const newNDO = createNewNDO();
    setFormData((prev) => ({
      ...prev,
      nonDisclosureOrders: [...prev.nonDisclosureOrders, newNDO],
    }));
    setShowAddNDO(false);
    setEditingNDOId(newNDO.id);
    setNdoViewMode("detailed");
    setExpandedNDOs((prev) => ({ ...prev, [newNDO.id]: true }));
    toast.success("NDO added successfully");
  }, []);

  const handleRemoveNDO = useCallback((ndoId: string) => {
    setFormData((prev) => ({
      ...prev,
      nonDisclosureOrders: prev.nonDisclosureOrders.filter((ndo) => ndo.id !== ndoId),
    }));
    toast.info("NDO removed");
  }, []);

  const handleEditNDO = useCallback((ndoId: string) => {
    setEditingNDOId(ndoId);
    if (ndoViewMode === "summary") {
      setNdoViewMode("detailed");
      setExpandedNDOs((prev) => ({ ...prev, [ndoId]: true }));
    }
  }, [ndoViewMode]);

  const handleUpdateNDO = useCallback((ndoId: string, updates: Partial<NonDisclosureOrder>) => {
    setFormData((prev) => ({
      ...prev,
      nonDisclosureOrders: prev.nonDisclosureOrders.map((ndo) =>
        ndo.id === ndoId ? { ...ndo, ...updates } : ndo
      ),
    }));
  }, []);

  const handleSaveNewNDO = useCallback(() => {
    if (!currentNDO.name.trim()) {
      toast.error("Please enter an NDO name");
      return;
    }
    if (!currentNDO.status) {
      toast.error("Please select a status");
      return;
    }

    let finalStatus = currentNDO.status;
    if (currentNDO.expirationDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expirationDate = new Date(currentNDO.expirationDate);
      expirationDate.setHours(0, 0, 0, 0);
      
      if (expirationDate < today) {
        finalStatus = "Expired";
      }
    }

    const newNDO: NonDisclosureOrder = {
      id: generateNDOId(),
      name: currentNDO.name,
      status: finalStatus,
      statusReason: currentNDO.statusReason,
      exclusionReason: currentNDO.exclusionReason,
      temporaryNDO: currentNDO.temporaryNDO,
      startDate: currentNDO.startDate,
      expirationDate: currentNDO.expirationDate,
      createdBy: formData.assigneeName || "Current User",
      createdOn: new Date(),
      relatedCases: currentNDO.relatedCases ? currentNDO.relatedCases.split(',').map(c => c.trim()).filter(c => c) : [],
    };

    setFormData((prev) => ({
      ...prev,
      nonDisclosureOrders: [...prev.nonDisclosureOrders, newNDO],
    }));

    setCurrentNDO(EMPTY_NDO_FORM);
    setShowAddNDO(false);

    toast.success("NDO added successfully");
  }, [currentNDO, formData.assigneeName]);

  const handleClearNDOForm = useCallback(() => {
    setCurrentNDO(EMPTY_NDO_FORM);
    setShowAddNDO(false);
  }, []);

  const handleEditSavedNDO = useCallback((ndoId: string) => {
    const ndoToEdit = formData.nonDisclosureOrders.find(ndo => ndo.id === ndoId);
    if (ndoToEdit) {
      setCurrentNDO({
        name: ndoToEdit.name,
        status: ndoToEdit.status,
        statusReason: ndoToEdit.statusReason,
        exclusionReason: ndoToEdit.exclusionReason || "",
        temporaryNDO: ndoToEdit.temporaryNDO,
        startDate: ndoToEdit.startDate,
        expirationDate: ndoToEdit.expirationDate,
        relatedCases: ndoToEdit.relatedCases.join(', '),
        notes: "",
      });
      setFormData((prev) => ({
        ...prev,
        nonDisclosureOrders: prev.nonDisclosureOrders.filter(ndo => ndo.id !== ndoId),
      }));
      setShowAddNDO(true);
      toast.info("Editing NDO - make changes and click Save");
    }
  }, [formData.nonDisclosureOrders]);

  const handleDeleteSavedNDO = useCallback((ndoId: string) => {
    setFormData((prev) => ({
      ...prev,
      nonDisclosureOrders: prev.nonDisclosureOrders.filter(ndo => ndo.id !== ndoId),
    }));
    toast.success("NDO deleted successfully");
  }, []);

  const handleSaveNDO = useCallback(() => {
    setEditingNDOId(null);
    toast.success("NDO updated successfully");
  }, []);

  const handleCancelEditNDO = useCallback(() => {
    setEditingNDOId(null);
  }, []);

  const toggleNDOExpanded = useCallback((ndoId: string) => {
    setExpandedNDOs((prev) => ({
      ...prev,
      [ndoId]: !prev[ndoId],
    }));
  }, []);

  return {
    // State
    ndoViewMode, setNdoViewMode,
    showAddNDO, setShowAddNDO,
    editingNDOId, setEditingNDOId,
    expandedNDOs, setExpandedNDOs,
    currentNDO, setCurrentNDO,

    // Handlers
    handleAddNDO,
    handleRemoveNDO,
    handleEditNDO,
    handleUpdateNDO,
    handleSaveNewNDO,
    handleClearNDOForm,
    handleEditSavedNDO,
    handleDeleteSavedNDO,
    handleSaveNDO,
    handleCancelEditNDO,
    toggleNDOExpanded,
  };
}
