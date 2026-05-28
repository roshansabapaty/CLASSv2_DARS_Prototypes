import React, { useState, useEffect, useCallback } from "react";
import { CaseQueue } from "./components/CaseQueue";
import {
  DataEntryForm,
  FormData,
} from "./components/DataEntryForm";
import { CollectionTracker } from "./components/CollectionTracker";
import { CollectionSidebarNav } from "./components/CollectionSidebarNav";
import { WorkflowSidebar } from "./components/WorkflowSidebar";
import { AppHeader } from "./components/AppHeader";
import { ComponentDocumentation } from "./components/ComponentDocumentation";
import { Toaster } from "./components/ui/sonner";
import { SkipLinks } from "./components/SkipLinks";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import {
  AriaLiveRegion,
  useAnnouncer,
} from "./components/AriaLiveRegion";
import { StatusAnnouncer } from "./components/StatusAnnouncer";
import { TooltipProvider } from "./components/ui/tooltip";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { cn } from "./components/ui/utils";
import { CASE_DATA_BUILDERS } from "./utils/caseDataRegistry";
import { buildFormDataFromQueueItem } from "./utils/mockCaseDataFactory";
import { MOCK_CASES } from "./components/case-queue/case-queue-types";
import type { SidebarNavState } from "./types/sidebarNav";
import { useOutboundAutoSim } from "./hooks/useOutboundAutoSim";
import { useCorrespondenceNotifications } from "./hooks/useCorrespondenceNotifications";
import { CURRENT_USER } from "./constants/caseConstants";
import { FF_STAGE_TAB_BAR } from "./constants/featureFlags";
import { DemoControlsPanel } from "./components/correspondence/DemoControlsPanel";
import {
  LeftNavRail,
  type ActiveApp,
} from "./components/app-shell/LeftNavRail";
import { AttorneyDashboard } from "./components/app-shell/AttorneyDashboard";
import { AttorneyReviewWorkspace } from "./components/attorney-escalation/AttorneyReviewWorkspace";
import { NotificationsPage } from "./components/app-shell/NotificationsPage";

const ACTIVE_APP_STORAGE_KEY = "dars.activeApp";

function isActiveApp(v: unknown): v is ActiveApp {
  return (
    v === "queue" ||
    v === "attorneyDashboard" ||
    v === "attorneyCaseView" ||
    v === "notifications"
  );
}

// Suppress React warnings about Figma inspector props (_fgT, _fgS, _fgB)
// These are injected by Figma's FGCmp wrapper at every level of the component tree
// and cannot be intercepted at the component level for native DOM elements.
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("React does not recognize the") &&
    typeof args[1] === "string" &&
    args[1].startsWith("_fg")
  ) {
    return;
  }
  originalConsoleError(...args);
};

export default function App() {
  // Phase 2 Slice D: drive the outbound transmission cascade
  // (Sent → Delivered ≈ 10s → Acknowledged ≈ 20s) at App-level so it runs
  // regardless of which case is open. Demo Controls (DEV only) can toggle
  // it off or fire events on demand.
  useOutboundAutoSim();

  const [selectedCaseId, setSelectedCaseId] = useState<
    string | null
  >(null);
  const [showWireframes, setShowWireframes] = useState(false);
  const [workflowStage, setWorkflowStage] = useState<
    "triage" | "fulfillment" | "collection"
  >("triage");
  const [sharedFormData, setSharedFormData] =
    useState<FormData | null>(null);
  const [
    isEditingCollectionScope,
    setIsEditingCollectionScope,
  ] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] =
    useState(false);
  // 3B (UX-Polish): the workflow sidebar's collapse-to-icons toggle was
  // retired. The rail is now fixed at 256px when FF_STAGE_TAB_BAR is off,
  // and hidden entirely when the flag is on. We retain the local boolean
  // (constant `false`) so existing prop names (`sidebarCollapsed`) keep
  // their meaning without rewiring every consumer.
  const sidebarCollapsed = false;
  const [showComponentDocs, setShowComponentDocs] =
    useState(false);
  // Design-direction preview modal, opened from Help & Resources in
  // the app header. State lives here so the menu can fire from any
  // route, not just the Case Queue page. (`showWireframes` already
  // declared above for the same purpose.)
  const [showRedesignPreview, setShowRedesignPreview] = useState(false);
  const { announcement, announce } = useAnnouncer();
  // Track whether CollectionTracker has been mounted (to preserve its state)
  const [hasVisitedCollection, setHasVisitedCollection] =
    useState(false);

  // ── M365 Left Nav Rail — active hero app ───────────────────────────────
  // Persisted to localStorage so reloads land back on the user's last app.
  // Independent of selectedCaseId / workflowStage so switching apps doesn't
  // lose case context.
  const [activeApp, setActiveAppState] = useState<ActiveApp>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_APP_STORAGE_KEY);
      if (isActiveApp(stored)) return stored;
    } catch {
      /* noop */
    }
    return "queue";
  });
  const setActiveApp = useCallback((next: ActiveApp) => {
    setActiveAppState(next);
    try {
      localStorage.setItem(ACTIVE_APP_STORAGE_KEY, next);
    } catch {
      /* noop */
    }
  }, []);

  // Cross-case correspondence notifications — drives the rail's bell badge
  // AND the NotificationsPage list. Scoped to the current user's queue so
  // the count only reflects cases assigned to them.
  const notifications = useCorrespondenceNotifications({
    assigneeName: CURRENT_USER,
    recentLimit: 50,
  });

  // Track stage completion
  const [stageCompletion, setStageCompletion] = useState({
    triage: false,
    fulfillment: false,
    collection: false,
  });

  // ── Dynamic sidebar nav state (from active page's stepper) ──
  const [sidebarNavState, setSidebarNavState] = useState<SidebarNavState | null>(null);
  const [requestedStepKey, setRequestedStepKey] = useState<string | null>(null);

  // ── Collection page readiness filter (lifted for sidebar nav) ──
  const [collectionReadinessFilter, setCollectionReadinessFilter] = useState<'all' | 'needs-action' | 'by-identifier' | 'complete'>('by-identifier');

  const handleSidebarStepClick = useCallback((key: string) => {
    setRequestedStepKey(key);
    // Reset after a tick so repeated clicks on the same step still fire
    requestAnimationFrame(() => setRequestedStepKey(null));
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show keyboard shortcuts with ?
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if user is typing in an input
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA"
        )
          return;
        e.preventDefault();
        setShowKeyboardShortcuts(true);
        announce("Keyboard shortcuts dialog opened");
      }

      // Navigation shortcuts with 'g' key
      if (
        e.key === "g" &&
        !e.ctrlKey &&
        !e.metaKey &&
        selectedCaseId
      ) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA"
        )
          return;

        // Set up listener for next key
        const handleNextKey = (nextE: KeyboardEvent) => {
          // Note: g+q is intentionally omitted here because
          // queue navigation requires an unsaved-changes guard
          // that lives in DataEntryForm. Use Escape key instead,
          // which routes through DataEntryForm's guardedNavigate.
          if (
            nextE.key === "t" &&
            stageCompletion.triage
          ) {
            e.preventDefault();
            handleNavigateToTriage();
            announce("Navigated to triage stage");
          } else if (
            nextE.key === "f" &&
            stageCompletion.fulfillment
          ) {
            e.preventDefault();
            handleNavigateToFulfillment();
            announce("Navigated to fulfillment stage");
          } else if (
            nextE.key === "c" &&
            stageCompletion.collection
          ) {
            e.preventDefault();
            handleNavigateToCollection();
            announce("Navigated to collection stage");
          }
          window.removeEventListener("keydown", handleNextKey);
        };

        window.addEventListener("keydown", handleNextKey);
        setTimeout(() => {
          window.removeEventListener("keydown", handleNextKey);
        }, 2000);
      }

      // Prevent Ctrl+S from saving page (DataEntryForm handles its own Ctrl+S save)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCaseId, stageCompletion]);

  const handleCaseSelect = (
    caseId: string,
    initialWorkflowStage?:
      | "triage"
      | "fulfillment"
      | "collection",
  ) => {
    setSelectedCaseId(caseId);
    setWorkflowStage(initialWorkflowStage || "triage");
    setIsEditingCollectionScope(false);
    // (3B) Sidebar no longer collapses — the toggle was retired and the
    // rail is fixed at 256px when FF_STAGE_TAB_BAR is off, hidden when
    // it's on. Nothing to flip here on case open.

    // Generate stage-appropriate mock form data from queue item.
    // Detailed pre-built data for the demo cases is looked up via the
    // central registry; all other queue items fall through to the
    // generic factory.
    const queueItem = MOCK_CASES.find(c => c.caseId === caseId);
    if (queueItem) {
      const builder = CASE_DATA_BUILDERS[caseId];
      setSharedFormData(builder ? builder() : buildFormDataFromQueueItem(queueItem));
    }

    // Set appropriate stage completion based on where we're opening
    if (initialWorkflowStage === "collection") {
      setStageCompletion({
        triage: true,
        fulfillment: true,
        collection: false,
      });
      setHasVisitedCollection(true);
    } else if (initialWorkflowStage === "fulfillment") {
      setStageCompletion({
        triage: true,
        fulfillment: false,
        collection: false,
      });
    } else {
      setStageCompletion({
        triage: false,
        fulfillment: false,
        collection: false,
      });
    }
  };

  const handleNavigateToQueue = () => {
    setSelectedCaseId(null);
    setWorkflowStage("triage");
    setSharedFormData(null);
    setIsEditingCollectionScope(false);
    setHasVisitedCollection(false);
    setStageCompletion({
      triage: false,
      fulfillment: false,
      collection: false,
    });
  };

  const handleNavigateToTriage = () => {
    setWorkflowStage("triage");
    setIsEditingCollectionScope(false);
    // When coming back from collection, pop Case Overview so banners
    // (GFR, Enterprise, RFI, Attorney) are immediately visible.
    if (workflowStage === "collection") {
      handleSidebarStepClick("overview");
    }
  };

  const handleNavigateToFulfillment = () => {
    // Workflow-rail navigation = "view the case at this stage". Edit-mode
    // entry is a SEPARATE intent — see `handleEditFulfillmentScope`. Prior
    // behaviour conflated the two, which meant clicking Fulfillment from
    // Collection dropped the RS into the wizard edit chrome and buried
    // the banner stack.
    setIsEditingCollectionScope(false);
    setWorkflowStage("fulfillment");
    setStageCompletion((prev) => ({ ...prev, triage: true }));
    if (workflowStage === "collection") {
      // Pop Case Overview so banners (GFR + RFI + Attorney …) are
      // immediately visible after coming back from collection.
      handleSidebarStepClick("overview");
    }
  };

  /** Explicit "edit collection scope" entry — the wizard edit flow. Wired
   *  to the "Edit Fulfillment Plan" button on CollectionTracker, NOT to
   *  the workflow rail. Lands on the Identifier & Data Services step
   *  where the editable scope lives. */
  const handleEditFulfillmentScope = () => {
    setIsEditingCollectionScope(true);
    setWorkflowStage("fulfillment");
    handleSidebarStepClick("data");
  };

  const handleNavigateToCollection = () => {
    setWorkflowStage("collection");
    setIsEditingCollectionScope(false);
    setStageCompletion((prev) => ({
      ...prev,
      fulfillment: true,
    }));
    setHasVisitedCollection(true);
  };

  const handleNavigateToReadySubmit = () => {
    setWorkflowStage("collection");
    setIsEditingCollectionScope(false);
    setStageCompletion((prev) => ({
      ...prev,
      fulfillment: true,
    }));
    setHasVisitedCollection(true);
  };

  if (!selectedCaseId) {
    return (
      // NOTE: do NOT pass className to FluentProvider — Fluent's portal mirror
      // would clone it and overlay the page (whiteout regression from session 6).
      // `style={{ height: "100%" }}` is safe because Fluent's portal mirror only
      // clones className; without it, the App's h-full chain collapses to 0
      // because FluentProvider's wrapping div has no defined height.
      <FluentProvider theme={webLightTheme} style={{ height: "100%" }}>
        <TooltipProvider>
          <StatusAnnouncer>
          {/* Microsoft Teams / Outlook shell:
              ┌────────────────────────────────────────┐
              │ AppHeader (full width, edge-to-edge)  │
              ├────┬───────────────────────────────────┤
              │ R  │ Body                              │
              └────┴───────────────────────────────────┘
              Outer is flex-col; the rail sits below the header in an
              inner flex-row. */}
          <div className="flex flex-col h-full overflow-hidden bg-[#faf9f8]">
            <SkipLinks />
            <Toaster position="top-right" />
            <AppHeader
              onShowComponentDocs={() => setShowComponentDocs(true)}
              onShowRedesignPreview={() => setShowRedesignPreview(true)}
              onShowWireframes={() => setShowWireframes(true)}
              onOpenCase={(caseId) => handleCaseSelect(caseId)}
            />
            <div className="flex flex-row flex-1 overflow-hidden">
              <LeftNavRail
                activeApp={activeApp}
                onChangeApp={setActiveApp}
                unreadCount={notifications.totalUnread}
              />
              <main id="main-content" className="flex-1 overflow-auto">
                {showComponentDocs ? (
                  <ComponentDocumentation
                    onClose={() => setShowComponentDocs(false)}
                  />
                ) : activeApp === "attorneyDashboard" ? (
                  <AttorneyDashboard
                    onOpenCase={(caseId) => {
                      // "Open case to take action" routes to the focused
                      // attorney review workspace, not the RS case form.
                      // The workspace's "Open in DARS Request View" button
                      // jumps to the RS form when the attorney wants the
                      // full workflow surface.
                      handleCaseSelect(caseId);
                      setActiveApp("attorneyCaseView");
                    }}
                  />
                ) : activeApp === "attorneyCaseView" ? (
                  <AttorneyReviewWorkspace
                    caseId={selectedCaseId ?? ""}
                    onBackToDashboard={() => setActiveApp("attorneyDashboard")}
                    onOpenDarsRequestView={() => setActiveApp("queue")}
                  />
                ) : activeApp === "notifications" ? (
                  <NotificationsPage
                    notifications={notifications}
                    onOpenCase={(caseId) => {
                      setActiveApp("queue");
                      handleCaseSelect(caseId);
                    }}
                  />
                ) : (
                  <CaseQueue onCaseSelect={handleCaseSelect} />
                )}
              </main>
            </div>
            <KeyboardShortcutsModal
              isOpen={showKeyboardShortcuts}
              onClose={() => setShowKeyboardShortcuts(false)}
            />
            <AriaLiveRegion message={announcement} />
            {/* Slice D: dev-only Demo Controls. Visible from the queue
                too so PMs can pre-seed inbound/outbound state. */}
            {import.meta.env.DEV && <DemoControlsPanel />}
          </div>
          </StatusAnnouncer>
        </TooltipProvider>
      </FluentProvider>
    );
  }

  return (
    // NOTE: do NOT pass className to FluentProvider — see whiteout note above.
    <FluentProvider theme={webLightTheme} style={{ height: "100%" }}>
      <TooltipProvider>
        <StatusAnnouncer>
        {/* Teams / Outlook shell — same as the no-case path:
            full-width AppHeader on top, then a flex-row with the
            LeftNavRail and the body. */}
        <div className="flex flex-col h-full overflow-hidden bg-[#faf9f8]">
          <SkipLinks />
          <Toaster position="top-right" />
          <AppHeader />

          <div className="flex flex-row flex-1 overflow-hidden">
            <LeftNavRail
              activeApp={activeApp}
              onChangeApp={setActiveApp}
              unreadCount={notifications.totalUnread}
            />
            <div className="flex-1 flex flex-col overflow-hidden">

        {/* Hero-app body switch. When the user has navigated to Attorney
            Dashboard or Notifications, swap the entire case-form area for
            that page. `selectedCaseId` is preserved so returning to the
            Cases app restores the open case. */}
        {activeApp === "attorneyDashboard" ? (
          <main id="main-content" className="flex-1 overflow-auto">
            <AttorneyDashboard
              onOpenCase={(caseId) => {
                handleCaseSelect(caseId);
                setActiveApp("attorneyCaseView");
              }}
            />
          </main>
        ) : activeApp === "attorneyCaseView" ? (
          <main id="main-content" className="flex-1 overflow-hidden">
            <AttorneyReviewWorkspace
              caseId={selectedCaseId}
              onBackToDashboard={() => setActiveApp("attorneyDashboard")}
              onOpenDarsRequestView={() => setActiveApp("queue")}
            />
          </main>
        ) : activeApp === "notifications" ? (
          <main id="main-content" className="flex-1 overflow-auto">
            <NotificationsPage
              notifications={notifications}
              onOpenCase={(caseId) => {
                setActiveApp("queue");
                handleCaseSelect(caseId);
              }}
            />
          </main>
        ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Rail Navigation — Phase 4 (FF_STAGE_TAB_BAR): when the
              horizontal StageTabBar replaces this sidebar, the entire
              <nav> is omitted so the case body owns the full content
              width. The StageTabBar mounts inside StickyCaseHeader
              instead. */}
          {!FF_STAGE_TAB_BAR && (
            <nav
              id="navigation"
              aria-label="Workflow stages"
              className="flex-shrink-0 h-full z-10 w-64"
            >
              <WorkflowSidebar
                workflowStage={workflowStage}
                stageCompletion={stageCompletion}
                onNavigateToQueue={handleNavigateToQueue}
                onNavigateToTriage={
                  stageCompletion.triage
                    ? handleNavigateToTriage
                    : undefined
                }
                onNavigateToFulfillment={
                  stageCompletion.fulfillment
                    ? handleNavigateToFulfillment
                    : undefined
                }
                onNavigateToCollection={
                  stageCompletion.collection
                    ? handleNavigateToCollection
                    : undefined
                }
                navState={sidebarNavState}
                onStepClick={handleSidebarStepClick}
              />
            </nav>
          )}

          {/* Main Content Area */}
          <main
            id="main-content"
            className="flex-1 h-full overflow-hidden"
          >
            <div className="h-full">
              {/* 
                State Preservation Pattern: Components are kept mounted but hidden
                via CSS display:none instead of conditional rendering. This preserves
                all internal state (scroll position, expanded sections, form inputs,
                UI selections) when navigating between workflow stages.
                - DataEntryForm: single instance handles both triage & fulfillment
                - CollectionTracker: mounted once visited, hidden when inactive
              */}

              {/* DataEntryForm — single instance for triage & fulfillment stages */}
              <div
                className="h-full"
                style={{ display: workflowStage !== "collection" ? undefined : "none" }}
              >
                <DataEntryForm
                  workflowStage={workflowStage === "collection" ? "fulfillment" : workflowStage}
                  onNavigateToFulfillment={handleNavigateToFulfillment}
                  onNavigateToTriage={handleNavigateToTriage}
                  onNavigateToCollection={handleNavigateToCollection}
                  onNavigateToReadySubmit={handleNavigateToReadySubmit}
                  onNavigateToQueue={handleNavigateToQueue}
                  sharedFormData={sharedFormData}
                  setSharedFormData={setSharedFormData}
                  selectedCaseId={selectedCaseId}
                  isEditingCollectionScope={isEditingCollectionScope}
                  sidebarCollapsed={sidebarCollapsed}
                  announce={announce}
                  onStepperStateChange={setSidebarNavState}
                  requestedStepKey={requestedStepKey}
                  stageCompletion={stageCompletion}
                  stageBarNavState={sidebarNavState}
                  onStageBarStepClick={handleSidebarStepClick}
                />
              </div>

              {/* CollectionTracker — mounted once visited, hidden when not active */}
              {hasVisitedCollection && (
                <div
                  className="h-full"
                  style={{ display: workflowStage === "collection" ? undefined : "none" }}
                >
                  <CollectionSidebarNav
                    readinessFilter={collectionReadinessFilter}
                    onReadinessFilterChange={setCollectionReadinessFilter}
                    onStepperStateChange={workflowStage === "collection" ? setSidebarNavState : undefined}
                    requestedStepKey={workflowStage === "collection" ? requestedStepKey : null}
                  >
                    <CollectionTracker
                      workflowStage="collection"
                      onNavigateToFulfillment={handleNavigateToFulfillment}
                      onEditFulfillmentScope={handleEditFulfillmentScope}
                      onNavigateToTriage={handleNavigateToTriage}
                      onNavigateToQueue={handleNavigateToQueue}
                      sharedFormData={sharedFormData}
                      setSharedFormData={setSharedFormData}
                      readinessFilter={collectionReadinessFilter}
                      onReadinessFilterChange={setCollectionReadinessFilter}
                      stageCompletion={stageCompletion}
                      stageBarNavState={sidebarNavState}
                      onStageBarStepClick={handleSidebarStepClick}
                    />
                  </CollectionSidebarNav>
                </div>
              )}
            </div>
          </main>
        </div>
        )}

            </div>{/* close inner flex-1 flex-col (body column) */}
          </div>{/* close inner flex-row (rail + body) */}

          {/* Keyboard Shortcuts Modal */}
          <KeyboardShortcutsModal
            isOpen={showKeyboardShortcuts}
            onClose={() => setShowKeyboardShortcuts(false)}
          />

          {/* Aria Live Region */}
          <AriaLiveRegion message={announcement} />
          {/* Slice D: dev-only Demo Controls. Stays mounted while a
              case is open so PMs can fire inbound events mid-demo. */}
          {import.meta.env.DEV && <DemoControlsPanel />}
        </div>{/* close outer flex-col shell */}
        </StatusAnnouncer>
      </TooltipProvider>
    </FluentProvider>
  );
}