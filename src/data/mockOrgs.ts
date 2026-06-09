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
    tenantCreatedAt: new Date("2014-03-12T18:22:00Z"),
    tenantMailingAddress: {
      number: "1 Microsoft Way",
      street: "Redmond Way",
      city: "Redmond",
      stateProvince: "WA",
      postalCode: "98052",
      country: "United States",
    },
    tenantPhone: "+1 425 555 0100",
    domains: [
      { name: "contoso.com",                verified: true,  isPrimary: true,  domainType: "custom" },
      { name: "contoso.onmicrosoft.com",    verified: true,  isPrimary: false, domainType: "onmicrosoft" },
      { name: "mail.contoso.com",           verified: true,  isPrimary: false, domainType: "custom" },
      { name: "contoso-internal.com",       verified: true,  isPrimary: false, domainType: "custom" },
      { name: "contoso-staging.com",        verified: false, isPrimary: false, domainType: "custom" },
    ],
    provenance: {
      exchangeSeatCount: "Lynx",
      isS500: "Lynx",
      hasDerogation: "Concession Tracker",
      hqCountry: "CLASS Org Profile",
      accountManager: "RAVE",
      adminContact: "CLASS Org Profile",
      sharePointRegion: "SharePoint Admin",
      defaultStorageRegion: "CLASS Org Profile",
      tenantCreatedAt: "CLASS Org Profile",
      tenantMailingAddress: "CLASS Org Profile",
      tenantPhone: "CLASS Org Profile",
      domains: "CLASS Org Profile",
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
    tenantCreatedAt: new Date("2016-11-08T11:30:00Z"),
    tenantMailingAddress: {
      number: "27",
      street: "Calle de Serrano",
      city: "Madrid",
      stateProvince: "Comunidad de Madrid",
      postalCode: "28001",
      country: "Spain",
    },
    tenantPhone: "+34 91 555 0100",
    domains: [
      { name: "corp-iberia.example",         verified: true,  isPrimary: true,  domainType: "custom" },
      { name: "corp-iberia.onmicrosoft.com", verified: true,  isPrimary: false, domainType: "onmicrosoft" },
      { name: "iberia-corp.es",              verified: true,  isPrimary: false, domainType: "custom" },
    ],
    provenance: {
      exchangeSeatCount: "Lynx",
      hasDerogation: "Concession Tracker",
      hqCountry: "CLASS Org Profile",
      sharePointRegion: "SharePoint Admin",
      defaultStorageRegion: "CLASS Org Profile",
      tenantCreatedAt: "CLASS Org Profile",
      tenantMailingAddress: "CLASS Org Profile",
      tenantPhone: "CLASS Org Profile",
      domains: "CLASS Org Profile",
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
    tenantCreatedAt: new Date("2013-07-22T15:45:00Z"),
    tenantMailingAddress: {
      number: "300",
      street: "South Wacker Drive",
      city: "Chicago",
      stateProvince: "IL",
      postalCode: "60606",
      country: "United States",
    },
    tenantPhone: "+1 312 555 0100",
    domains: [
      { name: "fabrikam.com",             verified: true,  isPrimary: true,  domainType: "custom" },
      { name: "fabrikam.onmicrosoft.com", verified: true,  isPrimary: false, domainType: "onmicrosoft" },
      { name: "fabrikamcorp.com",         verified: true,  isPrimary: false, domainType: "custom" },
    ],
    provenance: {
      exchangeSeatCount: "Lynx",
      hqCountry: "CLASS Org Profile",
      tenantCreatedAt: "CLASS Org Profile",
      tenantMailingAddress: "CLASS Org Profile",
      tenantPhone: "CLASS Org Profile",
      domains: "CLASS Org Profile",
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
    tenantCreatedAt: new Date("2012-02-14T17:10:00Z"),
    tenantMailingAddress: {
      number: "210",
      street: "1st Avenue South",
      city: "Seattle",
      stateProvince: "WA",
      postalCode: "98104",
      country: "United States",
    },
    tenantPhone: "+1 206 555 0100",
    domains: [
      { name: "northwind.example",         verified: true,  isPrimary: true,  domainType: "custom" },
      { name: "northwind.onmicrosoft.com", verified: true,  isPrimary: false, domainType: "onmicrosoft" },
      { name: "northwindtraders.com",      verified: true,  isPrimary: false, domainType: "custom" },
    ],
    provenance: {
      exchangeSeatCount: "Lynx",
      hqCountry: "CLASS Org Profile",
      tenantCreatedAt: "CLASS Org Profile",
      tenantMailingAddress: "CLASS Org Profile",
      tenantPhone: "CLASS Org Profile",
      domains: "CLASS Org Profile",
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
    tenantCreatedAt: new Date("2015-05-19T09:00:00Z"),
    tenantMailingAddress: {
      number: "42",
      street: "Mayfair Place",
      city: "London",
      stateProvince: "Greater London",
      postalCode: "W1J 8AJ",
      country: "United Kingdom",
    },
    tenantPhone: "+44 20 7946 0100",
    domains: [
      { name: "tailwind.co.uk",            verified: true,  isPrimary: true,  domainType: "custom" },
      { name: "tailwind.onmicrosoft.com",  verified: true,  isPrimary: false, domainType: "onmicrosoft" },
      { name: "tailwindgroup.uk",          verified: true,  isPrimary: false, domainType: "custom" },
    ],
    provenance: {
      isS500: "Lynx",
      hqCountry: "CLASS Org Profile",
      sharePointRegion: "SharePoint Admin",
      tenantCreatedAt: "CLASS Org Profile",
      tenantMailingAddress: "CLASS Org Profile",
      tenantPhone: "CLASS Org Profile",
      domains: "CLASS Org Profile",
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
    tenantCreatedAt: new Date("2017-08-30T13:20:00Z"),
    tenantMailingAddress: {
      number: "1500",
      street: "Avenida Paulista",
      city: "São Paulo",
      stateProvince: "SP",
      postalCode: "01310-200",
      country: "Brazil",
    },
    tenantPhone: "+55 11 5555 0100",
    domains: [
      { name: "adventureworks.com.br",            verified: true,  isPrimary: true,  domainType: "custom" },
      { name: "adventureworks-br.onmicrosoft.com", verified: true, isPrimary: false, domainType: "onmicrosoft" },
      // Unverified — registered but DNS verification pending. Demos the
      // amber-warning chip rendering on the OrgPanel.
      { name: "aworks.com.br",                    verified: false, isPrimary: false, domainType: "custom" },
    ],
    provenance: {
      hqCountry: "CLASS Org Profile",
      customContractLanguage: "Concession Tracker",
      tenantCreatedAt: "CLASS Org Profile",
      tenantMailingAddress: "CLASS Org Profile",
      tenantPhone: "CLASS Org Profile",
      domains: "CLASS Org Profile",
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
    tenantCreatedAt: new Date("2017-09-04T08:15:00Z"),
    tenantMailingAddress: {
      number: "12",
      street: "Mainzer Landstraße",
      city: "Frankfurt am Main",
      stateProvince: "Hessen",
      postalCode: "60329",
      country: "Germany",
    },
    tenantPhone: "+49 69 1367 0000",
    domains: [
      { name: "kontoso-de.example",          verified: true,  isPrimary: true,  domainType: "custom" },
      { name: "kontoso-de.onmicrosoft.com",  verified: true,  isPrimary: false, domainType: "onmicrosoft" },
      { name: "mail.kontoso-de.example",     verified: true,  isPrimary: false, domainType: "custom" },
    ],
    provenance: {
      exchangeSeatCount: "Lynx",
      hqCountry: "CLASS Org Profile",
      sharePointRegion: "SharePoint Admin",
      defaultStorageRegion: "CLASS Org Profile",
      tenantCreatedAt: "CLASS Org Profile",
      tenantMailingAddress: "CLASS Org Profile",
      tenantPhone: "CLASS Org Profile",
      domains: "CLASS Org Profile",
    },
  },
  // Globex UK Ltd — corporate-treasury target for LNS-2025-00125 (UK
  // preservation hold). Single-tenant UK org, no parent rollup.
  "globex-uk": {
    tenantId: "8b3f9c2e-7d14-4a26-9e87-f31a02d4c581",
    tenantPrimaryDomain: "globex-uk.example",
    tenantDisplayName: "Globex UK Ltd.",
    hqCountry: "United Kingdom",
    exchangeSeatCount: 1420,
    // Demo seed — matches the case-level `tenantTierCheck` recorded on
    // LNS-2025-00125 (S500 + V100 dual-tier). Tier-check CTA writes
    // through to org, so the OrgPanel badges + queue chip render
    // post-recording.
    isS500: true,
    isV100: true,
    hasDerogation: false,
    customContractLanguage: false,
    accountManager: {
      name: "Priya Iyer",
      email: "piyer@microsoft.com",
    },
    adminContact: {
      name: "Michael Thompson",
      email: "tenant.admin@globex-uk.example",
      phone: "+44 20 7946 0480",
    },
    sharePointRegion: "UK South",
    defaultStorageRegion: "UK",
    tenantCreatedAt: new Date("2019-01-15T10:00:00Z"),
    tenantMailingAddress: {
      number: "30",
      street: "Cabot Square",
      city: "London",
      stateProvince: "Greater London",
      postalCode: "E14 4QQ",
      country: "United Kingdom",
    },
    tenantPhone: "+44 20 7946 0450",
    domains: [
      { name: "globex-uk.example",         verified: true,  isPrimary: true,  domainType: "custom" },
      { name: "globex-uk.onmicrosoft.com", verified: true,  isPrimary: false, domainType: "onmicrosoft" },
    ],
    provenance: {
      hqCountry: "CLASS Org Profile",
      sharePointRegion: "SharePoint Admin",
      tenantCreatedAt: "CLASS Org Profile",
      tenantMailingAddress: "CLASS Org Profile",
      tenantPhone: "CLASS Org Profile",
      domains: "CLASS Org Profile",
    },
  },
  // ACME IT — Italian enterprise for LNS-2026-00210 (manifest-error
  // mismatch path on the Enterprise-detected branch). Mid-market tenant
  // headquartered in Milan.
  "acme-it": {
    tenantId: "2c7b6d31-4a18-4e89-bf02-91a4e0d59b73",
    tenantPrimaryDomain: "acme-it.onmicrosoft.com",
    tenantDisplayName: "ACME IT S.r.l.",
    hqCountry: "Italy",
    exchangeSeatCount: 980,
    // Demo seed — matches the case-level `tenantTierCheck` recorded
    // on LNS-2026-00210. The tier-check CTA writes through to the
    // org so the OrgPanel S500 badge renders post-recording.
    isS500: true,
    hasDerogation: false,
    customContractLanguage: false,
    accountManager: {
      name: "Luca Bianchi",
      email: "lbianchi@microsoft.com",
    },
    adminContact: {
      name: "Giulia Conti",
      email: "tenant.admin@acme-it.com",
      phone: "+39 02 7212 3400",
    },
    sharePointRegion: "EU West",
    defaultStorageRegion: "EU",
    tenantCreatedAt: new Date("2021-10-04T12:45:00Z"),
    tenantMailingAddress: {
      number: "8",
      street: "Corso Buenos Aires",
      city: "Milano",
      stateProvince: "MI",
      postalCode: "20124",
      country: "Italy",
    },
    tenantPhone: "+39 02 7212 3000",
    domains: [
      // Newer tenant — still operating on the onmicrosoft.com default
      // as the primary; the custom acme-it.com domain was registered
      // but DNS verification hasn't completed. Demos the "early-stage
      // tenant" scenario.
      { name: "acme-it.onmicrosoft.com", verified: true,  isPrimary: true,  domainType: "onmicrosoft" },
      { name: "acme-it.com",             verified: false, isPrimary: false, domainType: "custom" },
    ],
    provenance: {
      hqCountry: "CLASS Org Profile",
      sharePointRegion: "SharePoint Admin",
      tenantCreatedAt: "CLASS Org Profile",
      tenantMailingAddress: "CLASS Org Profile",
      tenantPhone: "CLASS Org Profile",
      domains: "CLASS Org Profile",
    },
  },
  // Stichting Leiden Holding — Dutch corporate-fraud target shared by
  // LNS-2026-00220 (preservation order) and LNS-2026-00230 (follow-on
  // EPOC-ER). Single tenant, Netherlands HQ.
  "stichting-leiden-nl": {
    tenantId: "5f02a18c-3e64-4b92-a371-87d1f0c4e215",
    tenantPrimaryDomain: "stichting-leiden.example",
    tenantDisplayName: "Stichting Leiden Holding B.V.",
    hqCountry: "Netherlands",
    exchangeSeatCount: 2150,
    isS500: false,
    hasDerogation: false,
    customContractLanguage: false,
    accountManager: {
      name: "Eva van der Berg",
      email: "evanderberg@microsoft.com",
    },
    adminContact: {
      name: "Pieter de Jong",
      email: "tenant.admin@stichting-leiden.example",
      phone: "+31 71 521 4040",
    },
    sharePointRegion: "EU West",
    defaultStorageRegion: "EU",
    tenantCreatedAt: new Date("2014-12-03T09:15:00Z"),
    tenantMailingAddress: {
      number: "5",
      street: "Rapenburg",
      city: "Leiden",
      stateProvince: "Zuid-Holland",
      postalCode: "2311 EV",
      country: "Netherlands",
    },
    tenantPhone: "+31 71 521 4000",
    domains: [
      { name: "stichting-leiden.example",         verified: true,  isPrimary: true,  domainType: "custom" },
      { name: "stichting-leiden.onmicrosoft.com", verified: true,  isPrimary: false, domainType: "onmicrosoft" },
      { name: "stichtingleiden.nl",               verified: true,  isPrimary: false, domainType: "custom" },
    ],
    provenance: {
      hqCountry: "CLASS Org Profile",
      sharePointRegion: "SharePoint Admin",
      tenantCreatedAt: "CLASS Org Profile",
      tenantMailingAddress: "CLASS Org Profile",
      tenantPhone: "CLASS Org Profile",
      domains: "CLASS Org Profile",
    },
  },
  // ─── TPID rollup parent tenants ──────────────────────────────────────
  // Holding-company tenants associated with a TPID. The convention is
  // `tenantId === parentTpid` so `getParentTenantOrg(parentTpid)` can
  // resolve them with a single lookup. They have NO `parentTpid` of
  // their own (they're the root) and carry the consolidated registered
  // domains for the group.
  //
  // The OrgPanel surfaces these alongside child-tenant domains when
  // the target identifier belongs to a child of the TPID.

  "contoso-holdings": {
    tenantId: "TPID-CONTOSO",
    tenantPrimaryDomain: "contoso-holdings.com",
    tenantDisplayName: "Contoso Holdings",
    hqCountry: "United States",
    exchangeSeatCount: 156000, // aggregate across child tenants
    isS500: true,
    hasDerogation: false,
    customContractLanguage: true,
    accountManager: {
      name: "Sarah Chen",
      email: "schen@microsoft.com",
      raveLink: "https://rave.example/contoso-holdings",
    },
    adminContact: {
      name: "Vivian Park",
      email: "tenant.admin@contoso-holdings.com",
      phone: "+1 425 555 0500",
    },
    sharePointRegion: "US East",
    defaultStorageRegion: "US",
    tenantCreatedAt: new Date("2011-06-15T14:00:00Z"),
    tenantMailingAddress: {
      number: "1",
      street: "Microsoft Way",
      city: "Redmond",
      stateProvince: "WA",
      postalCode: "98052",
      country: "United States",
    },
    tenantPhone: "+1 425 555 0500",
    domains: [
      { name: "contoso-holdings.com",            verified: true,  isPrimary: true,  domainType: "custom" },
      { name: "contoso-holdings.onmicrosoft.com", verified: true, isPrimary: false, domainType: "onmicrosoft" },
      { name: "contosogroup.com",                verified: true,  isPrimary: false, domainType: "custom" },
      { name: "contoso-corporate.com",           verified: true,  isPrimary: false, domainType: "custom" },
    ],
    provenance: {
      exchangeSeatCount: "Lynx",
      isS500: "Lynx",
      hqCountry: "CLASS Org Profile",
      tenantCreatedAt: "CLASS Org Profile",
      tenantMailingAddress: "CLASS Org Profile",
      tenantPhone: "CLASS Org Profile",
      domains: "CLASS Org Profile",
    },
  },

  "kontoso-holdings": {
    tenantId: "TPID-KONTOSO",
    tenantPrimaryDomain: "kontoso.example",
    tenantDisplayName: "Kontoso Holdings",
    hqCountry: "Germany",
    exchangeSeatCount: 6500, // single-child for now
    isS500: false,
    hasDerogation: false,
    customContractLanguage: false,
    accountManager: {
      name: "Klaus Weber",
      email: "kweber@microsoft.com",
    },
    adminContact: {
      name: "Bettina Schäfer",
      email: "tenant.admin@kontoso.example",
      phone: "+49 69 1367 0500",
    },
    sharePointRegion: "EU North",
    defaultStorageRegion: "EU",
    tenantCreatedAt: new Date("2015-04-20T09:30:00Z"),
    tenantMailingAddress: {
      number: "55",
      street: "Bockenheimer Landstraße",
      city: "Frankfurt am Main",
      stateProvince: "Hessen",
      postalCode: "60325",
      country: "Germany",
    },
    tenantPhone: "+49 69 1367 0500",
    domains: [
      { name: "kontoso.example",            verified: true,  isPrimary: true,  domainType: "custom" },
      { name: "kontoso.onmicrosoft.com",    verified: true,  isPrimary: false, domainType: "onmicrosoft" },
      { name: "kontoso-group.example",      verified: true,  isPrimary: false, domainType: "custom" },
    ],
    provenance: {
      hqCountry: "CLASS Org Profile",
      tenantCreatedAt: "CLASS Org Profile",
      tenantMailingAddress: "CLASS Org Profile",
      tenantPhone: "CLASS Org Profile",
      domains: "CLASS Org Profile",
    },
  },

  // Italian Parliament — LNS-2026-00240 (Full GFR / immunities path).
  // Subject is an MP carrying parliamentary immunity; the Enterprise
  // surface lets the attorney see the org-level posture (sovereign
  // institution, single-country) alongside the GFR ruling.
  "parlamento-it": {
    tenantId: "9d18c7e2-5f63-4cb0-a4e3-12a8d0739f56",
    tenantPrimaryDomain: "parlamento.it",
    tenantDisplayName: "Parlamento Italiano",
    hqCountry: "Italy",
    exchangeSeatCount: 1200,
    isS500: false,
    hasDerogation: true,
    customContractLanguage: true,
    accountManager: {
      name: "Marco Romano",
      email: "mromano@microsoft.com",
    },
    adminContact: {
      name: "Dott.ssa Sofia Russo",
      email: "ict.admin@parlamento.it",
      phone: "+39 06 6760 6000",
    },
    sharePointRegion: "EU West",
    defaultStorageRegion: "EU",
    provenance: {
      hqCountry: "CLASS Org Profile",
      hasDerogation: "Concession Tracker",
      customContractLanguage: "Concession Tracker",
    },
  },
  // Polish newspaper — LNS-2026-00250 (Partial GFR / press-freedom path).
  // Journalist's enterprise mailbox hosted by the paper's tenant. The
  // Enterprise surface lets the attorney see the press-org context
  // alongside the EA's Partial-GFR block on this LDTask.
  "dziennik-pl": {
    tenantId: "3a91b502-7c14-4b86-9e25-d04f56a8c719",
    tenantPrimaryDomain: "dziennik.example",
    tenantDisplayName: "Dziennik Press Sp. z o.o.",
    hqCountry: "Poland",
    exchangeSeatCount: 480,
    isS500: false,
    hasDerogation: false,
    customContractLanguage: false,
    accountManager: {
      name: "Aleksandra Nowak",
      email: "anowak@microsoft.com",
    },
    adminContact: {
      name: "Tomasz Wójcik",
      email: "tenant.admin@dziennik.example",
      phone: "+48 22 555 80 00",
    },
    sharePointRegion: "EU West",
    defaultStorageRegion: "EU",
    provenance: {
      hqCountry: "CLASS Org Profile",
      sharePointRegion: "SharePoint Admin",
    },
  },
  // Kontoso International — LNS-2026-00310 (LE service-mapping failure
  // demo). Generic mid-market enterprise tenant — the demo focus is the
  // service-name resolver pipeline, not org-specific UX, but the
  // Enterprise UX still wants a real org seed for the OrgPanel render.
  "kontoso-intl": {
    tenantId: "6a4e29c1-8f70-4d35-b612-c08f3a0e975b",
    tenantPrimaryDomain: "kontoso.example",
    tenantDisplayName: "Kontoso International Ltd.",
    hqCountry: "Ireland",
    exchangeSeatCount: 3200,
    isS500: false,
    hasDerogation: false,
    customContractLanguage: false,
    accountManager: {
      name: "Aoife Murphy",
      email: "amurphy@microsoft.com",
    },
    adminContact: {
      name: "Cillian O'Connor",
      email: "tenant.admin@kontoso.example",
      phone: "+353 1 706 4000",
    },
    sharePointRegion: "EU West",
    defaultStorageRegion: "EU",
    provenance: {
      hqCountry: "CLASS Org Profile",
      sharePointRegion: "SharePoint Admin",
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
    tenantCreatedAt: new Date("2016-04-26T13:00:00Z"),
    tenantMailingAddress: {
      number: "37",
      street: "Quai du Président Roosevelt",
      city: "Issy-les-Moulineaux",
      stateProvince: "Île-de-France",
      postalCode: "92130",
      country: "France",
    },
    tenantPhone: "+33 1 42 60 30 00",
    domains: [
      // Primary still on onmicrosoft — Contoso France hasn't migrated
      // a verified custom domain to primary, even though both contoso.fr
      // and contoso-france.com are verified. Common in early subsidiary
      // rollouts where the parent tenant (Contoso Corp) owns the
      // headline brand domain.
      { name: "contoso-fr.onmicrosoft.com", verified: true, isPrimary: true,  domainType: "onmicrosoft" },
      { name: "contoso.fr",                 verified: true, isPrimary: false, domainType: "custom" },
      { name: "contoso-france.com",         verified: true, isPrimary: false, domainType: "custom" },
    ],
    provenance: {
      exchangeSeatCount: "Lynx",
      hqCountry: "CLASS Org Profile",
      customContractLanguage: "Concession Tracker",
      sharePointRegion: "SharePoint Admin",
      defaultStorageRegion: "CLASS Org Profile",
      tenantCreatedAt: "CLASS Org Profile",
      tenantMailingAddress: "CLASS Org Profile",
      tenantPhone: "CLASS Org Profile",
      domains: "CLASS Org Profile",
    },
  },
};
