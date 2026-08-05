import { NextResponse, type NextRequest } from "next/server";
import { getWorkflowAnalytics } from "@/lib/builder/workflow-analytics";

type RouteParams = {
  params: Promise<{ workflowId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { workflowId } = await params;
  const url = new URL(request.url);
  const startDate = url.searchParams.get("start") || undefined;
  const endDate = url.searchParams.get("end") || undefined;

  const analytics = await getWorkflowAnalytics({
    workflowId,
    startDate,
    endDate,
  });

  if (!analytics) {
    return NextResponse.json(
      { error: "Analytics unavailable" },
      { status: 500 }
    );
  }

  return NextResponse.json(analytics);
}
