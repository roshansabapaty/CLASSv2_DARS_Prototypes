import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { NoteFieldEditor } from "./NoteFieldEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface CaseActionsProps {
  selectedFilesCount: number;
  onSubmitJob: () => void;
}

export function CaseActions({ selectedFilesCount, onSubmitJob }: CaseActionsProps) {
  const [processingService, setProcessingService] = useState("");
  const [notes, setNotes] = useState("");
  const [notesAttachments, setNotesAttachments] = useState<
    import("./RichTextEditor").Attachment[]
  >([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSubmit = () => {
    if (!processingService) {
      toast.error("Please select a processing service");
      return;
    }
    if (selectedFilesCount === 0) {
      toast.error("Please select at least one file");
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmSubmit = () => {
    setShowConfirmDialog(false);
    onSubmitJob();
    toast.success(
      `Job submitted successfully! ${selectedFilesCount} file(s) sent to ${processingService}`
    );
    setNotes("");
  };

  return (
    <>
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Submit to Processing Service
            </h3>
            <p className="text-gray-600 mb-6">
              Select files from the table above and submit them to Azure Content
              Processor for indexing and analysis.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="processing-service">
                Processing Service <span className="text-red-500">*</span>
              </Label>
              <Select
                value={processingService}
                onValueChange={setProcessingService}
              >
                <SelectTrigger id="processing-service" aria-required="true">
                  <SelectValue placeholder="Select a service..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="azure-content-processor">
                    Azure Content Processor
                  </SelectItem>
                  <SelectItem value="azure-document-intelligence">
                    Azure Document Intelligence
                  </SelectItem>
                  <SelectItem value="microsoft-purview">
                    Microsoft Purview
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {/* Processing Notes — rich-text + attachments via the
                  shared NoteFieldEditor so processing-job notes carry
                  the same formatting capabilities as a Case Note. */}
              <NoteFieldEditor
                id="processing-notes"
                label="Processing Notes (Optional)"
                subType="processing-job"
                value={notes}
                onChange={setNotes}
                attachments={notesAttachments}
                onAttachmentsChange={setNotesAttachments}
                placeholder="Add any special instructions or notes for this processing job…"
              />
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-gray-500 mb-1">Files Selected</dt>
                  <dd className="text-gray-900">
                    {selectedFilesCount} {selectedFilesCount === 1 ? "file" : "files"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 mb-1">Service</dt>
                  <dd className="text-gray-900">
                    {processingService
                      ? processingService
                          .split("-")
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(" ")
                      : "Not selected"}
                  </dd>
                </div>
              </div>
            </div>

            {selectedFilesCount > 0 && processingService && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-green-800">
                  Ready to submit. The selected files will be uploaded to{" "}
                  {processingService
                    .split("-")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}{" "}
                  for processing.
                </p>
              </div>
            )}

            {selectedFilesCount === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-800">
                  Please select at least one file from the table above to submit for
                  processing.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSubmit}
              disabled={selectedFilesCount === 0 || !processingService}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Submit Job
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setNotes("");
                setProcessingService("");
              }}
            >
              Clear Form
            </Button>
          </div>
        </div>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Job Submission</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to submit {selectedFilesCount}{" "}
              {selectedFilesCount === 1 ? "file" : "files"} to{" "}
              {processingService
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")}
              . This action cannot be undone.
              {notes && (
                <>
                  <br />
                  <br />
                  <strong>Notes:</strong> {notes}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSubmit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
