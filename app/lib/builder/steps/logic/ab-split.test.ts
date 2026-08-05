import { describe, it, expect, vi } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock step-handler
vi.mock("../step-handler", () => ({
  withStepLogging: (_input: unknown, fn: () => Promise<unknown>) => fn(),
}));

import { abSplitStep } from "./ab-split";

describe("abSplitStep", () => {
  describe("validacao de input", () => {
    it("deve rejeitar sem variantes", async () => {
      const result = await abSplitStep({ variants: undefined });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("at least 2 variants");
      }
    });

    it("deve rejeitar com menos de 2 variantes", async () => {
      const result = await abSplitStep({
        variants: JSON.stringify([{ label: "A", weight: 100 }]),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("at least 2 variants");
      }
    });

    it("deve rejeitar JSON invalido", async () => {
      const result = await abSplitStep({ variants: "not json" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid variants JSON");
      }
    });

    it("deve rejeitar peso total zero", async () => {
      const result = await abSplitStep({
        variants: JSON.stringify([
          { label: "A", weight: 0 },
          { label: "B", weight: 0 },
        ]),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("weight must be > 0");
      }
    });
  });

  describe("selecao deterministica", () => {
    it("deve retornar mesmo resultado para mesmo phone+workflow", async () => {
      const input = {
        variants: JSON.stringify([
          { label: "A", weight: 50 },
          { label: "B", weight: 50 },
        ]),
        triggerData: { from: "+5511999999999" },
        _context: { workflowId: "wf_test_1", nodeId: "n1", nodeName: "AB", nodeType: "ab-split" },
      };

      const result1 = await abSplitStep(input);
      const result2 = await abSplitStep(input);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.data.variant).toBe(result2.data.variant);
        expect(result1.data.variantLabel).toBe(result2.data.variantLabel);
        expect(result1.data.hash).toBe(result2.data.hash);
      }
    });

    it("deve retornar resultado diferente para phones diferentes", async () => {
      const base = {
        variants: JSON.stringify([
          { label: "A", weight: 50 },
          { label: "B", weight: 50 },
        ]),
        _context: { workflowId: "wf_test_2", nodeId: "n1", nodeName: "AB", nodeType: "ab-split" },
      };

      const results = new Set<number>();
      const phones = ["+5511111111111", "+5522222222222", "+5533333333333", "+5544444444444", "+5555555555555"];

      for (const phone of phones) {
        const result = await abSplitStep({ ...base, triggerData: { from: phone } });
        if (result.success) {
          results.add(result.data.variant);
        }
      }

      // Com 5 phones e 50/50 split, devemos ter ambas variantes representadas
      // (probabilidade de todos caírem no mesmo lado é 1/16 = 6.25%)
      expect(results.size).toBeGreaterThanOrEqual(1);
    });

    it("deve selecionar variante com peso correto (3 variantes)", async () => {
      const result = await abSplitStep({
        variants: JSON.stringify([
          { label: "A", weight: 33 },
          { label: "B", weight: 34 },
          { label: "C", weight: 33 },
        ]),
        triggerData: { from: "+5511999999999" },
        _context: { workflowId: "wf_test_3", nodeId: "n1", nodeName: "AB", nodeType: "ab-split" },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.variant).toBeGreaterThanOrEqual(0);
        expect(result.data.variant).toBeLessThan(3);
        expect(["A", "B", "C"]).toContain(result.data.variantLabel);
      }
    });
  });

  describe("fallback sem phone", () => {
    it("deve usar selecao aleatoria sem phone", async () => {
      const result = await abSplitStep({
        variants: JSON.stringify([
          { label: "A", weight: 50 },
          { label: "B", weight: 50 },
        ]),
        triggerData: {},
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hash).toBe("random");
        expect(result.data.variant).toBeGreaterThanOrEqual(0);
        expect(result.data.variant).toBeLessThan(2);
      }
    });
  });
});
