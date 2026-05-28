import { useState } from "react";
import { toast } from "sonner@2.0.3";
import type { FormData, CaseNote, Attachment } from "../types/caseTypes";
import { CURRENT_USER } from "../constants/caseConstants";

interface UseCaseNotesOptions {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleInputChange: (field: keyof FormData, value: any) => void;
}

export function useCaseNotes({
  formData,
  setFormData,
  handleInputChange,
}: UseCaseNotesOptions) {
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteAttachments, setNewNoteAttachments] = useState<Attachment[]>([]);
  const [escalationNotesSaved, setEscalationNotesSaved] = useState(true);
  const [isSavingEscalationNotes, setIsSavingEscalationNotes] = useState(false);

  const handleAddNote = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newNoteText;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    if (!textContent.trim() && newNoteAttachments.length === 0) {
      toast.error("Please enter a note or add an attachment");
      return;
    }

    const newNote: CaseNote = {
      id: `NOTE-${Date.now()}`,
      content: newNoteText,
      createdBy: CURRENT_USER,
      createdAt: new Date(),
      attachments: newNoteAttachments.length > 0 ? newNoteAttachments : undefined,
    };

    setFormData(prev => ({
      ...prev,
      notes: [...prev.notes, newNote],
    }));

    setNewNoteText("");
    setNewNoteAttachments([]);
    toast.success("Note added successfully");
  };

  const handleDeleteNote = (noteId: string) => {
    setFormData(prev => ({
      ...prev,
      notes: prev.notes.filter(note => note.id !== noteId),
    }));
    toast.info("Note deleted");
  };

  const handleEditNote = (noteId: string, newContent: string, attachments?: Attachment[]) => {
    setFormData(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === noteId
          ? { ...note, content: newContent, attachments: attachments || note.attachments }
          : note
      ),
    }));
    toast.success("Note updated successfully");
  };

  const handleSaveEscalationNotes = () => {
    if (!formData.escalationNotes.trim()) {
      toast.error("Cannot save empty escalation notes");
      return;
    }

    setIsSavingEscalationNotes(true);
    
    setTimeout(() => {
      setEscalationNotesSaved(true);
      setIsSavingEscalationNotes(false);
      toast.success("Escalation notes saved successfully");
    }, 300);
  };

  const handleEscalationNotesChange = (value: string) => {
    handleInputChange("escalationNotes", value);
    setEscalationNotesSaved(false);
  };

  return {
    newNoteText, setNewNoteText,
    newNoteAttachments, setNewNoteAttachments,
    escalationNotesSaved, setEscalationNotesSaved,
    isSavingEscalationNotes,
    handleAddNote,
    handleDeleteNote,
    handleEditNote,
    handleSaveEscalationNotes,
    handleEscalationNotesChange,
  };
}
