"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/builder/ui/button";
import { Input } from "@/components/builder/ui/input";
import { Label } from "@/components/builder/ui/label";
import { cn } from "@/lib/builder/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TemplateBadgeInput } from "@/components/builder/ui/template-badge-input";
import { splitTemplateText, type TemplateSegment } from "./utils";

export interface TemplatePreviewEditorProps {
  disabled: boolean;
  templateFormat: string;
  bodyText: string;
  headerText: string;
  footerText: string;
  bodyParamsMap: Record<string, string>;
  headerParamsMap: Record<string, string>;
  buttonParamIndex: number | null;
  buttonParamValue: string;
  buttonLabel: string;
  bodyKeys: string[];
  headerKeys: string[];
  systemFieldOptions: Array<{ label: string; token: string }>;
  customFieldOptions: Array<{ key: string; label: string }>;
  testContact: {
    name?: string;
    phone?: string;
    email?: string | null;
    custom_fields?: Record<string, unknown>;
  } | null;
  autoFillLabel: string;
  autoFillDisabled: boolean;
  onAutoFill: () => void;
  onUpdateBodyParam: (key: string, value: string) => void;
  onUpdateHeaderParam: (key: string, value: string) => void;
  onUpdateButtonParam: (value: string) => void;
}

export function TemplatePreviewEditor({
  disabled,
  templateFormat,
  bodyText,
  headerText,
  footerText,
  bodyParamsMap,
  headerParamsMap,
  buttonParamIndex,
  buttonParamValue,
  buttonLabel,
  bodyKeys,
  headerKeys,
  systemFieldOptions,
  customFieldOptions,
  testContact,
  autoFillLabel,
  autoFillDisabled,
  onAutoFill,
  onUpdateBodyParam,
  onUpdateHeaderParam,
  onUpdateButtonParam,
}: TemplatePreviewEditorProps) {
  const [activeSlot, setActiveSlot] = useState<{
    scope: "body" | "header" | "button";
    key?: string;
    id: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [flowDraft, setFlowDraft] = useState("");

  const bodySegments = useMemo(
    () => splitTemplateText(bodyText, templateFormat),
    [bodyText, templateFormat]
  );
  const headerSegments = useMemo(
    () => splitTemplateText(headerText, templateFormat),
    [headerText, templateFormat]
  );
  const footerSegments = useMemo(
    () => splitTemplateText(footerText, templateFormat),
    [footerText, templateFormat]
  );

  const slotAnchors = useMemo(() => {
    const map = new Map<string, string>();
    const register = (
      segments: TemplateSegment[],
      scope: "body" | "header"
    ) => {
      segments.forEach((segment, index) => {
        if (segment.type !== "var") return;
        const mapKey = `${scope}:${segment.key}`;
        if (!map.has(mapKey)) {
          map.set(mapKey, `${scope}-${segment.key}-${index}`);
        }
      });
    };
    register(headerSegments, "header");
    register(bodySegments, "body");
    return map;
  }, [bodySegments, headerSegments]);

  const slotOrder = useMemo(() => {
    const slots: Array<{
      scope: "header" | "body" | "button";
      key?: string;
      id: string;
    }> = [];
    if (headerKeys.length > 0) {
      const key = headerKeys[0];
      const anchorId = slotAnchors.get(`header:${key}`) || `header-${key}-0`;
      slots.push({ scope: "header", key, id: anchorId });
    }
    for (const key of bodyKeys) {
      const anchorId = slotAnchors.get(`body:${key}`) || `body-${key}-0`;
      slots.push({ scope: "body", key, id: anchorId });
    }
    if (buttonParamIndex !== null) {
      slots.push({ scope: "button", id: "button" });
    }
    return slots;
  }, [bodyKeys, buttonParamIndex, headerKeys, slotAnchors]);

  const getSlotValue = (slot: {
    scope: "body" | "header" | "button";
    key?: string;
  }) => {
    if (slot.scope === "button") return buttonParamValue || "";
    if (slot.scope === "header") {
      return slot.key ? headerParamsMap[slot.key] || "" : "";
    }
    return slot.key ? bodyParamsMap[slot.key] || "" : "";
  };

  const activeValue = activeSlot ? getSlotValue(activeSlot) : "";

  useEffect(() => {
    if (!activeSlot) {
      setSearchTerm("");
      setFlowDraft("");
      return;
    }
    setSearchTerm("");
    setFlowDraft(activeValue.includes("{{@") ? activeValue : "");
  }, [activeSlot, activeValue]);

  const resolveSystemToken = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (
      trimmed === "{{nome}}" ||
      trimmed === "{{name}}" ||
      trimmed === "{{contact.name}}"
    ) {
      return "{{contact.name}}";
    }
    if (
      trimmed === "{{telefone}}" ||
      trimmed === "{{phone}}" ||
      trimmed === "{{contact.phone}}"
    ) {
      return "{{contact.phone}}";
    }
    if (trimmed === "{{email}}" || trimmed === "{{contact.email}}") {
      return "{{contact.email}}";
    }
    return null;
  };

  const resolvePreviewValue = (raw: string): string => {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return "";

    const normalizedSystem = resolveSystemToken(trimmed);
    if (normalizedSystem) {
      const systemLabel =
        systemFieldOptions.find((option) => option.token === normalizedSystem)
          ?.label || normalizedSystem;
      if (!testContact) return systemLabel;
      if (normalizedSystem === "{{contact.name}}") {
        return testContact.name?.trim() || systemLabel;
      }
      if (normalizedSystem === "{{contact.phone}}") {
        return testContact.phone?.trim() || systemLabel;
      }
      if (normalizedSystem === "{{contact.email}}") {
        return String(testContact.email || "").trim() || systemLabel;
      }
      return systemLabel;
    }

    const customMatch = trimmed.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);
    if (customMatch) {
      const key = customMatch[1];
      const customLabel =
        customFieldOptions.find((option) => option.key === key)?.label || key;
      const customValue = testContact?.custom_fields?.[key];
      if (customValue !== undefined && customValue !== null) {
        return String(customValue);
      }
      return customLabel;
    }

    const flowMatch = trimmed.match(/^\{\{@[^:]+:([^}]+)\}\}$/);
    if (flowMatch) {
      return flowMatch[1];
    }

    return trimmed;
  };

  const handleActiveChange = (value: string) => {
    if (!activeSlot) return;
    if (activeSlot.scope === "button") {
      onUpdateButtonParam(value);
      return;
    }
    if (!activeSlot.key) return;
    if (activeSlot.scope === "header") {
      onUpdateHeaderParam(activeSlot.key, value);
      return;
    }
    onUpdateBodyParam(activeSlot.key, value);
  };

  const filledCount = useMemo(
    () =>
      slotOrder.filter((slot) => String(getSlotValue(slot)).trim().length > 0)
        .length,
    [slotOrder, bodyParamsMap, headerParamsMap, buttonParamValue, getSlotValue]
  );
  const totalCount = slotOrder.length;
  const progressPct =
    totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  const focusNextSlot = () => {
    if (!slotOrder.length) return;
    if (!activeSlot) {
      const first = slotOrder.find(
        (slot) => String(getSlotValue(slot)).trim().length === 0
      );
      setActiveSlot(first || slotOrder[0]);
      return;
    }
    const currentIndex = slotOrder.findIndex(
      (slot) =>
        slot.scope === activeSlot.scope && slot.key === activeSlot.key
    );
    const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
    const ordered = [...slotOrder.slice(startIndex), ...slotOrder.slice(0, startIndex)];
    const next = ordered.find(
      (slot) => String(getSlotValue(slot)).trim().length === 0
    );
    setActiveSlot(next || ordered[0]);
  };

  const normalizedSearch = searchTerm.toLowerCase().trim();
  const filteredSystem = systemFieldOptions.filter((option) => {
    if (!normalizedSearch) return true;
    return (
      option.label.toLowerCase().includes(normalizedSearch) ||
      option.token.toLowerCase().includes(normalizedSearch)
    );
  });
  const filteredCustom = customFieldOptions.filter((option) => {
    if (!normalizedSearch) return true;
    return (
      option.label.toLowerCase().includes(normalizedSearch) ||
      option.key.toLowerCase().includes(normalizedSearch)
    );
  });

  const renderSlotPicker = (
    slot: { scope: "body" | "header" | "button"; key?: string; id: string },
    displayValue: string
  ) => {
    const isActive = activeSlot?.id === slot.id;
    const rawValue = getSlotValue(slot);
    const placeholder =
      slot.scope === "button"
        ? "Clique para definir"
        : slot.key
          ? `{${slot.key}}`
          : "";
    return (
      <Popover
        open={isActive}
        onOpenChange={(open) => setActiveSlot(open ? slot : null)}
      >
        <PopoverTrigger asChild>
          <button
            className={cn(
            "inline-flex items-center rounded-md border border-red-500/30 bg-red-500/15 px-1.5 py-0.5 text-xs text-red-100 transition-colors hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400/70",
            !rawValue && "text-red-200/70",
            isActive && "ring-1 ring-red-400/70"
          )}
            disabled={disabled}
            type="button"
          >
            {displayValue || placeholder}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 border border-white/10 bg-zinc-950 p-3 text-white">
          <div className="flex items-center justify-between gap-2">
            <Input
              className="h-8 bg-zinc-900/60 text-xs text-white"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar campo..."
              value={searchTerm}
            />
            <Button
              onClick={() => {
                handleActiveChange("");
                setActiveSlot(null);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              Limpar
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Sistema
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredSystem.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  Nenhum campo encontrado.
                </span>
              ) : (
                filteredSystem.map((option) => (
                  <button
                    className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-100 hover:bg-red-500/20"
                    key={option.token}
                    onClick={() => {
                      handleActiveChange(option.token);
                      setActiveSlot(null);
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Personalizado
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredCustom.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  Nenhum campo encontrado.
                </span>
              ) : (
                filteredCustom.map((option) => (
                  <button
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/5"
                    key={option.key}
                    onClick={() => {
                      handleActiveChange(`{{${option.key}}}`);
                      setActiveSlot(null);
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Variável do fluxo
            </div>
            <TemplateBadgeInput
              className="bg-zinc-900/60 text-white"
              disabled={disabled}
              onChange={setFlowDraft}
              placeholder="Digite @ para escolher"
              value={flowDraft}
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  if (!flowDraft.trim()) return;
                  handleActiveChange(flowDraft);
                  setActiveSlot(null);
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                Usar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderSegments = (
    segments: TemplateSegment[],
    scope: "body" | "header"
  ) =>
    segments.map((segment, index) => {
      if (segment.type === "text") {
        return <span key={`${scope}-text-${index}`}>{segment.value}</span>;
      }
      const map = scope === "header" ? headerParamsMap : bodyParamsMap;
      const value = map[segment.key] || "";
      const displayValue = resolvePreviewValue(value);
      const slotId = `${scope}-${segment.key}-${index}`;
      return (
        <span key={`${scope}-var-${segment.key}-${index}`}>
          {renderSlotPicker({ scope, key: segment.key, id: slotId }, displayValue)}
        </span>
      );
    });

  const buttonDisplayValue = resolvePreviewValue(buttonParamValue);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Label className="ml-1">Clique no preview para preencher</Label>
          <div className="mt-1 text-xs text-muted-foreground">
            {filledCount}/{totalCount} preenchidos
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={autoFillDisabled || disabled}
            onClick={onAutoFill}
            size="sm"
            type="button"
            variant="outline"
            title={autoFillDisabled ? autoFillLabel : undefined}
          >
            Auto-preencher (contato teste)
          </Button>
          <Button
            disabled={disabled || totalCount === 0}
            onClick={focusNextSlot}
            size="sm"
            type="button"
            variant="outline"
          >
            Próximo campo
          </Button>
        </div>
      </div>
      {autoFillLabel && (
        <div className="text-xs text-muted-foreground">{autoFillLabel}</div>
      )}
      <div className="h-1.5 w-full rounded-full bg-white/10">
        <div
          className="h-1.5 rounded-full bg-red-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="rounded-xl border border-white/10 bg-black/50 p-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Preview do WhatsApp
        </div>
        <div className="mt-3 space-y-2">
          {headerSegments.length > 0 && (
            <div
              className={cn(
                "max-w-[260px] whitespace-pre-line rounded-2xl rounded-bl-sm bg-red-500/10 px-4 py-2 text-sm font-semibold text-white",
                "shadow-[0_0_24px_rgba(16,185,129,0.1)]"
              )}
            >
              {renderSegments(headerSegments, "header")}
            </div>
          )}
          <div
            className={cn(
              "max-w-[260px] whitespace-pre-line rounded-2xl rounded-bl-sm bg-red-500/10 px-4 py-3 text-sm text-white",
              "shadow-[0_0_24px_rgba(16,185,129,0.1)]"
            )}
          >
            {bodySegments.length > 0
              ? renderSegments(bodySegments, "body")
              : bodyText || "Preview do template"}
            {footerSegments.length > 0 && (
              <div className="mt-2 text-xs text-white/70">
                {renderSegments(footerSegments, "body")}
              </div>
            )}
          </div>
        </div>
        {buttonParamIndex !== null && (
          <div className="mt-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>{buttonLabel || "Botão"}</span>
              {renderSlotPicker({ scope: "button", id: "button" }, buttonDisplayValue)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
