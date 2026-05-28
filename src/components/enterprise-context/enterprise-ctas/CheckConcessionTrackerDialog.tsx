/**
 * CheckConcessionTrackerDialog — record the result of looking up the
 * tenant in the Concession Tracker (derogation registry). Appends a
 * `DerogationCheckResult` to the case's `enterpriseContext` so the
 * Derogation badge in the EnterpriseContextSection header reflects
 * the latest lookup.
 *
 * Phase 4 of the prototype-to-prod merge.
 */

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Dropdown,
  Field,
  Option,
  Textarea,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useState } from "react";
import { CURRENT_USER } from "../../../constants/caseConstants";
import type {
  DerogationCheckResult,
  FormData,
} from "../../../types/caseTypes";
import type { EnterpriseCtaAction } from "../enterpriseCtaTypes";

const useStyles = makeStyles({
  body: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalM,
    minWidth: "440px",
  },
});

interface Props {
  case: FormData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (a: EnterpriseCtaAction) => void;
}

const RESULT_LABELS: Record<DerogationCheckResult["result"], string> = {
  present: "Derogation present",
  absent: "No derogation",
  unclear: "Unclear / needs follow-up",
};

export function CheckConcessionTrackerDialog({
  case: _c,
  open,
  onOpenChange,
  onAction,
}: Props) {
  const styles = useStyles();
  const [result, setResult] =
    useState<DerogationCheckResult["result"]>("present");
  const [notes, setNotes] = useState("");

  const record = () => {
    const now = new Date();
    const checkResult: DerogationCheckResult = {
      checkedAt: now,
      checkedBy: CURRENT_USER,
      result,
      trackerLink: "https://concessions.example/tenant",
      notes,
    };
    onAction({
      kind: "recordDerogationCheck",
      result: checkResult,
      audit: {
        id: `audit-derogation-${Date.now().toString(36)}`,
        kind: "DerogationChecked",
        actor: CURRENT_USER,
        actorRole: "Attorney",
        performedAt: now,
        note: `Result: ${result}${notes ? ` — ${notes}` : ""}`,
      },
    });
    setNotes("");
    setResult("present");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Check Concession Tracker</DialogTitle>
          <DialogContent className={styles.body}>
            <Field label="Result">
              <Dropdown
                value={RESULT_LABELS[result]}
                selectedOptions={[result]}
                onOptionSelect={(_, d) => {
                  if (d.optionValue) {
                    setResult(
                      d.optionValue as DerogationCheckResult["result"],
                    );
                  }
                }}
              >
                <Option value="present">{RESULT_LABELS.present}</Option>
                <Option value="absent">{RESULT_LABELS.absent}</Option>
                <Option value="unclear">{RESULT_LABELS.unclear}</Option>
              </Dropdown>
            </Field>
            <Field label="Notes">
              <Textarea
                rows={3}
                value={notes}
                onChange={(_, d) => setNotes(d.value)}
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Cancel</Button>
            </DialogTrigger>
            <Button appearance="primary" onClick={record}>
              Record
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
