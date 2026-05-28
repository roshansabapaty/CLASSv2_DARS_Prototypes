/**
 * RSEditPanel — right side of the per-identifier split-pane in Step 2.
 *
 * Wraps the existing ServiceDropdownSelector + ServiceCategoryTable workspace
 * (passed as children, fully wired by Step2ServicesConfiguration) and adds the
 * new identifier-level affordances introduced by the Step 2 redesign:
 *   - "Reject this identifier" overflow menu → opens RejectIdentifierDialog
 *   - "Reset to LE" link (per-identifier scope)
 *   - Full-LE-removal confirmation banner ("you've removed every LE-requested service")
 *   - Overall disabled state when validation is blocking (account check not run / errored / N/A)
 *
 * The popover, configure step, and per-category date editing all live inside
 * the children (the existing ServiceDropdownSelector + ServiceCategoryTable
 * tree). This keeps the graduation low-risk while still delivering the new
 * UX shell.
 */

import * as React from "react";
import {
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Ban, MoreHorizontal, RotateCcw, XCircle } from "lucide-react";
import type { AccountIdentifier } from "../../types/caseTypes";
import { RejectIdentifierDialog } from "./RejectIdentifierDialog";
import { MarkInvalidDialog } from "./MarkInvalidDialog";

export interface RSEditPanelProps {
  identifier: AccountIdentifier;
  /** True when validation has a blocking issue (account check not run / errored / N/A).
   *  Disables the Reset-to-LE action; the children should also disable Add Service. */
  disabled?: boolean;
  /** True when the validation engine flagged "full LE removal" and the RS hasn't confirmed yet. */
  showFullRemovalConfirm: boolean;
  confirmedNoData: boolean;
  onConfirmNoData: () => void;
  /** Per-identifier reset to the LE baseline. */
  onResetToLE: () => void;
  /** Mark this identifier rejected; the dialog collects reason + optional doc ref. */
  onRejectIdentifier: (reason: string, documentRef?: string) => void;
  /** Mark this identifier invalid (Phase 5c.2); the dialog collects a reason. */
  onMarkInvalid?: (reason: string) => void;
  /** The configured ServiceDropdownSelector (or equivalent workspace body). */
  children: React.ReactNode;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalS,
  },
  title: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: tokens.fontWeightSemibold,
  },
  toolbar: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
  },
  removalConfirm: {
    paddingTop: tokens.spacingVerticalS,
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorPaletteYellowBackground1,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
  },
  removalConfirmTitle: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  removalConfirmActions: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXS,
  },
});

export function RSEditPanel({
  identifier,
  disabled,
  showFullRemovalConfirm,
  confirmedNoData,
  onConfirmNoData,
  onResetToLE,
  onRejectIdentifier,
  onMarkInvalid,
  children,
}: RSEditPanelProps) {
  const styles = useStyles();
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [markInvalidOpen, setMarkInvalidOpen] = React.useState(false);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>RS workspace</div>
        <div className={styles.toolbar}>
          <Button
            appearance="subtle"
            size="small"
            icon={<RotateCcw size={14} />}
            onClick={onResetToLE}
            disabled={disabled}
          >
            Reset to LE
          </Button>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button
                appearance="subtle"
                size="small"
                icon={<MoreHorizontal size={14} />}
                aria-label="More actions"
              />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem
                  icon={<XCircle size={14} />}
                  onClick={() => setRejectOpen(true)}
                >
                  Reject this identifier…
                </MenuItem>
                {onMarkInvalid && (
                  <MenuItem
                    icon={<Ban size={14} />}
                    onClick={() => setMarkInvalidOpen(true)}
                  >
                    Mark identifier as invalid…
                  </MenuItem>
                )}
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      </div>

      {showFullRemovalConfirm && !confirmedNoData && (
        <div className={styles.removalConfirm}>
          <div className={styles.removalConfirmTitle}>
            You have removed every LE-requested service.
          </div>
          <div
            style={{
              fontSize: tokens.fontSizeBase200,
              color: tokens.colorNeutralForeground2,
            }}
          >
            Confirm "no data to collect" for this identifier or reject it.
          </div>
          <div className={styles.removalConfirmActions}>
            <Button appearance="primary" size="small" onClick={onConfirmNoData}>
              Confirm: no data to collect
            </Button>
            <Button
              appearance="secondary"
              size="small"
              onClick={() => setRejectOpen(true)}
            >
              Reject identifier
            </Button>
          </div>
        </div>
      )}

      {children}

      <RejectIdentifierDialog
        open={rejectOpen}
        identifierLabel={identifier.value}
        onCancel={() => setRejectOpen(false)}
        onConfirm={(reason, ref) => {
          setRejectOpen(false);
          onRejectIdentifier(reason, ref);
        }}
      />

      <MarkInvalidDialog
        open={markInvalidOpen}
        identifierLabel={identifier.value}
        onCancel={() => setMarkInvalidOpen(false)}
        onConfirm={(reason) => {
          setMarkInvalidOpen(false);
          onMarkInvalid?.(reason);
        }}
      />
    </div>
  );
}
