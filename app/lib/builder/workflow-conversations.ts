import "server-only";

import { nanoid } from "nanoid";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ConversationState = {
  id: string;
  workflow_id: string;
  phone: string;
  status: "waiting" | "completed";
  resume_node_id?: string | null;
  variable_key?: string | null;
  variables?: Record<string, unknown> | null;
  turn_count?: number;
  timeout_at?: string | null;
  timeout_action?: "end" | "retry" | "goto_node" | null;
  context?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export async function createConversation(params: {
  supabase: SupabaseClient;
  workflowId: string;
  phone: string;
  resumeNodeId?: string | null;
  variableKey?: string | null;
  variables?: Record<string, unknown> | null;
  timeoutSeconds?: number;
  timeoutAction?: "end" | "retry" | "goto_node";
  context?: Record<string, unknown> | null;
  turnCount?: number;
}): Promise<ConversationState | null> {
  const now = new Date().toISOString();
  const id = nanoid();

  const timeoutAt = params.timeoutSeconds && params.timeoutSeconds > 0
    ? new Date(Date.now() + params.timeoutSeconds * 1000).toISOString()
    : null;

  const { data, error } = await params.supabase
    .from("workflow_conversations")
    .insert({
      id,
      workflow_id: params.workflowId,
      phone: params.phone,
      status: "waiting",
      resume_node_id: params.resumeNodeId ?? null,
      variable_key: params.variableKey ?? null,
      variables: params.variables ?? null,
      turn_count: params.turnCount ?? 0,
      timeout_at: timeoutAt,
      timeout_action: params.timeoutAction ?? "end",
      context: params.context ?? {},
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  // Schedule QStash timeout if configured
  if (params.timeoutSeconds && params.timeoutSeconds > 0) {
    try {
      const qstashToken = process.env.QSTASH_TOKEN;
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_PROJECT_PRODUCTION_URL &&
          `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
        (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
        "";

      if (qstashToken && baseUrl) {
        const { Client } = await import("@upstash/qstash");
        const qstash = new Client({ token: qstashToken });
        await qstash.publishJSON({
          url: `${baseUrl}/api/builder/workflow/${params.workflowId}/timeout`,
          body: { conversationId: id },
          delay: params.timeoutSeconds,
        });
      }
    } catch (e) {
      // Best-effort: don't fail conversation creation if timeout scheduling fails
      console.error("[Conversation] Failed to schedule timeout via QStash:", e);
    }
  }

  return data as ConversationState;
}

export async function getPendingConversation(
  supabase: SupabaseClient,
  phone: string
): Promise<ConversationState | null> {
  const { data } = await supabase
    .from("workflow_conversations")
    .select("*")
    .eq("phone", phone)
    .eq("status", "waiting")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return data as ConversationState;
}

export async function completeConversation(
  supabase: SupabaseClient,
  conversationId: string,
  variables: Record<string, unknown>
): Promise<void> {
  await supabase
    .from("workflow_conversations")
    .update({
      status: "completed",
      variables,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
}
