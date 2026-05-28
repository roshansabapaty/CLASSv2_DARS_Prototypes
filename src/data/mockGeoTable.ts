/**
 * Mock IP → geolocation table for the cross-border drill-down feature.
 *
 * Phase 3 of the prototype-to-prod merge — ported from the prototype's
 * `src/data/mockGeoTable.ts`, extended with the IPs the DARS_eEvidence
 * case identifiers reference (Warsaw, Munich, Athens, Brussels).
 *
 * Production wires this through Lynx / Kusto IP-geo enrichment. For the
 * prototype this small lookup table backs the panel deterministically so
 * demos and tests stay reproducible.
 */

import type { GeoLocation } from "../types/crossBorder";

export const GEO_TABLE: Record<string, Omit<GeoLocation, "ip">> = {
  // ── United States ──────────────────────────────────────────────────
  "73.222.14.88": {
    country: "United States", countryCode: "US",
    region: "California", city: "San Francisco",
    latitude: 37.7749, longitude: -122.4194,
    isp: "Comcast Cable", isVpn: false, isTor: false,
  },
  "98.45.201.17": {
    country: "United States", countryCode: "US",
    region: "Washington", city: "Seattle",
    latitude: 47.6062, longitude: -122.3321,
    isp: "AT&T Wireless", isVpn: false, isTor: false,
  },
  "172.58.122.4": {
    country: "United States", countryCode: "US",
    region: "New York", city: "New York",
    latitude: 40.7128, longitude: -74.006,
    isp: "T-Mobile USA", isVpn: false, isTor: false,
  },
  "24.13.55.200": {
    country: "United States", countryCode: "US",
    region: "Illinois", city: "Chicago",
    latitude: 41.8781, longitude: -87.6298,
    isp: "Comcast Cable", isVpn: false, isTor: false,
  },
  "104.32.14.7": {
    country: "United States", countryCode: "US",
    region: "California", city: "Los Angeles",
    latitude: 34.0522, longitude: -118.2437,
    isp: "Spectrum", isVpn: false, isTor: false,
  },
  "67.84.218.40": {
    country: "United States", countryCode: "US",
    region: "Florida", city: "Miami",
    latitude: 25.7617, longitude: -80.1918,
    isp: "Comcast Cable", isVpn: false, isTor: false,
  },
  "207.241.234.15": {
    country: "United States", countryCode: "US",
    region: "California", city: "San Jose",
    latitude: 37.3382, longitude: -121.8863,
    isp: "Charter Communications", isVpn: false, isTor: false,
  },
  "76.102.30.91": {
    country: "United States", countryCode: "US",
    region: "California", city: "Oakland",
    latitude: 37.8044, longitude: -122.2712,
    isp: "Comcast Cable", isVpn: false, isTor: false,
  },

  // ── United Kingdom ─────────────────────────────────────────────────
  "82.132.244.10": {
    country: "United Kingdom", countryCode: "GB",
    region: "England", city: "London",
    latitude: 51.5074, longitude: -0.1278,
    isp: "BT Group", isVpn: false, isTor: false,
  },
  "92.40.176.55": {
    country: "United Kingdom", countryCode: "GB",
    region: "England", city: "Manchester",
    latitude: 53.4808, longitude: -2.2426,
    isp: "Vodafone UK", isVpn: false, isTor: false,
  },
  "86.143.218.20": {
    country: "United Kingdom", countryCode: "GB",
    region: "England", city: "Birmingham",
    latitude: 52.4862, longitude: -1.8904,
    isp: "Sky Broadband", isVpn: false, isTor: false,
  },

  // ── France ─────────────────────────────────────────────────────────
  "90.84.122.18": {
    country: "France", countryCode: "FR",
    region: "Île-de-France", city: "Paris",
    latitude: 48.8566, longitude: 2.3522,
    isp: "Orange S.A.", isVpn: false, isTor: false,
  },
  "82.66.111.49": {
    country: "France", countryCode: "FR",
    region: "Auvergne-Rhône-Alpes", city: "Lyon",
    latitude: 45.764, longitude: 4.8357,
    isp: "Free SAS", isVpn: false, isTor: false,
  },

  // ── Germany ────────────────────────────────────────────────────────
  "84.158.61.200": {
    country: "Germany", countryCode: "DE",
    region: "Berlin", city: "Berlin",
    latitude: 52.52, longitude: 13.405,
    isp: "Deutsche Telekom", isVpn: false, isTor: false,
  },
  "91.45.198.77": {
    country: "Germany", countryCode: "DE",
    region: "Bavaria", city: "Munich",
    latitude: 48.1351, longitude: 11.582,
    isp: "Vodafone Deutschland", isVpn: false, isTor: false,
  },
  "93.214.55.18": {
    country: "Germany", countryCode: "DE",
    region: "Hesse", city: "Frankfurt am Main",
    latitude: 50.1109, longitude: 8.6821,
    isp: "1&1 Versatel", isVpn: false, isTor: false,
  },

  // ── Spain ──────────────────────────────────────────────────────────
  "88.27.142.10": {
    country: "Spain", countryCode: "ES",
    region: "Madrid", city: "Madrid",
    latitude: 40.4168, longitude: -3.7038,
    isp: "Telefónica de España", isVpn: false, isTor: false,
  },
  "80.58.205.66": {
    country: "Spain", countryCode: "ES",
    region: "Catalonia", city: "Barcelona",
    latitude: 41.3851, longitude: 2.1734,
    isp: "Vodafone España", isVpn: false, isTor: false,
  },

  // ── Italy ──────────────────────────────────────────────────────────
  "151.61.85.18": {
    country: "Italy", countryCode: "IT",
    region: "Lazio", city: "Rome",
    latitude: 41.9028, longitude: 12.4964,
    isp: "Telecom Italia (TIM)", isVpn: false, isTor: false,
  },

  // ── Greece ─────────────────────────────────────────────────────────
  "94.66.34.108": {
    country: "Greece", countryCode: "GR",
    region: "Attica", city: "Athens",
    latitude: 37.9838, longitude: 23.7275,
    isp: "OTE — Hellenic Telecommunications", isVpn: false, isTor: false,
  },
  "85.74.211.46": {
    country: "Greece", countryCode: "GR",
    region: "Central Macedonia", city: "Thessaloniki",
    latitude: 40.6401, longitude: 22.9444,
    isp: "Wind Hellas", isVpn: false, isTor: false,
  },

  // ── Poland ─────────────────────────────────────────────────────────
  "83.21.128.42": {
    country: "Poland", countryCode: "PL",
    region: "Mazovia", city: "Warsaw",
    latitude: 52.2297, longitude: 21.0122,
    isp: "Orange Polska", isVpn: false, isTor: false,
  },
  "89.207.142.18": {
    country: "Poland", countryCode: "PL",
    region: "Lesser Poland", city: "Kraków",
    latitude: 50.0647, longitude: 19.945,
    isp: "Netia", isVpn: false, isTor: false,
  },

  // ── Belgium ────────────────────────────────────────────────────────
  "81.246.122.91": {
    country: "Belgium", countryCode: "BE",
    region: "Brussels", city: "Brussels",
    latitude: 50.8503, longitude: 4.3517,
    isp: "Proximus", isVpn: false, isTor: false,
  },

  // ── Portugal ───────────────────────────────────────────────────────
  "188.250.45.91": {
    country: "Portugal", countryCode: "PT",
    region: "Lisbon", city: "Lisbon",
    latitude: 38.7223, longitude: -9.1393,
    isp: "MEO — Altice Portugal", isVpn: false, isTor: false,
  },

  // ── Brazil ─────────────────────────────────────────────────────────
  "187.45.221.9": {
    country: "Brazil", countryCode: "BR",
    region: "São Paulo", city: "São Paulo",
    latitude: -23.5505, longitude: -46.6333,
    isp: "Vivo Fibra", isVpn: false, isTor: false,
  },

  // ── Japan ──────────────────────────────────────────────────────────
  "153.232.18.77": {
    country: "Japan", countryCode: "JP",
    region: "Tokyo", city: "Tokyo",
    latitude: 35.6762, longitude: 139.6503,
    isp: "NTT Docomo", isVpn: false, isTor: false,
  },

  // ── VPN exit nodes (flagged) ───────────────────────────────────────
  "45.83.220.15": {
    country: "Switzerland", countryCode: "CH",
    region: "Zürich", city: "Zürich",
    latitude: 47.3769, longitude: 8.5417,
    isp: "ProtonVPN AG", isVpn: true, isTor: false,
  },
  "185.220.101.42": {
    country: "Netherlands", countryCode: "NL",
    region: "North Holland", city: "Amsterdam",
    latitude: 52.3676, longitude: 4.9041,
    isp: "Mullvad VPN", isVpn: true, isTor: false,
  },
};
