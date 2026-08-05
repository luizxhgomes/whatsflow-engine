import { describe, it, expect } from "vitest";
import { getAllActions, findActionById, getActionsByCategory } from "./plugins";
import { getStepImporter } from "./step-registry";

describe("plugins — registry de acoes", () => {
  const allActions = getAllActions();

  it("deve ter pelo menos 16 acoes registradas (6 originais + 10 novas)", () => {
    expect(allActions.length).toBeGreaterThanOrEqual(16);
  });

  describe("acoes Phase 1", () => {
    it.each([
      ["whatsapp/wait-for-reply", "waitForReplyStep"],
      ["whatsapp/handoff", "handoffStep"],
      ["contact/update-contact", "updateContactStep"],
      ["contact/manage-tags", "manageTagsStep"],
    ])("deve ter acao %s com stepFunction %s", (id, expectedStepFunction) => {
      const action = findActionById(id);
      expect(action).toBeDefined();
      expect(action?.stepFunction).toBe(expectedStepFunction);
    });
  });

  describe("acoes Phase 2", () => {
    it.each([
      ["logic/ab-split", "abSplitStep"],
      ["logic/business-hours", "businessHoursStep"],
      ["logic/sub-workflow", "subWorkflowStep"],
      ["ai/ai-response", "aiResponseStep"],
      ["whatsapp/send-carousel", "sendCarouselStep"],
    ])("deve ter acao %s com stepFunction %s", (id, expectedStepFunction) => {
      const action = findActionById(id);
      expect(action).toBeDefined();
      expect(action?.stepFunction).toBe(expectedStepFunction);
    });
  });

  describe("acoes Phase 3", () => {
    it("deve ter acao whatsapp/send-flow com stepFunction sendFlowStep", () => {
      const action = findActionById("whatsapp/send-flow");
      expect(action).toBeDefined();
      expect(action?.stepFunction).toBe("sendFlowStep");
    });
  });

  describe("step registry — imports resolvem", () => {
    it.each([
      "whatsapp/wait-for-reply",
      "whatsapp/handoff",
      "whatsapp/send-carousel",
      "whatsapp/send-flow",
      "contact/update-contact",
      "contact/manage-tags",
      "logic/ab-split",
      "logic/business-hours",
      "logic/sub-workflow",
      "ai/ai-response",
    ])("deve ter step importer para %s", (actionId) => {
      const importer = getStepImporter(actionId);
      expect(importer).not.toBeNull();
      expect(importer?.stepFunction).toBeTruthy();
      expect(typeof importer?.importer).toBe("function");
    });
  });

  describe("categorias", () => {
    it("deve ter categorias WhatsApp, Contatos, Logica, IA, Sistema", () => {
      const categories = getActionsByCategory();
      const categoryNames = Object.keys(categories);

      expect(categoryNames).toContain("WhatsApp");
      expect(categoryNames).toContain("Contatos");
      expect(categoryNames).toContain("Logica");
      expect(categoryNames).toContain("IA");
    });

    it("WhatsApp deve ter pelo menos 10 acoes", () => {
      const categories = getActionsByCategory();
      expect(categories.WhatsApp.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("legacy labels", () => {
    it.each([
      ["Wait for Reply", "whatsapp/wait-for-reply"],
      ["Handoff", "whatsapp/handoff"],
      ["A/B Split", "logic/ab-split"],
      ["AI Response", "ai/ai-response"],
      ["Carousel", "whatsapp/send-carousel"],
      ["Send Flow", "whatsapp/send-flow"],
    ])("deve resolver legacy label '%s' para %s", (legacyLabel, expectedId) => {
      const action = findActionById(legacyLabel);
      expect(action).toBeDefined();
      expect(action?.id).toBe(expectedId);
    });
  });

  describe("configFields", () => {
    it("cada acao deve ter configFields array", () => {
      for (const action of allActions) {
        expect(Array.isArray(action.configFields)).toBe(true);
      }
    });

    it("wait-for-reply deve ter variableKey required", () => {
      const action = findActionById("whatsapp/wait-for-reply");
      const field = action?.configFields.find((f) => "key" in f && f.key === "variableKey");
      expect(field).toBeDefined();
      if (field && "required" in field) {
        expect(field.required).toBe(true);
      }
    });

    it("send-flow deve ter flowId e variableKey", () => {
      const action = findActionById("whatsapp/send-flow");
      const fields = action?.configFields || [];
      const fieldKeys = fields.map((f) => ("key" in f ? f.key : ""));
      expect(fieldKeys).toContain("flowId");
      expect(fieldKeys).toContain("variableKey");
    });

    it("ab-split deve ter variants required", () => {
      const action = findActionById("logic/ab-split");
      const field = action?.configFields.find((f) => "key" in f && f.key === "variants");
      expect(field).toBeDefined();
      if (field && "required" in field) {
        expect(field.required).toBe(true);
      }
    });
  });
});
