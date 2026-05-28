import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { getServiceDisplayName } from "../config/microsoftServices";
import { getGroupName, getItemName } from "../config/lensServicesConfig";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Building,
  User,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { CopyButton } from "./CopyButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { useState } from "react";

interface AccountDetailsTabsProps {
  identifierId: string;
  identifierType: string;
  identifierValue: string;
  identifierServices: any;
  accountTypes: string[];
  formDataCountry: string;
  formatStorageLocation: (location: string) => string;
  doesStorageCountryMatch: (location: string, country: string) => boolean;
  handleAddAliasAsIdentifier: (alias: string, accountType: string, identifier: any) => void;
  handleAddAliasToCategory: (alias: string, accountType: string, sourceIdentifier: any, selectedServices: Set<string>, selectedCategories: Record<string, Set<string>>) => void;
  identifier: any;
  accountCheckData?: any;
}

export function AccountDetailsTab({
  identifierId,
  identifierType,
  identifierValue,
  identifierServices,
  accountTypes,
  formDataCountry,
  formatStorageLocation,
  doesStorageCountryMatch,
  handleAddAliasAsIdentifier,
  handleAddAliasToCategory,
  identifier,
  accountCheckData,
}: AccountDetailsTabsProps) {
  const hasConsumer = accountTypes.includes("Consumer");
  const hasEnterprise = accountTypes.includes("Enterprise");
  
  // Dialog state for service/category selection
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [selectedAlias, setSelectedAlias] = useState<{ alias: string; accountType: string } | null>(null);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Record<string, Set<string>>>({});

  if (!hasConsumer && !hasEnterprise) return null;

  // Prepare Consumer data
  const consumerStorageLocations = new Set<string>();
  Object.values(identifierServices).forEach((service: any) => {
    if (service.enabled && service.accountExistence?.consumerStorageLocation) {
      consumerStorageLocations.add(service.accountExistence.consumerStorageLocation);
    }
  });
  const consumerLocations = Array.from(consumerStorageLocations);
  const consumerPrimaryId = identifierType === "Email"
    ? identifierValue
    : `consumer_${identifierValue.substring(0, 8)}@outlook.com`;
  const allConsumerAliases = Array.from(
    new Set(
      Object.values(identifierServices).flatMap((service: any) =>
        service.enabled && service.backgroundData?.consumerAliases || []
      )
    )
  );

  // Prepare Enterprise data
  const enterpriseStorageLocations = new Set<string>();
  Object.values(identifierServices).forEach((service: any) => {
    if (service.enabled && service.accountExistence?.enterpriseStorageLocation) {
      enterpriseStorageLocations.add(service.accountExistence.enterpriseStorageLocation);
    }
  });
  const enterpriseLocations = Array.from(enterpriseStorageLocations);
  
  // Get UPN from Enterprise account data
  let enterprisePrimaryId = identifierType === "Email"
    ? identifierValue
    : `ent_${identifierValue.substring(0, 8)}@contoso.com`;
  
  // Try to get actual UPN from background data
  for (const service of Object.values(identifierServices)) {
    if (service.enabled && service.backgroundData?.enterpriseUPN) {
      enterprisePrimaryId = service.backgroundData.enterpriseUPN;
      break;
    }
  }
  
  const allEnterpriseAliases = Array.from(
    new Set(
      Object.values(identifierServices).flatMap((service: any) =>
        service.enabled && service.backgroundData?.enterpriseAliases || []
      )
    )
  );

  // Handler to open dialog for service/category selection
  const handleOpenServiceDialog = (alias: string, accountType: string) => {
    setSelectedAlias({ alias, accountType });
    // Initialize with all enabled services from the source identifier
    const enabledServices = new Set<string>();
    const categories: Record<string, Set<string>> = {};
    
    Object.entries(identifierServices).forEach(([serviceKey, service]: [string, any]) => {
      if (service.enabled) {
        enabledServices.add(serviceKey);
        // Initialize with all categories for this service
        if (service.categoryGroups) {
          const compoundKeys = Object.entries(service.categoryGroups).flatMap(([gKey, group]: [string, any]) =>
            Object.keys(group || {}).map(iKey => `${gKey}:${iKey}`)
          );
          categories[serviceKey] = new Set(compoundKeys);
        }
      }
    });
    
    setSelectedServices(enabledServices);
    setSelectedCategories(categories);
    setShowServiceDialog(true);
  };

  // Toggle service selection
  const toggleService = (serviceKey: string) => {
    setSelectedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceKey)) {
        newSet.delete(serviceKey);
        // Remove all categories for this service
        setSelectedCategories(prevCat => {
          const newCat = { ...prevCat };
          delete newCat[serviceKey];
          return newCat;
        });
      } else {
        newSet.add(serviceKey);
        // Add all categories for this service
        const service = identifierServices[serviceKey];
        if (service?.categoryGroups) {
          const compoundKeys = Object.entries(service.categoryGroups).flatMap(([gKey, group]: [string, any]) =>
            Object.keys(group || {}).map(iKey => `${gKey}:${iKey}`)
          );
          setSelectedCategories(prevCat => ({
            ...prevCat,
            [serviceKey]: new Set(compoundKeys),
          }));
        }
      }
      return newSet;
    });
  };

  // Toggle category selection
  const toggleCategory = (serviceKey: string, categoryKey: string) => {
    setSelectedCategories(prev => {
      const newCat = { ...prev };
      if (!newCat[serviceKey]) {
        newCat[serviceKey] = new Set();
      }
      if (newCat[serviceKey].has(categoryKey)) {
        newCat[serviceKey].delete(categoryKey);
      } else {
        newCat[serviceKey].add(categoryKey);
      }
      return newCat;
    });
  };

  // Format service name for display
  const formatServiceName = (serviceKey: string) => {
    return getServiceDisplayName(serviceKey);
  };

  // Format category name for display
  const formatCategoryName = (categoryKey: string) => {
    if (categoryKey.includes(":")) {
      const [gKey, iKey] = categoryKey.split(":");
      return `${getGroupName(gKey)} — ${getItemName(gKey, iKey)}`;
    }
    return categoryKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Handle adding identifier with selected services/categories
  const handleConfirmAdd = () => {
    if (!selectedAlias) return;
    
    handleAddAliasToCategory(selectedAlias.alias, selectedAlias.accountType, identifier, selectedServices, selectedCategories);
    
    // Close dialog and reset
    setShowServiceDialog(false);
    setSelectedAlias(null);
    setSelectedServices(new Set());
    setSelectedCategories({});
  };

  const renderAccountDetails = (
    type: "consumer" | "enterprise",
    locations: string[],
    primaryId: string,
    primaryIdType: string,
    aliases: string[],
    icon: React.ReactNode,
    bgColor: string,
    borderColor: string,
    dotColor: string,
    buttonColors: string
  ) => {
    // Get account check data for this account type
    const accountData = type === "consumer" ? accountCheckData?.consumer : accountCheckData?.enterprise;
    
    return (
      <div className={`${bgColor} ${borderColor} rounded p-3`}>
        {/* Account Existence and Status Row */}
        {accountCheckData && (
          <div className={`mb-3 pb-3 ${borderColor.replace('border', 'border-t-0 border-x-0 border-b')}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Account Existence */}
              <div className="space-y-1">
                <p className="text-xs text-[#605e5c]">Account Existence</p>
                <div className="flex items-center gap-2">
                  {accountCheckData?.exists ? (
                    <Badge className="bg-[#107c10] text-white border-[#107c10] hover:bg-[#0e6b0e]">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Yes
                    </Badge>
                  ) : (
                    <Badge className="bg-[#d13438] text-white border-[#d13438] hover:bg-[#b02e31]">
                      <XCircle className="w-3 h-3 mr-1" />
                      No
                    </Badge>
                  )}
                  {accountCheckData?.exists && accountData && (
                    <Badge variant="outline" className="text-xs">
                      {type === "consumer" ? "Consumer" : "Enterprise"}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Provisioned Status */}
              {accountData && (
                <div className="space-y-1">
                  <p className="text-xs text-[#605e5c]">Provisioned Status</p>
                  <div className="flex items-center gap-2">
                    {accountData.provisioned ? (
                      <Badge variant="outline" className="text-xs bg-[#f3f2f1]">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-[#107c10]" />
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-[#f3f2f1]">
                        <XCircle className="w-3 h-3 mr-1 text-[#605e5c]" />
                        No
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <div className="space-y-1">
            <p className="text-xs text-[#605e5c]">Storage Location</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#323130]">
                {locations.length > 0 ? locations.map(formatStorageLocation).join(", ") : "N/A"}
              </span>
              {locations.length > 0 && formDataCountry && (
                <>
                  {locations.every(loc => doesStorageCountryMatch(loc, formDataCountry)) ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <CheckCircle2 className="w-4 h-4 text-[#107c10] flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Storage country matches case country</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="w-4 h-4 text-[#ca5010] flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>⚠️ Storage country doesn't match case country ({formDataCountry})</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[#605e5c]">Primary Identifier</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-white">
                {primaryIdType}
              </Badge>
              <Input
                value={primaryId}
                readOnly
                className="h-7 text-xs bg-white border-[#c8c6c4] cursor-default flex-1"
              />
              <CopyButton text={primaryId} />
            </div>
          </div>
        </div>

        {aliases.length > 0 && (
          <div className={`pt-2 ${borderColor.replace('border', 'border-b-0 border-x-0 border-t')}`}>
            <p className="text-xs text-[#605e5c] mb-2">Related Identifiers ({aliases.length})</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {aliases.map((alias, idx) => (
                <div key={idx} className={`flex items-center justify-between gap-2 py-1 px-2 rounded hover:${bgColor.split(' ')[0]}/40 transition-colors bg-white/50`}>
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className={`w-1 h-1 rounded-full ${dotColor} mt-1.5 flex-shrink-0`} />
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 flex-shrink-0">
                      Email
                    </Badge>
                    <span className="text-xs text-[#323130] break-all">{alias}</span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenServiceDialog(alias, type === "consumer" ? "Consumer" : "Enterprise")}
                          className={`h-6 px-2 ${buttonColors} flex-shrink-0`}
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          <span className="text-xs">Add</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Link this identifier to specific Services & Data Categories</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // If only one account type, show it without tabs
  if (hasConsumer && !hasEnterprise) {
    return (
      <>
        <div className="bg-[#deecf9]/20 border border-[#0078d4]/20 rounded p-3">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-[#0078d4]" />
            <h4 className="text-sm font-semibold text-[#323130]">Consumer Account</h4>
          </div>
          {renderAccountDetails(
            "consumer",
            consumerLocations,
            consumerPrimaryId,
            identifierType,
            allConsumerAliases,
            <User className="w-3 h-3" />,
            "bg-[#deecf9]/20",
            "border-[#0078d4]/20",
            "bg-[#0078d4]",
            "text-[#0078d4] hover:text-[#106ebe] hover:bg-[#deecf9]"
          )}
        </div>

        {/* Service and Category Selection Dialog */}
        <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Services & Data Categories</DialogTitle>
              <DialogDescription>
                Choose which Microsoft Services and Data Categories to link to this identifier: <strong>{selectedAlias?.alias}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {Object.entries(identifierServices)
                .filter(([_, service]: [string, any]) => service.enabled)
                .map(([serviceKey, service]: [string, any]) => {
                  const isServiceSelected = selectedServices.has(serviceKey);
                  const categories = Object.entries(service.categoryGroups || {}).flatMap(([gKey, group]: [string, any]) => Object.keys(group || {}).map(iKey => `${gKey}:${iKey}`));

                  return (
                    <div key={serviceKey} className="border border-[#edebe9] rounded p-3">
                      {/* Service Checkbox */}
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={isServiceSelected}
                          onCheckedChange={() => toggleService(serviceKey)}
                          id={`service-${serviceKey}`}
                        />
                        <label
                          htmlFor={`service-${serviceKey}`}
                          className="text-sm font-semibold text-[#323130] cursor-pointer"
                        >
                          {formatServiceName(serviceKey)}
                        </label>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                        </Badge>
                      </div>

                      {/* Category Checkboxes - only show if service is selected */}
                      {isServiceSelected && categories.length > 0 && (
                        <div className="ml-6 mt-2 space-y-2">
                          {categories.map((categoryKey) => {
                            const isCategorySelected = selectedCategories[serviceKey]?.has(categoryKey);

                            return (
                              <div key={categoryKey} className="flex items-center gap-2">
                                <Checkbox
                                  checked={isCategorySelected}
                                  onCheckedChange={() => toggleCategory(serviceKey, categoryKey)}
                                  id={`category-${serviceKey}-${categoryKey}`}
                                />
                                <label
                                  htmlFor={`category-${serviceKey}-${categoryKey}`}
                                  className="text-xs text-[#605e5c] cursor-pointer"
                                >
                                  {formatCategoryName(categoryKey)}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowServiceDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAdd}
                disabled={selectedServices.size === 0}
                className="bg-[#0078d4] hover:bg-[#106ebe] text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Identifier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (hasEnterprise && !hasConsumer) {
    return (
      <>
        <div className="bg-[#fff9f5] border border-[#ca5010]/20 rounded p-3">
          <div className="flex items-center gap-2 mb-3">
            <Building className="w-4 h-4 text-[#ca5010]" />
            <h4 className="text-sm font-semibold text-[#323130]">Enterprise Account</h4>
          </div>
          {renderAccountDetails(
            "enterprise",
            enterpriseLocations,
            enterprisePrimaryId,
            identifierType,
            allEnterpriseAliases,
            <Building className="w-3 h-3" />,
            "bg-[#fff9f5]",
            "border-[#ca5010]/20",
            "bg-[#ca5010]",
            "text-[#ca5010] hover:text-[#9c3d0c] hover:bg-[#fff9f5]"
          )}
        </div>

        {/* Service and Category Selection Dialog */}
        <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Services & Data Categories</DialogTitle>
              <DialogDescription>
                Choose which Microsoft Services and Data Categories to link to this identifier: <strong>{selectedAlias?.alias}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {Object.entries(identifierServices)
                .filter(([_, service]: [string, any]) => service.enabled)
                .map(([serviceKey, service]: [string, any]) => {
                  const isServiceSelected = selectedServices.has(serviceKey);
                  const categories = Object.entries(service.categoryGroups || {}).flatMap(([gKey, group]: [string, any]) => Object.keys(group || {}).map(iKey => `${gKey}:${iKey}`));

                  return (
                    <div key={serviceKey} className="border border-[#edebe9] rounded p-3">
                      {/* Service Checkbox */}
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={isServiceSelected}
                          onCheckedChange={() => toggleService(serviceKey)}
                          id={`service-${serviceKey}`}
                        />
                        <label
                          htmlFor={`service-${serviceKey}`}
                          className="text-sm font-semibold text-[#323130] cursor-pointer"
                        >
                          {formatServiceName(serviceKey)}
                        </label>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                        </Badge>
                      </div>

                      {/* Category Checkboxes - only show if service is selected */}
                      {isServiceSelected && categories.length > 0 && (
                        <div className="ml-6 mt-2 space-y-2">
                          {categories.map((categoryKey) => {
                            const isCategorySelected = selectedCategories[serviceKey]?.has(categoryKey);

                            return (
                              <div key={categoryKey} className="flex items-center gap-2">
                                <Checkbox
                                  checked={isCategorySelected}
                                  onCheckedChange={() => toggleCategory(serviceKey, categoryKey)}
                                  id={`category-${serviceKey}-${categoryKey}`}
                                />
                                <label
                                  htmlFor={`category-${serviceKey}-${categoryKey}`}
                                  className="text-xs text-[#605e5c] cursor-pointer"
                                >
                                  {formatCategoryName(categoryKey)}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowServiceDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAdd}
                disabled={selectedServices.size === 0}
                className="bg-[#0078d4] hover:bg-[#106ebe] text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Identifier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Both account types exist - use tabs
  return (
    <>
      <Tabs defaultValue="consumer" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="consumer" className="text-xs">
            <User className="w-3 h-3 mr-1" />
            Consumer
          </TabsTrigger>
          <TabsTrigger value="enterprise" className="text-xs">
            <Building className="w-3 h-3 mr-1" />
            Enterprise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consumer" className="mt-2">
          {renderAccountDetails(
            "consumer",
            consumerLocations,
            consumerPrimaryId,
            identifierType,
            allConsumerAliases,
            <User className="w-3 h-3" />,
            "bg-[#deecf9]/20",
            "border-[#0078d4]/20",
            "bg-[#0078d4]",
            "text-[#0078d4] hover:text-[#106ebe] hover:bg-[#deecf9]"
          )}
        </TabsContent>

        <TabsContent value="enterprise" className="mt-2">
          {renderAccountDetails(
            "enterprise",
            enterpriseLocations,
            enterprisePrimaryId,
            identifierType,
            allEnterpriseAliases,
            <Building className="w-3 h-3" />,
            "bg-[#fff9f5]",
            "border-[#ca5010]/20",
            "bg-[#ca5010]",
            "text-[#ca5010] hover:text-[#9c3d0c] hover:bg-[#fff9f5]"
          )}
        </TabsContent>
      </Tabs>

      {/* Service and Category Selection Dialog */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Services & Data Categories</DialogTitle>
            <DialogDescription>
              Choose which Microsoft Services and Data Categories to link to this identifier: <strong>{selectedAlias?.alias}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {Object.entries(identifierServices)
              .filter(([_, service]: [string, any]) => service.enabled)
              .map(([serviceKey, service]: [string, any]) => {
                const isServiceSelected = selectedServices.has(serviceKey);
                const categories = Object.entries(service.categoryGroups || {}).flatMap(([gKey, group]: [string, any]) => Object.keys(group || {}).map(iKey => `${gKey}:${iKey}`));

                return (
                  <div key={serviceKey} className="border border-[#edebe9] rounded p-3">
                    {/* Service Checkbox */}
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={isServiceSelected}
                        onCheckedChange={() => toggleService(serviceKey)}
                        id={`service-${serviceKey}`}
                      />
                      <label
                        htmlFor={`service-${serviceKey}`}
                        className="text-sm font-semibold text-[#323130] cursor-pointer"
                      >
                        {formatServiceName(serviceKey)}
                      </label>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                      </Badge>
                    </div>

                    {/* Category Checkboxes - only show if service is selected */}
                    {isServiceSelected && categories.length > 0 && (
                      <div className="ml-6 mt-2 space-y-2">
                        {categories.map((categoryKey) => {
                          const isCategorySelected = selectedCategories[serviceKey]?.has(categoryKey);

                          return (
                            <div key={categoryKey} className="flex items-center gap-2">
                              <Checkbox
                                checked={isCategorySelected}
                                onCheckedChange={() => toggleCategory(serviceKey, categoryKey)}
                                id={`category-${serviceKey}-${categoryKey}`}
                              />
                              <label
                                htmlFor={`category-${serviceKey}-${categoryKey}`}
                                className="text-xs text-[#605e5c] cursor-pointer"
                              >
                                {formatCategoryName(categoryKey)}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowServiceDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAdd}
              disabled={selectedServices.size === 0}
              className="bg-[#0078d4] hover:bg-[#106ebe] text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Identifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}