import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ workflowId: string }>;
};

/**
 * Timeout handler for workflow conversations.
 * Called by QStash delayed message when a conversation times out.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { workflowId } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  let body: { conversationId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { conversationId } = body;
  if (!conversationId) {
    return NextResponse.json(
      { error: "Missing conversationId" },
      { status: 400 }
    );
  }

  // Fetch the conversation (only if still waiting)
  const { data: conversation } = await supabase
    .from("workflow_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("workflow_id", workflowId)
    .eq("status", "waiting")
    .maybeSingle();

  if (!conversation) {
    // Already completed or doesn't exist — nothing to do
    return NextResponse.json({ status: "skipped", reason: "not_waiting" });
  }

  const timeoutAction = (conversation.timeout_action as string) || "end";

  // Mark conversation as expired
  await supabase
    .from("workflow_conversations")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
      context: {
        ...(typeof conversation.context === "object" && conversation.context !== null
          ? conversation.context
          : {}),
        _timeout: true,
        _timeout_action: timeoutAction,
      },
    })
    .eq("id", conversationId);

  // Update the workflow run status
  const { data: runs } = await supabase
    .from("workflow_runs")
    .select("id")
    .eq("workflow_id", workflowId)
    .eq("status", "waiting")
    .order("started_at", { ascending: false })
    .limit(1);

  if (runs && runs.length > 0) {
    await supabase
      .from("workflow_runs")
      .update({
        status: "timeout",
        finished_at: new Date().toISOString(),
        output: { timeout: true, action: timeoutAction },
      })
      .eq("id", runs[0].id);
  }

  // If timeout_action is 'retry', we could re-trigger the workflow from
  // the resume node. For now, we just mark it as timed out.
  // Future: handle goto_node by triggering execution from a specific node.

  return NextResponse.json({
    status: "timeout",
    conversationId,
    action: timeoutAction,
  });
}
