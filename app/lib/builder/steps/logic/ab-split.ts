import "server-only";

import { createHash } from "node:crypto";
import { withStepLogging, type StepInput } from "../step-handler";

type ABSplitResult =
  | { success: true; data: { variant: number; variantLabel: string; hash: string } }
  | { success: false; error: string };

export type ABSplitInput = StepInput & {
  /**
   * JSON array of variants with weights.
   * Example: [{"label":"A","weight":50},{"label":"B","weight":50}]
   */
  variants?: string;
  triggerData?: Record<string, unknown>;
};

type Variant = {
  label: string;
  weight: number;
};

/**
 * Deterministic hash-based A/B split.
 * Uses SHA-256 of (phone + workflowId) to ensure the same user
 * always gets the same variant for a given workflow.
 */
function selectVariant(
  phone: string,
  workflowId: string,
  variants: Variant[]
): { variant: number; hash: string } {
  const input = `${phone}:${workflowId}`;
  const hash = createHash("sha256").update(input).digest("hex");
  // Convert first 8 hex chars to a number between 0-100
  const hashNum = parseInt(hash.substring(0, 8), 16);
  const percentage = hashNum % 100;

  let cumulative = 0;
  for (let i = 0; i < variants.length; i++) {
    cumulative += variants[i].weight;
    if (percentage < cumulative) {
      return { variant: i, hash: hash.substring(0, 8) };
    }
  }

  // Fallback to last variant
  return { variant: variants.length - 1, hash: hash.substring(0, 8) };
}

export async function abSplitStep(
  input: ABSplitInput
): Promise<ABSplitResult> {
  "use step";

  return withStepLogging(input, async () => {
    // Parse variants
    let variants: Variant[];
    try {
      const raw = typeof input.variants === "string"
        ? JSON.parse(input.variants)
        : input.variants;
      if (!Array.isArray(raw) || raw.length < 2) {
        return { success: false, error: "A/B Split requires at least 2 variants" };
      }
      variants = raw.map((v: { label?: string; weight?: number }, i: number) => ({
        label: v.label || `Variant ${String.fromCharCode(65 + i)}`,
        weight: typeof v.weight === "number" ? v.weight : Math.floor(100 / raw.length),
      }));
    } catch {
      return { success: false, error: "Invalid variants JSON" };
    }

    // Validate total weight
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight <= 0) {
      return { success: false, error: "Total variant weight must be > 0" };
    }

    // Get phone for deterministic hashing
    const phone = String(
      input.triggerData?.from ||
      input.triggerData?.to ||
      input.triggerData?.phone ||
      ""
    );

    const workflowId = String(input._context?.workflowId || "default");

    if (!phone) {
      // Without a phone, use random selection
      const randomIdx = Math.floor(Math.random() * variants.length);
      return {
        success: true,
        data: {
          variant: randomIdx,
          variantLabel: variants[randomIdx].label,
          hash: "random",
        },
      };
    }

    const { variant, hash } = selectVariant(phone, workflowId, variants);

    return {
      success: true,
      data: {
        variant,
        variantLabel: variants[variant].label,
        hash,
      },
    };
  });
}
abSplitStep.maxRetries = 0;
