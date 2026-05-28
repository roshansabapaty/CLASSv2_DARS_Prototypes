/**
 * NotificationsPage — full-page version of the AppHeader bell dropdown.
 *
 * Renders the cross-case unread inbound items the RS / TS still has to
 * read. Grouped by case, newest at the top. Clicking a row routes back
 * into the Cases app and opens the relevant case (the case form's Hub
 * surfaces the inbound item via the existing flow).
 *
 * Empty state surfaces friendly copy when the user has no unread items.
 */

import * as React from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Bell, Mail, Clock, ChevronRight } from "lucide-react";
import { cn } from "../ui/utils";
import type { CorrespondenceNotifications } from "../../hooks/useCorrespondenceNotifications";
import {
  CaseQueueViewToggle,
  type CaseListViewMode,
  VIEW_MODE_LABEL,
} from "../case-queue/CaseQueueViewToggle";
import { useStatusAnnouncer } from "../StatusAnnouncer";

const VIEW_MODE_STORAGE_KEY = "dars.notifications.viewMode";

function readPersistedViewMode(): CaseListViewMode {
  try {
    const v = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    // Notifications supports Cards (grouped by case) + Detailed list
    // (flat single-row-per-message). Preview-pane stays queue-only.
    if (v === "cards" || v === "list") return v;
    if (v === "preview") return "list";
  } catch {
    /* localStorage may be blocked */
  }
  return "cards";
}

function formatRelativeAge(d: Date | string): string {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} hr ago`;
  const days = Math.floor(ms / 86_400_000);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export interface NotificationsPageProps {
  notifications: CorrespondenceNotifications;
  /** Open the case carrying this inbound item. Caller switches activeApp
   *  to "queue" and routes through the existing handleCaseSelect path. */
  onOpenCase: (caseId: string) => void;
}

export function NotificationsPage({
  notifications,
  onOpenCase,
}: NotificationsPageProps) {
  const { announce: announceStatus } = useStatusAnnouncer();
  const { recentInbound, totalUnread } = notifications;

  // Group inbound items by case for the per-case section headers.
  const grouped = React.useMemo(() => {
    const byCase = new Map<string, typeof recentInbound>();
    for (const entry of recentInbound) {
      const arr = byCase.get(entry.caseId) ?? [];
      arr.push(entry);
      byCase.set(entry.caseId, arr);
    }
    return Array.from(byCase.entries());
  }, [recentInbound]);

  // Persisted view mode. Notifications supports Cards (grouped by case)
  // and Detailed list (flat one-row-per-message). Preview is queue-only.
  const [viewMode, setViewModeRaw] = React.useState<CaseListViewMode>(() =>
    readPersistedViewMode(),
  );
  const setViewMode = (next: CaseListViewMode) => {
    if (next === "preview") return;
    setViewModeRaw(next);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, next);
    } catch {
      /* localStorage may be blocked */
    }
    announceStatus(`Switched to ${VIEW_MODE_LABEL[next]}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-6 space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#0078d4]" />
            <h1 className="text-xl font-semibold text-[#323130]">
              Notifications
            </h1>
          </div>
          <p className="text-sm text-[#605e5c]">
            Unread inbound correspondence from issuing or enforcing
            authorities, scoped to the cases assigned to you.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {totalUnread > 0 ? (
            <Badge
              variant="outline"
              className="text-xs bg-[#c50f1f] text-white border-[#c50f1f]"
            >
              {totalUnread} unread
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              All caught up
            </Badge>
          )}
          <CaseQueueViewToggle
            value={viewMode}
            onChange={setViewMode}
            previewDisabled
          />
        </div>
      </header>

      {recentInbound.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-[#c8c6c4]">
          <Bell className="w-8 h-8 text-[#a19f9d] mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-[#323130]">You're all caught up.</p>
          <p className="text-xs text-[#605e5c] mt-1">
            New inbound items from issuing or enforcing authorities will
            appear here.
          </p>
        </Card>
      ) : viewMode === "list" ? (
        // Flat single-row list. Each row carries: subject + case id +
        // counterparty/kind + relative age + open chevron. Tighter than
        // the per-case Cards mode so the RS can scan a lot at once.
        <div
          role="table"
          aria-label="Inbound correspondence — detailed list"
          aria-rowcount={recentInbound.length}
          className="bg-white border border-[#edebe9] rounded-md overflow-hidden"
        >
          {recentInbound.map((entry, idx) => (
            <div
              key={`${entry.caseId}:${entry.item.id}`}
              role="row"
              aria-rowindex={idx + 1}
              tabIndex={0}
              onClick={() => onOpenCase(entry.caseId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenCase(entry.caseId);
                }
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2 border-b border-[#edebe9] last:border-b-0 cursor-pointer border-l-4 border-l-[#0078d4] bg-white hover:bg-[#faf9f8]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-[-2px] focus-visible:z-10",
              )}
              aria-label={`Open case ${entry.caseId}: ${entry.item.subject}`}
            >
              <div className="w-7 h-7 rounded-full bg-[#f3f9fd] flex items-center justify-center flex-shrink-0">
                <Mail className="w-3.5 h-3.5 text-[#0078d4]" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 grid grid-cols-[1.4fr_auto_1fr_auto] gap-3 items-center">
                <div role="gridcell" className="min-w-0">
                  <p className="text-sm font-medium text-[#323130] truncate">
                    {entry.item.subject}
                  </p>
                </div>
                <div role="gridcell" className="font-mono text-xs text-[#0078d4]">
                  {entry.caseId}
                </div>
                <div role="gridcell" className="text-xs text-[#605e5c] truncate">
                  {entry.item.counterparty === "IssuingAuthority"
                    ? "Issuing Authority"
                    : "Enforcing Authority"}
                  {" · "}
                  {entry.item.kind}
                </div>
                <div
                  role="gridcell"
                  className="flex items-center gap-1 text-[10px] text-[#605e5c]"
                >
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>{formatRelativeAge(entry.item.createdAt)}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCase(entry.caseId);
                }}
                aria-label={`Open case ${entry.caseId}`}
                className="flex-shrink-0 text-[#0078d4] hover:text-[#106ebe] hover:bg-[#f3f9fd]"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([caseId, items]) => (
            <section
              key={caseId}
              className="space-y-2"
              aria-labelledby={`notifications-section-${caseId}`}
            >
              <div className="flex items-baseline justify-between">
                <h2
                  id={`notifications-section-${caseId}`}
                  className="text-sm font-semibold text-[#0078d4]"
                >
                  {caseId}
                </h2>
                <span className="text-[10px] uppercase tracking-wide text-[#605e5c]">
                  {items.length} unread
                </span>
              </div>
              <ul className="space-y-2">
                {items.map((entry) => (
                  <li key={`${entry.caseId}:${entry.item.id}`}>
                    <Card
                      role="button"
                      tabIndex={0}
                      aria-label={`Open case ${entry.caseId}: ${entry.item.subject}`}
                      onClick={() => onOpenCase(entry.caseId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpenCase(entry.caseId);
                        }
                      }}
                      className={cn(
                        "p-3 cursor-pointer hover:shadow-md transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-2",
                        "border-l-4 border-l-[#0078d4]",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          <div className="w-8 h-8 bg-[#f3f9fd] rounded-full flex items-center justify-center">
                            <Mail className="w-4 h-4 text-[#0078d4]" aria-hidden="true" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-[#323130]">
                            {entry.item.subject}
                          </p>
                          <p className="text-xs text-[#605e5c]">
                            {entry.item.counterparty === "IssuingAuthority"
                              ? "Issuing Authority"
                              : "Enforcing Authority"}
                            {" · "}
                            {entry.item.kind}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#605e5c]">
                            <Clock className="w-3 h-3" aria-hidden="true" />
                            <span>{formatRelativeAge(entry.item.createdAt)}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCase(entry.caseId);
                          }}
                          aria-label={`Open case ${entry.caseId}`}
                          className="flex-shrink-0 text-[#0078d4] hover:text-[#106ebe] hover:bg-[#f3f9fd]"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
