/**
 * FormsLibrarySection — accordion-section content for the case page's
 * "Forms & Letters" surface. Lists existing CaseFormInstance items (Draft /
 * Signed) and exposes a "New form" CTA that opens the TemplatePickerDialog.
 *
 * State plumbing is owned by the parent (DataEntryForm), which threads three
 * handlers through CaseSummaryAndTabs. This component is presentational +
 * dialog-orchestration only.
 *
 * Per docs/UI_LIBRARY_POLICY.md — Fluent v9 + Griffel only. No shadcn imports.
 */

import * as React from "react";
import {
  Body1,
  Body1Strong,
  Button,
  Caption1,
  Caption2,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  makeStyles,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Subtitle2,
  tokens,
} from "@fluentui/react-components";
import {
  Add20Regular,
  Delete20Regular,
  DocumentBulletListMultiple24Regular,
  DocumentSignature20Regular,
  MoreHorizontal20Regular,
  Open20Regular,
  Print20Regular,
  Send20Filled,
} from "@fluentui/react-icons";
import { FormStatusBadge } from "./FormStatusBadge";
import { TemplatePickerDialog } from "./TemplatePickerDialog";
import { FormFillerDialog } from "./FormFillerDialog";
import { createFormInstance } from "./formEngine";
import { generateFormPdf } from "./pdfGenerator";
import { getTemplateById } from "../../config/formTemplates";
import type {
  CaseFormInstance,
  FormTemplate,
} from "../../types/formTemplate";
import type { FormData as CaseFormData } from "../../types/caseTypes";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  headerCopy: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    flex: "1 1 auto",
    minWidth: 0,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    paddingLeft: tokens.spacingHorizontalXL,
    paddingRight: tokens.spacingHorizontalXL,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopStyle: "dashed",
    borderRightStyle: "dashed",
    borderBottomStyle: "dashed",
    borderLeftStyle: "dashed",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
  },
  emptyIcon: {
    color: tokens.colorNeutralForeground3,
  },
  emptyText: {
    textAlign: "center",
    color: tokens.colorNeutralForeground2,
    maxWidth: "440px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
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
    transitionProperty: "border-color, box-shadow",
    transitionDuration: tokens.durationFaster,
    ":hover": {
      borderTopColor: tokens.colorBrandStroke2,
      borderRightColor: tokens.colorBrandStroke2,
      borderBottomColor: tokens.colorBrandStroke2,
      borderLeftColor: tokens.colorBrandStroke2,
      boxShadow: tokens.shadow4,
    },
  },
  rowIcon: {
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
  },
  rowMain: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    flex: "1 1 auto",
    minWidth: 0,
  },
  rowMeta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2,
  },
  rowAnchor: {
    color: tokens.colorNeutralForeground3,
  },
  rowActions: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    flexShrink: 0,
  },
  truncate: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

export interface FormsLibrarySectionProps {
  /** Source of truth for autofill, filtering, and the list itself. */
  formData: CaseFormData;
  /** Append a new instance to formData.formInstances. */
  onCreateInstance: (instance: CaseFormInstance) => void;
  /** Patch fields on an existing instance (values, status, signature, updatedAt). */
  onUpdateInstance: (
    instanceId: string,
    partial: Partial<CaseFormInstance>,
  ) => void;
  /** Remove an instance — UI only allows this for Drafts. */
  onDeleteInstance: (instanceId: string) => void;
  /** Phase 2: send a signed instance to the authority. Caller writes an
   *  OutboundCorrespondenceItem (with formInstanceId) to the store and
   *  flips the instance status to "Sent". Optional — when omitted, the
   *  Send action is hidden and Phase 1 keeps its prior behaviour. */
  onSendSignedInstance?: (instance: CaseFormInstance) => void;
  /** Slice D: when set, the section opens the filler for this instance
   *  on mount / when the value changes. Used by the Correspondence Hub's
   *  Compose tab to hand off into the filler after the RS picks a
   *  template inside the modal. The parent should clear it via
   *  `onConsumeOpenInstanceRequest` once consumed so subsequent picks
   *  in the same session also fire. */
  openInstanceId?: string | null;
  onConsumeOpenInstanceRequest?: () => void;
}

function formatTimestamp(d: Date | string | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FormsLibrarySection({
  formData,
  onCreateInstance,
  onSendSignedInstance,
  onUpdateInstance,
  onDeleteInstance,
  openInstanceId,
  onConsumeOpenInstanceRequest,
}: FormsLibrarySectionProps) {
  const styles = useStyles();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [activeInstanceId, setActiveInstanceId] = React.useState<string | null>(
    null,
  );

  // Honor external open requests (Slice D: Hub picks a template, parent
  // routes the new instance id here so the filler opens automatically).
  React.useEffect(() => {
    if (openInstanceId) {
      setActiveInstanceId(openInstanceId);
      onConsumeOpenInstanceRequest?.();
    }
  }, [openInstanceId, onConsumeOpenInstanceRequest]);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(
    null,
  );

  const instances = formData.formInstances ?? [];
  const sortedInstances = React.useMemo(() => {
    return [...instances].sort((a, b) => {
      const at = new Date(a.updatedAt).getTime();
      const bt = new Date(b.updatedAt).getTime();
      return bt - at;
    });
  }, [instances]);

  const activeInstance = React.useMemo(
    () => instances.find((i) => i.instanceId === activeInstanceId),
    [instances, activeInstanceId],
  );
  const activeTemplate = React.useMemo<FormTemplate | undefined>(
    () =>
      activeInstance ? getTemplateById(activeInstance.templateId) : undefined,
    [activeInstance],
  );

  const pendingDelete = React.useMemo(
    () => instances.find((i) => i.instanceId === confirmDeleteId),
    [instances, confirmDeleteId],
  );

  const handleSelectTemplate = React.useCallback(
    (template: FormTemplate) => {
      const instance = createFormInstance(template, formData);
      onCreateInstance(instance);
      setPickerOpen(false);
      setActiveInstanceId(instance.instanceId);
    },
    [formData, onCreateInstance],
  );

  const handleDownloadPdf = React.useCallback(
    (instance: CaseFormInstance) => {
      const template = getTemplateById(instance.templateId);
      if (!template) return;
      generateFormPdf(template, instance);
    },
    [],
  );

  const handleConfirmDelete = React.useCallback(() => {
    if (confirmDeleteId) {
      onDeleteInstance(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  }, [confirmDeleteId, onDeleteInstance]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <Subtitle2>Forms & Letters</Subtitle2>
          <Caption1>
            Author, sign, and download structured correspondence to send to the
            issuing or enforcing authority for this case.
          </Caption1>
        </div>
        <Button
          appearance="primary"
          icon={<Add20Regular />}
          onClick={() => setPickerOpen(true)}
        >
          New form
        </Button>
      </div>

      {sortedInstances.length === 0 ? (
        <div className={styles.emptyState}>
          <DocumentBulletListMultiple24Regular className={styles.emptyIcon} />
          <Body1Strong>No forms yet</Body1Strong>
          <Body1 className={styles.emptyText}>
            Pick a template — production letters, rejection responses, and
            notices — to author, sign, and download a PDF for transmission.
          </Body1>
          <Button
            appearance="primary"
            icon={<Add20Regular />}
            onClick={() => setPickerOpen(true)}
          >
            New form
          </Button>
        </div>
      ) : (
        <div className={styles.list}>
          {sortedInstances.map((instance) => {
            const template = getTemplateById(instance.templateId);
            if (!template) {
              return (
                <div key={instance.instanceId} className={styles.row}>
                  <DocumentBulletListMultiple24Regular
                    className={styles.rowIcon}
                  />
                  <div className={styles.rowMain}>
                    <Body1Strong>Unknown template</Body1Strong>
                    <Caption1>{instance.templateId}</Caption1>
                  </div>
                  <FormStatusBadge status={instance.status} />
                </div>
              );
            }
            const isSigned = instance.status === "Signed";
            const isDraft = instance.status === "Draft";
            const isSent = instance.status === "Sent";
            const canSend = isSigned && !!onSendSignedInstance;
            return (
              <div key={instance.instanceId} className={styles.row}>
                <DocumentBulletListMultiple24Regular
                  className={styles.rowIcon}
                />
                <div className={styles.rowMain}>
                  <Body1Strong className={styles.truncate}>
                    {template.name}
                  </Body1Strong>
                  <div className={styles.rowMeta}>
                    <FormStatusBadge status={instance.status} />
                    {template.regulatoryAnchor && (
                      <Caption2 className={styles.rowAnchor}>
                        {template.regulatoryAnchor}
                      </Caption2>
                    )}
                    <Caption2>·</Caption2>
                    <Caption2>
                      Updated {formatTimestamp(instance.updatedAt)}
                    </Caption2>
                    {isSigned && instance.signature && (
                      <>
                        <Caption2>·</Caption2>
                        <Caption2>
                          <DocumentSignature20Regular
                            style={{
                              width: 12,
                              height: 12,
                              verticalAlign: "text-bottom",
                              marginRight: 4,
                            }}
                          />
                          Signed by {instance.signature.signerName}
                        </Caption2>
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.rowActions}>
                  <Button
                    appearance="secondary"
                    icon={<Open20Regular />}
                    onClick={() => setActiveInstanceId(instance.instanceId)}
                  >
                    {isDraft ? "Continue" : "Open"}
                  </Button>
                  {canSend && (
                    <Button
                      appearance="primary"
                      icon={<Send20Filled />}
                      onClick={() => onSendSignedInstance?.(instance)}
                    >
                      Send
                    </Button>
                  )}
                  {(isSigned || isSent) && (
                    <Button
                      appearance="subtle"
                      icon={<Print20Regular />}
                      onClick={() => handleDownloadPdf(instance)}
                    >
                      PDF
                    </Button>
                  )}
                  <Menu>
                    <MenuTrigger disableButtonEnhancement>
                      <Button
                        appearance="subtle"
                        icon={<MoreHorizontal20Regular />}
                        aria-label="More actions"
                      />
                    </MenuTrigger>
                    <MenuPopover>
                      <MenuList>
                        <MenuItem
                          icon={<Open20Regular />}
                          onClick={() =>
                            setActiveInstanceId(instance.instanceId)
                          }
                        >
                          Open
                        </MenuItem>
                        {(isSigned || isSent) && (
                          <MenuItem
                            icon={<Print20Regular />}
                            onClick={() => handleDownloadPdf(instance)}
                          >
                            Download PDF
                          </MenuItem>
                        )}
                        {canSend && (
                          <MenuItem
                            icon={<Send20Filled />}
                            onClick={() => onSendSignedInstance?.(instance)}
                          >
                            Send to authority
                          </MenuItem>
                        )}
                        {isDraft && (
                          <MenuItem
                            icon={<Delete20Regular />}
                            onClick={() =>
                              setConfirmDeleteId(instance.instanceId)
                            }
                          >
                            Delete draft
                          </MenuItem>
                        )}
                      </MenuList>
                    </MenuPopover>
                  </Menu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template picker */}
      <TemplatePickerDialog
        open={pickerOpen}
        formData={formData}
        onSelect={handleSelectTemplate}
        onClose={() => setPickerOpen(false)}
      />

      {/* Filler — opened for the active instance */}
      {activeInstance && activeTemplate && (
        <FormFillerDialog
          open={true}
          template={activeTemplate}
          instance={activeInstance}
          onUpdate={onUpdateInstance}
          onClose={() => setActiveInstanceId(null)}
        />
      )}

      {/* Delete confirm */}
      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(_, data) => {
          if (!data.open) setConfirmDeleteId(null);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete draft?</DialogTitle>
            <DialogContent>
              <Body1>
                This permanently removes the draft
                {pendingDelete &&
                  (() => {
                    const t = getTemplateById(pendingDelete.templateId);
                    return t ? ` for "${t.name}"` : "";
                  })()}
                . This action cannot be undone.
              </Body1>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Divider />
    </div>
  );
}
