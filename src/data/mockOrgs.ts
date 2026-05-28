// Mock enterprise tenants for the attorney review surfaces. Ported from
// `enterprise-attorney-escalation-prototype/src/data/mockOrgs.ts`.
//
// Production wires this from CLASS Org Profile + Lynx + concession tracker
// + RAVE. For the prototype, six representative tenants cover the demo
// scenarios (S500, derogations, multi-region storage, etc.).

import type { EnterpriseOrgContext } from "../types/caseTypes";

export const MOCK_ORGS: Record<string, EnterpriseOrgContext> = {
  "contoso-com": {
    tenantId: "tenant-contoso",
    parentTpid: "TPID-CONTOSO",
    parentTpidDisplayName: "Contoso Holdings",
    tenantPrimaryDomain: "contoso.com",
    tenantDisplayName: "Contoso Corp",
    hqCountry: "United States",
    exchangeSeatCount: 52000,
    isS500: true,
    hasDerogation: false,
    customContractLanguage: true,
    accountManager: {
      name: "Sarah Chen",
      email: "schen@microsoft.com",
      raveLink: "https://rave.example/contoso",
    },
    adminContact: {
      name: "Daniel Hart",
      email: "admin@contoso.com",
      phone: "+1 425 555 0142",
    },
    sharePointRegion: "US East",
    defaultStorageRegion: "US",
    provenance: {
      exchangeSeatCount: "Lynx",
      isS500: "Lynx",
      hasDerogation: "Concession Tracker",
      hqCountry: "CLASS Org Profile",
      accountManager: "RAVE",
      adminContact: "CLASS Org Profile",
      sharePointRegion: "SharePoint Admin",
      defaultStorageRegion: "CLASS Org Profile",
    },
  },
  "iberia-corp-es": {
    tenantId: "tenant-iberia",
    parentTpid: "TPID-IBERIA",
    parentTpidDisplayName: "Iberia Corp Holdings",
    tenantPrimaryDomain: "corp-iberia.example",
    tenantDisplayName: "Iberia Corp S.A.",
    hqCountry: "Spain",
    exchangeSeatCount: 12400,
    isS500: false,
    hasDerogation: true,
    customContractLanguage: true,
    accountManager: {
      name: "Marta López",
      email: "mlopez@microsoft.com",
      raveLink: "https://rave.example/iberia",
    },
    adminContact: {
      name: "Carlos Vidal",
      email: "admin@corp-iberia.example",
      phone: "+34 91 555 0193",
    },
    sharePointRegion: "EU North",
    defaultStorageRegion: "EU",
    provenance: {
      exchangeSeatCount: "Lynx",
      hasDerogation: "Concession Tracker",
      hqCountry: "CLASS Org Profile",
      sharePointRegion: "SharePoint Admin",
      defaultStorageRegion: "CLASS Org Profile",
    },
  },
  "fabrikam-com": {
    tenantId: "tenant-fabrikam",
    parentTpid: "TPID-FABRIKAM",
    parentTpidDisplayName: "Fabrikam Inc.",
    tenantPrimaryDomain: "fabrikam.com",
    tenantDisplayName: "Fabrikam Inc.",
    hqCountry: "United States",
    exchangeSeatCount: 8200,
    isS500: false,
    hasDerogation: false,
    customContractLanguage: false,
    accountManager: {
      name: "John Park",
      email: "jpark@microsoft.com",
    },
    adminContact: {
      name: "Lisa Reed",
      email: "admin@fabrikam.com",
      phone: "+1 312 555 0177",
    },
    sharePointRegion: "US Central",
    defaultStorageRegion: "US",
    provenance: {
      exchangeSeatCount: "Lynx",
      hqCountry: "CLASS Org Profile",
    },
  },
  "northwind-com": {
    tenantId: "tenant-northwind",
    parentTpid: "TPID-NORTHWIND",
    parentTpidDisplayName: "Northwind Traders Holdings",
    tenantPrimaryDomain: "northwind.example",
    tenantDisplayName: "Northwind Traders",
    hqCountry: "United States",
    exchangeSeatCount: 3400,
    isS500: false,
    hasDerogation: false,
    customContractLanguage: false,
    accountManager: {
      name: "Priya Iyer",
      email: "piyer@microsoft.com",
    },
    adminContact: {
      name: "Tom Frost",
      email: "admin@northwind.example",
      phone: "+1 206 555 0188",
    },
    sharePointRegion: "US West",
    defaultStorageRegion: "US",
    provenance: {
      exchangeSeatCount: "Lynx",
      hqCountry: "CLASS Org Profile",
    },
  },
  "tailwind-co-uk": {
    tenantId: "tenant-tailwind",
    parentTpid: "TPID-TAILWIND",
    parentTpidDisplayName: "Tailwind Traders Holdings",
    tenantPrimaryDomain: "tailwind.co.uk",
    tenantDisplayName: "Tailwind Traders Ltd.",
    hqCountry: "United Kingdom",
    exchangeSeatCount: 6800,
    isS500: true,
    hasDerogation: false,
    customContractLanguage: false,
    accountManager: {
      name: "Olivia Martin",
      email: "omartin@microsoft.com",
      raveLink: "https://rave.example/tailwind",
    },
    adminContact: {
      name: "James O'Brien",
      email: "admin@tailwind.co.uk",
      phone: "+44 20 7946 0123",
    },
    sharePointRegion: "UK South",
    defaultStorageRegion: "UK",
    provenance: {
      isS500: "Lynx",
      hqCountry: "CLASS Org Profile",
      sharePointRegion: "SharePoint Admin",
    },
  },
  "adventure-works-br": {
    tenantId: "tenant-adventure-works",
    parentTpid: "TPID-ADVENTURE-WORKS",
    parentTpidDisplayName: "Adventure Works Holdings",
    tenantPrimaryDomain: "adventureworks.com.br",
    tenantDisplayName: "Adventure Works Brasil Ltda.",
    hqCountry: "Brazil",
    exchangeSeatCount: 1200,
    isS500: false,
    hasDerogation: false,
    customContractLanguage: true,
    accountManager: {
      name: "Rafael Souza",
      email: "rsouza@microsoft.com",
    },
    adminContact: {
      name: "Beatriz Gomes",
      email: "admin@adventureworks.com.br",
      phone: "+55 11 5555 0166",
    },
    sharePointRegion: "Brazil South",
    defaultStorageRegion: "Brazil",
    provenance: {
      hqCountry: "CLASS Org Profile",
      customContractLanguage: "Concession Tracker",
    },
  },
  // Phase 4 polish — extra tenants matching the LNS-2026-00150 (Kontoso)
  // and LNS-2026-00200 (Contoso France) demo cases so they can fully
  // exercise the EnterpriseContextSection + Prior Tenant History flows.
  "kontoso-de": {
    tenantId: "tenant-kontoso-de",
    parentTpid: "TPID-KONTOSO",
    parentTpidDisplayName: "Kontoso Holdings",
    tenantPrimaryDomain: "kontoso-de.example",
    tenantDisplayName: "Kontoso GmbH",
    hqCountry: "Germany",
    exchangeSeatCount: 6500,
    isS500: false,
    hasDerogation: false,
    customContractLanguage: false,
    accountManager: {
      name: "Klaus Weber",
      email: "kweber@microsoft.com",
    },
    adminContact: {
      name: "Markus Hoffmann",
      email: "admin@kontoso-de.example",
      phone: "+49 69 1367 0001",
    },
    sharePointRegion: "EU North",
    defaultStorageRegion: "EU",
    provenance: {
      exchangeSeatCount: "Lynx",
      hqCountry: "CLASS Org Profile",
      sharePointRegion: "SharePoint Admin",
      defaultStorageRegion: "CLASS Org Profile",
    },
  },
  "contoso-fr": {
    tenantId: "tenant-contoso-fr",
    // Same TPID as Contoso Corp (US) — sibling tenants under the
    // Contoso global organization. Demonstrates the TPID rollup where
    // an attorney can scope an action to "all identifiers under
    // Contoso Holdings" and capture both tenants together.
    parentTpid: "TPID-CONTOSO",
    parentTpidDisplayName: "Contoso Holdings",
    tenantPrimaryDomain: "contoso-fr.onmicrosoft.com",
    tenantDisplayName: "Contoso France SAS",
    hqCountry: "France",
    exchangeSeatCount: 4200,
    isS500: false,
    hasDerogation: false,
    customContractLanguage: true,
    accountManager: {
      name: "Camille Roussel",
      email: "croussel@microsoft.com",
    },
    adminContact: {
      name: "Hélène Moreau",
      email: "tenant.admin@contoso-fr.com",
      phone: "+33 1 42 60 30 00",
    },
    sharePointRegion: "EU West",
    defaultStorageRegion: "EU",
    provenance: {
      exchangeSeatCount: "Lynx",
      hqCountry: "CLASS Org Profile",
      customContractLanguage: "Concession Tracker",
      sharePointRegion: "SharePoint Admin",
      defaultStorageRegion: "CLASS Org Profile",
    },
  },
};
