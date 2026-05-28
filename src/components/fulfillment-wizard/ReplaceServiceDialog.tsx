/**
 * ReplaceServiceDialog — Fluent Dialog for substituting an LE-supplied
 * external service that didn't resolve cleanly with an RS-chosen internal
 * LENS service (Phase 5b.4).
 *
 * Triggered from MappingIssuesPane's "Replace with internal service…"
 * button. The picker is account-type-aware: for a Consumer identifier we
 * filter to Consumer-or-no-account-type services; for Enterprise we filter
 * to Enterprise. Selecting a service commits the substitution and closes
 * the dialog.
 *
 * The substitution is recorded in `identifier.externalSubstitutions` for
 * the audit trail.
 */

import * as React from "react";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { SearchableServiceSelector } from "./SearchableServiceSelector";
import { LENS_SERVICES, LENS_SERVICE_MAP } from "../../config/lensServicesConfig";

export interface ReplaceServiceDialogProps {
  open: boolean;
  /** The LE-supplied external name we're substituting for (e.g. "SharePoint"). */
  externalName: string;
  /** Resolver reason explaining why the original couldn't resolve. */
  reason?: string;
  /** Identifier's account type — drives which internal services are selectable. */
  accountType?: "Consumer" | "Enterprise" | "N/A" | string;
  /** Internal services already configured for this identifier (greyed out). */
  alreadySelected?: string[];
  onCancel: () => void;
  /** User picked an internal service to substitute. Parent records the audit
   *  entry and adds the service to the identifier's RS workspace. */
  onConfirm: (internalKey: string) => void;
}

const useStyles = makeStyles({
  reason: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    marginTop: 0,
    marginBottom: tokens.spacingVerticalS,
  },
  pickerWrap: {
    minHeight: "320px",
  },
});

export function ReplaceServiceDialog({
  open,
  externalName,
  reason,
  accountType,
  alreadySelected = [],
  onCancel,
  onConfirm,
}: ReplaceServiceDialogProps) {
  const styles = useStyles();

  // Build picker list: filter internal services to those compatible with the
  // identifier's account type. Services with no account-type binding (e.g.
  // "either") are shown for both types.
  const services = React.useMemo(() => {
    const ac =
      accountType === "Consumer" || accountType === "Enterprise"
        ? accountType
        : undefined;
    return LENS_SERVICES.filter((svc) => {
      if (!ac) return true;
      if (!svc.accountType) return true;
      return svc.accountType === ac;
    }).map((svc) => ({
      id: svc.key,
      name: LENS_SERVICE_MAP[svc.key]?.name ?? svc.name,
      icon: svc.icon || "📦",
      description: undefined as string | undefined,
    }));
  }, [accountType]);

  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) onCancel(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Replace "{externalName}" with internal service</DialogTitle>
          <DialogContent>
            {reason && <p className={styles.reason}>{reason}</p>}
            <p className={styles.reason}>
              {accountType === "Consumer" || accountType === "Enterprise" ? (
                <>
                  Showing services compatible with this identifier's
                  <b> {accountType}</b> account. Picking a service substitutes
                  it in for the LE-supplied "{externalName}" and adds it to
                  the RS workspace.
                </>
              ) : (
                <>
                  Pick an internal LENS service to substitute for the LE-supplied
                  "{externalName}". The substitution is logged in the audit trail.
                </>
              )}
            </p>
            <div className={styles.pickerWrap}>
              <SearchableServiceSelector
                services={services}
                selectedKeys={alreadySelected}
                multiSelect={false}
                onSelect={(key) => onConfirm(key)}
                placeholder="Search internal services…"
                disabledReason={(key) =>
                  alreadySelected.includes(key)
                    ? "Already configured for this identifier"
                    : undefined
                }
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
