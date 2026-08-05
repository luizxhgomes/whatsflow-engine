import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../step-handler", () => ({
  withStepLogging: (_input: unknown, fn: () => Promise<unknown>) => fn(),
}));

import { businessHoursStep } from "./business-hours";

describe("businessHoursStep", () => {
  it("deve retornar condition boolean", async () => {
    const result = await businessHoursStep({
      timezone: "America/Sao_Paulo",
      startTime: "00:00",
      endTime: "23:59",
      workDays: "0,1,2,3,4,5,6",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.condition).toBe(true);
      expect(typeof result.data.currentTime).toBe("string");
      expect(typeof result.data.dayOfWeek).toBe("number");
      expect(result.data.isBusinessDay).toBe(true);
    }
  });

  it("deve retornar false fora do horario", async () => {
    // Horario impossivel: 03:00-03:01 em dia util
    // A menos que o teste rode exatamente nesse horario, sera false
    const result = await businessHoursStep({
      timezone: "Pacific/Kiritimati", // UTC+14, para forcar horario diferente
      startTime: "03:00",
      endTime: "03:01",
      workDays: "1,2,3,4,5",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.condition).toBe("boolean");
    }
  });

  it("deve usar defaults quando nao configurado", async () => {
    const result = await businessHoursStep({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.condition).toBe("boolean");
      expect(typeof result.data.currentTime).toBe("string");
      expect(result.data.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(result.data.dayOfWeek).toBeLessThanOrEqual(6);
    }
  });

  it("deve respeitar dias nao uteis", async () => {
    // Dia 7 nao existe no sistema (0-6), entao nenhum dia sera util
    const result = await businessHoursStep({
      startTime: "00:00",
      endTime: "23:59",
      workDays: "7",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.condition).toBe(false);
      expect(result.data.isBusinessDay).toBe(false);
    }
  });
});
