import "server-only";

import type { DatabaseClient } from "@/lib/supabase";
import { getPendingConversation } from "./workflow-conversations";
import { normalizePhoneNumber } from "@/lib/phone-formatter";

type KeywordWorkflow = {
  workflowId: string;
  keywords: string[];
};

type MessageReceivedWorkflow = {
  workflowId: string;
  filters?: {
    messageType?: string;
    bodyMatch?: string;
    bodyMatchMode?: "contains" | "regex" | "exact";
  };
};

export type WorkflowRouteResult =
  | { type: "resume"; workflowId: string; conversationId: string }
  | { type: "keyword"; workflowId: string }
  | { type: "message_received"; workflowId: string }
  | { type: "default"; workflowId: string }
  | { type: "none" };

function normalizeInboundText(text: string): string {
  return text.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function matchesFilter(
  filters: MessageReceivedWorkflow["filters"],
  messageType: string,
  text: string
): boolean {
  if (!filters) return true;

  if (filters.messageType && filters.messageType !== "any" && filters.messageType !== messageType) {
    return false;
  }

  if (filters.bodyMatch && text) {
    const normalizedText = normalizeInboundText(text);
    const normalizedMatch = normalizeInboundText(filters.bodyMatch);

    switch (filters.bodyMatchMode) {
      case "exact":
        return normalizedText === normalizedMatch;
      case "regex":
        try {
          return new RegExp(filters.bodyMatch, "i").test(text);
        } catch {
          return false;
        }
      case "contains":
      default:
        return normalizedText.includes(normalizedMatch);
    }
  }

  return true;
}

/**
 * Route an inbound WhatsApp message to the appropriate workflow.
 *
 * Priority order:
 * 1. Pending conversation (resume multi-turn)
 * 2. Keyword match
 * 3. MessageReceived trigger (with optional filters)
 * 4. Default workflow
 */
export async function routeInboundMessage(params: {
  supabase: DatabaseClient;
  from: string;
  text: string;
  messageType: string;
  keywordWorkflows: KeywordWorkflow[];
  messageReceivedWorkflows: MessageReceivedWorkflow[];
  defaultWorkflowId: string | null;
}): Promise<WorkflowRouteResult> {
  const {
    supabase,
    from,
    text,
    messageType,
    keywordWorkflows,
    messageReceivedWorkflows,
    defaultWorkflowId,
  } = params;

  // 1. Check for pending conversation (highest priority)
  const normalizedFrom = normalizePhoneNumber(from);
  if (normalizedFrom) {
    const pending = await getPendingConversation(supabase, normalizedFrom);
    if (pending) {
      return {
        type: "resume",
        workflowId: pending.workflow_id,
        conversationId: pending.id,
      };
    }
  }

  // 2. Keyword match
  if (text) {
    const normalizedMessage = normalizeInboundText(text);
    if (normalizedMessage) {
      for (const workflow of keywordWorkflows) {
        if (workflow.keywords.some((kw) => kw === normalizedMessage)) {
          return { type: "keyword", workflowId: workflow.workflowId };
        }
      }
    }
  }

  // 3. MessageReceived trigger
  for (const workflow of messageReceivedWorkflows) {
    if (matchesFilter(workflow.filters, messageType, text)) {
      return { type: "message_received", workflowId: workflow.workflowId };
    }
  }

  // 4. Default workflow
  if (defaultWorkflowId) {
    return { type: "default", workflowId: defaultWorkflowId };
  }

  return { type: "none" };
}

/**
 * Load MessageReceived workflows from published versions.
 */
export async function loadMessageReceivedWorkflows(
  supabase: DatabaseClient,
  excludeWorkflowIds: string[]
): Promise<MessageReceivedWorkflow[]> {
  const { data } = await supabase
    .from("workflow_versions")
    .select("workflow_id, nodes, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (!data) return [];

  const results: MessageReceivedWorkflow[] = [];

  for (const version of data) {
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic workflow data
    const v = version as any;
    if (!v?.workflow_id || !v?.nodes || excludeWorkflowIds.includes(v.workflow_id)) {
      continue;
    }

    // biome-ignore lint/suspicious/noExplicitAny: Dynamic node data
    const triggerNode = (v.nodes as any[]).find(
      (node: any) => node?.data?.type === "trigger"
    );
    const triggerType = triggerNode?.data?.config?.triggerType;
    if (triggerType !== "MessageReceived") continue;

    const config = triggerNode?.data?.config || {};
    const filters: MessageReceivedWorkflow["filters"] = {};

    if (config.messageTypeFilter && config.messageTypeFilter !== "any") {
      filters.messageType = config.messageTypeFilter as string;
    }
    if (config.bodyMatch) {
      filters.bodyMatch = config.bodyMatch as string;
      filters.bodyMatchMode = (config.bodyMatchMode as "contains" | "regex" | "exact") || "contains";
    }

    results.push({
      workflowId: v.workflow_id,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });
  }

  return results;
}
