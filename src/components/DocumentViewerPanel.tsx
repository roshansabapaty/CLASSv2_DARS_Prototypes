import React from "react";
import { Resizable } from "re-resizable";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Tabs, TabsContent } from "./ui/tabs";
import { DocumentFieldsPanel } from "./DocumentFieldsPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  FileText,
  X,
  Keyboard,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { cn } from "./ui/utils";
import warrantPage1 from "figma:asset/50d813e5f37746f1ef3e42d999b8ed8fffbea835.png";
import warrantPage2 from "figma:asset/a5fd7a3dff0a4ab9df9e009981241eee452a1664.png";
import type { FormData } from "../types/caseTypes";
import { LegalDemandFormView } from "./forms-library/LegalDemandFormView";
import { hasLegalDemandForm } from "../utils/legalDemandForm";

/** Shape of a document in the viewer */
export interface ViewerDocument {
  id: string;
  name: string;
  type: string;
  pages: number;
  documentId: string;
  documentName: string;
  documentType: string;
  documentStatus: string;
  startDate: Date;
  expirationDate: Date;
  approverName: string;
  approvalDateTime: Date;
  approvalReason: string;
  documentDesiredStatus: string;
}

/** Image URLs keyed by document ID */
const DOCUMENT_IMAGES: Record<string, string[]> = {
  "warrant-1": [warrantPage1, warrantPage2],
  "subpoena-1": [],
  "ndo-1": [],
};

interface DocumentViewerPanelProps {
  /** The open case's FormData. When the case is eEvidence, the panel
   *  renders the inbound EPOC legal-demand form (Form 1 / Form 2) from the
   *  ETSI envelope instead of the static warrant / subpoena / NDO docs. */
  legalDemandFormData?: FormData | null;
  /** Navigate to a related case (e.g. the prior EPOC-PR a subsequent
   *  production follows) from the Documents register. */
  onOpenCase?: (caseId: string) => void;
  /** "templateId#nonce" — when set, the Documents register selects the
   *  document for that template (used by workflow-banner deep-links). */
  focusDocRequest?: string;
  showFulfillmentSummary: boolean;
  documentPanelWidth: number;
  documentPanelMaxWidth: number;
  onResize: (width: number) => void;
  availableDocuments: ViewerDocument[];
  openDocumentIds: string[];
  setOpenDocumentIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeDocumentId: string;
  setActiveDocumentId: React.Dispatch<React.SetStateAction<string>>;
  selectedDocumentToOpen: string;
  setSelectedDocumentToOpen: React.Dispatch<React.SetStateAction<string>>;
  documentDetailsExpanded: Record<string, boolean>;
  setDocumentDetailsExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  documentInvalidReasons: Record<string, string>;
  setDocumentInvalidReasons: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  documentVerifications: Record<string, {
    verified: boolean;
    verifiedBy: string;
    verifiedAt: Date;
    rejected?: boolean;
    rejectedBy?: string;
    rejectedAt?: Date;
  }>;
  verifiedDocumentsCount: number;
  attachmentZoom: number;
  setAttachmentZoom: React.Dispatch<React.SetStateAction<number>>;
  attachmentRotation: number;
  setAttachmentRotation: React.Dispatch<React.SetStateAction<number>>;
  onVerifyDocument: (id: string) => void;
  onRejectDocument: (id: string) => void;
  onUndoVerifyDocument: (id: string) => void;
  onClose: () => void;
  modalCloseButtonRef: React.RefObject<HTMLButtonElement | null>;
  modalTriggerButtonRef: React.RefObject<HTMLButtonElement | null>;
}

export function DocumentViewerPanel({
  legalDemandFormData,
  onOpenCase,
  focusDocRequest,
  showFulfillmentSummary,
  documentPanelWidth,
  documentPanelMaxWidth,
  onResize,
  availableDocuments,
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
  verifiedDocumentsCount,
  attachmentZoom,
  setAttachmentZoom,
  attachmentRotation,
  setAttachmentRotation,
  onVerifyDocument,
  onRejectDocument,
  onUndoVerifyDocument,
  onClose,
  modalCloseButtonRef,
  modalTriggerButtonRef,
}: DocumentViewerPanelProps) {
  // eEvidence cases: render the inbound EPOC legal-demand form (Form 1 /
  // Form 2) from the ETSI envelope instead of the static seed documents.
  const showLegalDemandForm = hasLegalDemandForm(legalDemandFormData);
  return (
    <div
      className={cn(
        "pointer-events-none transition-all duration-300",
        showFulfillmentSummary
          ? "fixed top-0 bottom-0 right-0 z-[62]"
          : "absolute top-0 bottom-0 right-0 z-[60]"
      )}
    >
      <Resizable
        size={{ width: documentPanelWidth, height: '100%' }}
        minWidth={400}
        maxWidth={documentPanelMaxWidth}
        enable={{
          top: false,
          right: false,
          bottom: false,
          left: true,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false
        }}
        onResize={(e, direction, ref, d) => {
          const newWidth = documentPanelWidth + d.width;
          const clampedWidth = Math.max(400, Math.min(newWidth, documentPanelMaxWidth));
          onResize(clampedWidth);
        }}
        className="bg-white shadow-2xl flex flex-col pointer-events-auto border-l-2 border-[#0078d4]/20"
        handleStyles={{
          left: {
            width: '6px',
            left: '0',
            cursor: 'col-resize',
            background: 'linear-gradient(90deg, rgba(0,120,212,0.1) 0%, rgba(0,120,212,0.3) 50%, rgba(0,120,212,0.1) 100%)',
            borderLeft: '1px solid #d1d5db',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }
        }}
        handleComponent={{
          left: (
            <div
              className="w-full h-full flex items-center justify-center group hover:bg-[#0078d4]/20 transition-colors"
              role="separator"
              aria-label="Resize document panel"
              aria-orientation="vertical"
              title="Drag to resize document panel"
            >
              <div className="flex flex-col gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                <div className="w-0.5 h-4 bg-[#605e5c] rounded-full"></div>
                <div className="w-0.5 h-4 bg-[#605e5c] rounded-full"></div>
                <div className="w-0.5 h-4 bg-[#605e5c] rounded-full"></div>
              </div>
            </div>
          )
        }}
      >
        <div
          className="w-full h-full flex flex-col bg-gradient-to-br from-white to-blue-50/30"
          role="dialog"
          aria-modal="true"
          aria-labelledby="document-viewer-title"
          aria-describedby="document-viewer-description"
        >
          {/* Screen Reader Announcement Region */}
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            Document review panel opened. {openDocumentIds.length} of {availableDocuments.length} documents currently open.
            Press Tab to navigate controls, ESC to close.
          </div>

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <h2 id="document-viewer-title" className="text-gray-900">Legal Document Review Panel</h2>
                <p id="document-viewer-description" className="text-gray-600 mt-1">
                  {showLegalDemandForm
                    ? "Inbound eEvidence legal demand • read-only • Press ESC to close"
                    : `${openDocumentIds.length} of ${availableDocuments.length} documents open • Press ESC to close`}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      verifiedDocumentsCount === availableDocuments.length
                        ? "bg-green-50 text-green-700 border-green-300"
                        : "bg-amber-50 text-amber-700 border-amber-300"
                    )}
                  >
                    {verifiedDocumentsCount} of {availableDocuments.length} verified
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300 cursor-help">
                          Width: {documentPanelWidth}px
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Drag the left edge to resize panel</p>
                        <p className="text-xs text-gray-500">Max: {documentPanelMaxWidth}px</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          toast.info('Keyboard Shortcuts', {
                            description: (
                              <div className="text-sm space-y-1 mt-1">
                                <p><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">ESC</kbd> Close panel</p>
                                <p><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Ctrl/⌘ +</kbd> Zoom in</p>
                                <p><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Ctrl/⌘ -</kbd> Zoom out</p>
                                <p><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Ctrl/⌘ 0</kbd> Reset zoom</p>
                              </div>
                            ),
                            duration: 5000,
                          });
                        }}
                        className="flex-shrink-0"
                        aria-label="View keyboard shortcuts"
                      >
                        <Keyboard className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Keyboard Shortcuts</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  ref={modalCloseButtonRef}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClose();
                    if (modalTriggerButtonRef.current) {
                      modalTriggerButtonRef.current.focus();
                    }
                  }}
                  className="flex-shrink-0"
                  aria-label="Close document review panel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* eEvidence: the inbound EPOC form IS the legal demand — render it
              read-only from the ETSI envelope in place of the static docs. */}
          {showLegalDemandForm ? (
            <div className="flex-1 min-h-0">
              <LegalDemandFormView
                formData={legalDemandFormData}
                onOpenCase={onOpenCase}
                focusDocRequest={focusDocRequest}
              />
            </div>
          ) : (
          /* Scrollable Content with Tabs */
          <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-[#0078d4] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-gray-100">
            <Tabs value={activeDocumentId} onValueChange={setActiveDocumentId} className="h-full flex flex-col">
              {/* Document Selector */}
              <div className="px-6 pt-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="document-selector" className="text-gray-700">
                    Available Documents ({availableDocuments.length})
                  </Label>
                  {openDocumentIds.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setOpenDocumentIds([openDocumentIds[0]]);
                        setActiveDocumentId(openDocumentIds[0]);
                        toast.success('Closed all documents except active');
                      }}
                      className="h-7 text-xs"
                      aria-label="Close all documents except the active one"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Close Others
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Select
                    value={selectedDocumentToOpen || undefined}
                    onValueChange={(value) => {
                      if (value && !openDocumentIds.includes(value)) {
                        const docName = availableDocuments.find(d => d.id === value)?.name;
                        setOpenDocumentIds([...openDocumentIds, value]);
                        setActiveDocumentId(value);
                        setSelectedDocumentToOpen('');
                        toast.success(`Opened ${docName}`);
                      } else if (value && openDocumentIds.includes(value)) {
                        setActiveDocumentId(value);
                        setSelectedDocumentToOpen('');
                      }
                    }}
                  >
                    <SelectTrigger
                      id="document-selector"
                      className="flex-1 h-9 border-gray-300"
                      aria-label={`Select document to open. ${openDocumentIds.length} of ${availableDocuments.length} documents currently open`}
                    >
                      <SelectValue placeholder={`Select from ${availableDocuments.length} attached documents`} />
                    </SelectTrigger>
                    {/* SelectContent portals to <body> at z-50 by default
                        (see ui/select.tsx). DocumentViewerPanel mounts at
                        z-[60] (or z-[62] when a fulfillment summary is
                        open), so without the explicit z-[70] override the
                        dropdown opened BEHIND the panel and looked unre-
                        sponsive. Bump above both panel layers. */}
                    <SelectContent className="z-[70]">
                      {availableDocuments.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" aria-hidden="true" />
                            <div>
                              <div className="font-medium">{doc.name}</div>
                              <div className="text-xs text-gray-500">{doc.type} • {doc.pages} page{doc.pages > 1 ? 's' : ''}</div>
                            </div>
                            {openDocumentIds.includes(doc.id) && (
                              <Badge variant="secondary" className="ml-2">Open</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Open Document Tabs */}
              <div className="px-6 pt-4 flex-shrink-0 border-b border-gray-200">
                <div
                  className="flex items-center gap-2 overflow-x-auto pb-2"
                  role="tablist"
                  aria-label="Open documents"
                >
                  {openDocumentIds.map((docId) => {
                    const doc = availableDocuments.find(d => d.id === docId);
                    if (!doc) return null;
                    const isActive = activeDocumentId === docId;
                    const isVerified = documentVerifications[docId]?.verified;

                    return (
                      <div
                        key={docId}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`document-panel-${docId}`}
                        onClick={() => {
                          setActiveDocumentId(docId);
                          toast.success(`Switched to ${doc.name}`);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-t-lg border border-b-0 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#0078d4] focus:ring-offset-2 cursor-pointer",
                          isActive
                            ? "bg-white border-gray-300 border-b-white -mb-[1px] z-10"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        )}
                        tabIndex={isActive ? 0 : -1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setActiveDocumentId(docId);
                            toast.success(`Switched to ${doc.name}`);
                          }
                        }}
                      >
                        {isVerified && (
                          <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" aria-label="Verified" />
                        )}
                        <FileText className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span className="text-sm">{doc.name}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newOpenDocs = openDocumentIds.filter(id => id !== docId);
                                  setOpenDocumentIds(newOpenDocs);
                                  if (activeDocumentId === docId && newOpenDocs.length > 0) {
                                    setActiveDocumentId(newOpenDocs[0]);
                                  }
                                  toast.success(`Closed ${doc.name}`);
                                }}
                                className="ml-1 p-0.5 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
                                disabled={openDocumentIds.length === 1}
                                aria-label={`Close ${doc.name}`}
                              >
                                <X className="h-3 w-3" aria-hidden="true" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {openDocumentIds.length === 1 ? 'Cannot close last document' : `Close ${doc.name}`}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Document Content - Render each document's tab content */}
              <>
                {availableDocuments.map((doc) => (
                  <TabsContent
                    key={doc.id}
                    value={doc.id}
                    className="flex-1 px-6 pb-6 mt-4"
                    role="tabpanel"
                    id={`document-panel-${doc.id}`}
                    aria-labelledby={`tab-${doc.id}`}
                  >
                    <div className="space-y-6">
                      <DocumentFieldsPanel
                        document={doc as any}
                        isExpanded={documentDetailsExpanded[doc.id] || false}
                        invalidReason={documentInvalidReasons[doc.id] || ''}
                        verification={documentVerifications[doc.id]}
                        documentImageUrls={DOCUMENT_IMAGES[doc.id] || []}
                        attachmentZoom={attachmentZoom}
                        onZoomChange={setAttachmentZoom}
                        attachmentRotation={attachmentRotation}
                        onRotationChange={setAttachmentRotation}
                        onToggleExpanded={() => {
                          setDocumentDetailsExpanded(prev => ({
                            ...prev,
                            [doc.id]: !prev[doc.id]
                          }));
                        }}
                        onInvalidReasonChange={(value) => {
                          setDocumentInvalidReasons(prev => ({
                            ...prev,
                            [doc.id]: value
                          }));
                        }}
                        onVerify={() => onVerifyDocument(doc.id)}
                        onReject={() => onRejectDocument(doc.id)}
                        onUndoVerify={() => onUndoVerifyDocument(doc.id)}
                      />
                    </div>
                  </TabsContent>
                ))}
              </>
            </Tabs>
          </div>
          )}
        </div>
      </Resizable>
    </div>
  );
}
