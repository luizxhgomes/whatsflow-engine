"use client";

import type { Edge, Node } from "@xyflow/react";

export interface WorkflowNode extends Node {
  data: {
    type: "trigger" | "action";
    label: string;
    description?: string;
    enabled?: boolean;
    config?: Record<string, unknown>;
  };
}

export interface WorkflowEdge extends Edge {
  id: string;
  source: string;
  target: string;
  selected?: boolean;
}

export interface PanelHeaderProps {
  title: string;
}

export interface MultiSelectionPanelProps {
  selectedNodes: { id: string; selected?: boolean }[];
  selectedEdges: { id: string; selected?: boolean }[];
  onDelete: () => void;
}

export interface EdgePropertiesPanelProps {
  selectedEdge: WorkflowEdge;
  isOwner: boolean;
  onDelete: () => void;
}

export interface WorkspacePropertiesPanelProps {
  workflowId: string | null;
  workflowName: string;
  isOwner: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onUpdateWorkflowName: (name: string) => void;
  onClear: () => void;
  onDelete: () => void;
  onDeleteAllRuns: () => void;
  onRefreshRuns: () => Promise<void>;
  isRefreshing: boolean;
  refreshRunsRef: React.MutableRefObject<(() => Promise<void>) | null>;
  workflowCode: string;
  onCopyWorkflowCode: () => void;
}

export interface NodePropertiesPanelProps {
  selectedNode: WorkflowNode;
  isOwner: boolean;
  isGenerating: boolean;
  newlyCreatedNodeId: string | null;
  workflowId: string | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onUpdateConfig: (key: string, value: string) => void;
  onUpdateLabel: (label: string) => void;
  onUpdateDescription: (description: string) => void;
  onToggleEnabled: () => void;
  onDelete: () => void;
  onDeleteAllRuns: () => void;
  onRefreshRuns: () => Promise<void>;
  isRefreshing: boolean;
  refreshRunsRef: React.MutableRefObject<(() => Promise<void>) | null>;
  onCopyCode: () => void;
  onClearNewlyCreatedNode: () => void;
}

export interface CodePanelProps {
  code: string;
  filename: string;
  language: string;
  onCopy: () => void;
}

export interface RunsPanelProps {
  isActive: boolean;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onDeleteAll: () => void;
  refreshRunsRef: React.MutableRefObject<(() => Promise<void>) | null>;
}

export interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
}
