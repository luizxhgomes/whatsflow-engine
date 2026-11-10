import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: false,
  // Provisionar primeiro via CLI com --add-default-grants=false --skip-auth-schema.
  dataApi: {
    authProvider: "external",
    jwksUrl: "https://whatsflow-engine.vercel.app/.well-known/jwks.json",
    providerName: "WhatsFlow",
    jwtAudience: "whatsflow-data",
    settings: {
      dbAnonRole: "anonymous",
      dbSchemas: ["public"],
      jwtRoleClaimKey: ".role",
      dbMaxRows: 1000,
      openapiMode: "disabled",
    },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
