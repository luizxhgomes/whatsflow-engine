import "server-only";

import { withStepLogging, type StepInput } from "../step-handler";

type WaitForReplyResult =
  | { success: true; data: { status: "waiting"; variableKey: string } }
  | { success: false; error: string };

export type WaitForReplyInput = StepInput & {
  variableKey?: string;
  timeoutSeconds?: number | string;
  timeoutAction?: "end" | "retry" | "goto_node";
  timeoutTargetNodeId?: string;
  triggerData?: Record<string, unknown>;
};

/**
 * Wait for Reply step — pauses the workflow and waits for the next
 * inbound message from the user WITHOUT sending a message first.
 *
 * Unlike ask-question which sends a question then waits,
 * this step simply pauses and waits for any reply.
 *
 * The conversation state is created by the executor (same pattern as ask-question).
 * This step just validates the config and signals readiness to pause.
 */
export async function waitForReplyStep(
  input: WaitForReplyInput
): Promise<WaitForReplyResult> {
  "use step";

  return withStepLogging(input, async () => {
    const variableKey = String(input.variableKey || "").trim();
    if (!variableKey) {
      return { success: false, error: "Variable key is required for Wait for Reply" };
    }

    return {
      success: true,
      data: {
        status: "waiting",
        variableKey,
      },
    };
  });
}
waitForReplyStep.maxRetries = 0;

export const _integrationType = "whatsapp";
