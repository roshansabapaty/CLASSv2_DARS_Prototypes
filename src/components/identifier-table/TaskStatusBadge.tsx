import React from "react";
import { Badge } from "../ui/badge";
import { getTaskStatusStyle } from "./identifier-table-utils";

interface TaskStatusBadgeProps {
  status?: string;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = getTaskStatusStyle(status || "New");
  return (
    <Badge
      variant="outline"
      className="text-xs font-mono"
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        borderColor: config.borderColor,
      }}
    >
      {config.label}
    </Badge>
  );
}
