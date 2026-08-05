import type { ComponentType } from "react";
import type { IntegrationType } from "./types/integration";

export type SelectOption = {
  value: string;
  label: string;
};

export type ActionConfigFieldBase = {
  key: string;
  label: string;
  type:
    | "template-input"
    | "template-textarea"
    | "text"
    | "number"
    | "select"
    | "schema-builder";
  placeholder?: string;
  defaultValue?: string;
  example?: string;
  options?: SelectOption[];
  rows?: number;
  min?: number;
  required?: boolean;
  showWhen?: {
    field: string;
    equals: string;
  };
};

export type ActionConfigFieldGroup = {
  label: string;
  type: "group";
  fields: ActionConfigFieldBase[];
  defaultExpanded?: boolean;
};

export type ActionConfigField = ActionConfigFieldBase | ActionConfigFieldGroup;

export type OutputField = {
  field: string;
  description: string;
};

export type ResultComponentProps = {
  output: unknown;
  input?: unknown;
};

export type OutputDisplayConfig =
  | {
      type: "image" | "video" | "url";
      field: string;
    }
  | {
      type: "component";
      component: ComponentType<ResultComponentProps>;
    };

export type PluginAction = {
  slug: string;
  label: string;
  description: string;
  category: string;
  stepFunction: string;
  stepImportPath: string;
  configFields: ActionConfigField[];
  outputFields?: OutputField[];
  outputConfig?: OutputDisplayConfig;
  codegenTemplate?: string;
};

export type ActionWithFullId = PluginAction & {
  id: string;
  integration: IntegrationType;
};

export type IntegrationPlugin = {
  type: IntegrationType;
  label: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
  formFields?: Array<{
    id: string;
    label: string;
    type: "text" | "password" | "url";
    placeholder?: string;
    helpText?: string;
    helpLink?: { text: string; url: string };
    configKey: string;
    envVar?: string;
  }>;
  actions: PluginAction[];
};

const integrations: IntegrationPlugin[] = [
  {
    type: "whatsapp",
    label: "WhatsApp",
    description: "Enviar mensagens no WhatsApp",
    actions: [
      {
        slug: "send-message",
        label: "Enviar mensagem",
        description: "Enviar uma mensagem de texto",
        category: "WhatsApp",
        stepFunction: "sendMessageStep",
        stepImportPath: "whatsapp/send-message",
        configFields: [
          {
            key: "toSource",
            label: "Destinatário",
            type: "select",
            options: [
              { label: "Da mensagem recebida", value: "inbound" },
              { label: "Número manual", value: "manual" },
            ],
            defaultValue: "inbound",
          },
          {
            key: "to",
            label: "Para",
            type: "template-input",
            placeholder: "+5511999999999",
            showWhen: { field: "toSource", equals: "manual" },
          },
          {
            key: "message",
            label: "Mensagem",
            type: "template-textarea",
            placeholder: "Digite sua mensagem",
            required: true,
          },
          {
            key: "previewUrl",
            label: "URL de preview",
            type: "select",
            options: [
              { label: "Desligado", value: "false" },
              { label: "Ligado", value: "true" },
            ],
          },
        ],
        outputFields: [{ field: "messageId", description: "ID da mensagem" }],
      },
      {
        slug: "ask-question",
        label: "Perguntar",
        description: "Fazer uma pergunta e aguardar a resposta",
        category: "WhatsApp",
        stepFunction: "askQuestionStep",
        stepImportPath: "whatsapp/ask-question",
        configFields: [
          {
            key: "toSource",
            label: "Destinatário",
            type: "select",
            options: [
              { label: "Da mensagem recebida", value: "inbound" },
              { label: "Número manual", value: "manual" },
            ],
            defaultValue: "inbound",
          },
          {
            key: "to",
            label: "Para",
            type: "template-input",
            placeholder: "+5511999999999",
            showWhen: { field: "toSource", equals: "manual" },
          },
          {
            key: "message",
            label: "Pergunta",
            type: "template-textarea",
            placeholder: "Digite sua pergunta",
            required: true,
          },
          {
            key: "variableKey",
            label: "Salvar resposta como",
            type: "text",
            placeholder: "user_answer",
            required: true,
          },
        ],
        outputFields: [
          { field: "status", description: "Status da conversa" },
          { field: "conversationId", description: "ID da conversa" },
        ],
      },
      {
        slug: "send-template",
        label: "Enviar template",
        description: "Enviar uma mensagem de template",
        category: "WhatsApp",
        stepFunction: "sendTemplateStep",
        stepImportPath: "whatsapp/send-template",
        configFields: [
          {
            key: "toSource",
            label: "Destinatário",
            type: "select",
            options: [
              { label: "Da mensagem recebida", value: "inbound" },
              { label: "Número manual", value: "manual" },
            ],
            defaultValue: "inbound",
          },
          {
            key: "to",
            label: "Para",
            type: "template-input",
            placeholder: "+5511999999999",
            showWhen: { field: "toSource", equals: "manual" },
          },
          {
            key: "templateName",
            label: "Nome do template",
            type: "text",
            placeholder: "welcome_message",
            required: true,
          },
          {
            key: "language",
            label: "Idioma",
            type: "text",
            placeholder: "pt_BR",
            defaultValue: "pt_BR",
          },
          {
            key: "parameterFormat",
            label: "Formato dos parâmetros",
            type: "select",
            options: [
              { label: "Posicional", value: "positional" },
              { label: "Nomeado", value: "named" },
            ],
            defaultValue: "positional",
          },
          {
            key: "bodyParams",
            label: "Parâmetros do corpo (JSON)",
            type: "template-textarea",
            placeholder: '[{"key":"1","text":"John"}]',
            rows: 4,
          },
          {
            key: "headerParams",
            label: "Parâmetros do cabeçalho (JSON)",
            type: "template-textarea",
            placeholder: '[{"key":"1","text":"Hello"}]',
            rows: 3,
          },
          {
            key: "buttonParams",
            label: "Parâmetros do botão (JSON)",
            type: "template-textarea",
            placeholder: '[{"index":0,"params":[{"text":"https://example.com"}]}]',
            rows: 3,
          },
        ],
        outputFields: [{ field: "messageId", description: "ID da mensagem" }],
      },
      {
        slug: "send-media",
        label: "Enviar mídia",
        description: "Enviar imagem, vídeo, áudio ou documento",
        category: "WhatsApp",
        stepFunction: "sendMediaStep",
        stepImportPath: "whatsapp/send-media",
        configFields: [
          {
            key: "toSource",
            label: "Destinatário",
            type: "select",
            options: [
              { label: "Da mensagem recebida", value: "inbound" },
              { label: "Número manual", value: "manual" },
            ],
            defaultValue: "inbound",
          },
          {
            key: "to",
            label: "Para",
            type: "template-input",
            placeholder: "+5511999999999",
            showWhen: { field: "toSource", equals: "manual" },
          },
          {
            key: "mediaType",
            label: "Tipo de mídia",
            type: "select",
            options: [
              { label: "Imagem", value: "image" },
              { label: "Vídeo", value: "video" },
              { label: "Áudio", value: "audio" },
              { label: "Documento", value: "document" },
              { label: "Sticker", value: "sticker" },
            ],
            defaultValue: "image",
          },
          {
            key: "mediaUrl",
            label: "URL da mídia",
            type: "template-input",
            placeholder: "https://example.com/file.png",
          },
          {
            key: "mediaId",
            label: "ID da mídia",
            type: "text",
            placeholder: "Use if already uploaded",
          },
          {
            key: "caption",
            label: "Legenda",
            type: "template-textarea",
            placeholder: "Optional caption",
            rows: 3,
          },
          {
            key: "filename",
            label: "Nome do arquivo",
            type: "text",
            placeholder: "document.pdf",
          },
        ],
        outputFields: [{ field: "messageId", description: "ID da mensagem" }],
      },
      {
        slug: "send-buttons",
        label: "Botões",
        description: "Enviar botões interativos de resposta",
        category: "WhatsApp",
        stepFunction: "sendButtonsStep",
        stepImportPath: "whatsapp/send-buttons",
        configFields: [
          {
            key: "toSource",
            label: "Destinatário",
            type: "select",
            options: [
              { label: "Da mensagem recebida", value: "inbound" },
              { label: "Número manual", value: "manual" },
            ],
            defaultValue: "inbound",
          },
          {
            key: "to",
            label: "Para",
            type: "template-input",
            placeholder: "+5511999999999",
            showWhen: { field: "toSource", equals: "manual" },
          },
          {
            key: "body",
            label: "Corpo",
            type: "template-textarea",
            placeholder: "Choose an option",
            rows: 3,
            required: true,
          },
          {
            key: "headerText",
            label: "Texto do cabeçalho",
            type: "text",
            placeholder: "Optional header",
          },
          {
            key: "footer",
            label: "Rodapé",
            type: "text",
            placeholder: "Optional footer",
          },
          {
            key: "buttons",
            label: "Botões (JSON)",
            type: "template-textarea",
            placeholder: '[{"id":"yes","title":"Yes"},{"id":"no","title":"No"}]',
            rows: 4,
            required: true,
          },
        ],
        outputFields: [{ field: "messageId", description: "ID da mensagem" }],
      },
      {
        slug: "send-list",
        label: "Lista",
        description: "Enviar uma lista interativa",
        category: "WhatsApp",
        stepFunction: "sendListStep",
        stepImportPath: "whatsapp/send-list",
        configFields: [
          {
            key: "toSource",
            label: "Destinatário",
            type: "select",
            options: [
              { label: "Da mensagem recebida", value: "inbound" },
              { label: "Número manual", value: "manual" },
            ],
            defaultValue: "inbound",
          },
          {
            key: "to",
            label: "Para",
            type: "template-input",
            placeholder: "+5511999999999",
            showWhen: { field: "toSource", equals: "manual" },
          },
          {
            key: "body",
            label: "Corpo",
            type: "template-textarea",
            placeholder: "Select an option",
            rows: 3,
            required: true,
          },
          {
            key: "buttonText",
            label: "Texto do botão",
            type: "text",
            placeholder: "Options",
            required: true,
          },
          {
            key: "headerText",
            label: "Texto do cabeçalho",
            type: "text",
            placeholder: "Optional header",
          },
          {
            key: "footer",
            label: "Rodapé",
            type: "text",
            placeholder: "Optional footer",
          },
          {
            key: "sections",
            label: "Seções (JSON)",
            type: "template-textarea",
            placeholder:
              '[{"title":"Main","rows":[{"id":"1","title":"Option 1","description":"Details"}]}]',
            rows: 5,
            required: true,
          },
        ],
        outputFields: [{ field: "messageId", description: "ID da mensagem" }],
      },
      {
        slug: "wait-for-reply",
        label: "Aguardar Resposta",
        description: "Pausar e aguardar a próxima mensagem do usuário",
        category: "WhatsApp",
        stepFunction: "waitForReplyStep",
        stepImportPath: "whatsapp/wait-for-reply",
        configFields: [
          {
            key: "variableKey",
            label: "Salvar resposta como",
            type: "text",
            placeholder: "user_reply",
            required: true,
          },
          {
            key: "timeoutSeconds",
            label: "Timeout (segundos)",
            type: "number",
            placeholder: "3600",
            defaultValue: "3600",
          },
          {
            key: "timeoutAction",
            label: "Ao expirar",
            type: "select",
            options: [
              { value: "end", label: "Encerrar workflow" },
              { value: "retry", label: "Reenviar última mensagem" },
              { value: "goto_node", label: "Ir para outro nó" },
            ],
            defaultValue: "end",
          },
        ],
        outputFields: [
          { field: "status", description: "Status da espera" },
          { field: "variableKey", description: "Nome da variável" },
        ],
      },
      {
        slug: "handoff",
        label: "Transferir para Atendente",
        description: "Transferir conversa para atendimento humano",
        category: "WhatsApp",
        stepFunction: "handoffStep",
        stepImportPath: "whatsapp/handoff",
        configFields: [
          {
            key: "toSource",
            label: "Destinatário",
            type: "select",
            options: [
              { label: "Da mensagem recebida", value: "inbound" },
              { label: "Número manual", value: "manual" },
            ],
            defaultValue: "inbound",
          },
          {
            key: "to",
            label: "Para",
            type: "template-input",
            placeholder: "+5511999999999",
            showWhen: { field: "toSource", equals: "manual" },
          },
          {
            key: "message",
            label: "Mensagem ao usuário",
            type: "template-textarea",
            placeholder: "Um atendente vai te ajudar em breve!",
          },
          {
            key: "handoffSummary",
            label: "Resumo para o atendente",
            type: "template-textarea",
            placeholder: "Cliente quer informações sobre...",
          },
        ],
        outputFields: [
          { field: "handedOff", description: "Se a transferência foi feita" },
          { field: "conversationId", description: "ID da conversa no inbox" },
        ],
      },
    ],
  },
  {
    type: "contact",
    label: "Contatos",
    description: "Gerenciar contatos e tags",
    actions: [
      {
        slug: "update-contact",
        label: "Atualizar Contato",
        description: "Atualizar nome, email ou campos personalizados",
        category: "Contatos",
        stepFunction: "updateContactStep",
        stepImportPath: "contact/update-contact",
        configFields: [
          {
            key: "toSource",
            label: "Contato",
            type: "select",
            options: [
              { label: "Da mensagem recebida", value: "inbound" },
              { label: "Número manual", value: "manual" },
            ],
            defaultValue: "inbound",
          },
          {
            key: "phone",
            label: "Telefone",
            type: "template-input",
            placeholder: "+5511999999999",
            showWhen: { field: "toSource", equals: "manual" },
          },
          {
            key: "name",
            label: "Nome",
            type: "template-input",
            placeholder: "Nome do contato",
          },
          {
            key: "email",
            label: "Email",
            type: "template-input",
            placeholder: "email@exemplo.com",
          },
          {
            key: "customFields",
            label: "Campos personalizados (JSON)",
            type: "template-textarea",
            placeholder: '{"cargo": "Gerente", "empresa": "ACME"}',
            rows: 3,
          },
        ],
        outputFields: [
          { field: "contactId", description: "ID do contato" },
          { field: "updated", description: "Campos atualizados" },
        ],
      },
      {
        slug: "manage-tags",
        label: "Gerenciar Tags",
        description: "Adicionar ou remover tags de um contato",
        category: "Contatos",
        stepFunction: "manageTagsStep",
        stepImportPath: "contact/manage-tags",
        configFields: [
          {
            key: "toSource",
            label: "Contato",
            type: "select",
            options: [
              { label: "Da mensagem recebida", value: "inbound" },
              { label: "Número manual", value: "manual" },
            ],
            defaultValue: "inbound",
          },
          {
            key: "phone",
            label: "Telefone",
            type: "template-input",
            placeholder: "+5511999999999",
            showWhen: { field: "toSource", equals: "manual" },
          },
          {
            key: "action",
            label: "Ação",
            type: "select",
            options: [
              { value: "add", label: "Adicionar tags" },
              { value: "remove", label: "Remover tags" },
            ],
            defaultValue: "add",
          },
          {
            key: "tags",
            label: "Tags (separadas por vírgula)",
            type: "template-input",
            placeholder: "vip, interessado, qualificado",
            required: true,
          },
        ],
        outputFields: [
          { field: "contactId", description: "ID do contato" },
          { field: "action", description: "Ação realizada" },
          { field: "tags", description: "Tags modificadas" },
        ],
      },
    ],
  },
  {
    type: "logic",
    label: "Lógica",
    description: "Controle de fluxo e lógica",
    actions: [
      {
        slug: "ab-split",
        label: "Teste A/B",
        description: "Dividir fluxo entre variantes para teste",
        category: "Lógica",
        stepFunction: "abSplitStep",
        stepImportPath: "logic/ab-split",
        configFields: [
          {
            key: "variants",
            label: "Variantes (JSON)",
            type: "template-textarea",
            placeholder: '[{"label":"A","weight":50},{"label":"B","weight":50}]',
            rows: 4,
            required: true,
          },
        ],
        outputFields: [
          { field: "variant", description: "Índice da variante selecionada" },
          { field: "variantLabel", description: "Nome da variante" },
          { field: "hash", description: "Hash determinístico" },
        ],
      },
      {
        slug: "business-hours",
        label: "Horário Comercial",
        description: "Verificar se está dentro do expediente",
        category: "Lógica",
        stepFunction: "businessHoursStep",
        stepImportPath: "logic/business-hours",
        configFields: [
          {
            key: "timezone",
            label: "Fuso horário",
            type: "text",
            placeholder: "America/Sao_Paulo",
            defaultValue: "America/Sao_Paulo",
          },
          {
            key: "startTime",
            label: "Início do expediente",
            type: "text",
            placeholder: "09:00",
            defaultValue: "09:00",
          },
          {
            key: "endTime",
            label: "Fim do expediente",
            type: "text",
            placeholder: "18:00",
            defaultValue: "18:00",
          },
          {
            key: "workDays",
            label: "Dias úteis (0=Dom, 6=Sáb)",
            type: "text",
            placeholder: "1,2,3,4,5",
            defaultValue: "1,2,3,4,5",
          },
        ],
        outputFields: [
          { field: "condition", description: "Dentro do horário (true/false)" },
          { field: "currentTime", description: "Hora atual no timezone" },
          { field: "dayOfWeek", description: "Dia da semana (0-6)" },
        ],
      },
      {
        slug: "sub-workflow",
        label: "Sub-Workflow",
        description: "Executar outro workflow e aguardar resultado",
        category: "Lógica",
        stepFunction: "subWorkflowStep",
        stepImportPath: "logic/sub-workflow",
        configFields: [
          {
            key: "workflowId",
            label: "ID do workflow",
            type: "text",
            placeholder: "workflow_abc123",
            required: true,
          },
          {
            key: "inputVariables",
            label: "Variáveis de entrada (JSON)",
            type: "template-textarea",
            placeholder: '{"name": "{{var.user_name}}"}',
            rows: 3,
          },
        ],
        outputFields: [
          { field: "executionId", description: "ID da execução" },
          { field: "results", description: "Resultados do sub-workflow" },
        ],
      },
    ],
  },
  {
    type: "ai",
    label: "Inteligência Artificial",
    description: "Respostas e processamento com IA",
    actions: [
      {
        slug: "ai-response",
        label: "Resposta IA",
        description: "Gerar resposta com modelo de linguagem",
        category: "IA",
        stepFunction: "aiResponseStep",
        stepImportPath: "ai/ai-response",
        configFields: [
          {
            key: "prompt",
            label: "Prompt",
            type: "template-textarea",
            placeholder: "Resuma a seguinte mensagem: {{var.user_message}}",
            rows: 4,
            required: true,
          },
          {
            key: "systemPrompt",
            label: "Instrução de sistema",
            type: "template-textarea",
            placeholder: "Você é um assistente de suporte ao cliente...",
            rows: 3,
          },
          {
            key: "model",
            label: "Modelo (opcional)",
            type: "text",
            placeholder: "Deixe vazio para usar o padrão",
          },
          {
            key: "temperature",
            label: "Temperatura",
            type: "number",
            placeholder: "0.7",
            defaultValue: "0.7",
          },
          {
            key: "maxTokens",
            label: "Max tokens",
            type: "number",
            placeholder: "500",
            defaultValue: "500",
          },
        ],
        outputFields: [
          { field: "text", description: "Texto gerado pela IA" },
          { field: "model", description: "Modelo utilizado" },
          { field: "tokensUsed", description: "Tokens consumidos" },
        ],
      },
    ],
  },
];

// Add carousel to WhatsApp integration
integrations[0].actions.push({
  slug: "send-carousel",
  label: "Carousel",
  description: "Enviar carousel de cards via template aprovado",
  category: "WhatsApp",
  stepFunction: "sendCarouselStep",
  stepImportPath: "whatsapp/send-carousel",
  configFields: [
    {
      key: "toSource",
      label: "Destinatário",
      type: "select",
      options: [
        { label: "Da mensagem recebida", value: "inbound" },
        { label: "Número manual", value: "manual" },
      ],
      defaultValue: "inbound",
    },
    {
      key: "to",
      label: "Para",
      type: "template-input",
      placeholder: "+5511999999999",
      showWhen: { field: "toSource", equals: "manual" },
    },
    {
      key: "templateName",
      label: "Nome do template (aprovado com carousel)",
      type: "text",
      placeholder: "carousel_produtos",
      required: true,
    },
    {
      key: "language",
      label: "Idioma",
      type: "text",
      placeholder: "pt_BR",
      defaultValue: "pt_BR",
    },
    {
      key: "bodyText",
      label: "Parâmetros do body (JSON array)",
      type: "template-textarea",
      placeholder: '["valor1", "valor2"]',
      rows: 2,
    },
    {
      key: "cards",
      label: "Cards (JSON)",
      type: "template-textarea",
      placeholder:
        '[{"headerImageUrl":"https://...","bodyParams":["Produto 1","R$ 99"],"buttonParams":[{"type":"quick_reply","payload":"buy_1"}]}]',
      rows: 6,
      required: true,
    },
  ],
  outputFields: [{ field: "messageId", description: "ID da mensagem" }],
});

// Add WhatsApp Flow to WhatsApp integration
integrations[0].actions.push({
  slug: "send-flow",
  label: "WhatsApp Flow",
  description: "Enviar formulário interativo via WhatsApp Flows",
  category: "WhatsApp",
  stepFunction: "sendFlowStep",
  stepImportPath: "whatsapp/send-flow",
  configFields: [
    {
      key: "toSource",
      label: "Destinatário",
      type: "select",
      options: [
        { label: "Da mensagem recebida", value: "inbound" },
        { label: "Número manual", value: "manual" },
      ],
      defaultValue: "inbound",
    },
    {
      key: "to",
      label: "Para",
      type: "template-input",
      placeholder: "+5511999999999",
      showWhen: { field: "toSource", equals: "manual" },
    },
    {
      key: "flowId",
      label: "Flow ID",
      type: "text",
      placeholder: "1234567890",
      required: true,
    },
    {
      key: "bodyText",
      label: "Texto do corpo",
      type: "template-textarea",
      placeholder: "Preencha o formulário abaixo",
      rows: 2,
      required: true,
    },
    {
      key: "flowCta",
      label: "Texto do botão (CTA)",
      type: "text",
      placeholder: "Abrir formulário",
      defaultValue: "Abrir",
    },
    {
      key: "flowAction",
      label: "Ação do Flow",
      type: "select",
      options: [
        { value: "navigate", label: "Navegar (tela inicial)" },
        { value: "data_exchange", label: "Troca de dados" },
      ],
      defaultValue: "navigate",
    },
    {
      key: "initialScreen",
      label: "Tela inicial (opcional)",
      type: "text",
      placeholder: "SCREEN_1",
    },
    {
      key: "initialData",
      label: "Dados iniciais (JSON, opcional)",
      type: "template-textarea",
      placeholder: '{"product_id": "123"}',
      rows: 3,
    },
    {
      key: "footerText",
      label: "Rodapé (opcional)",
      type: "text",
      placeholder: "Powered by WhatsFlow",
    },
    {
      key: "variableKey",
      label: "Salvar resposta do flow como",
      type: "text",
      placeholder: "flow_response",
      defaultValue: "flow_response",
      required: true,
    },
    {
      key: "timeoutSeconds",
      label: "Timeout (segundos)",
      type: "number",
      placeholder: "3600",
      defaultValue: "3600",
    },
  ],
  outputFields: [
    { field: "status", description: "Status (waiting)" },
    { field: "flowId", description: "ID do Flow enviado" },
  ],
});

function getSafeIntegrations(): IntegrationPlugin[] {
  return integrations.filter((integration) => Array.isArray(integration.actions));
}

export function isFieldGroup(
  field: ActionConfigField
): field is ActionConfigFieldGroup {
  return field.type === "group";
}

export function computeActionId(
  integration: IntegrationType,
  slug: string
): string {
  return `${integration}/${slug}`;
}

export function flattenConfigFields(
  fields: ActionConfigField[]
): ActionConfigFieldBase[] {
  const flattened: ActionConfigFieldBase[] = [];
  for (const field of fields) {
    if (isFieldGroup(field)) {
      flattened.push(...field.fields);
    } else {
      flattened.push(field);
    }
  }
  return flattened;
}

export function getAllIntegrations(): IntegrationPlugin[] {
  return getSafeIntegrations();
}

export function getIntegration(type: IntegrationType | undefined) {
  if (!type) return undefined;
  return getSafeIntegrations().find((integration) => integration.type === type);
}

export function getIntegrationLabels(): Record<string, string> {
  return getSafeIntegrations().reduce((acc, integration) => {
    acc[integration.type] = integration.label;
    return acc;
  }, {} as Record<string, string>);
}

export function getSortedIntegrationTypes(): IntegrationType[] {
  return getSafeIntegrations()
    .map((integration) => integration.type)
    .sort((a, b) => a.localeCompare(b));
}

export function getActionsByCategory(): Record<string, ActionWithFullId[]> {
  const categories: Record<string, ActionWithFullId[]> = {};

  for (const integration of getSafeIntegrations()) {
    const actions = Array.isArray(integration.actions)
      ? integration.actions
      : [];
    for (const action of actions) {
      const category = action.category || "Other";
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({
        ...action,
        id: computeActionId(integration.type, action.slug),
        integration: integration.type,
      });
    }
  }

  return categories;
}

export function getAllActions(): ActionWithFullId[] {
  const categories = getActionsByCategory();
  return Object.values(categories).flat();
}

const LEGACY_ACTION_LABELS: Record<string, string> = {
  "Send Message": "whatsapp/send-message",
  "Ask Question": "whatsapp/ask-question",
  "Send Template": "whatsapp/send-template",
  "Send Media": "whatsapp/send-media",
  Buttons: "whatsapp/send-buttons",
  List: "whatsapp/send-list",
  "Wait for Reply": "whatsapp/wait-for-reply",
  Handoff: "whatsapp/handoff",
  "Update Contact": "contact/update-contact",
  "Manage Tags": "contact/manage-tags",
  "A/B Split": "logic/ab-split",
  "Business Hours": "logic/business-hours",
  "Sub-Workflow": "logic/sub-workflow",
  "AI Response": "ai/ai-response",
  Carousel: "whatsapp/send-carousel",
  "Send Flow": "whatsapp/send-flow",
};

export function findActionById(actionId?: string): ActionWithFullId | undefined {
  if (!actionId) return undefined;
  const legacyId = LEGACY_ACTION_LABELS[actionId];
  if (legacyId) {
    const legacyMatch = getAllActions().find((action) => action.id === legacyId);
    if (legacyMatch) {
      return legacyMatch;
    }
  }
  return getAllActions().find(
    (action) =>
      action.id === actionId ||
      action.slug === actionId ||
      `${action.integration}/${action.slug}` === actionId ||
      action.label === actionId
  );
}

export function getCredentialMapping(_type: IntegrationType) {
  return {};
}
