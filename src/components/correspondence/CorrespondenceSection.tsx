/**
 * CorrespondenceSection — accordion-section content for the case page.
 *
 * Compact tabbed summary of the latest few inbound/outbound items + a
 * Compose entry point. The "Open Hub" CTA hands off to the parent-owned
 * <CorrespondencePanel> side panel for deep work. The Compose tab still
 * wraps the Phase 1 forms-library surface (FormsLibrarySection) so all
 * existing template-authoring flows keep working unchanged.
 *
 * Replaces the standalone "Forms & Letters" accordion section per Phase 1
 * delta — Forms & Letters is now the Compose sub-experience here.
 */

import * as React from "react";
import {
  Body1,
  Body1Strong,
  Button,
  Caption1,
  Caption2,
  Subtitle2,
  Tab,
  TabList,
  makeStyles,
  tokens,
  type SelectTabData,
  type SelectTabEvent,
  type TabValue,
} from "@fluentui/react-components";
import {
  ArrowExpandRegular,
  Mail24Regular,
  Send24Regular,
} from "@fluentui/react-icons";
import {
  inboundItems,
  outboundItems,
  unreadInboxCount,
} from "./correspondenceEngine";
// "Open Hub" CTA delegates to the parent-owned CorrespondencePanel side panel.
import { FormsLibrarySection } from "../forms-library/FormsLibrarySection";
import type { CorrespondenceItem } from "../../types/correspondence";
import type { FormData as CaseFormData } from "../../types/caseTypes";
import type { CaseFormInstance } from "../../types/formTemplate";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalM,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    columnGap: tokens.spacingHorizontalM,
  },
  headerCopy: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXXS,
    flex: "1 1 auto",
    minWidth: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    columnGap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: "pointer",
    ":hover": {
      borderTopColor: tokens.colorBrandStroke2,
      borderRightColor: tokens.colorBrandStroke2,
      borderBottomColor: tokens.colorBrandStroke2,
      borderLeftColor: tokens.colorBrandStroke2,
    },
  },
  rowIcon: {
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
  },
  rowMain: {
    flex: "1 1 auto",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXXS,
  },
  truncate: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  metaLine: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3,
  },
  empty: {
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    color: tokens.colorNeutralForeground3,
  },
  unreadDot: {
    display: "inline-block",
    width: "8px",
    height: "8px",
    borderTopLeftRadius: "50%",
    borderTopRightRadius: "50%",
    borderBottomLeftRadius: "50%",
    borderBottomRightRadius: "50%",
    backgroundColor: tokens.colorBrandBackground,
    marginRight: tokens.spacingHorizontalXS,
  },
});

const SUMMARY_LIMIT = 5;

export interface CorrespondenceSectionProps {
  formData: CaseFormData;
  /** Inbound mutators threaded from DataEntryForm. */
  onMarkInboundRead: (itemId: string) => void;
  onClearInboundFollowUp?: (itemId: string) => void;
  /** Phase 1 form-instance mutators (compose tab still drives these). */
  onCreateFormInstance: (instance: CaseFormInstance) => void;
  onUpdateFormInstance: (
    instanceId: string,
    partial: Partial<CaseFormInstance>,
  ) => void;
  onDeleteFormInstance: (instanceId: string) => void;
  /** Slice D: send a signed form to the authority — creates an outbound
   *  item linked to the form instance + flips status to "Sent". */
  onSendSignedFormInstance?: (instance: CaseFormInstance) => void;
  /** Slice D: outbound transmission mutator passed through to the Hub. */
  onTransitionOutbound?: (
    itemId: string,
    next: import("../../types/correspondence").OutboundTransmissionStatus,
    audit?: Partial<import("../../types/correspondence").OutboundCorrespondenceItem["transmission"]>,
  ) => void;
  /** Slice D: free-text composer send handler passed through to the Hub. */
  onSendOutbound?: (
    item: import("../../types/correspondence").OutboundCorrespondenceItem,
  ) => void;
  /** Slice D: parent-owned pick-template handler. When the RS picks a
   *  template in the Hub's Compose tab, the parent creates the instance
   *  and surfaces the new id via `openInstanceRequestId` so the inline
   *  FormsLibrarySection opens the filler. */
  onPickTemplate?: (template: import("../../types/formTemplate").FormTemplate) => void;
  /** Slice D: one-shot request id to open a specific form instance in the
   *  Compose tab's inline FormsLibrarySection. */
  openInstanceRequestId?: string | null;
  /** Clears the parent-held request after it has been consumed here. */
  onConsumeOpenInstanceRequest?: () => void;
  /** Open the parent-controlled chat-thread side panel. Replaces the
   *  previous local-hub dialog mount. */
  onOpenPanel: () => void;
}

function formatRelativeAge(d: Date | string): string {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  const days = Math.floor(ms / 86_400_000);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function CorrespondenceSection({
  formData,
  onMarkInboundRead,
  onClearInboundFollowUp,
  onCreateFormInstance,
  onUpdateFormInstance,
  onDeleteFormInstance,
  onSendSignedFormInstance,
  onTransitionOutbound,
  onSendOutbound,
  onPickTemplate,
  openInstanceRequestId,
  onConsumeOpenInstanceRequest,
  onOpenPanel,
}: CorrespondenceSectionProps) {
  const styles = useStyles();
  const [tab, setTab] = React.useState<TabValue>("inbox");

  // When the parent surfaces a request to open a specific instance in the
  // Compose tab, switch the inline tab so FormsLibrarySection is mounted
  // and can pick up the request. Cleanup happens once consumed downstream.
  React.useEffect(() => {
    if (openInstanceRequestId) {
      setTab("compose");
    }
  }, [openInstanceRequestId]);

  const items = formData.correspondence;
  const inbound = React.useMemo(() => inboundItems(items), [items]);
  const outbound = React.useMemo(() => outboundItems(items), [items]);
  const unread = React.useMemo(() => unreadInboxCount(items), [items]);

  const onTabSelect = (_e: SelectTabEvent, data: SelectTabData) => {
    setTab(data.value);
  };

  const openHub = (
    _target?: "inbox" | "outbox" | "compose",
    _inboundId?: string,
  ) => {
    // Legacy callers still pass a target tab / inbound id — those args
    // are obsolete now that the side panel auto-selects the most-recent
    // thread. Drop them but keep the function signature stable.
    onOpenPanel();
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <Subtitle2>Correspondence with Authority</Subtitle2>
          <Caption1>
            Receive and send formal communications with the issuing or
            enforcing authority for this case. Open the Hub for the full
            workspace.
          </Caption1>
        </div>
        <Button
          appearance="primary"
          icon={<ArrowExpandRegular />}
          onClick={() => openHub("inbox")}
        >
          Open Hub
        </Button>
      </div>

      <TabList selectedValue={tab} onTabSelect={onTabSelect}>
        <Tab value="inbox">
          Inbox ({inbound.length})
          {unread > 0 ? ` · ${unread} unread` : ""}
        </Tab>
        <Tab value="outbox">Outbox ({outbound.length})</Tab>
        <Tab value="compose">Compose</Tab>
      </TabList>

      {tab === "inbox" && (
        <InboxSummary
          items={inbound}
          onSelect={(id) => openHub("inbox", id)}
          onOpenHub={() => openHub("inbox")}
          styles={styles}
        />
      )}

      {tab === "outbox" && (
        <OutboxSummary
          items={outbound}
          onOpenHub={() => openHub("outbox")}
          styles={styles}
        />
      )}

      {tab === "compose" && (
        <FormsLibrarySection
          formData={formData}
          onCreateInstance={onCreateFormInstance}
          onUpdateInstance={onUpdateFormInstance}
          onDeleteInstance={onDeleteFormInstance}
          onSendSignedInstance={onSendSignedFormInstance}
          openInstanceId={openInstanceRequestId ?? null}
          onConsumeOpenInstanceRequest={onConsumeOpenInstanceRequest}
        />
      )}

      {/* Hub now lives at the parent level as <CorrespondencePanel> —
          the section just exposes its entry button via openHub(). */}
    </div>
  );
}

// ── Inbox tab summary (top SUMMARY_LIMIT) ───────────────────────────────

interface InboxSummaryProps {
  items: ReturnType<typeof inboundItems>;
  onSelect: (id: string) => void;
  onOpenHub: () => void;
  styles: ReturnType<typeof useStyles>;
}

function InboxSummary({ items, onSelect, onOpenHub, styles }: InboxSummaryProps) {
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <Body1>
          No inbound correspondence yet. Items from the issuing or enforcing
          authority will appear here.
        </Body1>
      </div>
    );
  }

  const top = items.slice(0, SUMMARY_LIMIT);

  return (
    <div className={styles.list}>
      {top.map((item) => (
        <div
          key={item.id}
          role="button"
          tabIndex={0}
          className={styles.row}
          onClick={() => onSelect(item.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(item.id);
            }
          }}
        >
          <Mail24Regular className={styles.rowIcon} />
          <div className={styles.rowMain}>
            <Body1Strong className={styles.truncate}>
              {!item.readAt && (
                <span className={styles.unreadDot} aria-label="Unread" />
              )}
              {item.subject}
            </Body1Strong>
            <div className={styles.metaLine}>
              <Caption2>
                {item.counterparty === "IssuingAuthority"
                  ? "Issuing Authority"
                  : "Enforcing Authority"}
              </Caption2>
              <Caption2>·</Caption2>
              <Caption2>{item.kind}</Caption2>
              <Caption2>·</Caption2>
              <Caption2>{formatRelativeAge(item.createdAt)}</Caption2>
            </div>
          </div>
        </div>
      ))}
      {items.length > SUMMARY_LIMIT && (
        <Button appearance="subtle" onClick={onOpenHub}>
          View all {items.length} in Hub
        </Button>
      )}
    </div>
  );
}

// ── Outbox tab summary (top SUMMARY_LIMIT) ──────────────────────────────

interface OutboxSummaryProps {
  items: ReturnType<typeof outboundItems>;
  onOpenHub: () => void;
  styles: ReturnType<typeof useStyles>;
}

function OutboxSummary({ items, onOpenHub, styles }: OutboxSummaryProps) {
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <Body1>
          No outbound correspondence yet. Send a signed form or free-text
          letter from the Compose tab to populate this list.
        </Body1>
      </div>
    );
  }

  const top = items.slice(0, SUMMARY_LIMIT);

  return (
    <div className={styles.list}>
      {top.map((item) => (
        <div key={item.id} className={styles.row}>
          <Send24Regular className={styles.rowIcon} />
          <div className={styles.rowMain}>
            <Body1Strong className={styles.truncate}>{item.subject}</Body1Strong>
            <div className={styles.metaLine}>
              <Caption2>
                {item.counterparty === "IssuingAuthority"
                  ? "Issuing Authority"
                  : "Enforcing Authority"}
              </Caption2>
              <Caption2>·</Caption2>
              <Caption2>{item.transmission.status}</Caption2>
              <Caption2>·</Caption2>
              <Caption2>{formatRelativeAge(item.createdAt)}</Caption2>
            </div>
          </div>
        </div>
      ))}
      {items.length > SUMMARY_LIMIT && (
        <Button appearance="subtle" onClick={onOpenHub}>
          View all {items.length} in Hub
        </Button>
      )}
    </div>
  );
}
