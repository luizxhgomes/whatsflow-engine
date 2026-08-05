"use client";

import { Clock, Copy, Hash, MessageSquare, Play, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/builder/ui/button";
import { CodeEditor } from "@/components/builder/ui/code-editor";
import { Input } from "@/components/builder/ui/input";
import { Label } from "@/components/builder/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/builder/ui/select";
import { TimezoneSelect } from "@/components/builder/ui/timezone-select";
import { TemplateBadgeTextarea } from "@/components/builder/ui/template-badge-textarea";
import { SchemaBuilder, type SchemaField } from "./schema-builder";

type TriggerConfigProps = {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
  workflowId?: string;
};

export function TriggerConfig({
  config,
  onUpdateConfig,
  disabled,
  workflowId,
}: TriggerConfigProps) {
  const webhookUrl = workflowId
    ? `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")}/api/builder/workflows/${workflowId}/webhook`
    : "";

  const handleCopyWebhookUrl = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      toast.success("URL do webhook cópiada");
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="triggerType">
          Tipo de gatilho
        </Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("triggerType", value)}
          value={(config?.triggerType as string) || "Manual"}
        >
          <SelectTrigger className="w-full" id="triggerType">
            <SelectValue placeholder="Selecione o gatilho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MessageReceived">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagem Recebida
              </div>
            </SelectItem>
            <SelectItem value="Keywords">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Palavras-chave
              </div>
            </SelectItem>
            <SelectItem value="Manual">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Manual
              </div>
            </SelectItem>
            <SelectItem value="Schedule">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Agendamento
              </div>
            </SelectItem>
            <SelectItem value="Webhook">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Webhook
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Webhook fields */}
      {config?.triggerType === "Webhook" && (
        <>
          <div className="space-y-2">
            <Label className="ml-1">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                className="font-mono text-xs"
                disabled
                value={webhookUrl || "Salve o fluxo para gerar a URL do webhook"}
              />
              <Button
                disabled={!webhookUrl}
                onClick={handleCopyWebhookUrl}
                size="icon"
                variant="outline"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Schema da requisição (opcional)</Label>
            <SchemaBuilder
              disabled={disabled}
              onChange={(schema) =>
                onUpdateConfig("webhookSchema", JSON.stringify(schema))
              }
              schema={
                config?.webhookSchema
                  ? (JSON.parse(
                      config.webhookSchema as string
                    ) as SchemaField[])
                  : []
              }
            />
            <p className="text-muted-foreground text-xs">
              Defina a estrutura esperada do payload recebido.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhookMockRequest">
              Requisição mock (opcional)
            </Label>
            <div className="overflow-hidden rounded-md border">
              <CodeEditor
                defaultLanguage="json"
                height="150px"
                onChange={(value) =>
                  onUpdateConfig("webhookMockRequest", value || "")
                }
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  readOnly: disabled,
                  wordWrap: "on",
                }}
                value={(config?.webhookMockRequest as string) || ""}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Informe um JSON de exemplo para testar o webhook.
            </p>
          </div>
        </>
      )}

      {/* MessageReceived fields */}
      {config?.triggerType === "MessageReceived" && (
        <>
          <div className="space-y-2">
            <Label className="ml-1" htmlFor="messageTypeFilter">
              Filtrar por tipo de mensagem
            </Label>
            <Select
              disabled={disabled}
              onValueChange={(value) =>
                onUpdateConfig("messageTypeFilter", value)
              }
              value={(config?.messageTypeFilter as string) || "any"}
            >
              <SelectTrigger className="w-full" id="messageTypeFilter">
                <SelectValue placeholder="Qualquer tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualquer tipo</SelectItem>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="image">Imagem</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Documento</SelectItem>
                <SelectItem value="interactive">Interativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="ml-1" htmlFor="bodyMatch">
              Filtro no corpo (opcional)
            </Label>
            <Input
              disabled={disabled}
              id="bodyMatch"
              onChange={(e) => onUpdateConfig("bodyMatch", e.target.value)}
              placeholder="Texto para filtrar mensagens"
              value={(config?.bodyMatch as string) || ""}
            />
          </div>
          <div className="space-y-2">
            <Label className="ml-1" htmlFor="bodyMatchMode">
              Modo de comparação
            </Label>
            <Select
              disabled={disabled}
              onValueChange={(value) =>
                onUpdateConfig("bodyMatchMode", value)
              }
              value={(config?.bodyMatchMode as string) || "contains"}
            >
              <SelectTrigger className="w-full" id="bodyMatchMode">
                <SelectValue placeholder="Contem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contem</SelectItem>
                <SelectItem value="exact">Exato</SelectItem>
                <SelectItem value="regex">Regex</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-muted-foreground text-xs">
            Dispara quando qualquer mensagem e recebida. Use os filtros para
            restringir por tipo ou conteúdo.
          </p>
        </>
      )}

      {/* Keywords fields */}
      {config?.triggerType === "Keywords" && (
        <>
          <div className="space-y-2">
            <Label className="ml-1" htmlFor="keywordList">
              Palavras-chave (uma por linha)
            </Label>
            <TemplateBadgeTextarea
              disabled={disabled}
              id="keywordList"
              onChange={(value) => onUpdateConfig("keywordList", value)}
              placeholder={"preco\nvendas\norcamento\nsuporte"}
              rows={6}
              value={(config?.keywordList as string) || ""}
            />
            <p className="text-muted-foreground text-xs">
              Dispara quando a mensagem recebida contém qualquer palavra-chave.
            </p>
          </div>
        </>
      )}

      {/* Schedule fields */}
      {config?.triggerType === "Schedule" && (
        <>
          <div className="space-y-2">
            <Label className="ml-1" htmlFor="scheduleCron">
              Expressão cron
            </Label>
            <Input
              disabled={disabled}
              id="scheduleCron"
              onChange={(e) => onUpdateConfig("scheduleCron", e.target.value)}
              placeholder="0 9 * * * (todos os dias as 09:00)"
              value={(config?.scheduleCron as string) || ""}
            />
          </div>
          <div className="space-y-2">
            <Label className="ml-1" htmlFor="scheduleTimezone">
              Fuso horário
            </Label>
            <TimezoneSelect
              disabled={disabled}
              id="scheduleTimezone"
              onValueChange={(value) =>
                onUpdateConfig("scheduleTimezone", value)
              }
              value={(config?.scheduleTimezone as string) || "America/New_York"}
            />
          </div>
        </>
      )}
    </>
  );
}
