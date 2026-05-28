/**
 * Mock prior LNS cases keyed by `EnterpriseOrgContext.tenantId`.
 *
 * Phase 4 of the prototype-to-prod merge — ported from the prototype's
 * `src/data/mockPriorHistory.ts`. Production wires this from CLASS /
 * LERS's prior-tenant lookup. The PriorTenantHistoryPanel + the
 * PriorCaseDetailPanel render from this map.
 *
 * Tenant ids correspond to entries in `mockOrgs.ts`. Tenants without
 * an entry below render the "No prior LNS cases on file" empty state.
 */

import type { PriorCase } from "../types/caseTypes";

export const MOCK_PRIOR_HISTORY: Record<string, PriorCase[]> = {
  "tenant-fabrikam": [
    {
      caseId: "LNS-2025-00214",
      dateServed: "2025-08-12",
      submitter: { agency: "FBI — Chicago Field Office", person: "SA D. Vega" },
      resolutionStatus: "info_provided",
      attorneyId: "user-att-brad",
      attorneyName: "Brad Andersen",
      agencyCountry: "United States",
      jurisdiction: "US Federal",
      legalDemandType: "Subpoena",
      issuingAuthority: "USAO N.D. Illinois (Grand Jury)",
      natureOfCrime: "Wire fraud",
      identifierTargeted: "m.coleman@fabrikam.com",
      dateResolved: "2025-08-20",
      resolutionNote:
        "Account belonged to terminated employee. Records provided pursuant to subpoena. No enterprise complications.",
      requestType: "Standard",
    },
    {
      caseId: "LNS-2025-00388",
      dateServed: "2025-11-04",
      submitter: { agency: "USAO N.D. Illinois" },
      resolutionStatus: "redirected",
      attorneyId: "user-att-brad",
      attorneyName: "Brad Andersen",
      agencyCountry: "United States",
      jurisdiction: "US Federal",
      legalDemandType: "Court Order",
      issuingAuthority: "U.S. District Court, N.D. Illinois",
      natureOfCrime: "Securities fraud",
      identifierTargeted: "j.alvarez@fabrikam.com",
      dateResolved: "2025-11-12",
      resolutionNote:
        "Request scoped to enterprise CFO inbox covering 18 months of records. Redirected to Fabrikam admin contact (Lisa Reed) per enterprise process; agency confirmed alternate channel.",
      requestType: "Standard",
    },
    {
      caseId: "LNS-2026-00091",
      dateServed: "2026-02-19",
      submitter: { agency: "DEA — Chicago" },
      resolutionStatus: "info_provided",
      attorneyId: "user-att-maria",
      attorneyName: "Maria Velazquez",
      agencyCountry: "United States",
      jurisdiction: "US Federal",
      legalDemandType: "Search Warrant",
      issuingAuthority: "U.S. District Court, N.D. Illinois",
      natureOfCrime: "Controlled substance distribution",
      identifierTargeted: "k.morris@fabrikam.com",
      dateResolved: "2026-02-27",
      resolutionNote:
        "Search warrant scope clearly defined; records produced. Tenant cooperated and matched prior pattern.",
      requestType: "Standard",
    },
  ],
  "tenant-contoso": [
    {
      caseId: "LNS-2025-00501",
      dateServed: "2025-09-30",
      submitter: { agency: "FBI — New York" },
      resolutionStatus: "info_provided",
      attorneyId: "user-att-brad",
      attorneyName: "Brad Andersen",
      agencyCountry: "United States",
      jurisdiction: "US Federal",
      legalDemandType: "Court Order",
      issuingAuthority: "U.S. District Court, S.D.N.Y.",
      natureOfCrime: "Insider trading",
      identifierTargeted: "p.chen@contoso.com",
      dateResolved: "2025-10-15",
      resolutionNote:
        "S500 tenant — required policy review (completed). Records produced after attorney sign-off. Useful precedent for current case.",
      requestType: "Standard",
    },
  ],
  // Iberia (LNS-2026-00180's tenant) — two prior Spanish-jurisdiction
  // cases. Mix of info-provided + redirected so the resolution badges
  // demo both green and orange states.
  "tenant-iberia": [
    {
      caseId: "LNS-2025-00471",
      dateServed: "2025-10-21",
      submitter: {
        agency: "Mossos d'Esquadra — Unitat Central de Cibercriminalitat",
        person: "Inspector R. Vives",
      },
      resolutionStatus: "info_provided",
      attorneyName: "Marta Echevarría",
      agencyCountry: "Spain",
      jurisdiction: "Catalonia / National",
      legalDemandType: "EPOC (Production Order)",
      issuingAuthority: "Juzgado Central de Instrucción nº 4 (Audiencia Nacional)",
      natureOfCrime: "Organised cybercrime",
      identifierTargeted: "j.serra@corp-iberia.example",
      dateResolved: "2025-11-02",
      resolutionNote:
        "Validating-judge warrant covered subscriber + traffic data only; content data declined. Records produced within scope. Precedent for the current OCA-VA case.",
      requestType: "eEvidence",
    },
    {
      caseId: "LNS-2026-00042",
      dateServed: "2026-01-15",
      submitter: { agency: "Guardia Civil — Grupo de Delitos Telemáticos" },
      resolutionStatus: "redirected",
      attorneyName: "Brad Andersen",
      agencyCountry: "Spain",
      jurisdiction: "National",
      legalDemandType: "Production Order",
      issuingAuthority: "Juzgado de Instrucción nº 12 de Madrid",
      natureOfCrime: "Money laundering",
      identifierTargeted: "finanzas@corp-iberia.example",
      dateResolved: "2026-01-23",
      resolutionNote:
        "Request hit an enterprise treasury mailbox under controller relationship. Redirected to tenant admin (Carlos Vidal) per enterprise process; agency acknowledged.",
      requestType: "Standard",
    },
  ],
  "tenant-northwind": [],
  "tenant-tailwind": [
    {
      caseId: "LNS-2025-00622",
      dateServed: "2025-12-14",
      submitter: { agency: "Metropolitan Police Service" },
      resolutionStatus: "withdrawn",
      attorneyName: "Brad Andersen",
      agencyCountry: "United Kingdom",
      jurisdiction: "UK National",
      legalDemandType: "Production Order",
      issuingAuthority: "Westminster Magistrates' Court",
      natureOfCrime: "Fraud — investigation discontinued",
      identifierTargeted: "compliance@tailwind.co.uk",
      dateResolved: "2026-01-08",
      resolutionNote:
        "Agency withdrew the request after the underlying investigation closed. No data produced.",
      requestType: "Standard",
    },
  ],
  "tenant-adventure-works": [],
  // Kontoso GmbH (LNS-2026-00150's tenant) — one prior preservation
  // request, demonstrates a routine in-jurisdiction precedent.
  "tenant-kontoso-de": [
    {
      caseId: "LNS-2025-00715",
      dateServed: "2025-12-03",
      submitter: {
        agency: "Bundeskriminalamt — Cybercrime",
        person: "KOK Andreas Bauer",
      },
      resolutionStatus: "info_provided",
      attorneyName: "Marta Echevarría",
      agencyCountry: "Germany",
      jurisdiction: "Federal",
      legalDemandType: "Production Order (StPO §100j)",
      issuingAuthority: "Amtsgericht Frankfurt am Main",
      natureOfCrime: "Trade-secret theft",
      identifierTargeted: "h.koch@kontoso-de.example",
      dateResolved: "2025-12-19",
      resolutionNote:
        "Subscriber + traffic data produced under standard German production order. No controller-relationship complications.",
      requestType: "Standard",
    },
  ],
  // Contoso France SAS (LNS-2026-00200's tenant) — one redirected
  // precedent, supports the controller-route narrative on the current
  // case.
  "tenant-contoso-fr": [
    {
      caseId: "LNS-2025-00598",
      dateServed: "2025-11-20",
      submitter: { agency: "Police Nationale — Brigade des Fraudes" },
      resolutionStatus: "redirected",
      attorneyName: "Brad Andersen",
      agencyCountry: "France",
      jurisdiction: "National",
      legalDemandType: "Réquisition Judiciaire",
      issuingAuthority: "Tribunal Judiciaire de Paris",
      natureOfCrime: "Industrial espionage",
      identifierTargeted: "directeur@contoso-fr.onmicrosoft.com",
      dateResolved: "2025-11-28",
      resolutionNote:
        "Enterprise CFO mailbox under controller relationship. Redirected to tenant admin (Hélène Moreau) per enterprise process — agency confirmed alternate channel.",
      requestType: "Standard",
    },
  ],
};
