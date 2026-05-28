import React from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import {
  User,
  Clock,
  X,
  MessageSquare,
  FileText,
  AlertTriangle,
  ClipboardList,
  Building,
  Plus,
  Edit2,
  Check,
  Paperclip,
  Download
} from "lucide-react";
import { cn } from "./ui/utils";
import { RichTextEditor, Attachment } from "./RichTextEditor";

interface CaseNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: Date;
  attachments?: Attachment[];
}

interface FulfillmentTask {
  id: string;
  serviceName: string;
  serviceData?: {
    collectionNotes?: string;
  };
}

interface NotesTimelineProps {
  caseNotes: CaseNote[];
  escalationNotes: string;
  fulfillmentTasks: FulfillmentTask[];
  newNoteText: string;
  onNewNoteChange: (text: string) => void;
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => void;
  onEditNote: (noteId: string, newContent: string, attachments?: Attachment[]) => void;
  newNoteAttachments: Attachment[];
  onNewNoteAttachmentsChange: (attachments: Attachment[]) => void;
}

export function NotesTimeline({
  caseNotes,
  escalationNotes,
  fulfillmentTasks,
  newNoteText,
  onNewNoteChange,
  onAddNote,
  onDeleteNote,
  onEditNote,
  newNoteAttachments,
  onNewNoteAttachmentsChange
}: NotesTimelineProps) {
  // State for editing notes
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = React.useState("");
  const [editingNoteAttachments, setEditingNoteAttachments] = React.useState<Attachment[]>([]);

  // Calculate note counts with safe defaults
  const serviceNotesCount = (fulfillmentTasks || []).reduce(
    (acc, task) => acc + (task.serviceData?.collectionNotes ? 1 : 0),
    0
  );
  const allNotesCount = (caseNotes || []).length + (escalationNotes ? 1 : 0) + serviceNotesCount;

  // Generate all notes for timeline
  const getAllNotes = () => {
    const allNotes: Array<{
      id: string;
      content: string;
      createdBy: string;
      createdAt: Date;
      type: "case" | "escalation" | "service";
      context?: string;
      canDelete?: boolean;
    }> = [];

    // Add case notes
    (caseNotes || []).forEach((note) => {
      allNotes.push({
        ...note,
        type: "case",
        context: "General Case Note",
        canDelete: true
      });
    });

    // Add escalation note if exists
    if (escalationNotes) {
      allNotes.push({
        id: "escalation-note",
        content: escalationNotes,
        createdBy: "Case Specialist",
        createdAt: new Date(),
        type: "escalation",
        context: "Case Escalation",
        canDelete: false
      });
    }

    // Add service collection notes
    (fulfillmentTasks || []).forEach((task) => {
      if (task.serviceData?.collectionNotes) {
        allNotes.push({
          id: `service-${task.id}`,
          content: task.serviceData.collectionNotes,
          createdBy: "Data Collection",
          createdAt: new Date(),
          type: "service",
          context: `${task.serviceName} Collection`,
          canDelete: false
        });
      }
    });

    // Sort by date descending (newest first)
    allNotes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return allNotes;
  };

  const getNoteBadgeColor = (type: string) => {
    switch (type) {
      case "case":
        return "bg-[#0078d4] text-white";
      case "escalation":
        return "bg-[#d13438] text-white";
      case "service":
        return "bg-[#107c10] text-white";
      default:
        return "bg-[#605e5c] text-white";
    }
  };

  const servicesWithNotes = (fulfillmentTasks || []).filter(
    (task) => task.serviceData?.collectionNotes
  );

  return (
    <>
      {/* Add New Note - Now above tabs */}
      <div className="space-y-3 mb-6 pb-6 border-b border-[#e1dfdd]">
        <Label htmlFor="newNote" className="text-[#323130] text-sm font-semibold">
          Add a case note
        </Label>
        <RichTextEditor
          value={newNoteText}
          onChange={onNewNoteChange}
          attachments={newNoteAttachments}
          onAttachmentsChange={onNewNoteAttachmentsChange}
          placeholder="Enter case notes, updates, or observations... Use the toolbar for formatting."
          onKeyDown={(e) => {
            // Submit note with Ctrl+Enter or Cmd+Enter
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = newNoteText;
              const textContent = tempDiv.textContent || tempDiv.innerText || '';
              if (textContent.trim() || newNoteAttachments.length > 0) {
                onAddNote();
              }
            }
          }}
        />
        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-[#605e5c]">
            Press Ctrl+Enter to add note • Paste images directly
          </span>
          <Button
            type="button"
            onClick={onAddNote}
            disabled={!newNoteText.trim() && newNoteAttachments.length === 0}
            className="h-9 px-4 bg-[#0078d4] text-white hover:bg-[#106ebe] disabled:bg-[#f3f2f1] disabled:text-[#a19f9d] transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All Notes{allNotesCount > 0 && ` (${allNotesCount})`}
          </TabsTrigger>
          <TabsTrigger value="case" className="text-xs sm:text-sm">
            Case{caseNotes.length > 0 && ` (${caseNotes.length})`}
          </TabsTrigger>
          <TabsTrigger value="other" className="text-xs sm:text-sm">
            Other{serviceNotesCount + (escalationNotes ? 1 : 0) > 0 && ` (${serviceNotesCount + (escalationNotes ? 1 : 0)})`}
          </TabsTrigger>
        </TabsList>

        {/* All Notes Timeline View */}
        <TabsContent value="all" className="space-y-3 mt-0">
          {(() => {
            const allNotes = getAllNotes();

            if (allNotes.length === 0) {
              return (
                <div className="text-center py-8 text-[#605e5c] text-sm">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No notes have been added yet</p>
                </div>
              );
            }

            return allNotes.map((note) => {
              const currentNote = caseNotes.find(n => n.id === note.id);
              
              return (
              <div
                key={note.id}
                className="bg-[#faf9f8] border border-[#e1dfdd] rounded-lg p-4 space-y-2"
              >
                {editingNoteId === note.id ? (
                  // Edit mode with Rich Text Editor
                  <>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge
                        className={cn("text-xs font-semibold", getNoteBadgeColor(note.type))}
                      >
                        {note.context}
                      </Badge>
                    </div>
                    <RichTextEditor
                      value={editingNoteText}
                      onChange={setEditingNoteText}
                      attachments={editingNoteAttachments}
                      onAttachmentsChange={setEditingNoteAttachments}
                      placeholder="Edit your note with rich formatting..."
                      autoFocus={true}
                      onKeyDown={(e) => {
                        // Save with Ctrl+Enter
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault();
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = editingNoteText;
                          const textContent = tempDiv.textContent || tempDiv.innerText || '';
                          if (textContent.trim()) {
                            onEditNote(note.id, editingNoteText, editingNoteAttachments);
                            setEditingNoteId(null);
                            setEditingNoteText("");
                            setEditingNoteAttachments([]);
                          }
                        }
                        // Cancel with Escape
                        if (e.key === 'Escape') {
                          setEditingNoteId(null);
                          setEditingNoteText("");
                          setEditingNoteAttachments([]);
                        }
                      }}
                    />
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-[#605e5c]">
                        Press Ctrl+Enter to save • Esc to cancel • Paste images directly
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingNoteId(null);
                            setEditingNoteText("");
                            setEditingNoteAttachments([]);
                          }}
                          className="h-8 px-3 text-[#605e5c] hover:bg-[#f3f2f1] transition-colors"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = editingNoteText;
                            const textContent = tempDiv.textContent || tempDiv.innerText || '';
                            if (textContent.trim()) {
                              onEditNote(note.id, editingNoteText, editingNoteAttachments);
                              setEditingNoteId(null);
                              setEditingNoteText("");
                              setEditingNoteAttachments([]);
                            }
                          }}
                          disabled={!editingNoteText.trim()}
                          className="h-8 px-3 bg-[#0078d4] text-white hover:bg-[#106ebe] disabled:bg-[#f3f2f1] disabled:text-[#a19f9d] transition-colors"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  // View mode
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={cn("text-xs font-medium", getNoteBadgeColor(note.type))}
                          >
                            {note.context}
                          </Badge>
                          {currentNote?.attachments && currentNote.attachments.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Paperclip className="w-3 h-3 mr-1" />
                              {currentNote.attachments.length} {currentNote.attachments.length === 1 ? 'attachment' : 'attachments'}
                            </Badge>
                          )}
                        </div>
                        <div 
                          className="text-[#323130] text-sm prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                        {currentNote?.attachments && currentNote.attachments.length > 0 && (
                          <div className="pt-2 space-y-2">
                            {currentNote.attachments.map((att) => (
                              <div
                                key={att.id}
                                className="flex items-center gap-2 p-2 bg-white border border-[#e1dfdd] rounded hover:bg-[#f3f2f1] transition-colors"
                              >
                                {att.isImage ? (
                                  <div className="flex-shrink-0 w-12 h-12 bg-white border border-[#e1dfdd] rounded overflow-hidden">
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      className="w-full h-full object-cover cursor-pointer"
                                      onClick={() => window.open(att.url, '_blank')}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex-shrink-0 w-10 h-10 bg-[#0078d4] rounded flex items-center justify-center">
                                    <Paperclip className="w-5 h-5 text-white" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-[#323130] truncate">{att.name}</div>
                                  <div className="text-xs text-[#605e5c]">
                                    {(att.size / 1024).toFixed(1)} KB
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(att.url, '_blank')}
                                  className="h-7 w-7 p-0 text-[#605e5c] hover:text-[#0078d4] hover:bg-[#deecf9] transition-colors flex-shrink-0"
                                  aria-label="Download attachment"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {note.canDelete && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditingNoteText(note.content);
                              setEditingNoteAttachments(currentNote?.attachments || []);
                            }}
                            className="h-7 w-7 p-0 text-[#605e5c] hover:text-[#0078d4] hover:bg-[#deecf9] transition-colors"
                            aria-label="Edit note"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteNote(note.id)}
                            className="h-7 w-7 p-0 text-[#605e5c] hover:text-[#d13438] hover:bg-[#fde7e9] transition-colors"
                            aria-label="Delete note"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#605e5c]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>{note.createdBy}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {new Date(note.createdAt)
                            .toISOString()
                            .replace("T", " ")
                            .substring(0, 19)}{" "}
                          UTC
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
            });
          })()}
        </TabsContent>

        {/* Case Notes Tab */}
        <TabsContent value="case" className="space-y-3 mt-0">
          {caseNotes.length > 0 ? (
            <div className="space-y-3">
              {caseNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-[#faf9f8] border border-[#e1dfdd] rounded-lg p-4 space-y-2"
                >
                  {editingNoteId === note.id ? (
                    // Edit mode
                    <>
                      <textarea
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        onKeyDown={(e) => {
                          // Save with Ctrl+Enter
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            if (editingNoteText.trim()) {
                              onEditNote(note.id, editingNoteText.trim(), editingNoteAttachments);
                              setEditingNoteId(null);
                              setEditingNoteText("");
                              setEditingNoteAttachments([]);
                            }
                          }
                          // Cancel with Escape
                          if (e.key === 'Escape') {
                            setEditingNoteId(null);
                            setEditingNoteText("");
                            setEditingNoteAttachments([]);
                          }
                        }}
                        rows={3}
                        autoFocus
                        className="w-full px-3 py-2 border border-[#0078d4] rounded text-[#323130] text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-colors"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#605e5c]">
                          Press Ctrl+Enter to save • Esc to cancel
                        </span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingNoteId(null);
                              setEditingNoteText("");
                              setEditingNoteAttachments([]);
                            }}
                            className="h-8 px-3 text-[#605e5c] hover:bg-[#f3f2f1] transition-colors"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              if (editingNoteText.trim()) {
                                onEditNote(note.id, editingNoteText.trim(), editingNoteAttachments);
                                setEditingNoteId(null);
                                setEditingNoteText("");
                                setEditingNoteAttachments([]);
                              }
                            }}
                            disabled={!editingNoteText.trim()}
                            className="h-8 px-3 bg-[#0078d4] text-white hover:bg-[#106ebe] disabled:bg-[#f3f2f1] disabled:text-[#a19f9d] transition-colors"
                          >
                            <Check className="w-4 h-4 mr-1.5" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[#323130] text-sm flex-1">{note.content}</p>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditingNoteText(note.content);
                              setEditingNoteAttachments(note.attachments || []);
                            }}
                            className="h-7 w-7 p-0 text-[#605e5c] hover:text-[#0078d4] hover:bg-[#deecf9] transition-colors"
                            aria-label="Edit note"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteNote(note.id)}
                            className="h-7 w-7 p-0 text-[#605e5c] hover:text-[#d13438] hover:bg-[#fde7e9] transition-colors"
                            aria-label="Delete note"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#605e5c]">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>{note.createdBy}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {new Date(note.createdAt)
                              .toISOString()
                              .replace("T", " ")
                              .substring(0, 19)}{" "}
                            UTC
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#605e5c] text-sm">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No case notes yet</p>
            </div>
          )}
        </TabsContent>

        {/* Other Notes Tab (Escalation + Services) */}
        <TabsContent value="other" className="space-y-3 mt-0">
          {!escalationNotes && servicesWithNotes.length === 0 ? (
            <div className="text-center py-8 text-[#605e5c] text-sm">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No escalation or service notes</p>
            </div>
          ) : (
            <>
              {/* Escalation Note */}
              {escalationNotes && (
                <div>
                  <h4 className="text-[#323130] font-semibold text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#d13438]" />
                    Escalation
                  </h4>
                  <div className="bg-[#fde7e9] border border-[#d13438] rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[#d13438] mb-2">
                          Escalation Contact Notes
                        </p>
                        <p className="text-[#323130] text-sm">{escalationNotes}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Service Collection Notes */}
              {servicesWithNotes.length > 0 && (
                <div>
                  <h4 className="text-[#323130] font-semibold text-sm mb-2 flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#107c10]" />
                    Service Collection
                  </h4>
                  <div className="space-y-2">
                    {servicesWithNotes.map((task) => (
                      <div
                        key={task.id}
                        className="bg-[#f0fdf4] border border-[#107c10] rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-[#107c10] mb-2">
                              {task.serviceName}
                            </p>
                            <p className="text-[#323130] text-sm">
                              {task.serviceData?.collectionNotes}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}