/**
 * TransmissionStatusBadge — small coloured badge mapping an outbound
 * item's transmission status to a Fluent v9 Badge.
 *
 * Color treatment mirrors the canonical M365 status palette:
 *   Draft        → neutral grey
 *   Sent         → informative blue
 *   Delivered    → severe orange (action progressing but not yet ack'd)
 *   Acknowledged → success green
 *   Responded    → brand purple (response is what we wanted)
 *   Failed       → danger red
 */

import * as React from "react";
import { Badge } from "@fluentui/react-components";
import type { OutboundTransmissionStatus } from "../../types/correspondence";

const STATUS_LABEL: Record<OutboundTransmissionStatus, string> = {
  Draft: "Draft",
  Sent: "Sent",
  Delivered: "Delivered",
  Acknowledged: "Acknowledged",
  Responded: "Responded",
  Failed: "Failed",
};

const STATUS_APPEARANCE: Record<
  OutboundTransmissionStatus,
  React.ComponentProps<typeof Badge>["color"]
> = {
  Draft: "subtle",
  Sent: "informative",
  Delivered: "severe",
  Acknowledged: "success",
  Responded: "brand",
  Failed: "danger",
};

export interface TransmissionStatusBadgeProps {
  status: OutboundTransmissionStatus;
  size?: "small" | "medium";
}

export function TransmissionStatusBadge({
  status,
  size = "small",
}: TransmissionStatusBadgeProps) {
  return (
    <Badge
      appearance="filled"
      color={STATUS_APPEARANCE[status]}
      size={size}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}
