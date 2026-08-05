"use client";

import { useReactFlow } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import {
  Plus,
  Redo2,
  Settings2,
  Trash2,
  Undo2,
} from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/builder/ui/button";
import { ButtonGroup } from "@/components/builder/ui/button-group";
import {
  deleteEdgeAtom,
  deleteNodeAtom,
  edgesAtom,
  nodesAtom,
  selectedEdgeAtom,
  selectedNodeAtom,
  type WorkflowNode,
} from "@/lib/builder/workflow-store";
import { useOverlay } from "../../overlays/overlay-provider";
import { ConfigurationOverlay } from "../../overlays/configuration-overlay";
import { ConfirmOverlay } from "../../overlays/confirm-overlay";
import type { WorkflowState, WorkflowActions } from "./types";
import {
  SaveButton,
  DownloadButton,
  PublishButton,
  VersionsButton,
  VisibilityButton,
  RunButtonGroup,
} from "./toolbar-buttons";

// Props for ToolbarActions
export type ToolbarActionsProps = {
  workflowId?: string;
  state: WorkflowState;
  actions: WorkflowActions;
};

// Toolbar Actions Component - handles add step, undo/redo, save, and run buttons
export function ToolbarActions({
  workflowId,
  state,
  actions,
}: ToolbarActionsProps) {
  const { open: openOverlay, push } = useOverlay();
  const [selectedNodeId] = useAtom(selectedNodeAtom);
  const [selectedEdgeId] = useAtom(selectedEdgeAtom);
  const [nodes] = useAtom(nodesAtom);
  const [edges] = useAtom(edgesAtom);
  const deleteNode = useSetAtom(deleteNodeAtom);
  const deleteEdge = useSetAtom(deleteEdgeAtom);
  const { screenToFlowPosition } = useReactFlow();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const hasSelection = selectedNode || selectedEdge;

  // For non-owners viewing public workflows, don't show toolbar actions
  // (Duplicate button is now in the main toolbar next to Sign In)
  if (workflowId && !state.isOwner) {
    return null;
  }

  if (!workflowId) {
    return null;
  }

  const handleDeleteConfirm = () => {
    const isNode = Boolean(selectedNodeId);
    const itemType = isNode ? "etapa" : "conexão";

    push(ConfirmOverlay, {
      title: `Excluir ${itemType}`,
      message: `Tem certeza que deseja excluir esta ${itemType}? Essa ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      confirmVariant: "destructive" as const,
      onConfirm: () => {
        if (selectedNodeId) {
          deleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          deleteEdge(selectedEdgeId);
        }
      },
    });
  };

  const handleAddStep = () => {
    // Get the ReactFlow wrapper (the visible canvas container)
    const flowWrapper = document.querySelector(".react-flow");
    if (!flowWrapper) {
      return;
    }

    const rect = flowWrapper.getBoundingClientRect();
    // Calculate center in absolute screen coordinates
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Convert to flow coordinates
    const position = screenToFlowPosition({ x: centerX, y: centerY });

    // Adjust for node dimensions to center it properly
    // Action node is 192px wide and 192px tall (w-48 h-48 in Tailwind)
    const nodeWidth = 192;
    const nodeHeight = 192;
    position.x -= nodeWidth / 2;
    position.y -= nodeHeight / 2;

    // Check if there's already a node at this position
    const offset = 20; // Offset distance in pixels
    const threshold = 20; // How close nodes need to be to be considered overlapping

    const finalPosition = { ...position };
    let hasOverlap = true;
    let attempts = 0;
    const maxAttempts = 20; // Prevent infinite loop

    while (hasOverlap && attempts < maxAttempts) {
      hasOverlap = state.nodes.some((node) => {
        const dx = Math.abs(node.position.x - finalPosition.x);
        const dy = Math.abs(node.position.y - finalPosition.y);
        return dx < threshold && dy < threshold;
      });

      if (hasOverlap) {
        // Offset diagonally down-right
        finalPosition.x += offset;
        finalPosition.y += offset;
        attempts += 1;
      }
    }

    // Create new action node
    const newNode: WorkflowNode = {
      id: nanoid(),
      type: "action",
      position: finalPosition,
      data: {
        label: "",
        description: "",
        type: "action",
        config: {},
        status: "idle",
      },
    };

    state.addNode(newNode);
    state.setSelectedNodeId(newNode.id);
    state.setActiveTab("properties");
  };

  return (
    <>
      {/* Add Step - Mobile Vertical */}
      <ButtonGroup className="flex lg:hidden" orientation="vertical">
        <Button
          className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
          disabled={state.isGenerating}
          onClick={handleAddStep}
          size="icon"
          title="Adicionar etapa"
          variant="secondary"
        >
          <Plus className="size-4" />
        </Button>
      </ButtonGroup>

      {/* Properties - Mobile Vertical (always visible) */}
      <ButtonGroup className="flex lg:hidden" orientation="vertical">
        <Button
          className="border hover:bg-black/5 dark:hover:bg-white/5"
          onClick={() => openOverlay(ConfigurationOverlay, {})}
          size="icon"
          title="Configuração"
          variant="secondary"
        >
          <Settings2 className="size-4" />
        </Button>
        {/* Delete - Show when node or edge is selected */}
        {hasSelection && (
          <Button
            className="border hover:bg-black/5 dark:hover:bg-white/5"
            onClick={handleDeleteConfirm}
            size="icon"
            title="Excluir"
            variant="secondary"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </ButtonGroup>

      {/* Add Step - Desktop Horizontal */}
      <ButtonGroup className="hidden lg:flex" orientation="horizontal">
        <Button
          className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
          disabled={state.isGenerating}
          onClick={handleAddStep}
          size="icon"
          title="Adicionar etapa"
          variant="secondary"
        >
          <Plus className="size-4" />
        </Button>
      </ButtonGroup>

      {/* Undo/Redo - Mobile Vertical */}
      <ButtonGroup className="flex lg:hidden" orientation="vertical">
        <Button
          className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
          disabled={!state.canUndo || state.isGenerating}
          onClick={() => state.undo()}
          size="icon"
          title="Desfazer"
          variant="secondary"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
          disabled={!state.canRedo || state.isGenerating}
          onClick={() => state.redo()}
          size="icon"
          title="Refazer"
          variant="secondary"
        >
          <Redo2 className="size-4" />
        </Button>
      </ButtonGroup>

      {/* Undo/Redo - Desktop Horizontal */}
      <ButtonGroup className="hidden lg:flex" orientation="horizontal">
        <Button
          className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
          disabled={!state.canUndo || state.isGenerating}
          onClick={() => state.undo()}
          size="icon"
          title="Desfazer"
          variant="secondary"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
          disabled={!state.canRedo || state.isGenerating}
          onClick={() => state.redo()}
          size="icon"
          title="Refazer"
          variant="secondary"
        >
          <Redo2 className="size-4" />
        </Button>
      </ButtonGroup>

      {/* Save/Download - Mobile Vertical */}
      <ButtonGroup className="flex lg:hidden" orientation="vertical">
        <SaveButton handleSave={actions.handleSave} state={state} />
        <DownloadButton actions={actions} state={state} />
        <PublishButton
          isPublishing={actions.isPublishing}
          onPublish={actions.handlePublish}
          disabled={!state.currentWorkflowId}
        />
        <VersionsButton
          versions={actions.versions}
          disabled={!state.currentWorkflowId}
          isRollingBack={actions.isRollingBack}
          onRollback={actions.handleRollback}
        />
      </ButtonGroup>

      {/* Save/Download - Desktop Horizontal */}
      <ButtonGroup className="hidden lg:flex" orientation="horizontal">
        <SaveButton handleSave={actions.handleSave} state={state} />
        <DownloadButton actions={actions} state={state} />
        <PublishButton
          isPublishing={actions.isPublishing}
          onPublish={actions.handlePublish}
          disabled={!state.currentWorkflowId}
        />
        <VersionsButton
          versions={actions.versions}
          disabled={!state.currentWorkflowId}
          isRollingBack={actions.isRollingBack}
          onRollback={actions.handleRollback}
        />
      </ButtonGroup>

      {/* Visibility Toggle */}
      <VisibilityButton actions={actions} state={state} />

      <RunButtonGroup actions={actions} state={state} />
    </>
  );
}
