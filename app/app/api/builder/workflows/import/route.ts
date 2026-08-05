import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getCompanyId } from "@/lib/builder/workflow-db";
import { nanoid } from "nanoid";

/**
 * POST /api/builder/workflows/import — import a workflow from exported JSON.
 * Regenerates all node and edge IDs to avoid collisions.
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  let body: { name?: string; workflow?: { nodes?: unknown[]; edges?: unknown[]; description?: string } } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const sourceWorkflow = body.workflow;
  if (!sourceWorkflow?.nodes || !Array.isArray(sourceWorkflow.nodes)) {
    return NextResponse.json(
      { error: "Missing or invalid workflow.nodes" },
      { status: 400 }
    );
  }

  // Regenerate all IDs
  const nodeIdMap = new Map<string, string>();
  const nodes = sourceWorkflow.nodes.map((node: unknown) => {
    const n = node as { id: string; [key: string]: unknown };
    const newId = nanoid(10);
    nodeIdMap.set(n.id, newId);
    return { ...n, id: newId };
  });

  const edges = (sourceWorkflow.edges || []).map((edge: unknown) => {
    const e = edge as { id: string; source: string; target: string; [key: string]: unknown };
    return {
      ...e,
      id: nanoid(10),
      source: nodeIdMap.get(e.source) || e.source,
      target: nodeIdMap.get(e.target) || e.target,
    };
  });

  // Create the workflow
  const workflowId = nanoid();
  const versionId = nanoid();
  const companyId = await getCompanyId(supabase);
  const workflowName = body.name || `Imported ${new Date().toLocaleDateString("pt-BR")}`;

  await supabase.from("workflows").insert({
    id: workflowId,
    name: workflowName,
    description: sourceWorkflow.description || "",
    status: "draft",
    owner_company_id: companyId,
    active_version_id: versionId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  await supabase.from("workflow_versions").insert({
    id: versionId,
    workflow_id: workflowId,
    version: 1,
    status: "draft",
    nodes,
    edges,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({
    workflowId,
    versionId,
    name: workflowName,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  });
}
