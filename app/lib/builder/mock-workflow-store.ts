import { nanoid } from "nanoid";
import type { SavedWorkflow, WorkflowData } from "./api-client";
import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

type WorkflowStoreState = {
  workflows: Record<string, SavedWorkflow>;
  currentWorkflowId: string | null;
};

function getStore(): WorkflowStoreState {
  const globalKey = "__builderWorkflowStore";
  const g = globalThis as typeof globalThis & {
    [globalKey]?: WorkflowStoreState;
  };

  if (!g[globalKey]) {
    g[globalKey] = {
      workflows: {},
      currentWorkflowId: null,
    };
  }

  return g[globalKey];
}

function defaultGraph(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const triggerId = nanoid();
  const actionId = nanoid();

  return {
    nodes: [
      {
        id: triggerId,
        type: "trigger",
        position: { x: 80, y: 120 },
        data: {
          label: "Incoming Message",
          description: "Start when a message arrives",
          type: "trigger",
          config: { triggerType: "Webhook" },
        },
      },
      {
        id: actionId,
        type: "action",
        position: { x: 420, y: 120 },
        data: {
          label: "Send Message",
          description: "Reply to the user",
          type: "action",
          config: { actionType: "Send Message" },
        },
      },
    ],
    edges: [
      {
        id: nanoid(),
        source: triggerId,
        target: actionId,
        type: "animated",
      },
    ],
  };
}

function buildSavedWorkflow(
  input: WorkflowData & { id?: string }
): SavedWorkflow {
  const now = new Date().toISOString();
  const id = input.id ?? nanoid();
  return {
    id,
    name: input.name ?? "New Workflow",
    description: input.description,
    nodes: input.nodes,
    edges: input.edges,
    visibility: input.visibility ?? "private",
    createdAt: now,
    updatedAt: now,
    isOwner: true,
  };
}

export function listWorkflows(): SavedWorkflow[] {
  const store = getStore();
  return Object.values(store.workflows);
}

export function getWorkflow(id: string): SavedWorkflow | null {
  const store = getStore();
  return store.workflows[id] ?? null;
}

export function createWorkflow(input: WorkflowData): SavedWorkflow {
  const store = getStore();
  const workflow = buildSavedWorkflow(input);
  store.workflows[workflow.id] = workflow;
  store.currentWorkflowId = workflow.id;
  return workflow;
}

export function ensureWorkflow(id: string): SavedWorkflow {
  const existing = getWorkflow(id);
  if (existing) {
    return existing;
  }

  const graph = defaultGraph();
  return createWorkflow({
    id,
    name: "Starter Workflow",
    nodes: graph.nodes,
    edges: graph.edges,
  });
}

export function updateWorkflow(
  id: string,
  patch: Partial<WorkflowData>
): SavedWorkflow {
  const store = getStore();
  const existing = ensureWorkflow(id);
  const updated: SavedWorkflow = {
    ...existing,
    ...patch,
    name: patch.name ?? existing.name,
    nodes: patch.nodes ?? existing.nodes,
    edges: patch.edges ?? existing.edges,
    visibility: patch.visibility ?? existing.visibility,
    updatedAt: new Date().toISOString(),
  };
  store.workflows[id] = updated;
  return updated;
}

export function deleteWorkflow(id: string): void {
  const store = getStore();
  delete store.workflows[id];
  if (store.currentWorkflowId === id) {
    store.currentWorkflowId = null;
  }
}

export function duplicateWorkflow(id: string): SavedWorkflow {
  const store = getStore();
  const existing = ensureWorkflow(id);
  const duplicate = buildSavedWorkflow({
    ...existing,
    id: undefined,
    name: `${existing.name} Copy`,
  });
  store.workflows[duplicate.id] = duplicate;
  store.currentWorkflowId = duplicate.id;
  return duplicate;
}

export function getCurrentWorkflow(): SavedWorkflow {
  const store = getStore();
  if (store.currentWorkflowId) {
    return ensureWorkflow(store.currentWorkflowId);
  }
  const graph = defaultGraph();
  const workflow = createWorkflow({
    name: "Current Workflow",
    nodes: graph.nodes,
    edges: graph.edges,
  });
  store.currentWorkflowId = workflow.id;
  return workflow;
}

export function saveCurrentWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): SavedWorkflow {
  const store = getStore();
  const current = getCurrentWorkflow();
  const updated = updateWorkflow(current.id, { nodes, edges });
  store.currentWorkflowId = updated.id;
  return updated;
}
