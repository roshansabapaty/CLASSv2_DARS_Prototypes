import { useMemo, useRef } from "react";
import type { FormData } from "../types/caseTypes";
import { REGION_TO_LOCATION } from "../constants/caseConstants";
import { validateIdentifierFormat } from "../utils/caseHelpers";

interface UseCaseComputedValuesOptions {
  formData: FormData;
  identifierSearchTerm: string;
  newIdentifierValue: string;
  newIdentifierType: string;
}

export function useCaseComputedValues({
  formData,
  identifierSearchTerm,
  newIdentifierValue,
  newIdentifierType,
}: UseCaseComputedValuesOptions) {
  const filteredIdentifiers = useMemo(() => {
    if (!identifierSearchTerm) return formData.identifiers;
    
    const searchLower = identifierSearchTerm.toLowerCase();
    return formData.identifiers.filter(identifier => 
      identifier.value.toLowerCase().includes(searchLower) ||
      identifier.type.toLowerCase().includes(searchLower)
    );
  }, [formData.identifiers, identifierSearchTerm]);

  const identifierSummaryStats = useMemo(() => {
    const total = formData.identifiers.length;
    let accountsFound = 0;
    let accountsNotFound = 0;
    let accountsNotChecked = 0;
    let accountsError = 0;
    let totalServicesEnabled = 0;
    let hasEnterpriseAccounts = false;
    let countryMismatches = 0;

    formData.identifiers.forEach(identifier => {
      Object.values(identifier.services).forEach(service => {
        if (service.enabled) totalServicesEnabled++;
      });

      Object.values(identifier.services).forEach(service => {
        if (service.accountExistence?.enterpriseExists) {
          hasEnterpriseAccounts = true;
        }
      });
      
      if (identifier.accountExistenceStatus === "success" && formData.country) {
        const storageLocations = new Set<string>();
        Object.values(identifier.services).forEach(service => {
          if (service.enabled && service.accountExistence) {
            if (service.accountExistence.consumerStorageLocation) {
              storageLocations.add(service.accountExistence.consumerStorageLocation);
            }
            if (service.accountExistence.enterpriseStorageLocation) {
              storageLocations.add(service.accountExistence.enterpriseStorageLocation);
            }
          }
        });
        
        let hasMismatch = false;
        storageLocations.forEach(location => {
          const locationInfo = REGION_TO_LOCATION[location];
          if (locationInfo && locationInfo.country !== formData.country) {
            hasMismatch = true;
          }
        });
        
        if (hasMismatch) {
          countryMismatches++;
        }
      }

      if (!identifier.accountExistenceStatus || identifier.accountExistenceStatus === "not-checked" || identifier.accountExistenceStatus === "unknown") {
        accountsNotChecked++;
      } else if (identifier.accountExistenceStatus === "error") {
        accountsError++;
      } else if (identifier.accountExistenceStatus === "success") {
        const hasAccount = Object.values(identifier.services).some(service =>
          service.accountExistence?.consumerExists || service.accountExistence?.enterpriseExists
        );
        
        if (hasAccount) {
          accountsFound++;
        } else {
          accountsNotFound++;
        }
      }
    });

    return {
      total,
      accountsFound,
      accountsNotFound,
      accountsNotChecked,
      accountsError,
      totalServicesEnabled,
      hasEnterpriseAccounts,
      countryMismatches,
    };
  }, [formData.identifiers, formData.country]);

  const newIdentifierValidation = useMemo(() => {
    return validateIdentifierFormat(newIdentifierValue, newIdentifierType);
  }, [newIdentifierValue, newIdentifierType]);

  const totalServicesCount = useMemo(() => {
    return formData.identifiers.reduce((count, identifier) => {
      return count + Object.values(identifier.services).filter(s => s.enabled).length;
    }, 0);
  }, [formData.identifiers]);

  const totalDataCategoriesCount = useMemo(() => {
    return formData.identifiers.reduce((count, identifier) => {
      return count + Object.values(identifier.services).reduce((serviceCount, service) => {
        if (!service.enabled) return serviceCount;
        return serviceCount + Object.values(service.categoryGroups || {}).reduce((g: number, group: any) =>
          g + Object.values(group || {}).filter((cat: any) => cat.enabled).length, 0);
      }, 0);
    }, 0);
  }, [formData.identifiers]);

  const caseIdentificationCompletionCount = useMemo(() => {
    return [
      formData.caseId,
      formData.assigneeName,
      formData.identifiers.length > 0,
      formData.natureOfCrimes.length > 0,
      formData.startDate && formData.endDate
    ].filter(Boolean).length;
  }, [formData.caseId, formData.assigneeName, formData.identifiers, formData.natureOfCrimes, formData.startDate, formData.endDate]);

  // Memoized NDO status calculations
  const ndoStatusMap = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return formData.nonDisclosureOrders.reduce((acc, ndo) => {
      let displayStatus = ndo.status;
      
      if (ndo.expirationDate) {
        const expirationDate = new Date(ndo.expirationDate);
        expirationDate.setHours(0, 0, 0, 0);
        
        if (expirationDate < today && ndo.status !== "Revoked") {
          displayStatus = "Expired";
        }
      }
      
      acc[ndo.id] = displayStatus;
      return acc;
    }, {} as Record<string, string>);
  }, [formData.nonDisclosureOrders]);

  // Memoized identifier display data with caching to prevent flickering
  const identifierDisplayDataRef = useRef<Record<string, {
    enabledServicesCount: number;
    provisionedServicesCount: number;
    hasAnyAccount: boolean;
    hasProvisioned: boolean;
    accountTypes: string[];
    exists: boolean;
    consumer?: { storageLocation?: string; primaryId?: string; relatedIdentifiers?: string[] };
    enterprise?: { storageLocation?: string; primaryId?: string; relatedIdentifiers?: string[]; organizationId?: string };
  }>>({});
  
  const prevIdentifierHashRef = useRef<string>('');

  const identifierDisplayData = useMemo(() => {
    const relevantData = formData.identifiers.map(id => ({
      id: id.id,
      enabled: Object.keys(id.services).filter(k => id.services[k as keyof typeof id.services].enabled),
      accounts: Object.values(id.services).map(s => ({
        c: s.accountExistence?.consumerExists,
        e: s.accountExistence?.enterpriseExists
      }))
    }));
    const currentHash = JSON.stringify(relevantData);
    
    if (currentHash === prevIdentifierHashRef.current && Object.keys(identifierDisplayDataRef.current).length > 0) {
      return identifierDisplayDataRef.current;
    }
    
    const newData = formData.identifiers.reduce((acc, identifier) => {
      const enabledServices = Object.keys(identifier.services).filter(key => 
        identifier.services[key as keyof typeof identifier.services].enabled
      );
      
      const provisionedServicesCount = enabledServices.filter(key => {
        const service = identifier.services[key as keyof typeof identifier.services];
        return service.accountExistence?.consumerExists || service.accountExistence?.enterpriseExists;
      }).length;
      
      const hasAnyAccount = Object.values(identifier.services).some(service => 
        service.accountExistence?.consumerExists || service.accountExistence?.enterpriseExists
      );
      
      const hasProvisioned = Object.values(identifier.services).some(service => 
        service.enabled && (service.accountExistence?.consumerExists || service.accountExistence?.enterpriseExists)
      );
      
      const accountTypes = new Set<string>();
      const consumerStorageLocations = new Set<string>();
      const enterpriseStorageLocations = new Set<string>();
      
      let accountExists = false;
      let consumerAccountData: { storageLocation?: string; primaryId?: string; relatedIdentifiers?: string[] } | undefined;
      let enterpriseAccountData: { storageLocation?: string; primaryId?: string; relatedIdentifiers?: string[]; organizationId?: string } | undefined;
      
      Object.values(identifier.services).forEach(service => {
        if (service.accountExistence?.consumerExists) {
          accountTypes.add("Consumer");
          accountExists = true;
          if (service.accountExistence.consumerStorageLocation) {
            consumerStorageLocations.add(service.accountExistence.consumerStorageLocation);
          }
          
          if (!consumerAccountData) {
            consumerAccountData = {
              storageLocation: service.accountExistence.consumerStorageLocation,
              primaryId: (service.accountExistence as any).consumerPrimaryId,
              relatedIdentifiers: (service.accountExistence as any).consumerRelatedIdentifiers,
            };
          }
        }
        if (service.accountExistence?.enterpriseExists) {
          accountTypes.add("Enterprise");
          accountExists = true;
          if (service.accountExistence.enterpriseStorageLocation) {
            enterpriseStorageLocations.add(service.accountExistence.enterpriseStorageLocation);
          }
          
          if (!enterpriseAccountData) {
            enterpriseAccountData = {
              storageLocation: service.accountExistence.enterpriseStorageLocation,
              primaryId: (service.accountExistence as any).enterprisePrimaryId,
              relatedIdentifiers: (service.accountExistence as any).enterpriseRelatedIdentifiers,
              organizationId: (service.accountExistence as any).enterpriseOrganizationId,
            };
          }
        }
      });
      
      acc[identifier.id] = {
        enabledServicesCount: enabledServices.length,
        provisionedServicesCount,
        hasAnyAccount,
        hasProvisioned,
        accountTypes: Array.from(accountTypes),
        storageLocations: Array.from(consumerStorageLocations),
        enterpriseStorageLocations: Array.from(enterpriseStorageLocations),
        exists: accountExists,
        consumer: consumerAccountData,
        enterprise: enterpriseAccountData,
      };
      
      return acc;
    }, {} as Record<string, {
      enabledServicesCount: number;
      provisionedServicesCount: number;
      hasAnyAccount: boolean;
      hasProvisioned: boolean;
      accountTypes: string[];
      storageLocations?: string[];
      enterpriseStorageLocations?: string[];
      exists: boolean;
      consumer?: { storageLocation?: string; primaryId?: string; relatedIdentifiers?: string[] };
      enterprise?: { storageLocation?: string; primaryId?: string; relatedIdentifiers?: string[]; organizationId?: string };
    }>);
    
    identifierDisplayDataRef.current = newData;
    prevIdentifierHashRef.current = currentHash;
    
    return newData;
  }, [formData.identifiers]);

  return {
    filteredIdentifiers,
    identifierSummaryStats,
    newIdentifierValidation,
    totalServicesCount,
    totalDataCategoriesCount,
    caseIdentificationCompletionCount,
    ndoStatusMap,
    identifierDisplayData,
  };
}
