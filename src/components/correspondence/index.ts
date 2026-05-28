/**
 * Public surface of the correspondence module.
 *
 * The case page mounts `<CorrespondenceBanner>` above the case body (it
 * morphs between idle "Correspondence Hub" info and unread-aware
 * "N unread messages" warning in the same row — see the banner file for
 * details) and the `<CorrespondencePanel>` side panel at the case-page
 * root. The banner's "Open Hub" action flips the panel open; everything
 * else is orchestrated inside the panel.
 */

export { CorrespondenceSection } from "./CorrespondenceSection";
export type { CorrespondenceSectionProps } from "./CorrespondenceSection";

export { CorrespondenceBanner } from "./CorrespondenceBanner";
export type { CorrespondenceBannerProps } from "./CorrespondenceBanner";

export { CorrespondencePanel } from "./CorrespondencePanel";
export type { CorrespondencePanelProps } from "./CorrespondencePanel";

export { CorrespondenceThreads } from "./CorrespondenceThreads";
export { CorrespondenceThreadTabs } from "./CorrespondenceThreadTabs";
export { CorrespondenceMessageBubble } from "./CorrespondenceMessageBubble";
export { CorrespondenceComposer } from "./CorrespondenceComposer";

export { TransmissionStatusBadge } from "./TransmissionStatusBadge";
export { TransmissionStepper } from "./TransmissionStepper";
export { FreeTextComposer } from "./FreeTextComposer";
export { DemoControlsPanel } from "./DemoControlsPanel";

export {
  unreadInboxCount,
  pendingOutboxCount,
  awaitingAuthorityReplyOutbounds,
  heldForAttorneyOutbounds,
  inboundItems,
  outboundItems,
  getThread,
  groupByThread,
  groupCorrespondenceIntoThreads,
  linkInbound,
  transitionOutbound,
  resolveDocumentId,
} from "./correspondenceEngine";
export type { CorrespondenceThreadGroup } from "./correspondenceEngine";
