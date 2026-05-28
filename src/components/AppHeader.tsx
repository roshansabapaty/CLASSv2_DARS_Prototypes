import React from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  HelpCircle,
  User,
  Settings,
  Shield,
  ChevronDown,
  BookOpen,
  FileText,
  Figma,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface AppHeaderProps {
  userDisplayName?: string;
  userEmail?: string;
  onShowComponentDocs?: () => void;
  /** Open the Cards / List view design-direction preview modal.
   *  Moved into Help & Resources so it shares a home with other
   *  design-direction artifacts (Component Documentation, future
   *  spec links). When undefined the menu item hides. */
  onShowRedesignPreview?: () => void;
  /** Open the WorkflowSidebar wireframes modal. Same Help &
   *  Resources home as the Redesign Preview above. When undefined
   *  the menu item hides. */
  onShowWireframes?: () => void;
  /** Open a case by id. Previously used by the in-header notifications
   *  bell; kept on the prop interface as a no-op pass-through for
   *  back-compat. The bell + dropdown moved to the M365 left rail in
   *  May 2026 (see LeftNavRail + NotificationsPage). */
  onOpenCase?: (caseId: string) => void;
}

export function AppHeader({
  userDisplayName = "Nicole Garcia",
  userEmail = "nicole.garcia@microsoft.com",
  onShowComponentDocs,
  onShowRedesignPreview,
  onShowWireframes,
  // onOpenCase retained for prop-shape stability; the in-header bell that
  // used to consume it has been removed.
  onOpenCase: _onOpenCase,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-[#edebe9] shadow-sm flex-shrink-0">
      <div className="flex items-center justify-between h-[64px] px-6">
        {/* Left Section: Logo and Title */}
        <div className="flex items-center gap-4">
          {/* Microsoft Logo */}
          <div className="flex items-center gap-3">
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Microsoft Logo"
            >
              <rect width="11" height="11" fill="#F25022"/>
              <rect x="13" width="11" height="11" fill="#7FBA00"/>
              <rect y="13" width="11" height="11" fill="#00A4EF"/>
              <rect x="13" y="13" width="11" height="11" fill="#FFB900"/>
            </svg>
            <div className="h-6 w-px bg-[#edebe9]" />
          </div>
          
          {/* Application Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#0078d4] to-[#106ebe] rounded flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-[#323130]">
                Data Access Request Suite
              </h1>
              <p className="text-[11px] text-[#605e5c]">
                Law Enforcement Response
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Actions and User */}
        <div className="flex items-center gap-2">
          {/* Help Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1]"
                aria-label="Help and documentation"
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-[60]">
              <DropdownMenuLabel>Help & Resources</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onShowComponentDocs && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={onShowComponentDocs}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Component Documentation
                </DropdownMenuItem>
              )}
              {onShowRedesignPreview && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={onShowRedesignPreview}
                >
                  <Figma className="w-4 h-4 mr-2" />
                  Redesign Preview
                </DropdownMenuItem>
              )}
              {onShowWireframes && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={onShowWireframes}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Wireframes
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="cursor-pointer">
                <FileText className="w-4 h-4 mr-2" />
                User Guide
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <HelpCircle className="w-4 h-4 mr-2" />
                Support
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications moved to the M365 left rail (LeftNavRail).
              See src/components/app-shell/NotificationsPage.tsx for the
              full-page surface that replaces the old in-header dropdown. */}

          {/* Settings */}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1]"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>

          <div className="h-6 w-px bg-[#edebe9] mx-2" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 px-3 hover:bg-[#f3f2f1] gap-2"
              >
                <div className="w-7 h-7 bg-gradient-to-br from-[#0078d4] to-[#106ebe] rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-[13px] font-medium text-[#323130]">
                    {userDisplayName}
                  </div>
                  <div className="text-[11px] text-[#605e5c]">
                    Case Specialist
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#605e5c]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 z-[60]">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold text-[#323130]">
                    {userDisplayName}
                  </div>
                  <div className="text-xs text-[#605e5c] font-normal">
                    {userEmail}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <HelpCircle className="w-4 h-4 mr-2" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-[#c50f1f]">
                <svg 
                  className="w-4 h-4 mr-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                  />
                </svg>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Optional: Environment Badge for non-production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <Badge variant="outline" className="text-[10px] bg-[#fef7e6] text-[#8a6d3b] border-[#f9a825] shadow-lg px-3 py-1.5">
            DEVELOPMENT ENVIRONMENT
          </Badge>
        </div>
      )}
    </header>
  );
}