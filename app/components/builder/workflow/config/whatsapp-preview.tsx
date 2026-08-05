"use client";

import { cn } from "@/lib/builder/utils";
import type { Template, TemplateComponent, TemplateButton } from "@/types";

type PreviewProps = {
  actionType: string;
  config: Record<string, unknown>;
  template?: Template;
};

type TemplateParamEntry = { key?: string; text?: string };

function parseParams(raw: unknown): TemplateParamEntry[] {
  if (Array.isArray(raw)) return raw as TemplateParamEntry[];
  if (typeof raw !== "string" || raw.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TemplateParamEntry[]) : [];
  } catch {
    return [];
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceTemplateParams(
  text: string,
  params: TemplateParamEntry[],
  format: string
): string {
  if (!text || !params.length) return text;
  let result = text;

  if (format === "named") {
    for (const entry of params) {
      if (!entry?.key) continue;
      const pattern = new RegExp(
        `\\{\\{\\s*${escapeRegExp(entry.key)}\\s*\\}\\}`,
        "g"
      );
      result = result.replace(pattern, entry.text || "");
    }
    return result;
  }

  params.forEach((entry, index) => {
    const key = entry?.key ? Number(entry.key) : index + 1;
    if (!Number.isFinite(key)) return;
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    result = result.replace(pattern, entry?.text || "");
  });

  return result;
}

function getTemplateComponent(
  template: Template | undefined,
  type: TemplateComponent["type"]
): TemplateComponent | undefined {
  return template?.components?.find((component) => component.type === type);
}

function getTemplateButtons(template?: Template): TemplateButton[] {
  if (!template?.components?.length) return [];
  const buttonsComponent = template.components.find(
    (component) => component.type === "BUTTONS"
  );
  return buttonsComponent?.buttons || [];
}

function getPreviewText(actionType: string, config: Record<string, unknown>) {
  switch (actionType) {
    case "Send Message":
    case "Ask Question":
    case "whatsapp/send-message":
    case "whatsapp/ask-question":
      return String(config.message || "").trim() || "Preview da mensagem";
    case "Send Template":
    case "whatsapp/send-template": {
      const name =
        String(config.templateName || "").trim() || "nome_do_template";
      return `Template: ${name}`;
    }
    case "Buttons":
    case "whatsapp/send-buttons":
      return String(config.body || "").trim() || "Escolha uma opção";
    case "List":
    case "whatsapp/send-list":
      return String(config.body || "").trim() || "Selecione um item";
    case "Send Media":
    case "whatsapp/send-media":
      return (
        String(config.caption || "").trim() ||
        "Mensagem de mídia (imagem/vídeo/documento)"
      );
    default:
      return "";
  }
}

function parseButtons(raw: unknown): Array<{ id?: string; title?: string }> {
  if (typeof raw !== "string" || raw.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseSections(raw: unknown): Array<{ rows?: Array<{ title?: string }> }> {
  if (typeof raw !== "string" || raw.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function WhatsAppPreview({ actionType, config, template }: PreviewProps) {
  const isTemplate =
    actionType === "Send Template" || actionType === "whatsapp/send-template";
  const text = getPreviewText(actionType, config);

  const templateFormat =
    String(config.parameterFormat || template?.parameterFormat || "").trim() ||
    "positional";
  const bodyParams = parseParams(config.bodyParams);
  const headerParams = parseParams(config.headerParams);

  const templateBodyRaw = String(
    getTemplateComponent(template, "BODY")?.text || template?.content || ""
  );
  const templateHeaderComponent = getTemplateComponent(template, "HEADER");
  const templateHeaderRaw = String(
    templateHeaderComponent?.format === "TEXT"
      ? templateHeaderComponent?.text || ""
      : ""
  );
  const templateFooterRaw = String(
    getTemplateComponent(template, "FOOTER")?.text || ""
  );
  const templateButtons = getTemplateButtons(template);

  const templateBody = replaceTemplateParams(
    templateBodyRaw,
    bodyParams,
    templateFormat
  );
  const templateHeader = replaceTemplateParams(
    templateHeaderRaw,
    headerParams,
    templateFormat
  );
  const templateFooter = replaceTemplateParams(
    templateFooterRaw,
    bodyParams,
    templateFormat
  );

  const shouldRenderTemplatePreview =
    isTemplate && (templateBody || templateHeader || templateFooter);

  if (!text && !shouldRenderTemplatePreview) return null;

  const buttons = parseButtons(config.buttons);
  const sections = parseSections(config.sections);

  return (
    <div className="rounded-xl border border-white/10 bg-black/60 p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        Preview do WhatsApp
      </div>
      <div className="mt-3 space-y-2">
        {shouldRenderTemplatePreview ? (
          <>
            {templateHeader && (
              <div
                className={cn(
                  "max-w-[260px] rounded-2xl rounded-bl-sm bg-red-500/10 px-4 py-2 text-sm font-semibold text-white",
                  "shadow-[0_0_24px_rgba(16,185,129,0.1)]"
                )}
              >
                {templateHeader}
              </div>
            )}
            <div
              className={cn(
                "max-w-[260px] whitespace-pre-line rounded-2xl rounded-bl-sm bg-red-500/10 px-4 py-3 text-sm text-white",
                "shadow-[0_0_24px_rgba(16,185,129,0.1)]"
              )}
            >
              {templateBody || text}
              {templateFooter && (
                <div className="mt-2 text-xs text-white/70">
                  {templateFooter}
                </div>
              )}
            </div>
            {templateButtons.length > 0 && (
              <div className="space-y-2">
                {templateButtons.slice(0, 3).map((button, index) => (
                  <div
                    className="max-w-[260px] rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-xs text-white/80"
                    key={`${button.text}-${index}`}
                  >
                    {button.text || "Botão"}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div
            className={cn(
              "max-w-[260px] rounded-2xl rounded-bl-sm bg-red-500/10 px-4 py-3 text-sm text-white",
              "shadow-[0_0_24px_rgba(16,185,129,0.1)]"
            )}
          >
            {text}
          </div>
        )}

        {buttons.length > 0 && (
          <div className="space-y-2">
            {buttons.slice(0, 3).map((button, index) => (
              <div
                className="max-w-[260px] rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-xs text-white/80"
                key={`${button.id || button.title}-${index}`}
              >
                {button.title || "Botão"}
              </div>
            ))}
          </div>
        )}

        {sections.length > 0 && (
          <div className="max-w-[260px] rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white/70">
            {sections
              .flatMap((section) => section.rows || [])
              .slice(0, 3)
              .map((row, index) => (
                <div key={`${row.title}-${index}`}>{row.title || "Item"}</div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
