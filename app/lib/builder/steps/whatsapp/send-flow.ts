import "server-only";

import { withStepLogging, type StepInput } from "../step-handler";
import { getCredentials, resolveRecipient, sendWhatsAppPayload } from "./shared";

type SendFlowResult =
  | { success: true; data: { status: "waiting"; flowId: string } }
  | { success: false; error: string; details?: unknown };

export type SendFlowInput = StepInput & {
  to?: string;
  toSource?: string;
  flowId?: string;
  flowCta?: string;
  flowAction?: "navigate" | "data_exchange";
  bodyText?: string;
  footerText?: string;
  initialScreen?: string;
  initialData?: string; // JSON object
  triggerData?: Record<string, unknown>;
};

/**
 * Send WhatsApp Flow step — sends a Flow interactive message that opens
 * a multi-screen form inside WhatsApp.
 *
 * After sending, the workflow pauses (like wait-for-reply).
 * When the user completes the flow, the webhook receives an `nfm_reply`
 * event which resumes the workflow with the flow response data as variables.
 */
export async function sendFlowStep(
  input: SendFlowInput
): Promise<SendFlowResult> {
  "use step";

  return withStepLogging(input, async () => {
    const credentials = await getCredentials();
    if (!credentials) {
      return { success: false, error: "WhatsApp not configured" };
    }

    const recipient = resolveRecipient(input);
    if (!recipient.ok) {
      return { success: false, error: recipient.error };
    }

    const flowId = String(input.flowId || "").trim();
    if (!flowId) {
      return { success: false, error: "Flow ID is required" };
    }

    const flowCta = String(input.flowCta || "Abrir").trim();
    const flowAction = input.flowAction || "navigate";
    const bodyText = String(input.bodyText || "").trim();
    if (!bodyText) {
      return { success: false, error: "Body text is required" };
    }

    // Build flow action payload
    const flowActionPayload: Record<string, unknown> = {};
    if (input.initialScreen) {
      flowActionPayload.screen = input.initialScreen;
    }
    if (input.initialData) {
      try {
        flowActionPayload.data = typeof input.initialData === "string"
          ? JSON.parse(input.initialData)
          : input.initialData;
      } catch {
        return { success: false, error: "Invalid initial data JSON" };
      }
    }

    // Generate flow token with workflow context for resume
    const { nanoid } = await import("nanoid");
    const flowToken = `wf:${input._context?.workflowId || "unknown"}:${nanoid(8)}`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient.to,
      type: "interactive",
      interactive: {
        type: "flow",
        body: { text: bodyText },
        ...(input.footerText ? { footer: { text: input.footerText } } : {}),
        action: {
          name: "flow",
          parameters: {
            flow_message_version: "3",
            flow_id: flowId,
            flow_token: flowToken,
            flow_cta: flowCta,
            flow_action: flowAction,
            ...(Object.keys(flowActionPayload).length > 0
              ? { flow_action_payload: flowActionPayload }
              : {}),
          },
        },
      },
    };

    const result = await sendWhatsAppPayload(credentials, payload);
    if (!result.ok) {
      return { success: false, error: result.error, details: result.data };
    }

    return {
      success: true,
      data: {
        status: "waiting",
        flowId,
      },
    };
  });
}
sendFlowStep.maxRetries = 0;

export const _integrationType = "whatsapp";
