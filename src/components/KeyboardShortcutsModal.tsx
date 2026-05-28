import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Command, Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ["?"], description: "Show keyboard shortcuts", category: "Navigation" },
  { keys: ["Escape"], description: "Return to queue / close modal or panel", category: "Navigation" },
  { keys: ["g", "t"], description: "Go to Triage stage", category: "Navigation" },
  { keys: ["g", "f"], description: "Go to Fulfillment stage", category: "Navigation" },
  { keys: ["g", "c"], description: "Go to Collection stage", category: "Navigation" },
  
  // Actions
  { keys: ["Ctrl", "S"], description: "Save draft (auto-saves)", category: "Actions" },
  { keys: ["Ctrl", "K"], description: "Open command palette (future)", category: "Actions" },
  { keys: ["a"], description: "Add identifier", category: "Actions" },
  { keys: ["n"], description: "Add NDO", category: "Actions" },
  { keys: ["Ctrl", "Enter"], description: "Submit form", category: "Actions" },
  
  // Selection
  { keys: ["Ctrl", "A"], description: "Select all items", category: "Selection" },
  { keys: ["Shift", "Click"], description: "Select range", category: "Selection" },
  { keys: ["Delete"], description: "Delete selected items", category: "Selection" },
  
  // View — in-case stepper
  { keys: ["1"], description: "Summary view", category: "View" },
  { keys: ["2"], description: "Detailed view", category: "View" },
  { keys: ["3"], description: "Fulfillment view", category: "View" },

  // View mode — Case List / Attorney Dashboard / Notifications
  { keys: ["Ctrl", "1"], description: "Cards view (case list, attorney dashboard, notifications)", category: "List view mode" },
  { keys: ["Ctrl", "2"], description: "Detailed list view (case list, attorney dashboard, notifications)", category: "List view mode" },
  { keys: ["Ctrl", "3"], description: "Preview pane view (case list only — wide viewport required)", category: "List view mode" },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const categories = Array.from(new Set(shortcuts.map(s => s.category)));
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#323130]">
            <Keyboard className="w-5 h-5 text-[#0078d4]" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-[#323130] mb-3 uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 rounded hover:bg-[#f3f2f1] transition-colors"
                    >
                      <span className="text-sm text-[#605e5c]">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <span key={keyIdx} className="flex items-center gap-1">
                            <kbd className="px-2 py-1 text-xs font-semibold text-[#323130] bg-white border border-[#c8c6c4] rounded shadow-sm min-w-[32px] text-center">
                              {key}
                            </kbd>
                            {keyIdx < shortcut.keys.length - 1 && (
                              <span className="text-[#605e5c] text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-[#edebe9]">
          <p className="text-xs text-[#605e5c] flex items-center gap-2">
            <Command className="w-4 h-4" />
            Press <kbd className="px-1.5 py-0.5 text-xs bg-white border border-[#c8c6c4] rounded">?</kbd> anytime to view this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}