// Shared Microsoft Services Configuration
// This configuration is used across the app for consistent service definitions

export interface MicrosoftService {
  key: string;
  name: string;
  description: string;
  icon?: string;
}

export const MICROSOFT_SERVICES_CONFIG: Record<string, MicrosoftService> = {
  outlook: {
    key: "outlook",
    name: "Microsoft Outlook",
    description: "Email, calendar, and contacts",
    icon: "📧"
  },
  teams: {
    key: "teams",
    name: "Microsoft Teams",
    description: "Chat messages, files, and meetings",
    icon: "👥"
  },
  azure: {
    key: "azure",
    name: "Azure",
    description: "Cloud storage and Azure AD",
    icon: "☁️"
  },
  consumerIPHistory: {
    key: "consumerIPHistory",
    name: "Consumer IP History",
    description: "IP address history and authentication logs",
    icon: "🌐"
  },
  msaServicesUtilized: {
    key: "msaServicesUtilized",
    name: "MSA",
    description: "Microsoft account services, registration, and email history",
    icon: "📊"
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    description: "Enterprise organizational profile, user profile, and SMTP pull",
    icon: "🏢"
  },
  oneDriveSharePoint: {
    key: "oneDriveSharePoint",
    name: "OneDrive SharePoint",
    description: "SharePoint files and sharing activity",
    icon: "📁"
  },
  oneDriveConsumer: {
    key: "oneDriveConsumer",
    name: "OneDrive for Consumer",
    description: "Consumer OneDrive files and sharing",
    icon: "📁"
  },
  skype: {
    key: "skype",
    name: "Skype",
    description: "Chat and call history",
    icon: "📞"
  },
  xbox: {
    key: "xbox",
    name: "XBOX",
    description: "Gaming activity, messages, and profile data",
    icon: "🎮"
  },
};

// Legacy service ID mapping for backward compatibility
export const LEGACY_SERVICE_ID_MAP: Record<string, string> = {
  "exchange": "outlook",
  "onedrive": "oneDriveSharePoint",
};

// Get service configuration by key or legacy ID
export function getServiceConfig(keyOrLegacyId: string): MicrosoftService | undefined {
  // First try direct key lookup
  if (MICROSOFT_SERVICES_CONFIG[keyOrLegacyId]) {
    return MICROSOFT_SERVICES_CONFIG[keyOrLegacyId];
  }
  
  // Try legacy ID mapping
  const modernKey = LEGACY_SERVICE_ID_MAP[keyOrLegacyId];
  if (modernKey && MICROSOFT_SERVICES_CONFIG[modernKey]) {
    return MICROSOFT_SERVICES_CONFIG[modernKey];
  }
  
  return undefined;
}

// Get display name for a service (handles legacy IDs)
export function getServiceDisplayName(keyOrLegacyId: string): string {
  const config = getServiceConfig(keyOrLegacyId);
  if (config) {
    return config.name;
  }
  return keyOrLegacyId;
}