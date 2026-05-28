import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

interface CaseHeaderProps {
  caseNumber: string;
  caseTitle: string;
  status: "active" | "pending" | "completed";
  assignee: string;
  dateReceived: string;
  priority: "high" | "medium" | "low";
}

export function CaseHeader({
  caseNumber,
  caseTitle,
  status,
  assignee,
  dateReceived,
  priority,
}: CaseHeaderProps) {
  const statusColors = {
    active: "bg-blue-500",
    pending: "bg-yellow-500",
    completed: "bg-green-500",
  };

  const priorityColors = {
    high: "bg-red-100 text-red-800 border-red-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-gray-100 text-gray-800 border-gray-300",
  };

  return (
    <Card className="p-6 mb-6 border-l-4 border-l-blue-600">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-blue-600">{caseNumber}</h1>
            <Badge variant="outline" className={priorityColors[priority]}>
              {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
            </Badge>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
              <span className="text-gray-600">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
          </div>
          <h2 className="text-gray-700 mb-4">{caseTitle}</h2>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <dt className="text-gray-500 mb-1">Assigned To</dt>
          <dd className="text-gray-900">{assignee}</dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Date Received</dt>
          <dd className="text-gray-900">{dateReceived}</dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Total Files</dt>
          <dd className="text-gray-900">4 files (9.64 GB)</dd>
        </div>
      </div>
    </Card>
  );
}
