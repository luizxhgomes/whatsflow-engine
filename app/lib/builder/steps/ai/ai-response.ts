import "server-only";

import { withStepLogging, type StepInput } from "../step-handler";

type AIResponseResult =
  | { success: true; data: { text: string; model: string; tokensUsed?: number } }
  | { success: false; error: string };

export type AIResponseInput = StepInput & {
  prompt?: string;
  systemPrompt?: string;
  model?: string;
  temperature?: string | number;
  maxTokens?: string | number;
  triggerData?: Record<string, unknown>;
};

/**
 * AI/LLM Response step — generates a text response using the configured AI provider.
 *
 * Uses the existing unified AI service (Vercel AI SDK v6).
 * Compliance note: Use for structured responses (summarization, classification,
 * extraction), not open conversation, per Meta policy jan/2026.
 */
export async function aiResponseStep(
  input: AIResponseInput
): Promise<AIResponseResult> {
  "use step";

  return withStepLogging(input, async () => {
    const prompt = String(input.prompt || "").trim();
    if (!prompt) {
      return { success: false, error: "Prompt is required" };
    }

    const systemPrompt = String(input.systemPrompt || "").trim() || undefined;
    const model = String(input.model || "").trim() || undefined;
    const temperature = typeof input.temperature === "number"
      ? input.temperature
      : parseFloat(String(input.temperature || "0.7"));
    const maxTokens = typeof input.maxTokens === "number"
      ? input.maxTokens
      : parseInt(String(input.maxTokens || "500"), 10);

    try {
      // Dynamic import to avoid loading AI deps for non-AI workflows
      const { ai } = await import("@/lib/ai");

      const result = await ai.generateText({
        prompt,
        system: systemPrompt,
        model,
        temperature: Number.isFinite(temperature) ? temperature : 0.7,
        maxOutputTokens: Number.isFinite(maxTokens) ? maxTokens : 500,
      });

      // biome-ignore lint/suspicious/noExplicitAny: AI SDK result may include usage
      const usage = (result as any).usage;
      return {
        success: true,
        data: {
          text: result.text,
          model: model || "default",
          tokensUsed: usage?.totalTokens,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `AI generation failed: ${message}` };
    }
  });
}
aiResponseStep.maxRetries = 0;

export const _integrationType = "ai";
