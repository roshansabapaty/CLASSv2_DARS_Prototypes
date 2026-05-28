import React from "react";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { NoteFieldEditor } from "./NoteFieldEditor";
import type { Attachment as NoteAttachment } from "./RichTextEditor";
import { 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  AlertCircle, 
  XCircle, 
  Undo2, 
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2
} from "lucide-react";
import { format } from "date-fns";

interface DocumentData {
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

interface VerificationData {
  verified: boolean;
  verifiedBy: string;
  verifiedAt: Date;
  rejected?: boolean;
  rejectedBy?: string;
  rejectedAt?: Date;
}

interface DocumentFieldsPanelProps {
  document: DocumentData;
  isExpanded: boolean;
  invalidReason: string;
  onToggleExpanded: () => void;
  onInvalidReasonChange: (value: string) => void;
  verification?: VerificationData;
  onVerify: () => void;
  onReject: () => void;
  onUndoVerify: () => void;
  documentImageUrls?: string[];
  attachmentZoom?: number;
  onZoomChange?: (zoom: number) => void;
  attachmentRotation?: number;
  onRotationChange?: (rotation: number) => void;
}

export function DocumentFieldsPanel({
  document,
  isExpanded,
  invalidReason,
  onToggleExpanded,
  onInvalidReasonChange,
  verification,
  onVerify,
  onReject,
  onUndoVerify,
  documentImageUrls = [],
  attachmentZoom = 100,
  onZoomChange,
  attachmentRotation = 0,
  onRotationChange,
}: DocumentFieldsPanelProps) {
  const zoomOptions = [50, 75, 100, 125, 150, 200];
  // Local-only attachments for the verification-notes field. The
  // parent's `onInvalidReasonChange` callback only persists the string
  // content today; if attachments need to survive a panel close, the
  // hook (`useDocumentViewer`) would need a sibling
  // `documentInvalidAttachments` map.
  const [verificationAttachments, setVerificationAttachments] = React.useState<
    NoteAttachment[]
  >([]);
  
  const handleZoomIn = () => {
    const currentIndex = zoomOptions.indexOf(attachmentZoom);
    if (currentIndex < zoomOptions.length - 1 && onZoomChange) {
      onZoomChange(zoomOptions[currentIndex + 1]);
    }
  };
  
  const handleZoomOut = () => {
    const currentIndex = zoomOptions.indexOf(attachmentZoom);
    if (currentIndex > 0 && onZoomChange) {
      onZoomChange(zoomOptions[currentIndex - 1]);
    }
  };
  
  const handleRotateLeft = () => {
    if (onRotationChange) {
      onRotationChange((attachmentRotation - 90) % 360);
    }
  };
  
  const handleRotateRight = () => {
    if (onRotationChange) {
      onRotationChange((attachmentRotation + 90) % 360);
    }
  };
  
  const handleFitToWidth = () => {
    if (onZoomChange) {
      onZoomChange(100);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Document Viewer Section - FIRST STEP */}
      {documentImageUrls.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Document Review</h3>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
              {documentImageUrls.length} page{documentImageUrls.length > 1 ? 's' : ''}
            </Badge>
          </div>
          
          {/* Office-Style Toolbar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border-2 border-gray-300 rounded-t-lg shadow-sm">
            {/* Left Side - Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={attachmentZoom <= zoomOptions[0]}
                className="h-7 w-7 p-0 hover:bg-gray-100 disabled:opacity-40"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <select
                value={attachmentZoom}
                onChange={(e) => onZoomChange?.(Number(e.target.value))}
                className="h-7 px-2 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4]"
              >
                {zoomOptions.map((zoom) => (
                  <option key={zoom} value={zoom}>
                    {zoom}%
                  </option>
                ))}
              </select>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={attachmentZoom >= zoomOptions[zoomOptions.length - 1]}
                className="h-7 w-7 p-0 hover:bg-gray-100 disabled:opacity-40"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <div className="w-px h-5 bg-gray-300 mx-1" />
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFitToWidth}
                className="h-7 px-2 text-xs hover:bg-gray-100 gap-1"
                title="Fit to Width"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Fit
              </Button>
            </div>
            
            {/* Right Side - Rotation Controls */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRotateLeft}
                className="h-7 px-2 text-xs hover:bg-gray-100 gap-1"
                title="Rotate Left 90°"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Rotate Left
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRotateRight}
                className="h-7 px-2 text-xs hover:bg-gray-100 gap-1"
                title="Rotate Right 90°"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Rotate Right
              </Button>
            </div>
          </div>
          
          {/* Document Viewer with Increased Height */}
          <div className="max-h-[700px] overflow-y-auto overscroll-contain border-2 border-t-0 border-gray-300 rounded-b-lg bg-gray-50 p-3 space-y-3">
            {documentImageUrls.map((imageUrl, index) => (
              <div key={index} className="space-y-1.5">
                <p className="text-xs text-gray-700 font-medium" role="status">
                  Page {index + 1} of {documentImageUrls.length}
                </p>
                <div className="overflow-auto border border-gray-300 rounded-lg bg-white flex items-center justify-center min-h-[400px]">
                  <img 
                    src={imageUrl} 
                    alt={`${document.documentName} - Page ${index + 1}`}
                    className="shadow-sm transition-transform duration-200"
                    style={{ 
                      transform: `scale(${attachmentZoom / 100}) rotate(${attachmentRotation}deg)`,
                      transformOrigin: 'center center',
                      maxWidth: attachmentRotation % 180 === 0 ? '100%' : 'none',
                      display: 'block'
                    }}
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 bg-gray-100 border-2 border-gray-300 rounded-lg text-center" role="status">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-gray-600 font-medium">{document.documentName}</p>
          <p className="text-xs text-gray-500 mt-1">{document.pages} page document</p>
          <p className="text-xs text-gray-400 mt-2">Image preview not available</p>
        </div>
      )}

      {/* Document Validation Fields - SECOND STEP */}
      <Card className="p-3 bg-blue-50 border-blue-200 relative z-10">
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Document Validation Fields</h3>
            <Badge 
              variant="outline" 
              className={
                document.documentStatus === "Rejected" 
                  ? "bg-red-50 text-red-700 border-red-300 text-xs"
                  : document.documentStatus === "Valid" || document.documentStatus === "Active" || document.documentStatus === "Approved"
                  ? "bg-green-50 text-green-700 border-green-300 text-xs"
                  : "bg-yellow-50 text-yellow-700 border-yellow-300 text-xs"
              }
            >
              {document.documentStatus}
            </Badge>
          </div>
          
          {/* Primary Fields - Always Visible */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div>
              <Label className="text-xs text-gray-600">Document ID</Label>
              <p className="text-gray-900 font-medium mt-0.5">{document.documentId}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Document Name</Label>
              <p className="text-gray-900 font-medium mt-0.5">{document.documentName}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Document Type</Label>
              <p className="text-gray-900 font-medium mt-0.5">{document.documentType}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Document Status</Label>
              <p className="text-gray-900 font-medium mt-0.5">{document.documentStatus}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Start Date</Label>
              <p className="text-gray-900 font-medium mt-0.5">{format(document.startDate, 'MMM d, yyyy')}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Expiration Date</Label>
              <p className="text-gray-900 font-medium mt-0.5">{format(document.expirationDate, 'MMM d, yyyy')}</p>
            </div>
          </div>
          
          {/* Toggle for Additional Details */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="h-7 gap-1.5 text-xs text-[#0078d4] hover:text-[#106ebe] hover:bg-blue-100 -ml-2 mt-1"
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {isExpanded ? 'Hide' : 'See more'} details
          </Button>
          
          {/* Secondary Fields - Hidden by Default */}
          {isExpanded && (
            <div className="pt-2.5 border-t border-blue-200 space-y-2">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <Label className="text-xs text-gray-600">Approver Name</Label>
                  <p className="text-gray-900 font-medium mt-0.5">{document.approverName}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Approval Date/Time</Label>
                  <p className="text-gray-900 font-medium mt-0.5">{format(document.approvalDateTime, 'MMM d, yyyy h:mm a')}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-gray-600">Approval Reason</Label>
                  <p className="text-gray-900 mt-0.5 text-sm">{document.approvalReason}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Document Desired Status</Label>
                  <p className="text-gray-900 font-medium mt-0.5">{document.documentDesiredStatus}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Document Verification Section - FINAL STEP */}
      <Card className="p-3 border-2 border-gray-300 relative z-10">
        <div className="space-y-2.5">
          <div className={`p-3 rounded-lg border-2 ${
            verification?.verified 
              ? 'bg-green-50 border-green-300'
              : verification?.rejected
              ? 'bg-red-50 border-red-300'
              : 'bg-amber-50 border-amber-300'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  {verification?.verified ? (
                    <ShieldCheck className="h-4 w-4 text-green-700" />
                  ) : verification?.rejected ? (
                    <XCircle className="h-4 w-4 text-red-700" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-700" />
                  )}
                  <h3 className={`text-sm font-semibold ${
                    verification?.verified 
                      ? 'text-green-900' 
                      : verification?.rejected
                      ? 'text-red-900'
                      : 'text-amber-900'
                  }`}>
                    {verification?.verified 
                      ? 'Document Verified' 
                      : verification?.rejected
                      ? 'Document Rejected'
                      : 'Verification Required'}
                  </h3>
                </div>
                
                {verification?.verified ? (
                  <div className="text-xs space-y-0.5">
                    <p className="text-green-800">
                      <span className="font-medium">Verified by:</span> {verification.verifiedBy}
                    </p>
                    <p className="text-green-700">
                      <span className="font-medium">Verified at:</span>{' '}
                      {format(verification.verifiedAt, 'MMM d, yyyy')} at{' '}
                      {format(verification.verifiedAt, 'h:mm a')}
                    </p>
                  </div>
                ) : verification?.rejected ? (
                  <div className="text-xs space-y-0.5">
                    <p className="text-red-800">
                      <span className="font-medium">Rejected by:</span> {verification.rejectedBy}
                    </p>
                    <p className="text-red-700">
                      <span className="font-medium">Rejected at:</span>{' '}
                      {verification.rejectedAt && format(verification.rejectedAt, 'MMM d, yyyy')} at{' '}
                      {verification.rejectedAt && format(verification.rejectedAt, 'h:mm a')}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-amber-800">
                    Review the document above and verify it is a legitimate legal document before proceeding.
                  </p>
                )}
              </div>
              
              {!verification?.verified && !verification?.rejected && (
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    onClick={onVerify}
                    className="bg-[#0078d4] hover:bg-[#106ebe] text-white shadow-sm h-8 px-3 text-xs"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                    Verify
                  </Button>
                  <Button
                    type="button"
                    onClick={onReject}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-400 shadow-sm h-8 px-3 text-xs"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    Reject
                  </Button>
                </div>
              )}
              
              {verification?.verified && (
                <div className="flex flex-col gap-1.5 items-end">
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-400 h-fit text-xs">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                  <Button
                    type="button"
                    onClick={onUndoVerify}
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 h-7 px-2.5 text-xs -mr-2"
                  >
                    <Undo2 className="h-3 w-3 mr-1" />
                    Undo
                  </Button>
                </div>
              )}
              
              {verification?.rejected && (
                <div className="flex flex-col gap-1.5 items-end">
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-400 h-fit text-xs">
                    <XCircle className="h-3 w-3 mr-1" />
                    Rejected
                  </Badge>
                  <Button
                    type="button"
                    onClick={onUndoVerify}
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 h-7 px-2.5 text-xs -mr-2"
                  >
                    <Undo2 className="h-3 w-3 mr-1" />
                    Undo
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Verification Notes — rich-text + attachments via the
              shared NoteFieldEditor so document-verification notes
              carry the same formatting capabilities as a Case Note.
              Attachments are kept local to the panel for now since the
              parent's invalidReason callback only persists the string
              content. */}
          <div className="pt-2 border-t border-gray-200">
            <NoteFieldEditor
              id={`${document.id}-invalid-reason`}
              label="Verification Notes & Invalid Reason (Optional)"
              subType="document-verification"
              value={invalidReason}
              onChange={onInvalidReasonChange}
              attachments={verificationAttachments}
              onAttachmentsChange={setVerificationAttachments}
              placeholder="Enter any notes about this document verification, or reasons if document is invalid…"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}