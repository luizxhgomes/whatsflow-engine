import { Label } from "@/components/builder/ui/label";
import { TemplateBadgeInput } from "@/components/builder/ui/template-badge-input";

type ConditionConfigProps = {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
};

export function ConditionConfig({
  config,
  onUpdateConfig,
  disabled,
}: ConditionConfigProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="condition">Expressão de condição</Label>
      <TemplateBadgeInput
        disabled={disabled}
        id="condition"
        onChange={(value) => onUpdateConfig("condition", value)}
        placeholder="ex: 5 > 3, status === 200, {{PreviousNode.value}} > 100"
        value={(config?.condition as string) || ""}
      />
      <p className="text-muted-foreground text-xs">
        Informe uma expressão JavaScript que resulte em true ou false. Use @
        para referenciar saidas de nodes anteriores.
      </p>
    </div>
  );
}
