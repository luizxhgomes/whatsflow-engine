import "server-only";

import { withStepLogging, type StepInput } from "../step-handler";
import { getCredentials, resolveRecipient, sendWhatsAppPayload, parseJsonArray } from "./shared";

type SendCarouselResult =
  | { success: true; data: unknown }
  | { success: false; error: string; details?: unknown };

export type SendCarouselInput = StepInput & {
  to?: string;
  toSource?: string;
  templateName?: string;
  language?: string;
  bodyText?: string;
  cards?: string; // JSON array of card objects
  triggerData?: Record<string, unknown>;
};

type CarouselCard = {
  headerImageUrl?: string;
  headerImageId?: string;
  headerVideoUrl?: string;
  headerVideoId?: string;
  bodyParams?: string[]; // Template variable values for card body
  buttonParams?: Array<{
    type: "quick_reply" | "url";
    payload?: string;
    text?: string;
  }>;
};

/**
 * Send Carousel step — sends a carousel template message via WhatsApp Cloud API.
 *
 * Meta API requires carousel to be sent as a template message with CAROUSEL component.
 * The template must be pre-approved with carousel cards defined.
 *
 * Each card has:
 * - Header: image or video
 * - Body: text with optional variables
 * - Buttons: quick_reply or url
 *
 * Requires 2-10 cards.
 */
export async function sendCarouselStep(
  input: SendCarouselInput
): Promise<SendCarouselResult> {
  "use step";

  return withStepLogging(input, async () => {
    const credentials = await getCredentials();
    if (!credentials) {
      return { success: false, error: "WhatsApp not configured" };
    }

    const recipient = resolveRecipient(input);
    if (!recipient.ok) {
      return { success: false, error: recipient.error };
    }

    const templateName = String(input.templateName || "").trim();
    if (!templateName) {
      return { success: false, error: "Template name is required for carousel" };
    }

    const language = String(input.language || "pt_BR").trim();
    const cards = parseJsonArray<CarouselCard>(input.cards);

    if (cards.length < 2) {
      return { success: false, error: "Carousel requires at least 2 cards" };
    }
    if (cards.length > 10) {
      return { success: false, error: "Carousel supports max 10 cards" };
    }

    // Build template components
    const components: unknown[] = [];

    // Body component (template-level body params)
    if (input.bodyText) {
      try {
        const bodyParams = JSON.parse(input.bodyText);
        if (Array.isArray(bodyParams) && bodyParams.length > 0) {
          components.push({
            type: "body",
            parameters: bodyParams.map((p: string) => ({
              type: "text",
              text: String(p),
            })),
          });
        }
      } catch {
        // bodyText is plain text, not JSON params — skip
      }
    }

    // Carousel component with cards
    const carouselCards = cards.map((card, index) => {
      const cardComponents: unknown[] = [];

      // Card header (image or video)
      if (card.headerImageUrl || card.headerImageId) {
        cardComponents.push({
          type: "header",
          parameters: [
            card.headerImageId
              ? { type: "image", image: { id: card.headerImageId } }
              : { type: "image", image: { link: card.headerImageUrl } },
          ],
        });
      } else if (card.headerVideoUrl || card.headerVideoId) {
        cardComponents.push({
          type: "header",
          parameters: [
            card.headerVideoId
              ? { type: "video", video: { id: card.headerVideoId } }
              : { type: "video", video: { link: card.headerVideoUrl } },
          ],
        });
      }

      // Card body parameters
      if (card.bodyParams && card.bodyParams.length > 0) {
        cardComponents.push({
          type: "body",
          parameters: card.bodyParams.map((p) => ({
            type: "text",
            text: String(p),
          })),
        });
      }

      // Card buttons
      if (card.buttonParams && card.buttonParams.length > 0) {
        for (let btnIdx = 0; btnIdx < card.buttonParams.length; btnIdx++) {
          const btn = card.buttonParams[btnIdx];
          cardComponents.push({
            type: "button",
            sub_type: btn.type === "url" ? "url" : "quick_reply",
            index: btnIdx,
            parameters:
              btn.type === "url"
                ? [{ type: "text", text: btn.text || "" }]
                : [{ type: "payload", payload: btn.payload || `card_${index}_btn_${btnIdx}` }],
          });
        }
      }

      return {
        card_index: index,
        components: cardComponents,
      };
    });

    components.push({
      type: "carousel",
      cards: carouselCards,
    });

    // Build the template message payload
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient.to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    };

    const result = await sendWhatsAppPayload(credentials, payload);
    if (!result.ok) {
      return { success: false, error: result.error, details: result.data };
    }

    return { success: true, data: result.data };
  });
}
sendCarouselStep.maxRetries = 0;

export const _integrationType = "whatsapp";
