import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner@2.0.3";
import { DEFAULT_AVAILABLE_DOCUMENTS } from "../data/documentViewerData";

export interface DocumentVerification {
  verified: boolean;
  verifiedBy: string;
  verifiedAt: Date;
  rejected?: boolean;
  rejectedBy?: string;
  rejectedAt?: Date;
}

interface UseDocumentViewerOptions {
  sidebarCollapsed: boolean;
}

export function useDocumentViewer({ sidebarCollapsed }: UseDocumentViewerOptions) {
  // Panel state
  const [warrantModalOpen, setWarrantModalOpen] = useState(false);
  const [attachmentZoom, setAttachmentZoom] = useState(100);
  const [attachmentRotation, setAttachmentRotation] = useState(0);
  const [documentViewMode, setDocumentViewMode] = useState<'image' | 'text'>('image');
  const [documentPanelWidth, setDocumentPanelWidth] = useState(600);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);

  // Multi-document viewer state
  const [availableDocuments, setAvailableDocuments] = useState(DEFAULT_AVAILABLE_DOCUMENTS);
  const [openDocumentIds, setOpenDocumentIds] = useState<string[]>(['warrant-1', 'subpoena-1', 'ndo-1']);
  const [activeDocumentId, setActiveDocumentId] = useState<string>('warrant-1');
  const [selectedDocumentToOpen, setSelectedDocumentToOpen] = useState<string>('');
  const [documentDetailsExpanded, setDocumentDetailsExpanded] = useState<Record<string, boolean>>({});
  const [documentInvalidReasons, setDocumentInvalidReasons] = useState<Record<string, string>>({});

  // Document verification tracking
  const [documentVerifications, setDocumentVerifications] = useState<Record<string, DocumentVerification>>({});

  // Refs
  const modalCloseButtonRef = useRef<HTMLButtonElement>(null);
  const modalTriggerButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard shortcuts for document viewer (ESC, zoom, view mode)
  useEffect(() => {
    if (!warrantModalOpen) return;

    if (modalCloseButtonRef.current) {
      modalCloseButtonRef.current.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setWarrantModalOpen(false);
        if (modalTriggerButtonRef.current) {
          modalTriggerButtonRef.current.focus();
        }
        return;
      }

      if (documentViewMode === 'image' && (e.ctrlKey || e.metaKey)) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setAttachmentZoom((prev) => Math.min(200, prev + 25));
          toast.success(`Zoomed to ${Math.min(200, attachmentZoom + 25)}%`);
        } else if (e.key === '-') {
          e.preventDefault();
          setAttachmentZoom((prev) => Math.max(50, prev - 25));
          toast.success(`Zoomed to ${Math.max(50, attachmentZoom - 25)}%`);
        } else if (e.key === '0') {
          e.preventDefault();
          setAttachmentZoom(100);
          toast.success('Zoom reset to 100%');
        }
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'i') {
          e.preventDefault();
          setDocumentViewMode('image');
          toast.success('Switched to Image View');
        } else if (e.key === 't') {
          e.preventDefault();
          setDocumentViewMode('text');
          toast.success('Switched to Text View');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [warrantModalOpen, attachmentZoom]);

  // Calculate dynamic max width for document panel
  const documentPanelMaxWidth = useMemo(() => {
    const leftSidebarWidth = sidebarCollapsed ? 64 : 256;
    const minContentWidth = 600;
    const padding = 64;
    const maxPanelWidth = viewportWidth - leftSidebarWidth - minContentWidth - padding;
    return Math.max(400, Math.min(maxPanelWidth, 1200));
  }, [viewportWidth, sidebarCollapsed]);

  // Track viewport width for dynamic panel sizing
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clamp document panel width when viewport shrinks
  useEffect(() => {
    if (documentPanelWidth > documentPanelMaxWidth) {
      setDocumentPanelWidth(documentPanelMaxWidth);
    }
  }, [documentPanelMaxWidth]);

  // Memoized verified count
  const verifiedDocumentsCount = useMemo(() => {
    return Object.keys(documentVerifications).filter(id => documentVerifications[id]?.verified).length;
  }, [documentVerifications]);

  // Toggle document panel
  const toggleDocumentPanel = () => {
    setWarrantModalOpen((prev) => !prev);
    if (!warrantModalOpen) {
      setAttachmentZoom(100);
      setAttachmentRotation(0);
      if (openDocumentIds.length === 0) {
        setOpenDocumentIds(['warrant-1']);
        setActiveDocumentId('warrant-1');
      }
    }
  };

  // Document verification handlers
  const handleVerifyDocument = (documentId: string) => {
    const currentUser = "Nicole Garcia";
    const now = new Date();

    setDocumentVerifications((prev) => ({
      ...prev,
      [documentId]: {
        verified: true,
        verifiedBy: currentUser,
        verifiedAt: now,
      },
    }));

    toast.success(
      `Document verified by ${currentUser}`,
      {
        description: `Verification completed at ${now.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
      }
    );
  };

  const handleRejectDocument = (documentId: string) => {
    const currentUser = "Nicole Garcia";
    const now = new Date();

    setDocumentVerifications((prev) => ({
      ...prev,
      [documentId]: {
        verified: false,
        verifiedBy: '',
        verifiedAt: now,
        rejected: true,
        rejectedBy: currentUser,
        rejectedAt: now,
      },
    }));

    toast.error(
      `Document rejected by ${currentUser}`,
      {
        description: `Rejection recorded at ${now.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}. Please provide a reason in the invalid reason field.`,
      }
    );
  };

  const handleUndoVerifyDocument = (documentId: string) => {
    const currentUser = "Nicole Garcia";

    setDocumentVerifications((prev) => {
      const updated = { ...prev };
      delete updated[documentId];
      return updated;
    });

    toast.info(
      `Action undone by ${currentUser}`,
      {
        description: `Document status has been reset. You can now verify or reject the document.`,
      }
    );
  };

  return {
    // State
    warrantModalOpen,
    setWarrantModalOpen,
    attachmentZoom,
    setAttachmentZoom,
    attachmentRotation,
    setAttachmentRotation,
    documentViewMode,
    setDocumentViewMode,
    documentPanelWidth,
    setDocumentPanelWidth,
    availableDocuments,
    setAvailableDocuments,
    openDocumentIds,
    setOpenDocumentIds,
    activeDocumentId,
    setActiveDocumentId,
    selectedDocumentToOpen,
    setSelectedDocumentToOpen,
    documentDetailsExpanded,
    setDocumentDetailsExpanded,
    documentInvalidReasons,
    setDocumentInvalidReasons,
    documentVerifications,
    setDocumentVerifications,

    // Refs
    modalCloseButtonRef,
    modalTriggerButtonRef,

    // Computed
    documentPanelMaxWidth,
    verifiedDocumentsCount,

    // Handlers
    toggleDocumentPanel,
    handleVerifyDocument,
    handleRejectDocument,
    handleUndoVerifyDocument,
  };
}
