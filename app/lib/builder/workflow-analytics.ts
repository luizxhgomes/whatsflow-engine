import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase";

export type AnalyticsEventType = "entered" | "completed" | "dropped" | "timeout" | "error";

/**
 * Emit an analytics event for a workflow node.
 * Best-effort: never blocks execution, never throws.
 */
export async function emitNodeEvent(params: {
  workflowId: string;
  versionId?: string;
  nodeId: string;
  eventType: AnalyticsEventType;
  phone?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    await supabase.from("workflow_analytics").insert({
      workflow_id: params.workflowId,
      version_id: params.versionId || null,
      node_id: params.nodeId,
      event_type: params.eventType,
      phone: params.phone || null,
      metadata: params.metadata || {},
    });
  } catch {
    // Best-effort: don't fail workflow execution
  }
}

export type NodeFunnelEntry = {
  nodeId: string;
  entered: number;
  completed: number;
  dropped: number;
  errors: number;
  completionRate: number;
};

export type WorkflowAnalyticsSummary = {
  totalExecutions: number;
  uniquePhones: number;
  funnel: NodeFunnelEntry[];
  periodStart: string;
  periodEnd: string;
};

/**
 * Get analytics summary for a workflow with funnel data per node.
 */
export async function getWorkflowAnalytics(params: {
  workflowId: string;
  startDate?: string;
  endDate?: string;
}): Promise<WorkflowAnalyticsSummary | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = params.startDate || thirtyDaysAgo.toISOString();
  const endDate = params.endDate || now.toISOString();

  let query = supabase
    .from("workflow_analytics")
    .select("node_id, event_type, phone")
    .eq("workflow_id", params.workflowId)
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  const { data } = await query;
  if (!data || data.length === 0) {
    return {
      totalExecutions: 0,
      uniquePhones: 0,
      funnel: [],
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  // Aggregate by node
  const nodeStats = new Map<string, { entered: number; completed: number; dropped: number; errors: number }>();
  const phones = new Set<string>();

  for (const row of data) {
    const nodeId = row.node_id;
    if (!nodeStats.has(nodeId)) {
      nodeStats.set(nodeId, { entered: 0, completed: 0, dropped: 0, errors: 0 });
    }
    const stats = nodeStats.get(nodeId)!;

    switch (row.event_type) {
      case "entered":
        stats.entered++;
        break;
      case "completed":
        stats.completed++;
        break;
      case "dropped":
      case "timeout":
        stats.dropped++;
        break;
      case "error":
        stats.errors++;
        break;
    }

    if (row.phone) phones.add(row.phone);
  }

  const funnel: NodeFunnelEntry[] = [];
  for (const [nodeId, stats] of nodeStats.entries()) {
    funnel.push({
      nodeId,
      entered: stats.entered,
      completed: stats.completed,
      dropped: stats.dropped,
      errors: stats.errors,
      completionRate: stats.entered > 0 ? Math.round((stats.completed / stats.entered) * 100) : 0,
    });
  }

  // Sort by entered count descending (trigger nodes first)
  funnel.sort((a, b) => b.entered - a.entered);

  // Count total executions from trigger node entries
  const totalExecutions = funnel.length > 0 ? funnel[0].entered : 0;

  return {
    totalExecutions,
    uniquePhones: phones.size,
    funnel,
    periodStart: startDate,
    periodEnd: endDate,
  };
}
