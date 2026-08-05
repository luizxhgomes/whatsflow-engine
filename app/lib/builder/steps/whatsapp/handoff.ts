import "server-only";

import { withStepLogging, type StepInput } from "../step-handler";
import { getCredentials, resolveRecipient, sendWhatsAppPayload } from "./shared";
import { buildTextMessage } from "@/lib/whatsapp/text";
import { getSupabaseAdmin } from "@/lib/supabase";

type HandoffResult =
  | { success: true; data: { handedOff: boolean; conversationId?: string } }
  | { success: false; error: string; details?: unknown };

export type HandoffInput = StepInput & {
  to?: string;
  toSource?: string;
  message?: string;
  handoffSummary?: string;
  triggerData?: Record<string, unknown>;
};

/**
 * Live Chat Handoff step — transfers the conversation from bot to human agent.
 *
 * 1. Updates inbox_conversations.mode from 'bot' to 'human'
 * 2. Sets automation_paused_at timestamp
 * 3. Optionally sends a message to the user ("Um atendente vai te ajudar")
 * 4. Pauses the workflow (returns success, executor stops)
 */
export async function handoffStep(
  input: HandoffInput
): Promise<HandoffResult> {
  "use step";

  return withStepLogging(input, async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return { success: false, error: "Supabase not configured" };
    }

    const recipient = resolveRecipient(input);
    if (!recipient.ok) {
      return { success: false, error: recipient.error };
    }

    const phone = recipient.to;

    // Find the active inbox conversation for this phone
    const { data: inboxConversation } = await supabase
      .from("inbox_conversations")
      .select("id, mode")
      .eq("phone", phone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inboxConversation) {
      // Update mode to human and pause automation
      await supabase
        .from("inbox_conversations")
        .update({
          mode: "human",
          automation_paused_at: new Date().toISOString(),
          automation_paused_by: "workflow_handoff",
          handoff_summary: input.handoffSummary || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inboxConversation.id);
    }

    // Optionally send a message to the user
    const message = String(input.message || "").trim();
    if (message) {
      const credentials = await getCredentials();
      if (credentials) {
        const payload = buildTextMessage({
          to: phone,
          text: message,
        });
        await sendWhatsAppPayload(credentials, payload);
      }
    }

    return {
      success: true,
      data: {
        handedOff: true,
        conversationId: inboxConversation?.id || undefined,
      },
    };
  });
}
handoffStep.maxRetries = 0;

export const _integrationType = "whatsapp";
