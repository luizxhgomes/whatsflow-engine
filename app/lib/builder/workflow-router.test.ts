import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Mock supabase
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => mockSupabase,
}));

vi.mock("@/lib/phone-formatter", () => ({
  normalizePhoneNumber: (phone: string) => phone.startsWith("+") ? phone : `+${phone}`,
}));

vi.mock("./workflow-conversations", () => ({
  getPendingConversation: vi.fn(),
}));

import { routeInboundMessage } from "./workflow-router";
import { getPendingConversation } from "./workflow-conversations";

describe("routeInboundMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getPendingConversation as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it("deve priorizar pending conversation", async () => {
    (getPendingConversation as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "conv_1",
      workflow_id: "wf_pending",
      status: "waiting",
    });

    const result = await routeInboundMessage({
      supabase: mockSupabase as any,
      from: "+5511999999999",
      text: "oi",
      messageType: "text",
      keywordWorkflows: [{ workflowId: "wf_keyword", keywords: ["oi"] }],
      messageReceivedWorkflows: [{ workflowId: "wf_received" }],
      defaultWorkflowId: "wf_default",
    });

    expect(result.type).toBe("resume");
    if (result.type === "resume") {
      expect(result.workflowId).toBe("wf_pending");
      expect(result.conversationId).toBe("conv_1");
    }
  });

  it("deve usar keyword match quando nao tem pending", async () => {
    const result = await routeInboundMessage({
      supabase: mockSupabase as any,
      from: "+5511999999999",
      text: "preco",
      messageType: "text",
      keywordWorkflows: [
        { workflowId: "wf_preco", keywords: ["preco"] },
        { workflowId: "wf_suporte", keywords: ["suporte", "ajuda"] },
      ],
      messageReceivedWorkflows: [],
      defaultWorkflowId: null,
    });

    expect(result.type).toBe("keyword");
    if (result.type === "keyword") {
      expect(result.workflowId).toBe("wf_preco");
    }
  });

  it("deve usar MessageReceived quando nao tem keyword match", async () => {
    const result = await routeInboundMessage({
      supabase: mockSupabase as any,
      from: "+5511999999999",
      text: "qualquer coisa",
      messageType: "text",
      keywordWorkflows: [{ workflowId: "wf_preco", keywords: ["preco"] }],
      messageReceivedWorkflows: [{ workflowId: "wf_received" }],
      defaultWorkflowId: "wf_default",
    });

    expect(result.type).toBe("message_received");
    if (result.type === "message_received") {
      expect(result.workflowId).toBe("wf_received");
    }
  });

  it("deve usar default quando nada mais corresponde", async () => {
    const result = await routeInboundMessage({
      supabase: mockSupabase as any,
      from: "+5511999999999",
      text: "qualquer coisa",
      messageType: "text",
      keywordWorkflows: [],
      messageReceivedWorkflows: [],
      defaultWorkflowId: "wf_default",
    });

    expect(result.type).toBe("default");
    if (result.type === "default") {
      expect(result.workflowId).toBe("wf_default");
    }
  });

  it("deve retornar none quando nada corresponde e nao tem default", async () => {
    const result = await routeInboundMessage({
      supabase: mockSupabase as any,
      from: "+5511999999999",
      text: "qualquer coisa",
      messageType: "text",
      keywordWorkflows: [],
      messageReceivedWorkflows: [],
      defaultWorkflowId: null,
    });

    expect(result.type).toBe("none");
  });

  it("deve filtrar MessageReceived por tipo de mensagem", async () => {
    const result = await routeInboundMessage({
      supabase: mockSupabase as any,
      from: "+5511999999999",
      text: "",
      messageType: "image",
      keywordWorkflows: [],
      messageReceivedWorkflows: [
        {
          workflowId: "wf_text_only",
          filters: { messageType: "text" },
        },
        {
          workflowId: "wf_image",
          filters: { messageType: "image" },
        },
      ],
      defaultWorkflowId: null,
    });

    expect(result.type).toBe("message_received");
    if (result.type === "message_received") {
      expect(result.workflowId).toBe("wf_image");
    }
  });

  it("deve filtrar MessageReceived por body contains", async () => {
    const result = await routeInboundMessage({
      supabase: mockSupabase as any,
      from: "+5511999999999",
      text: "quero saber o preco do produto",
      messageType: "text",
      keywordWorkflows: [],
      messageReceivedWorkflows: [
        {
          workflowId: "wf_preco_filter",
          filters: { bodyMatch: "preco", bodyMatchMode: "contains" },
        },
      ],
      defaultWorkflowId: null,
    });

    expect(result.type).toBe("message_received");
    if (result.type === "message_received") {
      expect(result.workflowId).toBe("wf_preco_filter");
    }
  });
});
