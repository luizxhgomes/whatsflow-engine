import "server-only";

import { withStepLogging, type StepInput } from "../step-handler";
import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizePhoneNumber } from "@/lib/phone-formatter";

type UpdateProfileResult =
  | { success: true; data: { contactId: string; updated: string[] } }
  | { success: false; error: string };

export type UpdateProfileInput = StepInput & {
  phone?: string;
  toSource?: string;
  name?: string;
  email?: string;
  customFields?: string;
  triggerData?: Record<string, unknown>;
};

/**
 * Update Contact Profile step — updates contact information in the contacts table.
 */
export async function updateContactStep(
  input: UpdateProfileInput
): Promise<UpdateProfileResult> {
  "use step";

  return withStepLogging(input, async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return { success: false, error: "Supabase not configured" };
    }

    // Resolve phone from trigger or manual input
    const source = input.toSource || (input.triggerData?.from ? "inbound" : "manual");
    const rawPhone =
      source === "inbound"
        ? String(input.triggerData?.from || input.triggerData?.to || input.triggerData?.phone || "")
        : String(input.phone || "");

    const phone = normalizePhoneNumber(rawPhone);
    if (!phone) {
      return { success: false, error: `Invalid phone number: "${rawPhone}"` };
    }

    // Find existing contact
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, custom_fields")
      .eq("phone", phone)
      .maybeSingle();

    if (!contact) {
      return { success: false, error: `Contact not found for phone: ${phone}` };
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    const updatedFields: string[] = [];

    if (input.name) {
      updates.name = input.name;
      updatedFields.push("name");
    }
    if (input.email) {
      updates.email = input.email;
      updatedFields.push("email");
    }

    // Merge custom fields
    if (input.customFields) {
      try {
        const newFields = typeof input.customFields === "string"
          ? JSON.parse(input.customFields)
          : input.customFields;
        const existing = (contact.custom_fields as Record<string, unknown>) || {};
        updates.custom_fields = { ...existing, ...newFields };
        updatedFields.push("custom_fields");
      } catch {
        return { success: false, error: "Invalid custom fields JSON" };
      }
    }

    if (updatedFields.length === 0) {
      return { success: false, error: "No fields to update" };
    }

    updates.updated_at = new Date().toISOString();

    await supabase.from("contacts").update(updates).eq("id", contact.id);

    return {
      success: true,
      data: { contactId: contact.id, updated: updatedFields },
    };
  });
}

export const _integrationType = "contact";
