/**
 * Renders a Fluent Badge for a CaseFormInstance status.
 */

import { Badge } from "@fluentui/react-components";
import { CheckCircle2, FileEdit, Send } from "lucide-react";
import type { FormInstanceStatus } from "../../types/formTemplate";

export interface FormStatusBadgeProps {
  status: FormInstanceStatus;
}

export function FormStatusBadge({ status }: FormStatusBadgeProps) {
  if (status === "Sent") {
    return (
      <Badge
        appearance="filled"
        color="brand"
        icon={<Send size={14} />}
      >
        Sent
      </Badge>
    );
  }
  if (status === "Signed") {
    return (
      <Badge
        appearance="filled"
        color="success"
        icon={<CheckCircle2 size={14} />}
      >
        Signed
      </Badge>
    );
  }
  return (
    <Badge
      appearance="outline"
      color="informative"
      icon={<FileEdit size={14} />}
    >
      Draft
    </Badge>
  );
}
