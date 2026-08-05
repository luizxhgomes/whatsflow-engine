import "server-only";

import { withStepLogging, type StepInput } from "../step-handler";

type BusinessHoursResult =
  | { success: true; data: { condition: boolean; currentTime: string; dayOfWeek: number; isBusinessDay: boolean } }
  | { success: false; error: string };

export type BusinessHoursInput = StepInput & {
  timezone?: string;
  startTime?: string; // "09:00"
  endTime?: string;   // "18:00"
  workDays?: string;  // "1,2,3,4,5" (0=Sunday, 6=Saturday)
  triggerData?: Record<string, unknown>;
};

/**
 * Business Hours condition — evaluates whether the current time
 * falls within configured business hours.
 *
 * Returns condition: true if within business hours (same pattern as Condition node).
 */
export async function businessHoursStep(
  input: BusinessHoursInput
): Promise<BusinessHoursResult> {
  "use step";

  return withStepLogging(input, async () => {
    const timezone = input.timezone || "America/Sao_Paulo";
    const startTime = input.startTime || "09:00";
    const endTime = input.endTime || "18:00";
    const workDaysStr = input.workDays || "1,2,3,4,5";

    const workDays = workDaysStr
      .split(",")
      .map((d) => parseInt(d.trim(), 10))
      .filter((d) => !Number.isNaN(d));

    // Get current time in the specified timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    });

    const timeStr = formatter.format(now); // "09:30"
    const dayStr = dayFormatter.format(now);

    // Get day of week (0=Sunday)
    const dayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const dayOfWeek = dayMap[dayStr] ?? now.getDay();

    const isBusinessDay = workDays.includes(dayOfWeek);

    // Parse times for comparison
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const [currentH, currentM] = timeStr.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const currentMinutes = currentH * 60 + currentM;

    const isWithinHours = currentMinutes >= startMinutes && currentMinutes < endMinutes;

    const condition = isBusinessDay && isWithinHours;

    return {
      success: true,
      data: {
        condition,
        currentTime: timeStr,
        dayOfWeek,
        isBusinessDay,
      },
    };
  });
}
businessHoursStep.maxRetries = 0;
