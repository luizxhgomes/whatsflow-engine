import type { IntegrationType } from "@/lib/builder/types/integration";

// Regex constants for workflow name processing
export const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9\s]/g;
export const WORD_SPLIT_REGEX = /\s+/;

// System actions that need integrations (not in plugin registry)
export const SYSTEM_ACTION_INTEGRATIONS: Record<string, IntegrationType> = {
  "Database Query": "database",
};

// Global WhatsApp integration ID for actions that don't have a specific integration
export const WHATSAPP_GLOBAL_INTEGRATION_ID = "whatsapp-global";
