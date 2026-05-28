import React, { useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Input } from "./ui/input";
import { CopyableText } from "./CopyButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  MapPin,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  X,
  ChevronsDown,
  ChevronsUp,
} from "lucide-react";
import { cn } from "./ui/utils";
import { format } from "date-fns";
import { LENS_SERVICES, getGroupName, getItemName } from "../config/lensServicesConfig";

interface SubCategory {
  enabled: boolean;
  taskId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  status: "Not started" | "In Progress" | "Completed";
  jobId?: string;
  collectionStatus?: "Not Started" | "Started" | "Complete" | "No Data" | "Failed";
  publishStatus?: "Not Started" | "Started" | "Complete" | "Failed";
  deliveryStatus?: "Not Started" | "Started" | "Complete" | "Failed";
  collectionStatusUpdatedAt?: Date;
  publishStatusUpdatedAt?: Date;
  deliveryStatusUpdatedAt?: Date;
}

interface AccountExistence {
  consumerExists: boolean;
  enterpriseExists: boolean;
  consumerStorageLocation?: string;
  enterpriseStorageLocation?: string;
}

interface Service {
  enabled: boolean;
  accountExistence?: AccountExistence;
  categoryGroups: Record<string, Record<string, SubCategory>>;
  includeConsumerAccount?: boolean;
  includeEnterpriseAccount?: boolean;
}

interface AccountIdentifier {
  id: string;
  type: string;
  value: string;
  taskId: string;
  taskStatus: string;
  geoLocation?: string;
  createdBy?: string;
  accountExistenceStatus?: "idle" | "checking" | "success" | "error";
  services: Record<string, Service>;
}

interface FulfillmentTaskViewProps {
  identifiers: AccountIdentifier[];
  onRemoveIdentifier: (id: string) => void;
  onEditIdentifier: (id: string) => void;
  onToggleDataCategory: (identifierId: string, serviceKey: string, categoryKey: string, enabled: boolean) => void;
  onUpdateDateRange?: (identifierId: string, serviceKey: string, categoryKey: string, startDate: Date | undefined, endDate: Date | undefined) => void;
  servicesConfig: Record<string, { name: string; categoryLabels: Record<string, string> }>;
  isEditingCollectionScope?: boolean; // When true, show already-enabled items as disabled checkboxes
  hasSubmittedToFulfillment?: boolean; // When false, keep Collection/Publish/Delivery as "Not Started"
  /** When true (EPOC-PR preservation requests), the pipeline collapses to
   *  the Collection / Preservation stage only — Package + Delivery
   *  columns are not rendered. */
  collectionOnly?: boolean;
}

export function FulfillmentTaskView({
  identifiers,
  onRemoveIdentifier,
  onEditIdentifier,
  onToggleDataCategory,
  onUpdateDateRange,
  servicesConfig,
  isEditingCollectionScope = false,
  hasSubmittedToFulfillment = false,
  collectionOnly = false,
}: FulfillmentTaskViewProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});
  const [expandedIdentifiers, setExpandedIdentifiers] = useState<Record<string, boolean>>({});
  
  // Selection states for submission
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>({});
  const [selectedIdentifiers, setSelectedIdentifiers] = useState<Record<string, boolean>>({});
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});
  
  // Filter states
  const [filterIdentifier, setFilterIdentifier] = useState("");
  const [filterService, setFilterService] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Create flat list of all identifier-service-category combinations for stats and filtering
  const flatRows = useMemo(() => {
    return identifiers.flatMap((identifier) => {
      return Object.keys(identifier.services)
        .filter((serviceKey) => identifier.services[serviceKey]?.enabled)
        .flatMap((serviceKey) => {
          const service = identifier.services[serviceKey] as unknown as Service;
          if (!service) return [];
          const serviceConfig = servicesConfig[serviceKey];
          const lensService = LENS_SERVICES.find((s) => s.key === serviceKey);
          const resolvedServiceName = lensService?.name || serviceConfig?.name || serviceKey;

          const categories = Object.entries(service.categoryGroups || {}).flatMap(([gKey, group]) =>
            Object.entries(group || {}).map(([iKey, category]) => ({
              id: `${identifier.id}-${serviceKey}-${gKey}:${iKey}`,
              identifierId: identifier.id,
              identifierType: identifier.type,
              identifierValue: identifier.value,
              identifierTaskId: identifier.taskId,
              identifierTaskStatus: identifier.taskStatus,
              geoLocation: identifier.geoLocation,
              createdBy: identifier.createdBy,
              accountExistenceStatus: identifier.accountExistenceStatus,
              serviceKey,
              serviceName: resolvedServiceName,
              categoryKey: `${gKey}:${iKey}`,
              categoryName: `${getGroupName(gKey)} — ${getItemName(gKey, iKey)}`,
              category,
              accountExistence: service.accountExistence,
              includeConsumerAccount: service.includeConsumerAccount,
              includeEnterpriseAccount: service.includeEnterpriseAccount,
            }))
          );

          return categories;
        });
    });
  }, [identifiers, servicesConfig]);

  // Apply filters
  const filteredRows = useMemo(() => {
    return flatRows.filter((row) => {
      // Identifier filter (text search)
      if (filterIdentifier && !row.identifierValue.toLowerCase().includes(filterIdentifier.toLowerCase())) {
        return false;
      }
      
      // Service filter
      if (filterService !== "all" && row.serviceKey !== filterService) {
        return false;
      }
      
      // Type filter
      if (filterType !== "all" && row.identifierType !== filterType) {
        return false;
      }
      
      // Category filter
      if (filterCategory !== "all" && row.categoryKey !== filterCategory) {
        return false;
      }
      
      return true;
    });
  }, [flatRows, filterIdentifier, filterService, filterType, filterCategory]);

  // Group data by Identifier > Service > Categories
  const groupedData = useMemo(() => {
    const groups: Record<string, Record<string, typeof filteredRows>> = {};
    
    filteredRows.forEach((row) => {
      if (!groups[row.identifierId]) {
        groups[row.identifierId] = {};
      }
      if (!groups[row.identifierId][row.serviceKey]) {
        groups[row.identifierId][row.serviceKey] = [];
      }
      groups[row.identifierId][row.serviceKey].push(row);
    });
    
    return groups;
  }, [filteredRows]);

  // Get unique values for filter dropdowns
  const uniqueServices = useMemo(() => {
    const services = new Set(flatRows.map((row) => row.serviceKey));
    return Array.from(services).map((key) => ({
      key,
      name: servicesConfig[key]?.name || key,
    }));
  }, [flatRows, servicesConfig]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(flatRows.map((row) => row.identifierType)));
  }, [flatRows]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(flatRows.map((row) => row.categoryKey));
    return Array.from(categories).map((key) => {
      // Find the label from any service config
      const label = Object.values(servicesConfig).find((config) => config.categoryLabels[key])?.categoryLabels[key] || key;
      return { key, label };
    });
  }, [flatRows, servicesConfig]);

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const toggleService = (identifierId: string, serviceKey: string) => {
    const key = `${identifierId}-${serviceKey}`;
    setExpandedServices((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleIdentifier = (identifierId: string) => {
    setExpandedIdentifiers((prev) => ({ ...prev, [identifierId]: !prev[identifierId] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
      case "Complete":
        return <Badge variant="outline" className="bg-[#dff6dd] text-[#107c10] border-[#107c10] text-xs">Complete</Badge>;
      case "In Progress":
      case "Started":
        return <Badge variant="outline" className="bg-[#fff4ce] text-[#8a6d3b] border-[#8a6d3b] text-xs">In Progress</Badge>;
      case "Not started":
      case "Not Started":
        return <Badge variant="outline" className="bg-[#f3f2f1] text-[#605e5c] border-[#8a8886] text-xs">Not Started</Badge>;
      case "No Data":
        return <Badge variant="outline" className="bg-[#e1dfdd] text-[#605e5c] border-[#8a8886] text-xs">No Data</Badge>;
      case "Failed":
        return <Badge variant="outline" className="bg-[#fde7e9] text-[#d13438] border-[#d13438] text-xs">Failed</Badge>;
      default:
        return <Badge variant="outline" className="bg-[#f3f2f1] text-[#605e5c] border-[#8a8886] text-xs">{status}</Badge>;
    }
  };

  // Helper function to aggregate pipeline status for identifier
  const aggregatePipelineStatus = (
    categories: Array<{ category: SubCategory }>,
    statusField: "collectionStatus" | "publishStatus" | "deliveryStatus"
  ): string => {
    const statuses = categories
      .filter((row) => row.category.enabled)
      .map((row) => row.category[statusField] || "Not Started");
    
    if (statuses.length === 0) return "Not Started";
    
    // Priority: Failed > Started > Complete > No Data > Not Started
    if (statuses.some((s) => s === "Failed")) return "Failed";
    if (statuses.some((s) => s === "Started")) return "Started";
    if (statuses.every((s) => s === "Complete" || s === "No Data")) {
      if (statuses.some((s) => s === "Complete")) return "Complete";
      return "No Data";
    }
    if (statuses.some((s) => s === "Complete")) return "Started"; // Mix of complete and not started
    if (statuses.every((s) => s === "No Data")) return "No Data";
    
    return "Not Started";
  };

  // Calculate summary stats
  const stats = {
    total: flatRows.length,
    enabled: flatRows.filter((row) => row.category.enabled).length,
    completed: flatRows.filter((row) => row.category.enabled && row.category.status === "Completed").length,
    inProgress: flatRows.filter((row) => row.category.enabled && row.category.status === "In Progress").length,
    notStarted: flatRows.filter((row) => row.category.enabled && row.category.status === "Not started").length,
  };

  const activeFiltersCount = [
    filterIdentifier !== "",
    filterService !== "all",
    filterType !== "all",
    filterCategory !== "all",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilterIdentifier("");
    setFilterService("all");
    setFilterType("all");
    setFilterCategory("all");
  };

  // Selection helper functions
  const handleIdentifierSelection = (identifierId: string, checked: boolean) => {
    setSelectedIdentifiers((prev) => ({ ...prev, [identifierId]: checked }));
    
    // Cascade to all services and categories under this identifier
    const identifierData = groupedData[identifierId];
    if (identifierData) {
      Object.entries(identifierData).forEach(([serviceKey, categories]) => {
        const serviceIdentifierKey = `${identifierId}-${serviceKey}`;
        setSelectedServices((prev) => ({ ...prev, [serviceIdentifierKey]: checked }));
        
        categories.forEach((row) => {
          setSelectedCategories((prev) => ({ ...prev, [row.id]: checked }));
        });
      });
    }
  };

  const handleServiceSelection = (identifierId: string, serviceKey: string, checked: boolean) => {
    const serviceIdentifierKey = `${identifierId}-${serviceKey}`;
    setSelectedServices((prev) => ({ ...prev, [serviceIdentifierKey]: checked }));
    
    // Cascade to all categories under this service
    const categories = groupedData[identifierId]?.[serviceKey];
    if (categories) {
      categories.forEach((row) => {
        setSelectedCategories((prev) => ({ ...prev, [row.id]: checked }));
      });
    }
    
    // Update identifier selection status
    updateIdentifierSelectionStatus(identifierId);
  };

  const handleCategorySelection = (categoryId: string, identifierId: string, serviceKey: string, checked: boolean) => {
    setSelectedCategories((prev) => ({ ...prev, [categoryId]: checked }));
    
    // Update service selection status
    updateServiceSelectionStatus(identifierId, serviceKey);
    // Update identifier selection status
    updateIdentifierSelectionStatus(identifierId);
  };

  const updateServiceSelectionStatus = (identifierId: string, serviceKey: string) => {
    const categories = groupedData[identifierId]?.[serviceKey];
    if (!categories) return;
    
    const allSelected = categories.every((row) => selectedCategories[row.id]);
    const serviceIdentifierKey = `${identifierId}-${serviceKey}`;
    setSelectedServices((prev) => ({ ...prev, [serviceIdentifierKey]: allSelected }));
  };

  const updateIdentifierSelectionStatus = (identifierId: string) => {
    const identifierData = groupedData[identifierId];
    if (!identifierData) return;
    
    let allSelected = true;
    Object.entries(identifierData).forEach(([serviceKey, categories]) => {
      categories.forEach((row) => {
        if (!selectedCategories[row.id]) {
          allSelected = false;
        }
      });
    });
    
    setSelectedIdentifiers((prev) => ({ ...prev, [identifierId]: allSelected }));
  };

  const isIdentifierSelected = (identifierId: string) => {
    return selectedIdentifiers[identifierId] || false;
  };

  const isServiceSelected = (identifierId: string, serviceKey: string) => {
    const serviceIdentifierKey = `${identifierId}-${serviceKey}`;
    return selectedServices[serviceIdentifierKey] || false;
  };

  const isCategorySelected = (categoryId: string) => {
    return selectedCategories[categoryId] || false;
  };

  // Count selected items
  const selectedCount = Object.values(selectedCategories).filter(Boolean).length;

  // Expand/Collapse all functions
  const expandAll = () => {
    const newExpandedIdentifiers: Record<string, boolean> = {};
    const newExpandedServices: Record<string, boolean> = {};
    
    Object.keys(groupedData).forEach((identifierId) => {
      newExpandedIdentifiers[identifierId] = true;
      Object.keys(groupedData[identifierId]).forEach((serviceKey) => {
        newExpandedServices[`${identifierId}-${serviceKey}`] = true;
      });
    });
    
    setExpandedIdentifiers(newExpandedIdentifiers);
    setExpandedServices(newExpandedServices);
  };

  const collapseAll = () => {
    setExpandedIdentifiers({});
    setExpandedServices({});
    setExpandedRows({});
  };

  return (
    <div className="space-y-4">
      {/* Edit Collection Scope Banner */}
      {isEditingCollectionScope && (
        <div className="bg-[#fff4ce] border border-[#f9a825] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#8a6d3b] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[#323130] mb-1">
                Edit Collection Scope
              </h3>
              <p className="text-sm text-[#605e5c]">
                You are adding services to an existing collection. Previously enabled categories are shown with checkmarks and cannot be disabled. 
                Select additional categories below and click "Submit Additional Jobs" to add them to the collection.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-[#f3f2f1] border border-[#edebe9] rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-2xl text-[#0078d4]">{stats.total}</p>
            <p className="text-sm text-[#605e5c]">Total Categories</p>
          </div>
          <div className="text-center">
            <p className="text-2xl text-[#107c10]">{stats.enabled}</p>
            <p className="text-sm text-[#605e5c]">Enabled</p>
          </div>
          <div className="text-center">
            <p className="text-2xl text-[#107c10]">{stats.completed}</p>
            <p className="text-sm text-[#605e5c]">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl text-[#8a6d3b]">{stats.inProgress}</p>
            <p className="text-sm text-[#605e5c]">In Progress</p>
          </div>
          <div className="text-center">
            <p className="text-2xl text-[#605e5c]">{stats.notStarted}</p>
            <p className="text-sm text-[#605e5c]">Not Started</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#edebe9] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#605e5c]" />
          <h3 className="text-sm text-[#323130]">Filters</h3>
          {activeFiltersCount > 0 && (
            <>
              <Badge variant="outline" className="bg-[#0078d4] text-white border-[#0078d4] text-xs">
                {activeFiltersCount} active
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 px-2 text-xs text-[#0078d4] hover:text-[#106ebe] hover:bg-[#deecf9] ml-auto"
              >
                <X className="w-3 h-3 mr-1" />
                Clear all
              </Button>
            </>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Identifier Filter */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[#605e5c]">Identifier</Label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search identifier..."
                value={filterIdentifier}
                onChange={(e) => setFilterIdentifier(e.target.value)}
                className="h-9 text-sm border-[#c8c6c4] hover:border-[#605e5c] pr-8"
              />
              {filterIdentifier && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterIdentifier("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-[#605e5c] hover:text-[#323130]"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Service Filter */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[#605e5c]">Service</Label>
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="h-9 border-[#c8c6c4] hover:border-[#605e5c]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {uniqueServices.map((service) => (
                  <SelectItem key={service.key} value={service.key}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[#605e5c]">Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 border-[#c8c6c4] hover:border-[#605e5c]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Category Filter */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[#605e5c]">Data Type</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 border-[#c8c6c4] hover:border-[#605e5c]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Data Types</SelectItem>
                {uniqueCategories.map((category) => (
                  <SelectItem key={category.key} value={category.key}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 text-xs text-[#605e5c]">
          Showing {filteredRows.length} of {flatRows.length} categories
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="h-7 px-3 text-xs border-[#c8c6c4] hover:border-[#0078d4] hover:text-[#0078d4]"
            disabled={Object.keys(groupedData).length === 0}
          >
            <ChevronsDown className="w-3 h-3 mr-1.5" />
            Expand All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={collapseAll}
            className="h-7 px-3 text-xs border-[#c8c6c4] hover:border-[#0078d4] hover:text-[#0078d4]"
            disabled={Object.keys(groupedData).length === 0}
          >
            <ChevronsUp className="w-3 h-3 mr-1.5" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* Hierarchical Table View: Service > Identifier > Categories */}
      <div className="border border-[#edebe9] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#faf9f8] hover:bg-[#faf9f8]">
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead className="text-[#323130]">Service / Identifier / Data Category</TableHead>
                <TableHead className="text-[#323130]">Identifier</TableHead>
                <TableHead className="text-[#323130]">Type</TableHead>
                <TableHead className="text-[#323130] w-32">Created By</TableHead>
                <TableHead className="text-[#323130] w-28">Job ID</TableHead>
                <TableHead className="text-[#323130] w-24">
                  {collectionOnly ? "Preservation" : "Collection"}
                </TableHead>
                {!collectionOnly && (
                  <TableHead className="text-[#323130] w-24">Package</TableHead>
                )}
                {!collectionOnly && (
                  <TableHead className="text-[#323130] w-24">Delivery</TableHead>
                )}
                <TableHead className="text-[#323130] w-28">Date Range</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.keys(groupedData).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12 text-[#605e5c]">
                    {activeFiltersCount > 0 
                      ? "No matching categories found. Try adjusting your filters."
                      : "No data categories found. Add identifiers and select services to begin."
                    }
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(groupedData).map(([identifierId, servicesInIdentifier]) => {
                  const isIdentifierExpanded = expandedIdentifiers[identifierId];
                  const firstServiceKey = Object.keys(servicesInIdentifier)[0];
                  const firstCategory = servicesInIdentifier[firstServiceKey][0];
                  
                  // Count categories in this identifier
                  const identifierCategoryCount = Object.values(servicesInIdentifier).reduce(
                    (sum, categories) => sum + categories.length,
                    0
                  );
                  
                  // Get all categories for this identifier
                  const allIdentifierCategories = Object.values(servicesInIdentifier).flat();
                  
                  // Aggregate pipeline status
                  const collectionStatus = aggregatePipelineStatus(allIdentifierCategories, "collectionStatus");
                  const publishStatus = aggregatePipelineStatus(allIdentifierCategories, "publishStatus");
                  const deliveryStatus = aggregatePipelineStatus(allIdentifierCategories, "deliveryStatus");
                  
                  return [
                    // Identifier Header Row
                    <TableRow key={`${identifierId}-header`} className="bg-[#f3f2f1] hover:bg-[#edebe9]">
                        <TableCell className="py-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleIdentifier(identifierId)}
                            className="h-6 w-6 p-0"
                          >
                            {isIdentifierExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="py-3">
                          <Checkbox
                            checked={isIdentifierSelected(identifierId)}
                            onCheckedChange={(checked) =>
                              handleIdentifierSelection(identifierId, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col gap-1">
                            <CopyableText text={firstCategory.identifierValue} copyLabel="Copy identifier">
                              <span className="text-[#323130]">{firstCategory.identifierValue}</span>
                            </CopyableText>
                            {firstCategory.geoLocation && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3 h-3 text-[#0078d4]" />
                                <span className="text-xs text-[#605e5c]">{firstCategory.geoLocation}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3"></TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="bg-white text-xs">
                            {firstCategory.identifierType}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-[#323130]">
                            {firstCategory.createdBy || "LE Agency"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="bg-white text-xs">
                            {identifierCategoryCount} {identifierCategoryCount === 1 ? "category" : "categories"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          {getStatusBadge(collectionStatus)}
                        </TableCell>
                        {!collectionOnly && (
                          <TableCell className="py-3">
                            {getStatusBadge(publishStatus)}
                          </TableCell>
                        )}
                        {!collectionOnly && (
                          <TableCell className="py-3">
                            {getStatusBadge(deliveryStatus)}
                          </TableCell>
                        )}
                        <TableCell className="py-3"></TableCell>
                        <TableCell className="py-3">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditIdentifier(identifierId)}
                                  className="h-7 w-7 p-0 text-[#0078d4] hover:text-[#106ebe] hover:bg-[#deecf9]"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit identifier</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>

                      {/* Services within Identifier */}
                      {isIdentifierExpanded &&
                        Object.entries(servicesInIdentifier).map(([serviceKey, categories]) => {
                          const isServiceExpanded = expandedServices[`${identifierId}-${serviceKey}`];
                          const serviceConfig = servicesConfig[serviceKey];
                          const serviceName = serviceConfig?.name || serviceKey;
                          
                          return [
                            // Service Header Row
                            <TableRow key={`${serviceKey}-header`} className="bg-[#faf9f8] hover:bg-[#f3f2f1]">
                                <TableCell className="py-3 pl-8">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleService(identifierId, serviceKey)}
                                    className="h-6 w-6 p-0"
                                  >
                                    {isServiceExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TableCell>
                                <TableCell className="py-3">
                                  <Checkbox
                                    checked={isServiceSelected(identifierId, serviceKey)}
                                    onCheckedChange={(checked) =>
                                      handleServiceSelection(identifierId, serviceKey, checked as boolean)
                                    }
                                  />
                                </TableCell>
                                <TableCell colSpan={10} className="py-3 pl-6">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[#323130] text-sm">{serviceName}</span>
                                    <Badge variant="outline" className="bg-white text-xs">
                                      {categories.length} {categories.length === 1 ? "category" : "categories"}
                                    </Badge>
                                    {categories[0]?.includeEnterpriseAccount && (
                                      <Badge variant="outline" className="bg-[#fef9f5] text-[#ca5010] border-[#ca5010] text-xs">
                                        Enterprise Account
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>

                              {/* Data Category Rows */}
                              {isServiceExpanded &&
                                categories.map((row) => {
                                  const isExpanded = expandedRows[row.id];
                                  
                                  return [
                                    <TableRow
                                        key={row.id}
                                        className={cn(
                                          "hover:bg-[#f3f2f1] transition-colors",
                                          !row.category.enabled && "opacity-50"
                                        )}
                                      >
                                        <TableCell className="py-3 pl-12">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleRow(row.id)}
                                            className="h-6 w-6 p-0"
                                            disabled={!row.category.enabled}
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="w-4 h-4" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4" />
                                            )}
                                          </Button>
                                        </TableCell>
                                        <TableCell className="py-3">
                                          <Checkbox
                                            checked={row.category.enabled}
                                            disabled={isEditingCollectionScope && row.category.enabled}
                                            onCheckedChange={(checked) =>
                                              onToggleDataCategory(
                                                row.identifierId,
                                                row.serviceKey,
                                                row.categoryKey,
                                                checked as boolean
                                              )
                                            }
                                          />
                                        </TableCell>
                                        <TableCell className="py-3 pl-12">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[#323130] text-sm">{row.categoryName}</span>
                                            {isEditingCollectionScope && row.category.enabled && (
                                              <Badge variant="outline" className="text-xs bg-[#dff6dd] text-[#107c10] border-[#107c10]">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                Adding to collection
                                              </Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="py-3">
                                          {row.includeEnterpriseAccount && (
                                            <div className="text-xs space-y-0.5">
                                              <div className="flex items-center gap-1.5">
                                                <Badge variant="outline" className="bg-[#fef9f5] text-[#ca5010] border-[#ca5010] text-xs px-1.5 py-0.5">
                                                  Enterprise
                                                </Badge>
                                              </div>
                                              <div className="text-[#605e5c] font-mono">
                                                {row.identifierValue}
                                              </div>
                                              <div className="text-[#605e5c]">
                                                {row.identifierType}
                                              </div>
                                              {row.accountExistence?.enterpriseStorageLocation && (
                                                <div className="text-[#605e5c]">
                                                  {row.accountExistence.enterpriseStorageLocation}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </TableCell>
                                        <TableCell className="py-3"></TableCell>
                                        <TableCell className="py-3">
                                          <span className="text-[#605e5c] text-xs font-mono">
                                            {row.category.jobId || "Not generated"}
                                          </span>
                                        </TableCell>
                                        <TableCell className="py-3">
                                          {getStatusBadge(hasSubmittedToFulfillment ? (row.category.collectionStatus || "Not Started") : "Not Started")}
                                        </TableCell>
                                        {!collectionOnly && (
                                          <TableCell className="py-3">
                                            {getStatusBadge(hasSubmittedToFulfillment ? (row.category.publishStatus || "Not Started") : "Not Started")}
                                          </TableCell>
                                        )}
                                        {!collectionOnly && (
                                          <TableCell className="py-3">
                                            {getStatusBadge(hasSubmittedToFulfillment ? (row.category.deliveryStatus || "Not Started") : "Not Started")}
                                          </TableCell>
                                        )}
                                        <TableCell className="py-3">
                                          {row.category.enabled && onUpdateDateRange ? (
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  className={cn(
                                                    "h-7 px-2 text-xs hover:bg-[#f3f2f1]",
                                                    !row.category.startDate &&
                                                      !row.category.endDate &&
                                                      "text-[#a19f9d]"
                                                  )}
                                                >
                                                  {row.category.startDate && row.category.endDate ? (
                                                    <>
                                                      <CalendarIcon className="w-3 h-3 mr-1" />
                                                      {format(row.category.startDate, "MMM d")} -{" "}
                                                      {format(row.category.endDate, "MMM d, yyyy")}
                                                    </>
                                                  ) : (
                                                    <>
                                                      <CalendarIcon className="w-3 h-3 mr-1" />
                                                      Set dates
                                                    </>
                                                  )}
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-auto p-4" align="start">
                                                <div className="space-y-3">
                                                  <div>
                                                    <Label className="text-xs text-[#605e5c] mb-1.5 block">
                                                      Date Range
                                                    </Label>
                                                    <p className="text-xs text-[#323130]">{row.categoryName}</p>
                                                  </div>
                                                  <Calendar
                                                    mode="range"
                                                    selected={{
                                                      from: row.category.startDate,
                                                      to: row.category.endDate,
                                                    }}
                                                    onSelect={(range) => {
                                                      if (range?.from && range?.to) {
                                                        onUpdateDateRange(
                                                          row.identifierId,
                                                          row.serviceKey,
                                                          row.categoryKey,
                                                          range.from,
                                                          range.to
                                                        );
                                                      }
                                                    }}
                                                    numberOfMonths={2}
                                                  />
                                                </div>
                                              </PopoverContent>
                                            </Popover>
                                          ) : row.category.startDate && row.category.endDate ? (
                                            <div className="flex items-center gap-1 text-xs text-[#605e5c]">
                                              <CalendarIcon className="w-3 h-3" />
                                              <span>
                                                {format(row.category.startDate, "MMM d")} -{" "}
                                                {format(row.category.endDate, "MMM d, yyyy")}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-xs text-[#a19f9d]">No dates</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="py-3"></TableCell>
                                      </TableRow>

                                      {/* Expanded Details Row */}
                                      {isExpanded && row.category.enabled && (
                                        <TableRow>
                                          <TableCell colSpan={11} className="bg-[#faf9f8] p-6">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                              {/* Task Details */}
                                              <div className="space-y-3">
                                                <h5 className="text-sm text-[#323130]">Task Details</h5>
                                                <div className="space-y-2 text-xs">
                                                  <div className="flex justify-between py-1.5 border-b border-[#edebe9]">
                                                    <span className="text-[#605e5c]">Job ID:</span>
                                                    <span className="text-[#323130] font-mono">
                                                      {row.category.jobId || "Not generated"}
                                                    </span>
                                                  </div>
                                                  <div className="flex justify-between py-1.5">
                                                    <span className="text-[#605e5c]">Status:</span>
                                                    {getStatusBadge(row.category.status)}
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Processing Status */}
                                              <div className="space-y-3">
                                                <h5 className="text-sm text-[#323130]">Processing Pipeline</h5>
                                                <div className="space-y-2">
                                                  <div className="flex items-center justify-between py-2 px-3 bg-white rounded border border-[#edebe9]">
                                                    <span className="text-xs text-[#605e5c]">Collection</span>
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <div>
                                                            {getStatusBadge(
                                                              row.category.collectionStatus || "Not Started"
                                                            )}
                                                          </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          <p className="text-xs">
                                                            Last updated:{" "}
                                                            {row.category.collectionStatusUpdatedAt
                                                              ? format(row.category.collectionStatusUpdatedAt, "MMM d, yyyy 'at' h:mm a")
                                                              : "Never"}
                                                          </p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                  </div>
                                                  {!collectionOnly && (
                                                    <div className="flex items-center justify-between py-2 px-3 bg-white rounded border border-[#edebe9]">
                                                      <span className="text-xs text-[#605e5c]">Package</span>
                                                      <TooltipProvider>
                                                        <Tooltip>
                                                          <TooltipTrigger asChild>
                                                            <div>
                                                              {getStatusBadge(row.category.publishStatus || "Not Started")}
                                                            </div>
                                                          </TooltipTrigger>
                                                          <TooltipContent>
                                                            <p className="text-xs">
                                                              Last updated:{" "}
                                                              {row.category.publishStatusUpdatedAt
                                                                ? format(row.category.publishStatusUpdatedAt, "MMM d, yyyy 'at' h:mm a")
                                                                : "Never"}
                                                            </p>
                                                          </TooltipContent>
                                                        </Tooltip>
                                                      </TooltipProvider>
                                                    </div>
                                                  )}
                                                  {!collectionOnly && (
                                                    <div className="flex items-center justify-between py-2 px-3 bg-white rounded border border-[#edebe9]">
                                                      <span className="text-xs text-[#605e5c]">Delivery</span>
                                                      <TooltipProvider>
                                                        <Tooltip>
                                                          <TooltipTrigger asChild>
                                                            <div>
                                                              {getStatusBadge(row.category.deliveryStatus || "Not Started")}
                                                            </div>
                                                          </TooltipTrigger>
                                                          <TooltipContent>
                                                            <p className="text-xs">
                                                              Last updated:{" "}
                                                              {row.category.deliveryStatusUpdatedAt
                                                                ? format(row.category.deliveryStatusUpdatedAt, "MMM d, yyyy 'at' h:mm a")
                                                                : "Never"}
                                                            </p>
                                                          </TooltipContent>
                                                        </Tooltip>
                                                      </TooltipProvider>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>

                                              {/* Account Information */}
                                              <div className="space-y-3">
                                                <h5 className="text-sm text-[#323130]">Account Information</h5>
                                                <div className="space-y-2 text-xs">
                                                  <div className="flex justify-between py-1.5 border-b border-[#edebe9]">
                                                    <span className="text-[#605e5c]">Task ID:</span>
                                                    <CopyableText text={row.identifierTaskId || "N/A"} copyLabel="Copy task ID">
                                                      <span className="text-[#323130] font-mono">
                                                        {row.identifierTaskId || "N/A"}
                                                      </span>
                                                    </CopyableText>
                                                  </div>
                                                  <div className="flex justify-between py-1.5 border-b border-[#edebe9]">
                                                    <span className="text-[#605e5c]">Task Status:</span>
                                                    <span className="text-[#323130] text-xs">
                                                      {row.identifierTaskStatus || "N/A"}
                                                    </span>
                                                  </div>
                                                  <div className="flex justify-between py-1.5 border-b border-[#edebe9]">
                                                    <span className="text-[#605e5c]">Provisioned:</span>
                                                    {(row.accountExistence?.consumerExists || row.accountExistence?.enterpriseExists) ? (
                                                      <Badge
                                                        variant="outline"
                                                        className="bg-[#dff6dd] text-[#107c10] border-[#107c10] text-xs"
                                                      >
                                                        Yes
                                                      </Badge>
                                                    ) : (
                                                      <Badge
                                                        variant="outline"
                                                        className="bg-[#f3f2f1] text-[#605e5c] border-[#8a8886] text-xs"
                                                      >
                                                        No
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  {row.accountExistence && (
                                                    <>
                                                      <div className="flex justify-between py-1.5 border-b border-[#edebe9]">
                                                        <span className="text-[#605e5c]">Consumer:</span>
                                                        {row.accountExistence.consumerExists ? (
                                                          <Badge
                                                            variant="outline"
                                                            className="bg-[#deecf9] text-[#0078d4] border-[#0078d4] text-xs"
                                                          >
                                                            Exists
                                                          </Badge>
                                                        ) : (
                                                          <Badge
                                                            variant="outline"
                                                            className="bg-[#f3f2f1] text-[#605e5c] border-[#8a8886] text-xs"
                                                          >
                                                            No
                                                          </Badge>
                                                        )}
                                                      </div>
                                                      <div className="flex justify-between py-1.5">
                                                        <span className="text-[#605e5c]">Enterprise:</span>
                                                        {row.accountExistence.enterpriseExists ? (
                                                          <Badge
                                                            variant="outline"
                                                            className="bg-[#fff9f5] text-[#ca5010] border-[#ca5010] text-xs"
                                                          >
                                                            Exists
                                                          </Badge>
                                                        ) : (
                                                          <Badge
                                                            variant="outline"
                                                            className="bg-[#f3f2f1] text-[#605e5c] border-[#8a8886] text-xs"
                                                          >
                                                            No
                                                          </Badge>
                                                        )}
                                                      </div>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ),
                                    ];
                                  })}
                            ])
                          )
                        })
                      )
                    ];
                  })
                )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}