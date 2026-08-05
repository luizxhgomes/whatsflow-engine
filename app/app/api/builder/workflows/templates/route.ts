import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/builder/workflows/templates — list all workflow templates
 * Supports ?category= and ?search= query params
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ templates: [] });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search");

  let query = supabase
    .from("workflow_templates")
    .select("id, name, description, category, tags, thumbnail_url, popularity, created_at")
    .order("popularity", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Extract unique categories for filtering
  const { data: allCategories } = await supabase
    .from("workflow_templates")
    .select("category")
    .order("category");

  const categories = [
    ...new Set((allCategories || []).map((r: { category: string }) => r.category)),
  ];

  return NextResponse.json({
    templates: data || [],
    categories,
  });
}

/**
 * POST /api/builder/workflows/templates — create a workflow from a template
 * Body: { templateId: string, name?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  let body: { templateId?: string; name?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { templateId, name } = body;
  if (!templateId) {
    return NextResponse.json(
      { error: "Missing templateId" },
      { status: 400 }
    );
  }

  // Fetch template
  const { data: template } = await supabase
    .from("workflow_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!template) {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 }
    );
  }

  // Regenerate node and edge IDs to avoid collisions
  const { nanoid } = await import("nanoid");
  const nodeIdMap = new Map<string, string>();

  const nodes = (template.nodes as unknown[]).map((node: unknown) => {
    const n = node as { id: string; [key: string]: unknown };
    const newId = nanoid(10);
    nodeIdMap.set(n.id, newId);
    return { ...n, id: newId };
  });

  const edges = (template.edges as unknown[]).map((edge: unknown) => {
    const e = edge as { id: string; source: string; target: string; [key: string]: unknown };
    return {
      ...e,
      id: nanoid(10),
      source: nodeIdMap.get(e.source) || e.source,
      target: nodeIdMap.get(e.target) || e.target,
    };
  });

  // Increment popularity
  await supabase
    .from("workflow_templates")
    .update({ popularity: (template.popularity || 0) + 1 })
    .eq("id", templateId);

  return NextResponse.json({
    name: name || template.name,
    description: template.description,
    nodes,
    edges,
    fromTemplate: templateId,
  });
}
