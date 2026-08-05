"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/builder/ui/input";
import { Label } from "@/components/builder/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/builder/ui/select";
import { Checkbox } from "@/components/builder/ui/checkbox";
import { TemplateBadgeTextarea } from "@/components/builder/ui/template-badge-textarea";
import {
  BUTTON_PRESETS,
  normalizeButtonTitles,
  buildButtonsFromTitles,
} from "./utils";

export interface SendButtonsPanelProps {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}

export function SendButtonsPanel({
  config,
  onUpdateConfig,
  disabled,
}: SendButtonsPanelProps) {
  const bodyValue = String(config?.body || "");
  const headerTextValue = String(config?.headerText || "");
  const footerValue = String(config?.footer || "");
  const [buttonPreset, setButtonPreset] = useState("none");
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(headerTextValue || footerValue)
  );

  const buttonTitles = useMemo(() => {
    const titles = normalizeButtonTitles(config?.buttons);
    while (titles.length < 3) {
      titles.push("");
    }
    return titles.slice(0, 3);
  }, [config?.buttons]);

  const hasButtons = useMemo(
    () => buildButtonsFromTitles(buttonTitles).length > 0,
    [buttonTitles]
  );
  const hasBody = bodyValue.trim().length > 0;
  const hasTooLongTitle = buttonTitles.some(
    (title) => String(title).trim().length > 20
  );
  const footerTooLong = footerValue.trim().length > 60;

  useEffect(() => {
    if (headerTextValue || footerValue) {
      setShowAdvanced(true);
    }
  }, [footerValue, headerTextValue]);

  const handleButtonTitleChange = (index: number, value: string) => {
    const nextTitles = [...buttonTitles];
    nextTitles[index] = value;
    const nextButtons = buildButtonsFromTitles(nextTitles);
    onUpdateConfig("buttons", JSON.stringify(nextButtons));
    setButtonPreset("none");
  };

  const handlePresetChange = (value: string) => {
    setButtonPreset(value);
    const preset = BUTTON_PRESETS.find((item) => item.id === value);
    if (!preset) return;
    const nextTitles = [...preset.titles, "", "", ""].slice(0, 3);
    const nextButtons = buildButtonsFromTitles(nextTitles);
    onUpdateConfig("buttons", JSON.stringify(nextButtons));
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="body">
          Corpo *
        </Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="body"
          onChange={(value) => onUpdateConfig("body", value)}
          placeholder="Escolha uma opção"
          rows={3}
          value={bodyValue}
        />
        {!hasBody && (
          <p className="text-xs text-destructive">
            Corpo é obrigatório.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="ml-1">Presets</Label>
        <Select
          disabled={disabled}
          onValueChange={handlePresetChange}
          value={buttonPreset}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Escolha um preset" />
          </SelectTrigger>
          <SelectContent>
            {BUTTON_PRESETS.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="ml-1">Botões *</Label>
        <div className="space-y-2">
          {["Botão 1", "Botão 2", "Botão 3 (opcional)"].map(
            (label, index) => (
              <div className="space-y-1" key={label}>
                <Label className="text-xs text-muted-foreground" htmlFor={`button-title-${index}`}>
                  {label}
                </Label>
                <Input
                  disabled={disabled}
                  id={`button-title-${index}`}
                  onChange={(e) =>
                    handleButtonTitleChange(index, e.target.value)
                  }
                  placeholder={
                    index === 0
                      ? "Sim"
                      : index === 1
                        ? "Nao"
                        : "Outro"
                  }
                  value={buttonTitles[index] || ""}
                />
              </div>
            )
          )}
        </div>
        {!hasButtons && (
          <p className="text-xs text-destructive">
            Adicione pelo menos 1 botão.
          </p>
        )}
        {hasTooLongTitle && (
          <p className="text-xs text-destructive">
            Cada botão deve ter no máximo 20 caracteres.
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          Máximo de 3 botões. O ID é gerado automaticamente.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={showAdvanced}
            disabled={disabled}
            onCheckedChange={(value) => {
              const next = Boolean(value);
              setShowAdvanced(next);
              if (!next) {
                onUpdateConfig("headerText", "");
                onUpdateConfig("footer", "");
              }
            }}
          />
          <span className="text-sm text-muted-foreground">
            Mais opções (cabeçalho e rodapé)
          </span>
        </div>
        {showAdvanced && (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="headerText">Texto do cabeçalho</Label>
              <Input
                disabled={disabled}
                id="headerText"
                onChange={(e) =>
                  onUpdateConfig("headerText", e.target.value)
                }
                placeholder="Opcional"
                value={headerTextValue}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="footer">Rodapé</Label>
              <Input
                disabled={disabled}
                id="footer"
                onChange={(e) =>
                  onUpdateConfig("footer", e.target.value)
                }
                placeholder="Opcional"
                value={footerValue}
              />
              {footerTooLong && (
                <p className="text-xs text-destructive">
                  Rodapé deve ter no máximo 60 caracteres.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
