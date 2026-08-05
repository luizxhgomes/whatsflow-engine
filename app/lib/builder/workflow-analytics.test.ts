import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "workflow_analytics") {
        return {
          insert: mockInsert,
          select: mockSelect.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: [
                    { node_id: "trigger_1", event_type: "entered", phone: "+5511999" },
                    { node_id: "trigger_1", event_type: "completed", phone: "+5511999" },
                    { node_id: "action_1", event_type: "entered", phone: "+5511999" },
                    { node_id: "action_1", event_type: "completed", phone: "+5511999" },
                    { node_id: "action_2", event_type: "entered", phone: "+5511999" },
                    { node_id: "action_2", event_type: "error", phone: "+5511999" },
                  ],
                }),
              }),
            }),
          }),
        };
      }
      return {};
    },
  }),
}));

import { emitNodeEvent, getWorkflowAnalytics } from "./workflow-analytics";

describe("workflow-analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("emitNodeEvent", () => {
    it("deve inserir evento no banco", async () => {
      await emitNodeEvent({
        workflowId: "wf_1",
        nodeId: "node_1",
        eventType: "entered",
        phone: "+5511999",
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_id: "wf_1",
          node_id: "node_1",
          event_type: "entered",
          phone: "+5511999",
        })
      );
    });

    it("nao deve lancar erro mesmo com falha", async () => {
      mockInsert.mockRejectedValueOnce(new Error("DB error"));

      // Deve completar sem throw
      await expect(
        emitNodeEvent({
          workflowId: "wf_1",
          nodeId: "node_1",
          eventType: "entered",
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("getWorkflowAnalytics", () => {
    it("deve retornar funnel com aggregacao por node", async () => {
      const result = await getWorkflowAnalytics({ workflowId: "wf_1" });

      expect(result).not.toBeNull();
      if (result) {
        expect(result.totalExecutions).toBeGreaterThan(0);
        expect(result.uniquePhones).toBe(1);
        expect(result.funnel.length).toBe(3);

        const trigger = result.funnel.find((f) => f.nodeId === "trigger_1");
        expect(trigger?.entered).toBe(1);
        expect(trigger?.completed).toBe(1);
        expect(trigger?.completionRate).toBe(100);

        const errorNode = result.funnel.find((f) => f.nodeId === "action_2");
        expect(errorNode?.entered).toBe(1);
        expect(errorNode?.errors).toBe(1);
        expect(errorNode?.completionRate).toBe(0);
      }
    });
  });
});
