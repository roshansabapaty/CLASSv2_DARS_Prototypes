
# CLASSv2 DARS Prototype — v2.1 UI Enhancements

Interactive prototype demonstrating CLASSv2 v2.1 features for the DARS eEvidence workflow. Use this to visualize how the richer per-account metadata from the v2.1 Related Identifiers and Consumer User Location APIs will surface in the UI.

## Quick Start

```bash
git clone https://github.com/roshanp_microsoft/CLASSv2_DARS_Prototypes.git
cd CLASSv2_DARS_Prototypes
npm install
npm run dev
```

Open **http://localhost:3001/** in your browser.

## Demo Case

Open case **LNS-2026-00325** (CLASSv2 v2.1 Demo) from the case queue. It has two identifiers with real CLASS response data:

| Identifier | Account Type | Data Source |
|------------|-------------|-------------|
| `andyryan@microsoft.com` | Enterprise-and-Consumer | relatedidentifiersspec.md Example 1 |
| `roshankp@outlook.com` | Consumer | relatedidentifiersspec.md Example 2 |

### What to try

1. **Check Accounts** — Click "Check All Accounts" on the case. Both identifiers will resolve with v2.1 structured data.

2. **Related Accounts Panel** — Expand either identifier to see the v2.1 per-account cards:
   - PRIMARY accounts with "Included in collection" badge, relevance indicators, and collapsible alias lists (hover to preview, click to expand, each alias copyable)
   - RELATED accounts with "Discovery only" badge and "See more" pagination
   - Andy Ryan: 2 primary accounts (MSIT Enterprise with 12 aliases + Consumer MSA) and 9 related accounts (4 system-infra + 5 B2B guests)
   - roshankp: 1 primary account (Consumer MSA with 5 aliases) and 5 related accounts (3 B2B guests + 1 Unknown + 1 SystemInfrastructure)

3. **Consumer User Location Summary** — In the identifier table, roshankp shows:
   - ⚠ **Multiple Locations** yellow flag inline (3 countries, dominant: United States)
   - Click the cell or the "Consumer User Locations" button to open the detail panel
   - Summary: consistency indicator, per-country breakdown with login counts
   - Detail: full event list with timestamps, IPs, and countries

4. **Service Profile** — Each primary account card shows a "Service Profile" section with:
   - Per-service existence: Exchange and OneDrive shown as **✓ Yes** (green) or **✗ No** (grey/dimmed)
   - When provisioned: mailbox size, item count, creation date (Exchange) and storage size, file count (OneDrive)
   - Data storage location shown once per account (same region for both services)
   - Enterprise accounts show tenant registered location; warning if storage region differs
   - **Geo Mismatch** warning badge when consumer and enterprise data are stored in different regions (e.g., Andy's enterprise in US, consumer in North Europe)

5. **Service Configuration** — The identifier checkbox triggers data collection for **primary accounts only**. Related accounts are discovery-only (no data collection).

## Key Files

| File | Purpose |
|------|---------|
| `src/components/RelatedAccountsPanel.tsx` | v2.1 per-account display component |
| `src/components/ServiceProfilePanel.tsx` | Per-account service profile (Exchange/OneDrive existence + storage) |
| `src/components/ConsumerUserLocationPanel.tsx` | Location summary + detail drill-down |
| `src/utils/mockCaseDataLENS202600325.ts` | Demo case mock data (real CLASS patterns) |
| `src/types/caseTypes.ts` | v2.1 type definitions (~line 1070) |
| `src/utils/accountExistenceCheck.ts` | Mock check flow with v2.1 data preservation |

## Spec References

- **CLASSv2 v2.1 Spec** (`classv2spec.md`) — Scenarios 7 & 8 for Consumer User Location
- **Related Identifiers Spec** (`relatedidentifiersspec.md`) — Examples 1 & 2 for Andy Ryan and roshankp per-account structures

## Original Project

Based on the DARS v1.9 Case Form redesign. Original Figma: https://www.figma.com/design/reB0ul4I3bzCCqyE2GpXC9/Redesign-DARS-v1.9-Case-Form-list-view
