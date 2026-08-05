"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { HelpCircle, Plus, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ConfigureConnectionOverlay } from "@/components/builder/overlays/add-connection-overlay";
import { AiGatewayConsentOverlay } from "@/components/builder/overlays/ai-gateway-consent-overlay";
import { useOverlay } from "@/components/builder/overlays/overlay-provider";
import { Button } from "@/components/builder/ui/button";
import { IntegrationIcon } from "@/components/builder/ui/integration-icon";
import { IntegrationSelector } from "@/components/builder/ui/integration-selector";
import { Label } from "@/components/builder/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/builder/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/builder/ui/tooltip";
import { aiGatewayStatusAtom } from "@/lib/builder/ai-gateway/state";
import {
  integrationsAtom,
  integrationsVersionAtom,
} from "@/lib/builder/integrations-store";
import type { IntegrationType } from "@/lib/builder/types/integration";
import type { Template } from "@/types";
import {
  findActionById,
  getActionsByCategory,
  getAllIntegrations,
  isFieldGroup,
  type ActionConfigField,
} from "@/lib/builder/plugins";
import { templateService } from "@/services/templateService";
import { ActionConfigRenderer } from "./action-config-renderer";
import { WhatsAppPreview } from "./whatsapp-preview";
import {
  SystemActionFields,
  ExecutionFields,
  SendTemplatePanel,
  SendButtonsPanel,
} from "./action-panels";

// Types
export interface ActionConfigProps {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
  isOwner?: boolean;
}

// System actions that don't have plugins
const SYSTEM_ACTIONS: Array<{ id: string; label: string }> = [
  { id: "HTTP Request", label: "Requisição HTTP" },
  { id: "Database Query", label: "Consulta ao banco" },
  { id: "Condition", label: "Condição" },
];

const SYSTEM_ACTION_IDS = SYSTEM_ACTIONS.map((a) => a.id);

// System actions that need integrations (not in plugin registry)
const SYSTEM_ACTION_INTEGRATIONS: Record<string, IntegrationType> = {
  "Database Query": "database",
};

// Build category mapping dynamically from plugins + System
function useCategoryData() {
  return useMemo(() => {
    const pluginCategories = getActionsByCategory();

    // Build category map including System with both id and label
    const allCategories: Record<string, Array<{ id: string; label: string }>> = {
      Sistema: SYSTEM_ACTIONS,
    };

    for (const [category, actions] of Object.entries(pluginCategories || {})) {
      if (!Array.isArray(actions)) {
        continue;
      }
      allCategories[category] = actions.map((a) => ({
        id: a.id,
        label: a.label,
      }));
    }

    return allCategories;
  }, []);
}

// Get category for an action type (supports both new IDs, labels, and legacy labels)
function getCategoryForAction(actionType: string): string | null {
  // Check system actions first
  if (SYSTEM_ACTION_IDS.includes(actionType)) {
    return "Sistema";
  }

  // Use findActionById which handles legacy labels from plugin registry
  const action = findActionById(actionType);
  if (action?.category) {
    return action.category;
  }

  return null;
}

// Normalize action type to new ID format (handles legacy labels via findActionById)
function normalizeActionType(actionType: string): string {
  // Check system actions first - they use their label as ID
  if (SYSTEM_ACTION_IDS.includes(actionType)) {
    return actionType;
  }

  // Use findActionById which handles legacy labels and returns the proper ID
  const action = findActionById(actionType);
  if (action) {
    return action.id;
  }

  return actionType;
}

export function ActionConfig({
  config,
  onUpdateConfig,
  disabled,
  isOwner = true,
}: ActionConfigProps) {
  const actionType = (config?.actionType as string) || "";
  const categories = useCategoryData();
  const integrations = useMemo(() => getAllIntegrations(), []);

  const selectedCategory = actionType ? getCategoryForAction(actionType) : null;
  const [category, setCategory] = useState<string>(selectedCategory || "");
  const setIntegrationsVersion = useSetAtom(integrationsVersionAtom);
  const globalIntegrations = useAtomValue(integrationsAtom);
  const { push } = useOverlay();

  // AI Gateway managed keys state
  const aiGatewayStatus = useAtomValue(aiGatewayStatusAtom);

  // Sync category state when actionType changes (e.g., when switching nodes)
  useEffect(() => {
    const newCategory = actionType ? getCategoryForAction(actionType) : null;
    setCategory(newCategory || "");
  }, [actionType]);

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    // Auto-select the first action in the new category
    const firstAction = categories[newCategory]?.[0];
    if (firstAction) {
      onUpdateConfig("actionType", firstAction.id);
    }
  };

  const handleActionTypeChange = (value: string) => {
    onUpdateConfig("actionType", value);
  };

  // Adapter for plugin config components that expect (key, value: unknown)
  const handlePluginUpdateConfig = (key: string, value: unknown) => {
    onUpdateConfig(key, String(value));
  };

  // Get dynamic config fields for plugin actions
  const pluginAction = actionType ? findActionById(actionType) : null;
  const isSendTemplateAction = pluginAction?.slug === "send-template";
  const isSendButtonsAction = pluginAction?.slug === "send-buttons";
  const isWhatsappAction = pluginAction?.integration === "whatsapp";

  // Fetch templates only for send-template action
  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: templateService.getAll,
    enabled: Boolean(isSendTemplateAction),
  });

  const templateNameValue = String(config?.templateName || "");
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.name === templateNameValue),
    [templates, templateNameValue]
  );

  // Filter plugin fields - exclude fields handled by specialized panels
  const pluginFields: ActionConfigField[] = useMemo(() => {
    if (!pluginAction) return [];
    if (!isSendTemplateAction && !isSendButtonsAction && !isWhatsappAction) {
      return pluginAction.configFields;
    }

    const filtered = pluginAction.configFields
      .map((field) => {
        if (isFieldGroup(field)) {
          const fields = field.fields.filter((inner) => {
            if (
              isSendTemplateAction &&
              [
                "templateName",
                "toSource",
                "to",
                "language",
                "parameterFormat",
                "bodyParams",
                "headerParams",
                "buttonParams",
              ].includes(inner.key)
            ) {
              return false;
            }
            if (
              isSendButtonsAction &&
              ["toSource", "to", "body", "headerText", "footer", "buttons"].includes(
                inner.key
              )
            ) {
              return false;
            }
            if (isWhatsappAction && ["toSource", "to"].includes(inner.key)) {
              return false;
            }
            return true;
          });
          return { ...field, fields };
        }
        return field;
      })
      .filter((field) => {
        if (isFieldGroup(field)) return field.fields.length > 0;
        if (
          isSendTemplateAction &&
          [
            "templateName",
            "toSource",
            "to",
            "language",
            "parameterFormat",
            "bodyParams",
            "headerParams",
            "buttonParams",
          ].includes(field.key)
        ) {
          return false;
        }
        if (
          isSendButtonsAction &&
          ["toSource", "to", "body", "headerText", "footer", "buttons"].includes(
            field.key
          )
        ) {
          return false;
        }
        if (isWhatsappAction && ["toSource", "to"].includes(field.key)) {
          return false;
        }
        return true;
      });

    return filtered;
  }, [isSendButtonsAction, isSendTemplateAction, isWhatsappAction, pluginAction]);

  // Auto-set WhatsApp action defaults
  useEffect(() => {
    if (!isWhatsappAction) return;
    if (config?.toSource !== "inbound") {
      onUpdateConfig("toSource", "inbound");
    }
    if (config?.to) {
      onUpdateConfig("to", "");
    }
  }, [config?.to, config?.toSource, isWhatsappAction, onUpdateConfig]);

  // Determine the integration type for the current action
  const integrationType: IntegrationType | undefined = useMemo(() => {
    if (!actionType) {
      return;
    }

    // Check system actions first
    if (SYSTEM_ACTION_INTEGRATIONS[actionType]) {
      return SYSTEM_ACTION_INTEGRATIONS[actionType];
    }

    // Check plugin actions
    const action = findActionById(actionType);
    return action?.integration as IntegrationType | undefined;
  }, [actionType]);

  // Check if AI Gateway managed keys should be offered (user can have multiple for different teams)
  const shouldUseManagedKeys =
    integrationType === "ai-gateway" &&
    aiGatewayStatus?.enabled &&
    aiGatewayStatus?.isVercelUser;

  // Check if there are existing connections for this integration type
  const hasExistingConnections = useMemo(() => {
    if (!integrationType) return false;
    return globalIntegrations.some((i) => i.type === integrationType);
  }, [integrationType, globalIntegrations]);

  const handleConsentSuccess = (integrationId: string) => {
    onUpdateConfig("integrationId", integrationId);
    setIntegrationsVersion((v) => v + 1);
  };

  const openConnectionOverlay = () => {
    if (integrationType) {
      push(ConfigureConnectionOverlay, {
        type: integrationType,
        onSuccess: (integrationId: string) => {
          setIntegrationsVersion((v) => v + 1);
          onUpdateConfig("integrationId", integrationId);
        },
      });
    }
  };

  const handleAddSecondaryConnection = () => {
    if (shouldUseManagedKeys) {
      push(AiGatewayConsentOverlay, {
        onConsent: handleConsentSuccess,
        onManualEntry: openConnectionOverlay,
      });
    } else {
      openConnectionOverlay();
    }
  };

  const showConnection = Boolean(
    integrationType && isOwner && integrationType !== "whatsapp"
  );
  const showExecutionFields = false;

  return (
    <>
      {/* Category and Action Type Selectors */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="ml-1" htmlFor="actionCategory">
            Service
          </Label>
          <Select
            disabled={disabled}
            onValueChange={handleCategoryChange}
            value={category || undefined}
          >
            <SelectTrigger className="w-full" id="actionCategory">
            <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="System">
                <div className="flex items-center gap-2">
                  <Settings className="size-4" />
                  <span>Sistema</span>
                </div>
              </SelectItem>
              <SelectSeparator />
              {integrations.map((integration) => (
                <SelectItem key={integration.type} value={integration.label}>
                  <div className="flex items-center gap-2">
                    <IntegrationIcon
                      className="size-4"
                      integration={integration.type}
                    />
                    <span>{integration.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="ml-1" htmlFor="actionType">
            Ação
          </Label>
          <Select
            disabled={disabled || !category}
            onValueChange={handleActionTypeChange}
            value={normalizeActionType(actionType) || undefined}
          >
            <SelectTrigger className="w-full" id="actionType">
              <SelectValue placeholder="Selecione a ação" />
            </SelectTrigger>
            <SelectContent>
              {category &&
                categories[category]?.map((action) => (
                  <SelectItem key={action.id} value={action.id}>
                    {action.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Integration Connection Selector */}
      {showConnection && integrationType && (
        <div className="space-y-2">
          <div className="ml-1 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Label>Conexão</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="size-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Chave de API ou credenciais OAuth deste servico</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {hasExistingConnections && (
              <Button
                className="size-6"
                disabled={disabled}
                onClick={handleAddSecondaryConnection}
                size="icon"
                variant="ghost"
              >
                <Plus className="size-4" />
              </Button>
            )}
          </div>
          <IntegrationSelector
            disabled={disabled}
            integrationType={integrationType}
            onChange={(id) => onUpdateConfig("integrationId", id)}
            value={(config?.integrationId as string) || ""}
          />
        </div>
      )}

      {/* System Action Fields */}
      <SystemActionFields
        actionType={(config?.actionType as string) || ""}
        config={config}
        disabled={disabled}
        onUpdateConfig={onUpdateConfig}
      />

      {/* Execution Fields (currently hidden) */}
      {actionType && showExecutionFields && (
        <ExecutionFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Plugin Action Fields */}
      {pluginAction && !SYSTEM_ACTION_IDS.includes(actionType) && (
        <div className="space-y-4">
          {/* Send Template Panel */}
          {isSendTemplateAction && (
            <SendTemplatePanel
              config={config}
              disabled={disabled}
              onUpdateConfig={onUpdateConfig}
            />
          )}

          {/* Send Buttons Panel */}
          {isSendButtonsAction && (
            <SendButtonsPanel
              config={config}
              disabled={disabled}
              onUpdateConfig={onUpdateConfig}
            />
          )}

          {/* Generic Plugin Fields */}
          {(!isSendButtonsAction || pluginFields.length > 0) && (
            <ActionConfigRenderer
              config={config}
              disabled={disabled}
              fields={pluginFields}
              onUpdateConfig={handlePluginUpdateConfig}
            />
          )}

          {/* WhatsApp Preview */}
          {pluginAction.integration === "whatsapp" && !isSendTemplateAction && (
            <WhatsAppPreview
              actionType={actionType}
              config={config}
              template={selectedTemplate}
            />
          )}
        </div>
      )}
    </>
  );
}
