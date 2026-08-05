"use client";

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
import { TemplateBadgeInput } from "@/components/builder/ui/template-badge-input";
import { SchemaBuilder, type SchemaField } from "../schema-builder";

export interface SystemActionFieldsProps {
  actionType: string;
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}

// Database Query fields component
function DatabaseQueryFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
      <Label htmlFor="dbQuery">Consulta SQL</Label>
        <div className="overflow-hidden rounded-md border">
          <CodeEditor
            defaultLanguage="sql"
            height="150px"
            onChange={(value) => onUpdateConfig("dbQuery", value || "")}
            options={{
              minimap: { enabled: false },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              fontSize: 12,
              readOnly: disabled,
              wordWrap: "off",
            }}
            value={(config?.dbQuery as string) || ""}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          A DATABASE_URL das integrações do projeto será usada para executar
          essa consulta.
        </p>
      </div>
      <div className="space-y-2">
      <Label>Schema (opcional)</Label>
        <SchemaBuilder
          disabled={disabled}
          onChange={(schema) =>
            onUpdateConfig("dbSchema", JSON.stringify(schema))
          }
          schema={
            config?.dbSchema
              ? (JSON.parse(config.dbSchema as string) as SchemaField[])
              : []
          }
        />
      </div>
    </>
  );
}

// HTTP Request fields component
function HttpRequestFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
      <Label htmlFor="httpMethod">Método HTTP</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("httpMethod", value)}
          value={(config?.httpMethod as string) || "POST"}
        >
          <SelectTrigger className="w-full" id="httpMethod">
            <SelectValue placeholder="Selecione o método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
      <Label htmlFor="endpoint">URL</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="endpoint"
          onChange={(value) => onUpdateConfig("endpoint", value)}
          placeholder="https://api.example.com/endpoint or {{NodeName.url}}"
          value={(config?.endpoint as string) || ""}
        />
      </div>
      <div className="space-y-2">
      <Label htmlFor="httpHeaders">Cabeçalhos (JSON)</Label>
        <div className="overflow-hidden rounded-md border">
          <CodeEditor
            defaultLanguage="json"
            height="100px"
            onChange={(value) => onUpdateConfig("httpHeaders", value || "{}")}
            options={{
              minimap: { enabled: false },
              lineNumbers: "off",
              scrollBeyondLastLine: false,
              fontSize: 12,
              readOnly: disabled,
              wordWrap: "off",
            }}
            value={(config?.httpHeaders as string) || "{}"}
          />
        </div>
      </div>
      <div className="space-y-2">
      <Label htmlFor="httpBody">Corpo (JSON)</Label>
        <div
          className={`overflow-hidden rounded-md border ${config?.httpMethod === "GET" ? "opacity-50" : ""}`}
        >
          <CodeEditor
            defaultLanguage="json"
            height="120px"
            onChange={(value) => onUpdateConfig("httpBody", value || "{}")}
            options={{
              minimap: { enabled: false },
              lineNumbers: "off",
              scrollBeyondLastLine: false,
              fontSize: 12,
              readOnly: config?.httpMethod === "GET" || disabled,
              domReadOnly: config?.httpMethod === "GET" || disabled,
              wordWrap: "off",
            }}
            value={(config?.httpBody as string) || "{}"}
          />
        </div>
        {config?.httpMethod === "GET" && (
          <p className="text-muted-foreground text-xs">
            Body desativado para requisições GET
          </p>
        )}
      </div>
    </>
  );
}

// Condition fields component
function ConditionFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="condition">Expressão de condição</Label>
      <TemplateBadgeInput
        disabled={disabled}
        id="condition"
        onChange={(value) => onUpdateConfig("condition", value)}
        placeholder="e.g., 5 > 3, status === 200, {{PreviousNode.value}} > 100"
        value={(config?.condition as string) || ""}
      />
      <p className="text-muted-foreground text-xs">
        Enter a JavaScript expression that evaluates to true or false. You can
        use @ to reference previous node outputs.
      </p>
    </div>
  );
}

function DelayFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="delayMs">Atraso (ms)</Label>
      <Input
        disabled={disabled}
        id="delayMs"
        onChange={(e) => onUpdateConfig("delayMs", e.target.value)}
        placeholder="1000"
        value={(config?.delayMs as string) || ""}
      />
      <p className="text-muted-foreground text-xs">
        Wait before continuing to the next node.
      </p>
    </div>
  );
}

function VariableFields({
  config,
  onUpdateConfig,
  disabled,
  mode,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
  mode: "set" | "get";
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="variableKey">Chave da variável</Label>
      <Input
        disabled={disabled}
        id="variableKey"
        onChange={(e) => onUpdateConfig("variableKey", e.target.value)}
        placeholder="leadName"
        value={(config?.variableKey as string) || ""}
      />
      {mode === "set" && (
        <>
          <Label htmlFor="variableValue">Value</Label>
          <TemplateBadgeInput
            disabled={disabled}
            id="variableValue"
            onChange={(value) => onUpdateConfig("variableValue", value)}
            placeholder="Value or template"
            value={(config?.variableValue as string) || ""}
          />
        </>
      )}
      <p className="text-muted-foreground text-xs">
        {mode === "set"
          ? "Stores a value that can be used by later nodes."
          : "Reads a value stored earlier in the workflow."}
      </p>
    </div>
  );
}

export function ExecutionFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Execução
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="retryCount">Tentativas</Label>
          <Input
            disabled={disabled}
            id="retryCount"
            onChange={(e) => onUpdateConfig("retryCount", e.target.value)}
            placeholder="0"
            value={(config?.retryCount as string) || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="retryDelayMs">Atraso (ms)</Label>
          <Input
            disabled={disabled}
            id="retryDelayMs"
            onChange={(e) => onUpdateConfig("retryDelayMs", e.target.value)}
            placeholder="500"
            value={(config?.retryDelayMs as string) || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeoutMs">Timeout (ms)</Label>
          <Input
            disabled={disabled}
            id="timeoutMs"
            onChange={(e) => onUpdateConfig("timeoutMs", e.target.value)}
            placeholder="10000"
            value={(config?.timeoutMs as string) || ""}
          />
        </div>
      </div>
    </div>
  );
}

// System action fields wrapper - extracts conditional rendering to reduce complexity
export function SystemActionFields({
  actionType,
  config,
  onUpdateConfig,
  disabled,
}: SystemActionFieldsProps) {
  switch (actionType) {
    case "HTTP Request":
      return (
        <HttpRequestFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      );
    case "Database Query":
      return (
        <DatabaseQueryFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      );
    case "Condition":
      return (
        <ConditionFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      );
    case "Delay":
      return (
        <DelayFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      );
    case "Set Variable":
      return (
        <VariableFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
          mode="set"
        />
      );
    case "Get Variable":
      return (
        <VariableFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
          mode="get"
        />
      );
    default:
      return null;
  }
}
