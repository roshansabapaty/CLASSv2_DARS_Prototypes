import React from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "./ui/alert-dialog";
import { Save, Trash2, Clock } from "lucide-react";

interface DataRecoveryDialogProps {
  isOpen: boolean;
  savedDate: Date | null;
  onRecover: () => void;
  onDiscard: () => void;
}

export function DataRecoveryDialog({ isOpen, savedDate, onRecover, onDiscard }: DataRecoveryDialogProps) {
  const getTimeAgo = (date: Date | null): string => {
    if (!date) return "Unknown time";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return "Just now";
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-[#323130]">
            <Save className="w-5 h-5 text-[#0078d4]" />
            Recover Unsaved Work?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#605e5c]">
            We found unsaved work from your previous session.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-2 text-sm bg-[#f3f2f1] rounded px-3 py-2">
            <Clock className="w-4 h-4 text-[#605e5c]" />
            <span>Last saved: {getTimeAgo(savedDate)}</span>
          </div>
          <p className="text-sm text-[#605e5c]">
            Would you like to recover this data or start fresh?
          </p>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onDiscard}
            className="border-[#c8c6c4] hover:bg-[#f3f2f1] text-[#323130]"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Start Fresh
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onRecover}
            className="bg-[#0078d4] hover:bg-[#106ebe] text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Recover Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}