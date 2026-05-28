import { useState, useCallback } from "react";
import { toast } from "sonner@2.0.3";
import type { FormData, Agent } from "../types/caseTypes";
import {
  EU27_DSA_HARMS_SUBCATEGORIES,
} from "../constants/caseConstants";
import { generateAgentId, calculateDueDate } from "../utils/caseFactories";
import { MOCK_AGENCIES, MOCK_CONTACTS } from "../utils/caseHelpers";

interface UseFormHandlersOptions {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isDueDateManuallySet: boolean;
  setIsDueDateManuallySet: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useFormHandlers({
  formData,
  setFormData,
  errors,
  setErrors,
  isDueDateManuallySet,
  setIsDueDateManuallySet,
}: UseFormHandlersOptions) {
  const [agencySearchOpen, setAgencySearchOpen] = useState(false);
  const [contactSearchOpen, setContactSearchOpen] = useState(false);
  const [agentToRemove, setAgentToRemove] = useState<{ id: string; name: string } | null>(null);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleNatureOfCrimesToggle = (crime: string) => {
    setFormData((prev) => {
      const currentCrimes = prev.natureOfCrimes;
      const isSelected = currentCrimes.includes(crime);
      return {
        ...prev,
        natureOfCrimes: isSelected
          ? currentCrimes.filter((c) => c !== crime)
          : [...currentCrimes, crime],
      };
    });
    if (errors.natureOfCrimes) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.natureOfCrimes;
        return newErrors;
      });
    }
  };

  const handleEu27DsaHarmsToggle = (harm: string) => {
    setFormData((prev) => {
      const currentHarms = prev.eu27DsaHarms;
      const isSelected = currentHarms.includes(harm);
      if (isSelected) {
        const subcategoriesToRemove = EU27_DSA_HARMS_SUBCATEGORIES[harm] || [];
        return {
          ...prev,
          eu27DsaHarms: currentHarms.filter((h) => h !== harm),
          eu27DsaHarmsSubCategories: prev.eu27DsaHarmsSubCategories.filter(
            (sub) => !subcategoriesToRemove.includes(sub)
          ),
        };
      }
      return {
        ...prev,
        eu27DsaHarms: [...currentHarms, harm],
      };
    });
  };

  const handleEu27DsaHarmsSubCategoriesToggle = (subCategory: string) => {
    setFormData((prev) => {
      const currentSubCategories = prev.eu27DsaHarmsSubCategories;
      const isSelected = currentSubCategories.includes(subCategory);
      return {
        ...prev,
        eu27DsaHarmsSubCategories: isSelected
          ? currentSubCategories.filter((s) => s !== subCategory)
          : [...currentSubCategories, subCategory],
      };
    });
  };

  // Agent handlers
  const handleAddAgent = () => {
    setFormData((prev) => ({
      ...prev,
      agents: [
        ...prev.agents,
        {
          id: generateAgentId(),
          name: "",
          title: "",
          email: "",
          phone: "",
          role: "",
          languages: "",
          source: "user"
        }
      ]
    }));
    if (errors.agents) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.agents;
        return newErrors;
      });
    }
  };

  const handleRemoveAgent = (agentId: string, agentName: string) => {
    setAgentToRemove({ id: agentId, name: agentName });
  };

  const confirmRemoveAgent = () => {
    if (agentToRemove) {
      setFormData((prev) => ({
        ...prev,
        agents: prev.agents.filter((agt) => agt.id !== agentToRemove.id)
      }));
      setAgentToRemove(null);
    }
  };

  const cancelRemoveAgent = () => {
    setAgentToRemove(null);
  };

  const handleAgentChange = (agentId: string, field: "name" | "email" | "phone" | "role" | "title" | "languages", value: string) => {
    setFormData((prev) => ({
      ...prev,
      agents: prev.agents.map((agt) =>
        agt.id === agentId ? { ...agt, [field]: value } : agt
      )
    }));
  };

  const handleSelectAgency = (agency: typeof MOCK_AGENCIES[0]) => {
    setFormData((prev) => ({
      ...prev,
      agency: agency.name,
      agencyPhone: agency.phone,
      agencyAddress: agency.address
    }));
    setAgencySearchOpen(false);
    toast.success(`Agency "${agency.name}" loaded successfully`);
  };

  const handleSelectContact = (contact: typeof MOCK_CONTACTS[0]) => {
    const newAgent = {
      id: generateAgentId(),
      name: contact.name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      role: contact.role,
      languages: contact.languages,
      source: "agency" as const
    };
    setFormData((prev) => ({
      ...prev,
      agents: [...prev.agents, newAgent]
    }));
    setContactSearchOpen(false);
    toast.success(`Contact "${contact.name}" added successfully`);
  };

  // Due date handlers
  const handleDueDateChange = (date: Date | undefined) => {
    setFormData((prev) => ({ ...prev, dueDate: date, dueDateManuallySetBy: "Nicole Garcia" }));
    setIsDueDateManuallySet(true);
  };

  const handleResetDueDate = () => {
    if (formData.createDate && formData.jurisdiction) {
      const newDueDate = calculateDueDate(formData.createDate, formData.casePriority, formData.jurisdiction);
      setFormData((prev) => ({ ...prev, dueDate: newDueDate, dueDateManuallySetBy: undefined }));
      setIsDueDateManuallySet(false);
      toast.success("Due date reset to SLA default");
    }
  };

  return {
    // State
    agencySearchOpen, setAgencySearchOpen,
    contactSearchOpen, setContactSearchOpen,
    agentToRemove, setAgentToRemove,
    // Handlers
    handleInputChange,
    handleNatureOfCrimesToggle,
    handleEu27DsaHarmsToggle,
    handleEu27DsaHarmsSubCategoriesToggle,
    handleAddAgent,
    handleRemoveAgent,
    confirmRemoveAgent,
    cancelRemoveAgent,
    handleAgentChange,
    handleSelectAgency,
    handleSelectContact,
    handleDueDateChange,
    handleResetDueDate,
  };
}
