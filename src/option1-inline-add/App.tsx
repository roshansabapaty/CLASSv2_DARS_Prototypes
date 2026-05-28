import React, { useState } from "react";
import { Card } from "./components/Card";
import { Button } from "./components/Button";
import { Badge } from "./components/Badge";
import { Checkbox } from "./components/Checkbox";
import { ChevronDown, ChevronUp, Plus, Database, Clock, CheckCircle2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  enabled: boolean;
  status?: string;
}

interface Service {
  id: string;
  name: string;
  categories: Category[];
}

const AVAILABLE_SERVICES: Service[] = [
  {
    id: "outlook",
    name: "Outlook",
    categories: [
      { id: "emails", name: "Emails", enabled: true, status: "Complete" },
      { id: "calendar", name: "Calendar", enabled: true, status: "Started" },
      { id: "contacts", name: "Contacts", enabled: false },
      { id: "tasks", name: "Tasks", enabled: false },
    ],
  },
  {
    id: "teams",
    name: "Teams",
    categories: [
      { id: "chats", name: "Chats", enabled: true, status: "Started" },
      { id: "files", name: "Files", enabled: false },
      { id: "meetings", name: "Meetings", enabled: false },
    ],
  },
  {
    id: "onedrive",
    name: "OneDrive",
    categories: [
      { id: "documents", name: "Documents", enabled: false },
      { id: "photos", name: "Photos", enabled: false },
      { id: "shared", name: "Shared Files", enabled: false },
    ],
  },
];

export default function App() {
  const [identifiers, setIdentifiers] = useState([
    {
      id: "id-1",
      value: "user@contoso.com",
      type: "Email",
      services: JSON.parse(JSON.stringify(AVAILABLE_SERVICES)),
      showAddPanel: false,
      expanded: false,
    },
    {
      id: "id-2",
      value: "+1-555-0123",
      type: "Phone",
      services: JSON.parse(JSON.stringify(AVAILABLE_SERVICES)),
      showAddPanel: false,
      expanded: false,
    },
  ]);

  const [newSelections, setNewSelections] = useState<Record<string, Set<string>>>({});

  const toggleExpanded = (identifierId: string) => {
    setIdentifiers(prev =>
      prev.map(id =>
        id.id === identifierId ? { ...id, expanded: !id.expanded } : id
      )
    );
  };

  const toggleAddPanel = (identifierId: string) => {
    setIdentifiers(prev =>
      prev.map(id =>
        id.id === identifierId ? { ...id, showAddPanel: !id.showAddPanel } : id
      )
    );
    setNewSelections(prev => ({ ...prev, [identifierId]: new Set() }));
  };

  const toggleCategorySelection = (identifierId: string, serviceId: string, categoryId: string) => {
    const key = `${serviceId}-${categoryId}`;
    setNewSelections(prev => {
      const current = prev[identifierId] || new Set();
      const updated = new Set(current);
      if (updated.has(key)) {
        updated.delete(key);
      } else {
        updated.add(key);
      }
      return { ...prev, [identifierId]: updated };
    });
  };

  const submitAdditionalJobs = (identifierId: string) => {
    setIdentifiers(prev =>
      prev.map(identifier => {
        if (identifier.id !== identifierId) return identifier;

        const selections = newSelections[identifierId] || new Set();
        const updatedServices = identifier.services.map(service => ({
          ...service,
          categories: service.categories.map(category => {
            const key = `${service.id}-${category.id}`;
            if (selections.has(key)) {
              return { ...category, enabled: true, status: "Not Started" };
            }
            return category;
          }),
        }));

        return {
          ...identifier,
          services: updatedServices,
          showAddPanel: false,
        };
      })
    );
    setNewSelections(prev => ({ ...prev, [identifierId]: new Set() }));
  };

  const getStatusBadge = (status?: string) => {
    if (status === "Complete") {
      return (
        <Badge className="bg-[#dff6dd] text-[#107c10] border-[#107c10] text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Complete
        </Badge>
      );
    }
    if (status === "Started") {
      return (
        <Badge className="bg-[#deecf9] text-[#0078d4] border-[#0078d4] text-xs">
          <Clock className="w-3 h-3 mr-1" />
          In Progress
        </Badge>
      );
    }
    return (
      <Badge className="bg-[#f3f2f1] text-[#605e5c] border-[#8a8886] text-xs">
        <Clock className="w-3 h-3 mr-1" />
        Not Started
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-[#faf9f8] p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#deecf9] rounded flex items-center justify-center">
            <Database className="w-5 h-5 text-[#0078d4]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#323130]">Option 1: Inline Add Services</h1>
            <p className="text-sm text-[#605e5c]">
              Click the "+ Add Services" button on each identifier card
            </p>
          </div>
        </div>

        {/* Identifiers */}
        {identifiers.map(identifier => {
          const enabledCount = identifier.services.reduce(
            (acc, s) => acc + s.categories.filter(c => c.enabled).length,
            0
          );
          const availableCount = identifier.services.reduce(
            (acc, s) => acc + s.categories.filter(c => !c.enabled).length,
            0
          );
          const selectedCount = (newSelections[identifier.id] || new Set()).size;

          return (
            <Card key={identifier.id} className="shadow-sm">
              {/* Identifier Header */}
              <div className="p-4 bg-[#faf9f8] border-b border-[#edebe9] flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => toggleExpanded(identifier.id)}
                  >
                    {identifier.expanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>

                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Identifier</p>
                      <p className="text-sm font-medium text-[#323130]">{identifier.value}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Type</p>
                      <p className="text-sm text-[#323130]">{identifier.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Active Jobs</p>
                      <p className="text-sm font-semibold text-[#0078d4]">{enabledCount}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#0078d4] text-[#0078d4] hover:bg-[#deecf9]"
                    onClick={() => toggleAddPanel(identifier.id)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Services
                  </Button>
                </div>
              </div>

              {/* Add Services Panel */}
              {identifier.showAddPanel && (
                <div className="p-4 bg-[#fff] border-b-2 border-[#0078d4]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-[#323130]">
                        Add Data Categories ({availableCount} available)
                      </h3>
                      <p className="text-sm text-[#605e5c]">
                        Select additional services and categories to collect
                      </p>
                    </div>
                    {selectedCount > 0 && (
                      <Button
                        className="bg-[#0078d4] text-white hover:bg-[#106ebe]"
                        onClick={() => submitAdditionalJobs(identifier.id)}
                      >
                        Submit {selectedCount} New Job{selectedCount !== 1 ? "s" : ""}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {identifier.services.map(service => {
                      const availableCategories = service.categories.filter(c => !c.enabled);
                      if (availableCategories.length === 0) return null;

                      return (
                        <div key={service.id} className="border border-[#edebe9] rounded p-3">
                          <div className="font-medium text-[#323130] mb-2">{service.name}</div>
                          <div className="space-y-2">
                            {availableCategories.map(category => {
                              const key = `${service.id}-${category.id}`;
                              const isSelected = (newSelections[identifier.id] || new Set()).has(key);
                              return (
                                <label
                                  key={category.id}
                                  className="flex items-center gap-2 cursor-pointer hover:bg-[#f3f2f1] p-2 rounded"
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() =>
                                      toggleCategorySelection(identifier.id, service.id, category.id)
                                    }
                                  />
                                  <span className="text-sm text-[#323130]">{category.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expanded Content - Current Jobs */}
              {identifier.expanded && (
                <div className="p-4">
                  {identifier.services.map(service => {
                    const enabledCategories = service.categories.filter(c => c.enabled);
                    if (enabledCategories.length === 0) return null;

                    return (
                      <div key={service.id} className="mb-4">
                        <div className="font-medium text-[#323130] mb-2">{service.name}</div>
                        <div className="space-y-2 ml-4">
                          {enabledCategories.map(category => (
                            <div
                              key={category.id}
                              className="flex items-center justify-between p-3 bg-white border border-[#edebe9] rounded"
                            >
                              <span className="text-sm text-[#323130]">{category.name}</span>
                              {getStatusBadge(category.status)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
