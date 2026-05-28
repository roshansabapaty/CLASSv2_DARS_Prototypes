import { useEffect, useRef } from "react";
import { toast } from "sonner@2.0.3";
import type { FormData, TaskStatus } from "../types/caseTypes";
import { calculateDueDate } from "../utils/caseFactories";

interface UseCaseEffectsOptions {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  setSharedFormData?: (data: FormData) => void;
  isDueDateManuallySet: boolean;
  workflowStage: "triage" | "fulfillment" | "collection";
  isEditingCollectionScope: boolean;
  // Document viewer state setters
  setAvailableDocuments: React.Dispatch<React.SetStateAction<any[]>>;
  availableDocuments: any[];
  setDocumentInvalidReasons: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  // Identifier state setters
  setIdentifierViewMode: (v: string) => void;
  setWarrantModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setAttachmentZoom: React.Dispatch<React.SetStateAction<number>>;
  setAttachmentRotation: React.Dispatch<React.SetStateAction<number>>;
  openDocumentIds: string[];
  setOpenDocumentIds: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveDocumentId: React.Dispatch<React.SetStateAction<string>>;
  warrantModalOpen: boolean;
  setIdentifierPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  identifierPanelOpen: boolean;
  setFulfillmentInitialStep: React.Dispatch<React.SetStateAction<number>>;
  collectionScopeSnapshotRef: React.MutableRefObject<string | null>;
}

/** Ref-backed flag to track local → shared sync and prevent circular updates */
let _didLocalSyncRef: React.MutableRefObject<boolean> | null = null;

export function useCaseEffects({
  formData,
  setFormData,
  setSharedFormData,
  isDueDateManuallySet,
  workflowStage,
  isEditingCollectionScope,
  setAvailableDocuments,
  availableDocuments,
  setDocumentInvalidReasons,
  setIdentifierViewMode,
  setWarrantModalOpen,
  setAttachmentZoom,
  setAttachmentRotation,
  openDocumentIds,
  setOpenDocumentIds,
  setActiveDocumentId,
  warrantModalOpen,
  setIdentifierPanelOpen,
  identifierPanelOpen,
  setFulfillmentInitialStep,
  collectionScopeSnapshotRef,
}: UseCaseEffectsOptions) {
  // --- Due date auto-calculation ---
  useEffect(() => {
    if (!isDueDateManuallySet && formData.createDate && formData.country) {
      const newDueDate = calculateDueDate(formData.createDate, formData.casePriority, formData.country);
      setFormData((prev) => ({ ...prev, dueDate: newDueDate }));
    }
  }, [formData.createDate, formData.casePriority, formData.country, isDueDateManuallySet]);

  // --- Sync local formData to shared state (debounced) ---
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const didLocalSyncRef = useRef(false);
  _didLocalSyncRef = didLocalSyncRef;

  useEffect(() => {
    if (setSharedFormData && formData.caseId) {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        didLocalSyncRef.current = true;
        setSharedFormData(formData);
      }, 100);
    }
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [formData, setSharedFormData]);

  // --- Update identifier task statuses when assignee changes ---
  const prevAssigneeNameRef = useRef(formData.assigneeName);
  useEffect(() => {
    if (formData.assigneeName && !prevAssigneeNameRef.current && formData.identifiers.length > 0) {
      const hasNewTasks = formData.identifiers.some(
        identifier => identifier.taskStatus === "New"
      );
      
      if (hasNewTasks) {
        setFormData(prev => ({
          ...prev,
          identifiers: prev.identifiers.map(identifier => ({
            ...identifier,
            taskStatus: identifier.taskStatus === "New" ? "InProgress" as TaskStatus : identifier.taskStatus,
          })),
        }));
      }
    }
    prevAssigneeNameRef.current = formData.assigneeName;
  }, [formData.assigneeName]);

  // --- Update task statuses when case stage changes to "Triage Complete" ---
  const prevCaseStageRef = useRef(formData.caseStage);
  useEffect(() => {
    if (formData.caseStage === "Triage Complete" && prevCaseStageRef.current !== "Triage Complete" && formData.identifiers.length > 0) {
      const hasTasksToUpdate = formData.identifiers.some(
        identifier => identifier.taskStatus === "InProgress" || identifier.taskStatus === "New"
      );
      
      if (hasTasksToUpdate) {
        setFormData(prev => ({
          ...prev,
          identifiers: prev.identifiers.map(identifier => ({
            ...identifier,
            taskStatus: (identifier.taskStatus === "InProgress" || identifier.taskStatus === "New") 
              ? "AwaitingDisclosure" as TaskStatus 
              : identifier.taskStatus,
          })),
        }));
      }
    }
    prevCaseStageRef.current = formData.caseStage;
  }, [formData.caseStage]);

  // --- Update task statuses when case stage changes to "Rejected" ---
  const prevCaseStageForRejectedRef = useRef(formData.caseStage);
  useEffect(() => {
    if (formData.caseStage === "Rejected" && prevCaseStageForRejectedRef.current !== "Rejected" && formData.identifiers.length > 0) {
      const hasNonRejectedTasks = formData.identifiers.some(
        identifier => identifier.taskStatus !== "Rejected"
      );
      
      if (hasNonRejectedTasks) {
        setFormData(prev => ({
          ...prev,
          identifiers: prev.identifiers.map(identifier => ({
            ...identifier,
            taskStatus: "Rejected" as TaskStatus,
          })),
        }));
      }
    }
    prevCaseStageForRejectedRef.current = formData.caseStage;
  }, [formData.caseStage]);

  // --- Update document statuses when case is rejected ---
  useEffect(() => {
    if (formData.caseStage === "Rejected" && formData.rejectionReason) {
      setAvailableDocuments(prev => 
        prev.map(doc => ({
          ...doc,
          documentStatus: "Rejected"
        }))
      );
      
      const updatedInvalidReasons: Record<string, string> = {};
      availableDocuments.forEach(doc => {
        updatedInvalidReasons[doc.id] = formData.rejectionReason;
      });
      setDocumentInvalidReasons(updatedInvalidReasons);
    }
  }, [formData.caseStage, formData.rejectionReason, availableDocuments]);

  // --- Map "Triage Complete" to "In Review" when transitioning to fulfillment ---
  useEffect(() => {
    if (workflowStage === "fulfillment" && formData.caseStage === "Triage Complete") {
      setFormData(prev => ({
        ...prev,
        caseStage: "In Review",
      }));
    }
  }, [workflowStage, formData.caseStage]);

  // --- Scroll to identifiers section when editing collection scope ---
  useEffect(() => {
    if (isEditingCollectionScope && workflowStage === "fulfillment") {
      collectionScopeSnapshotRef.current = JSON.stringify(
        formData.identifiers.map(id => ({
          id: id.id,
          services: Object.fromEntries(
            Object.entries(id.services).map(([sk, svc]) => [sk, {
              enabled: svc.enabled,
              categoryGroups: Object.fromEntries(
                Object.entries(svc.categoryGroups || {}).map(([gk, group]: [string, any]) => [gk,
                  Object.fromEntries(Object.entries(group || {}).map(([ik, cat]: [string, any]) => [ik, { enabled: cat.enabled }]))
                ])
              ),
            }])
          ),
        }))
      );

      setIdentifierPanelOpen(true);
      setIdentifierViewMode("fulfillment");
      setFulfillmentInitialStep(2);
    } else {
      collectionScopeSnapshotRef.current = null;
    }
  }, [isEditingCollectionScope, workflowStage]);

  // --- Global keyboard shortcuts for panels ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        setWarrantModalOpen((prev) => !prev);
        if (!warrantModalOpen) {
          setAttachmentZoom(100);
          setAttachmentRotation(0);
          if (openDocumentIds.length === 0) {
            setOpenDocumentIds(['warrant-1']);
            setActiveDocumentId('warrant-1');
          }
          toast.success('Document panel opened');
        } else {
          toast.success('Document panel closed');
        }
      }
      
      if (e.altKey && e.key === 'i') {
        e.preventDefault();
        setIdentifierPanelOpen((prev) => {
          const newState = !prev;
          if (newState) {
            setIdentifierViewMode("fulfillment");
            setFulfillmentInitialStep(1);
            toast.success('Fulfillment wizard opened');
          } else {
            toast.success('Fulfillment wizard closed');
          }
          return newState;
        });
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [warrantModalOpen, openDocumentIds, identifierPanelOpen]);

  /** Returns the didLocalSyncRef for use in the initialization effect */
  return { didLocalSyncRef };
}
