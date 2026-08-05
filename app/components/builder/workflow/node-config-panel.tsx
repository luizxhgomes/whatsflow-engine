"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/builder/api-client";
import { generateWorkflowCode } from "@/lib/builder/workflow-codegen";
import {
  clearNodeStatusesAtom,
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  deleteEdgeAtom,
  deleteNodeAtom,
  deleteSelectedItemsAtom,
  edgesAtom,
  isGeneratingAtom,
  isWorkflowOwnerAtom,
  newlyCreatedNodeIdAtom,
  nodesAtom,
  propertiesPanelActiveTabAtom,
  selectedEdgeAtom,
  selectedNodeAtom,
  showClearDialogAtom,
  showDeleteDialogAtom,
  updateNodeDataAtom,
} from "@/lib/builder/workflow-store";
import { generateNodeCode } from "./utils/code-generators";
import {
  EdgePropertiesPanel,
  MultiSelectionPanel,
  NodePropertiesPanel,
  NON_ALPHANUMERIC_REGEX,
  useAutoSelectIntegration,
  WORD_SPLIT_REGEX,
  WorkspacePropertiesPanel,
  type WorkflowNode,
} from "./node-config";

/**
 * Main orchestrator component for the node configuration panel.
 * Determines which panel to show based on the current selection state.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Orchestrator component with multiple states
export const PanelInner = () => {
  // Atoms
  const [selectedNodeId] = useAtom(selectedNodeAtom);
  const [selectedEdgeId] = useAtom(selectedEdgeAtom);
  const [nodes] = useAtom(nodesAtom);
  const edges = useAtomValue(edgesAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const [currentWorkflowName, setCurrentWorkflowName] = useAtom(
    currentWorkflowNameAtom
  );
  const isOwner = useAtomValue(isWorkflowOwnerAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const deleteNode = useSetAtom(deleteNodeAtom);
  const deleteEdge = useSetAtom(deleteEdgeAtom);
  const deleteSelectedItems = useSetAtom(deleteSelectedItemsAtom);
  const setShowClearDialog = useSetAtom(showClearDialogAtom);
  const setShowDeleteDialog = useSetAtom(showDeleteDialogAtom);
  const clearNodeStatuses = useSetAtom(clearNodeStatusesAtom);
  const [newlyCreatedNodeId, setNewlyCreatedNodeId] = useAtom(
    newlyCreatedNodeIdAtom
  );
  const [activeTab, setActiveTab] = useAtom(propertiesPanelActiveTabAtom);

  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshRunsRef = useRef<(() => Promise<void>) | null>(null);

  // Derived state
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) as
    | WorkflowNode
    | undefined;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const selectedNodes = nodes.filter((node) => node.selected);
  const selectedEdges = edges.filter((edge) => edge.selected);
  const hasMultipleSelections = selectedNodes.length + selectedEdges.length > 1;

  // Use auto-select integration hook
  const { handleConfigUpdate } = useAutoSelectIntegration(selectedNode ?? null);

  // Switch to Properties tab if Code tab is hidden for the selected node
  useEffect(() => {
    if (!selectedNode || activeTab !== "code") {
      return;
    }

    const isConditionAction =
      selectedNode.data.config?.actionType === "Condition";
    const isManualTrigger =
      selectedNode.data.type === "trigger" &&
      selectedNode.data.config?.triggerType === "Manual";

    if (isConditionAction || isManualTrigger) {
      setActiveTab("properties");
    }
  }, [selectedNode, activeTab, setActiveTab]);

  // Generate workflow code
  const workflowCode = useMemo(() => {
    const baseName =
      currentWorkflowName
        .replace(NON_ALPHANUMERIC_REGEX, "")
        .split(WORD_SPLIT_REGEX)
        .map((word, i) => {
          if (i === 0) {
            return word.toLowerCase();
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join("") || "execute";

    const functionName = `${baseName}Workflow`;

    const { code } = generateWorkflowCode(nodes, edges, { functionName });
    return code;
  }, [nodes, edges, currentWorkflowName]);

  // Handlers
  const handleCopyCode = useCallback(() => {
    if (selectedNode) {
      navigator.clipboard.writeText(generateNodeCode(selectedNode));
    }
  }, [selectedNode]);

  const handleCopyWorkflowCode = useCallback(() => {
    navigator.clipboard.writeText(workflowCode);
    toast.success("Código copiado");
  }, [workflowCode]);

  const handleDeleteNode = useCallback(() => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    }
  }, [selectedNodeId, deleteNode]);

  const handleDeleteEdge = useCallback(() => {
    if (selectedEdgeId) {
      deleteEdge(selectedEdgeId);
    }
  }, [selectedEdgeId, deleteEdge]);

  const handleToggleEnabled = useCallback(() => {
    if (selectedNode) {
      const currentEnabled = selectedNode.data.enabled ?? true;
      updateNodeData({
        id: selectedNode.id,
        data: { enabled: !currentEnabled },
      });
    }
  }, [selectedNode, updateNodeData]);

  const handleDeleteAllRuns = useCallback(async () => {
    if (!currentWorkflowId) {
      return;
    }

    try {
      await api.workflow.deleteExecutions(currentWorkflowId);
      clearNodeStatuses();
    } catch (error) {
      console.error("Failed to delete runs:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete runs";
      toast.error(errorMessage);
    }
  }, [currentWorkflowId, clearNodeStatuses]);

  const handleUpdateLabel = useCallback(
    (label: string) => {
      if (selectedNode) {
        updateNodeData({ id: selectedNode.id, data: { label } });
      }
    },
    [selectedNode, updateNodeData]
  );

  const handleUpdateDescription = useCallback(
    (description: string) => {
      if (selectedNode) {
        updateNodeData({ id: selectedNode.id, data: { description } });
      }
    },
    [selectedNode, updateNodeData]
  );

  const handleUpdateConfig = useCallback(
    (key: string, value: string) => {
      if (selectedNode) {
        let newConfig = { ...selectedNode.data.config, [key]: value };

        // When action type changes, clear the integrationId since it may not be valid
        if (key === "actionType" && selectedNode.data.config?.integrationId) {
          newConfig = { ...newConfig, integrationId: undefined };
        }

        updateNodeData({ id: selectedNode.id, data: { config: newConfig } });

        // Trigger auto-selection when action type changes
        if (key === "actionType") {
          handleConfigUpdate(
            selectedNode.id,
            key,
            value,
            selectedNode.data.config || {}
          );
        }
      }
    },
    [selectedNode, updateNodeData, handleConfigUpdate]
  );

  const handleUpdateWorkspaceName = useCallback(
    async (newName: string) => {
      setCurrentWorkflowName(newName);

      // Save to database if workflow exists
      if (currentWorkflowId) {
        try {
          await api.workflow.update(currentWorkflowId, {
            name: newName,
            nodes,
            edges,
          });
        } catch (error) {
          console.error("Failed to update workflow name:", error);
          toast.error("Falha ao atualizar o nome do fluxo");
        }
      }
    },
    [currentWorkflowId, setCurrentWorkflowName, nodes, edges]
  );

  const handleRefreshRuns = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (refreshRunsRef.current) {
        await refreshRunsRef.current();
      }
    } catch (error) {
      console.error("Failed to refresh runs:", error);
      toast.error("Falha ao atualizar execuções");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleClearNewlyCreatedNode = useCallback(() => {
    setNewlyCreatedNodeId(null);
  }, [setNewlyCreatedNodeId]);

  // Render multi-selection panel
  if (hasMultipleSelections) {
    return (
      <MultiSelectionPanel
        onDelete={deleteSelectedItems}
        selectedEdges={selectedEdges}
        selectedNodes={selectedNodes}
      />
    );
  }

  // Render edge properties panel
  if (selectedEdge) {
    return (
      <EdgePropertiesPanel
        isOwner={isOwner}
        onDelete={handleDeleteEdge}
        selectedEdge={selectedEdge}
      />
    );
  }

  // Render workspace properties panel (no node selected)
  if (!selectedNode) {
    return (
      <WorkspacePropertiesPanel
        activeTab={activeTab}
        isOwner={isOwner}
        isRefreshing={isRefreshing}
        onClear={() => setShowClearDialog(true)}
        onCopyWorkflowCode={handleCopyWorkflowCode}
        onDelete={() => setShowDeleteDialog(true)}
        onDeleteAllRuns={handleDeleteAllRuns}
        onRefreshRuns={handleRefreshRuns}
        onTabChange={setActiveTab}
        onUpdateWorkflowName={handleUpdateWorkspaceName}
        refreshRunsRef={refreshRunsRef}
        workflowCode={workflowCode}
        workflowId={currentWorkflowId}
        workflowName={currentWorkflowName}
      />
    );
  }

  // Render node properties panel
  return (
    <NodePropertiesPanel
      activeTab={activeTab}
      isGenerating={isGenerating}
      isOwner={isOwner}
      isRefreshing={isRefreshing}
      newlyCreatedNodeId={newlyCreatedNodeId}
      onClearNewlyCreatedNode={handleClearNewlyCreatedNode}
      onCopyCode={handleCopyCode}
      onDelete={handleDeleteNode}
      onDeleteAllRuns={handleDeleteAllRuns}
      onRefreshRuns={handleRefreshRuns}
      onTabChange={setActiveTab}
      onToggleEnabled={handleToggleEnabled}
      onUpdateConfig={handleUpdateConfig}
      onUpdateDescription={handleUpdateDescription}
      onUpdateLabel={handleUpdateLabel}
      refreshRunsRef={refreshRunsRef}
      selectedNode={selectedNode}
      workflowId={currentWorkflowId}
    />
  );
};

export const NodeConfigPanel = () => (
  <div className="hidden size-full flex-col bg-background md:flex">
    <PanelInner />
  </div>
);
