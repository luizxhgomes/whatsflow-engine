"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { api } from "@/lib/builder/api-client";
import { integrationsAtom } from "@/lib/builder/integrations-store";
import { findActionById } from "@/lib/builder/plugins";
import type { IntegrationType } from "@/lib/builder/types/integration";
import {
  isWorkflowOwnerAtom,
  pendingIntegrationNodesAtom,
  updateNodeDataAtom,
} from "@/lib/builder/workflow-store";
import {
  SYSTEM_ACTION_INTEGRATIONS,
  WHATSAPP_GLOBAL_INTEGRATION_ID,
} from "./constants";
import type { WorkflowNode } from "./types";

/**
 * Hook to automatically select an integration when only one is available for an action type.
 * Also handles auto-fixing invalid integration references when a node is selected.
 */
export function useAutoSelectIntegration(selectedNode: WorkflowNode | null) {
  const globalIntegrations = useAtomValue(integrationsAtom);
  const isOwner = useAtomValue(isWorkflowOwnerAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const setPendingIntegrationNodes = useSetAtom(pendingIntegrationNodesAtom);
  const autoSelectAbortControllersRef = useRef<Record<string, AbortController>>(
    {}
  );

  // Auto-fix invalid integration references when a node is selected
  useEffect(() => {
    if (!(selectedNode && isOwner)) {
      return;
    }

    const actionType = selectedNode.data.config?.actionType as string | undefined;
    const currentIntegrationId = selectedNode.data.config?.integrationId as
      | string
      | undefined;

    // Skip if no action type or no integration configured
    if (!(actionType && currentIntegrationId)) {
      return;
    }

    // Get the required integration type for this action
    const action = findActionById(actionType);
    const integrationType: IntegrationType | undefined =
      (action?.integration as IntegrationType | undefined) ||
      SYSTEM_ACTION_INTEGRATIONS[actionType];

    if (!integrationType) {
      return;
    }

    // Check if current integration still exists
    const integrationExists = globalIntegrations.some(
      (i) => i.id === currentIntegrationId
    );

    if (
      integrationExists ||
      currentIntegrationId === WHATSAPP_GLOBAL_INTEGRATION_ID
    ) {
      return;
    }

    // Current integration was deleted - find a replacement
    const availableIntegrations = globalIntegrations.filter(
      (i) => i.type === integrationType
    );

    if (availableIntegrations.length === 1) {
      // Auto-select the only available integration
      const newConfig = {
        ...selectedNode.data.config,
        integrationId: availableIntegrations[0].id,
      };
      updateNodeData({ id: selectedNode.id, data: { config: newConfig } });
    } else if (availableIntegrations.length === 0) {
      // No integrations available - clear the invalid reference
      const newConfig = {
        ...selectedNode.data.config,
        integrationId: undefined,
      };
      updateNodeData({ id: selectedNode.id, data: { config: newConfig } });
    }
    // If multiple integrations exist, let the user choose manually
  }, [selectedNode, globalIntegrations, isOwner, updateNodeData]);

  // Auto-select integration when action type changes
  const autoSelectIntegration = useCallback(
    async (
      nodeId: string,
      actionType: string,
      currentConfig: Record<string, unknown>,
      abortSignal: AbortSignal
    ) => {
      // Get integration type - check plugin registry first, then system actions
      const action = findActionById(actionType);
      const integrationType: IntegrationType | undefined =
        (action?.integration as IntegrationType | undefined) ||
        SYSTEM_ACTION_INTEGRATIONS[actionType];

      if (!integrationType) {
        // No integration needed, remove from pending
        setPendingIntegrationNodes((prev: Set<string>) => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
        return;
      }

      try {
        const all = await api.integration.getAll();

        // Check if this operation was aborted (actionType changed)
        if (abortSignal.aborted) {
          return;
        }

        const filtered = all.filter((i) => i.type === integrationType);

        if (integrationType === "whatsapp" && filtered.length === 0) {
          const newConfig = {
            ...currentConfig,
            actionType,
            integrationId: WHATSAPP_GLOBAL_INTEGRATION_ID,
          };
          updateNodeData({ id: nodeId, data: { config: newConfig } });
          return;
        }

        // Auto-select if only one integration exists
        if (filtered.length === 1 && !abortSignal.aborted) {
          const newConfig = {
            ...currentConfig,
            actionType,
            integrationId: filtered[0].id,
          };
          updateNodeData({ id: nodeId, data: { config: newConfig } });
        }
      } catch (error) {
        console.error("Failed to auto-select integration:", error);
      } finally {
        // Always remove from pending set when done (unless aborted)
        if (!abortSignal.aborted) {
          setPendingIntegrationNodes((prev: Set<string>) => {
            const next = new Set(prev);
            next.delete(nodeId);
            return next;
          });
        }
      }
    },
    [updateNodeData, setPendingIntegrationNodes]
  );

  /**
   * Handles config updates and triggers auto-selection when action type changes.
   */
  const handleConfigUpdate = useCallback(
    (
      nodeId: string,
      key: string,
      value: string,
      currentConfig: Record<string, unknown>
    ) => {
      if (key === "actionType") {
        // Cancel any pending auto-select operation for this node
        const existingController = autoSelectAbortControllersRef.current[nodeId];
        if (existingController) {
          existingController.abort();
        }

        // Create new AbortController for this operation
        const newController = new AbortController();
        autoSelectAbortControllersRef.current[nodeId] = newController;

        // Add to pending set before starting async check
        setPendingIntegrationNodes((prev: Set<string>) =>
          new Set(prev).add(nodeId)
        );

        // Clear the integrationId since it may not be valid for the new action
        const newConfig = { ...currentConfig, [key]: value, integrationId: undefined };

        autoSelectIntegration(nodeId, value, newConfig, newController.signal);
      }
    },
    [autoSelectIntegration, setPendingIntegrationNodes]
  );

  return { handleConfigUpdate };
}
