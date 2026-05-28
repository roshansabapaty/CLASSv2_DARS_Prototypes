import React, { useMemo } from "react";
import { AccordionStepper, type StepperSection } from "./AccordionStepper";
import {
  FileText,
  ShieldCheck,
  Building,
  User,
  Bell,
  ClipboardList,
  FileSignature,
} from "lucide-react";
import { Badge } from "./ui/badge";

interface CaseSummaryAndTabsProps {
  /** Section 1: Case Overview content */
  caseOverviewContent: React.ReactNode;
  /** Section 2: Legal & Compliance content */
  legalComplianceContent: React.ReactNode;
  /** Section 3: Notification Workflow content */
  notificationWorkflowContent: React.ReactNode;
  /** Section 4: Sender Authority Details content */
  senderAuthorityDetailsContent: React.ReactNode;
  /** Section 5: Data Specification content */
  dataSpecificationContent: React.ReactNode;
  /** Section 6: Correspondence with Authority content (Phase 2 absorbs
   *  Phase 1's Forms & Letters as its Compose sub-experience).
   *  Optional — when omitted, the section is hidden. */
  correspondenceContent?: React.ReactNode;
  /** Section 7: Content below (Operational Case Review) */
  belowTabsContent?: React.ReactNode;
  /** Optional section toggle button rendered in the header */
  sectionToggleButton?: React.ReactNode;
  /** Set of section keys that are considered complete for progress indicators */
  completedSections?: Set<string>;
  /** Controlled mode: externally managed active step key */
  activeStepKey?: string;
  /** Controlled mode: callback when active step changes */
  onActiveStepKeyChange?: (key: string) => void;
  /** Multi-expand mode */
  multiExpand?: boolean;
  /** Controlled set of expanded keys (multi-expand mode) */
  expandedKeys?: Set<string>;
  /** Callback when expanded keys change */
  onExpandedKeysChange?: (keys: Set<string>) => void;
}

/**
 * CaseSummaryAndTabs Component
 *
 * Vertical accordion stepper layout — only one section is expanded at a time.
 * Each section has Continue / Back navigation and a top progress rail
 * with completion checkmarks.
 */
export function CaseSummaryAndTabs({
  caseOverviewContent,
  legalComplianceContent,
  notificationWorkflowContent,
  senderAuthorityDetailsContent,
  dataSpecificationContent,
  correspondenceContent,
  belowTabsContent,
  sectionToggleButton,
  completedSections = new Set(),
  activeStepKey,
  onActiveStepKeyChange,
  multiExpand,
  expandedKeys,
  onExpandedKeysChange,
}: CaseSummaryAndTabsProps) {
  /** Build the collapsedSummary for one section: passive "Complete" badge
   *  when filled, else nothing. Same rendering on Triage, Review Case,
   *  and Collection — sections light up green from the data-driven
   *  `completedSections` set, no per-section confirmation step. */
  const buildSectionStatus = (key: string): React.ReactNode => {
    const isDone = completedSections.has(key);
    return isDone ? (
      <Badge variant="outline" className="text-[10px] bg-[#dff6dd] text-[#107c10] border-[#107c10]">
        Complete
      </Badge>
    ) : undefined;
  };

  const sections: StepperSection[] = useMemo(() => {
    const list: StepperSection[] = [
      { key: "overview", label: "Case Overview", icon: FileText, content: caseOverviewContent, collapsedSummary: buildSectionStatus("overview"), footerAction: buildSectionStatus("overview") },
      { key: "legal", label: "Legal & Compliance", icon: ShieldCheck, content: legalComplianceContent, collapsedSummary: buildSectionStatus("legal"), footerAction: buildSectionStatus("legal") },
      { key: "agency", label: "Law Enforcement Details", icon: Building, content: senderAuthorityDetailsContent, collapsedSummary: buildSectionStatus("agency"), footerAction: buildSectionStatus("agency") },
      { key: "data", label: "Identifier & Data Services", icon: User, content: dataSpecificationContent, collapsedSummary: buildSectionStatus("data"), footerAction: buildSectionStatus("data") },
      { key: "notification", label: "Non-Disclosure & Notifications", icon: Bell, content: notificationWorkflowContent, collapsedSummary: buildSectionStatus("notification"), footerAction: buildSectionStatus("notification") },
    ];

    if (correspondenceContent) {
      list.push({ key: "correspondence", label: "Correspondence with Authority", icon: FileSignature, content: correspondenceContent, collapsedSummary: buildSectionStatus("correspondence"), footerAction: buildSectionStatus("correspondence") });
    }

    if (belowTabsContent) {
      list.push({ key: "review", label: "Operational Case Review", icon: ClipboardList, content: belowTabsContent, collapsedSummary: buildSectionStatus("review"), footerAction: buildSectionStatus("review") });
    }

    return list;
  }, [
    caseOverviewContent,
    legalComplianceContent,
    senderAuthorityDetailsContent,
    dataSpecificationContent,
    notificationWorkflowContent,
    correspondenceContent,
    belowTabsContent,
    completedSections,
  ]);

  return (
    <AccordionStepper
      sections={sections}
      completedSections={completedSections}
      sectionToggleButton={sectionToggleButton}
      activeKey={activeStepKey}
      onActiveKeyChange={onActiveStepKeyChange}
      multiExpand={multiExpand}
      expandedKeys={expandedKeys}
      onExpandedKeysChange={onExpandedKeysChange}
    />
  );
}