import "server-only";

import { withStepLogging, type StepInput } from "../step-handler";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  ensureWorkflowRecord,
  getCompanyId,
  toSavedWorkflow,
} from "@/lib/builder/workflow-db";
import { nanoid } from "nanoid";

type SubWorkflowResult =
  | { success: true; data: { executionId: string; results: unknown } }
  | { success: false; error: string };

export type SubWorkflowInput = StepInput & {
  workflowId?: string;
  inputVariables?: string; // JSON object to pass as triggerInput
  triggerData?: Record<string, unknown>;
  _nestingDepth?: number;
};

const MAX_NESTING_DEPTH = 3;

/**
 * Sub-Workflow step — executes another workflow by ID and waits for the result.
 *
 * Uses executeWorkflow() directly (not HTTP) for synchronous execution.
 * Guard: max nesting depth of 3 to prevent infinite recursion.
 */
export async function subWorkflowStep(
  input: SubWorkflowInput
): Promise<SubWorkflowResult> {
  "use step";

  return withStepLogging(input, async () => {
    const targetWorkflowId = String(input.workflowId || "").trim();
    if (!targetWorkflowId) {
      return { success: false, error: "Target workflow ID is required" };
    }

    // Nesting depth guard
    const depth = input._nestingDepth || 0;
    if (depth >= MAX_NESTING_DEPTH) {
      return {
        success: false,
        error: `Max sub-workflow nesting depth (${MAX_NESTING_DEPTH}) exceeded`,
      };
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return { success: false, error: "Supabase not configured" };
    }

    // Parse input variables
    let triggerInput: Record<string, unknown> = {
      ...(input.triggerData || {}),
    };
    if (input.inputVariables) {
      try {
        const parsed = typeof input.inputVariables === "string"
          ? JSON.parse(input.inputVariables)
          : input.inputVariables;
        triggerInput = { ...triggerInput, ...parsed };
      } catch {
        return { success: false, error: "Invalid input variables JSON" };
      }
    }

    // Load the target workflow
    const companyId = await getCompanyId(supabase);
    const record = await ensureWorkflowRecord(supabase, targetWorkflowId, companyId);
    const workflow = toSavedWorkflow(record);

    if (!workflow.nodes || workflow.nodes.length === 0) {
      return { success: false, error: "Target workflow has no nodes" };
    }

    const executionId = nanoid();

    // Dynamic import to avoid circular dependency
    const { executeWorkflow } = await import(
      "@/lib/builder/workflow-executor.workflow"
    );

    const execution = await executeWorkflow({
      nodes: workflow.nodes,
      edges: workflow.edges,
      triggerInput: {
        ...triggerInput,
        _nestingDepth: depth + 1,
      },
      executionId,
      workflowId: targetWorkflowId,
    });

    return {
      success: true,
      data: {
        executionId,
        results: execution.results || execution,
      },
    };
  });
}
subWorkflowStep.maxRetries = 0;
