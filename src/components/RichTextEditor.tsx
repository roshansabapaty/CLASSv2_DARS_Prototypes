import React, { useRef } from "react";
import { Button } from "./ui/button";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image,
  Paperclip,
  X
} from "lucide-react";
import { cn } from "./ui/utils";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  isImage: boolean;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  attachments,
  onAttachmentsChange,
  placeholder = "Type your note...",
  autoFocus = false,
  onKeyDown,
  className
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean = false) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    
    Array.from(files).forEach((file) => {
      // Create a mock URL for the file (in a real app, you'd upload to a server)
      const url = URL.createObjectURL(file);
      
      newAttachments.push({
        id: `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: url,
        isImage: file.type.startsWith('image/')
      });
    });

    onAttachmentsChange([...attachments, ...newAttachments]);
    
    // Reset input
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check for images in clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const url = URL.createObjectURL(file);
          const newAttachment: Attachment = {
            id: `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `Pasted Screenshot ${new Date().toLocaleTimeString()}.png`,
            size: file.size,
            type: file.type,
            url: url,
            isImage: true
          };
          onAttachmentsChange([...attachments, newAttachment]);
        }
        return;
      }
    }
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter(att => att.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={cn("border border-[#c8c6c4] rounded focus-within:border-[#0078d4] focus-within:ring-1 focus-within:ring-[#0078d4] transition-colors bg-white", className)}>
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-[#e1dfdd] flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('bold')}
          className="h-8 w-8 p-0 hover:bg-[#f3f2f1]"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('italic')}
          className="h-8 w-8 p-0 hover:bg-[#f3f2f1]"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('underline')}
          className="h-8 w-8 p-0 hover:bg-[#f3f2f1]"
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-[#e1dfdd] mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertUnorderedList')}
          className="h-8 w-8 p-0 hover:bg-[#f3f2f1]"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertOrderedList')}
          className="h-8 w-8 p-0 hover:bg-[#f3f2f1]"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-[#e1dfdd] mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = prompt('Enter URL:');
            if (url) execCommand('createLink', url);
          }}
          className="h-8 w-8 p-0 hover:bg-[#f3f2f1]"
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-[#e1dfdd] mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => imageInputRef.current?.click()}
          className="h-8 w-8 p-0 hover:bg-[#f3f2f1]"
          title="Add Image"
        >
          <Image className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 w-8 p-0 hover:bg-[#f3f2f1]"
          title="Attach File"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
      </div>

      {/* Content Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={handlePaste}
        onKeyDown={onKeyDown}
        className="min-h-[100px] max-h-[300px] overflow-y-auto px-3 py-2 text-[#323130] text-sm focus:outline-none"
        style={{ wordBreak: 'break-word' }}
        data-placeholder={placeholder}
        autoFocus={autoFocus}
      />

      {/* Attachments Display */}
      {attachments.length > 0 && (
        <div className="p-2 border-t border-[#e1dfdd] space-y-2">
          <div className="text-xs font-semibold text-[#605e5c]">
            Attachments ({attachments.length})
          </div>
          <div className="space-y-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 p-2 bg-[#f3f2f1] rounded hover:bg-[#edebe9] transition-colors"
              >
                {att.isImage ? (
                  <div className="flex-shrink-0 w-12 h-12 bg-white border border-[#e1dfdd] rounded overflow-hidden">
                    <img
                      src={att.url}
                      alt={att.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-10 h-10 bg-[#0078d4] rounded flex items-center justify-center">
                    <Paperclip className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#323130] truncate">{att.name}</div>
                  <div className="text-xs text-[#605e5c]">{formatFileSize(att.size)}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(att.id)}
                  className="h-7 w-7 p-0 text-[#605e5c] hover:text-[#d13438] hover:bg-[#fde7e9] transition-colors flex-shrink-0"
                  aria-label="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => handleFileSelect(e, false)}
        className="hidden"
        accept="*/*"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        onChange={(e) => handleFileSelect(e, true)}
        className="hidden"
        accept="image/*"
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #a19f9d;
          pointer-events: none;
        }
        [contenteditable] {
          white-space: pre-wrap;
        }
        [contenteditable] a {
          color: #0078d4;
          text-decoration: underline;
        }
        [contenteditable] ul, [contenteditable] ol {
          margin-left: 20px;
          margin-top: 4px;
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}
