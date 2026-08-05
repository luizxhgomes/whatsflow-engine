import "server-only";

import { withStepLogging, type StepInput } from "../step-handler";
import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizePhoneNumber } from "@/lib/phone-formatter";

type ManageTagsResult =
  | { success: true; data: { contactId: string; action: string; tags: string[] } }
  | { success: false; error: string };

export type ManageTagsInput = StepInput & {
  phone?: string;
  toSource?: string;
  action?: "add" | "remove";
  tags?: string;
  triggerData?: Record<string, unknown>;
};

/**
 * Manage Tags step — add or remove tags from a contact.
 */
export async function manageTagsStep(
  input: ManageTagsInput
): Promise<ManageTagsResult> {
  "use step";

  return withStepLogging(input, async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return { success: false, error: "Supabase not configured" };
    }

    const action = input.action || "add";
    const tagsRaw = String(input.tags || "").trim();
    if (!tagsRaw) {
      return { success: false, error: "Tags are required" };
    }

    const tagList = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (tagList.length === 0) {
      return { success: false, error: "No valid tags provided" };
    }

    // Resolve phone
    const source = input.toSource || (input.triggerData?.from ? "inbound" : "manual");
    const rawPhone =
      source === "inbound"
        ? String(input.triggerData?.from || input.triggerData?.to || input.triggerData?.phone || "")
        : String(input.phone || "");

    const phone = normalizePhoneNumber(rawPhone);
    if (!phone) {
      return { success: false, error: `Invalid phone number: "${rawPhone}"` };
    }

    // Find contact
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (!contact) {
      return { success: false, error: `Contact not found for phone: ${phone}` };
    }

    if (action === "add") {
      // Ensure tags exist in the tags table, then create contact_tags entries
      for (const tagName of tagList) {
        // Upsert tag
        const { data: tag } = await supabase
          .from("tags")
          .upsert({ name: tagName }, { onConflict: "name" })
          .select("id")
          .single();

        if (tag) {
          // Create contact-tag link (ignore if exists)
          await supabase
            .from("contact_tags")
            .upsert(
              { contact_id: contact.id, tag_id: tag.id },
              { onConflict: "contact_id,tag_id" }
            );
        }
      }
    } else {
      // Remove tags
      for (const tagName of tagList) {
        const { data: tag } = await supabase
          .from("tags")
          .select("id")
          .eq("name", tagName)
          .maybeSingle();

        if (tag) {
          await supabase
            .from("contact_tags")
            .delete()
            .eq("contact_id", contact.id)
            .eq("tag_id", tag.id);
        }
      }
    }

    return {
      success: true,
      data: { contactId: contact.id, action, tags: tagList },
    };
  });
}

export const _integrationType = "contact";
