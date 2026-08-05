/**
 * @deprecated Prefira importar de `@/lib/whatsapp-errors` (módulo canônico).
 *
 * Este arquivo expõe a classe `MetaAPIError` para compatibilidade com
 * call-sites existentes. Novos imports devem usar:
 *
 *   import { MetaAPIError, type MetaErrorPayload } from '@/lib/whatsapp-errors'
 *
 * Ver ADR-002 (`docs/architecture/ADR-002-error-handling.md`) para o plano
 * de consolidação. Remoção programada após migração dos call-sites.
 */
export interface MetaErrorPayload {
    error: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        error_user_title?: string;
        error_user_msg?: string;
        fbtrace_id: string;
    };
}

/** @deprecated Use `MetaAPIError` de `@/lib/whatsapp-errors` (re-exportado do canônico). */
export class MetaAPIError extends Error {
    public code: number;
    public subcode?: number;
    public type: string;
    public fbtrace_id: string;
    public userTitle?: string;
    public userMessage: string;

    constructor(payload: MetaErrorPayload['error']) {
        super(payload.message);
        this.name = 'MetaAPIError';
        this.code = payload.code;
        this.subcode = payload.error_subcode;
        this.type = payload.type;
        this.fbtrace_id = payload.fbtrace_id;
        this.userTitle = payload.error_user_title;

        // Custom Mapping Logic
        this.userMessage = this.mapToUserMessage(payload);
    }

    private mapToUserMessage(error: MetaErrorPayload['error']): string {
        // 1. Spam / Policy Block (The most critical one)
        if (error.code === 368) {
            return "⚠️ Bloqueio de Política (Spam): A Meta classificou este conteúdo como abusivo ou spam. Tente mudar drasticamente o texto ou aguarde 24h.";
        }

        // 2. Duplicate Name / Language
        if (error.code === 100 && error.error_subcode === 2388005) {
            return "⚠️ Nome Duplicado: Já existe um template com este nome (mesmo deletado). Mude o nome.";
        }
        if (error.code === 100 && error.error_subcode === 2388024) {
            return "⚠️ Template Duplicado: Já existe um template com este nome e idioma na Meta. Mude o nome ou delete o existente no Business Manager.";
        }
        if (error.code === 135000) { // Sometimes generic generic for duplicates
            return "⚠️ Nome Indisponível: O nome do template já está em uso nesta conta.";
        }

        // 3. Invalid Parameters (Structure issues)
        if (error.code === 100) {
            if (error.error_subcode === 2388299) {
                return "❌ Variável na borda: O texto do template não pode COMEÇAR nem TERMINAR com uma variável ({{1}}, {{2}}, etc). Adicione texto antes/depois da variável.";
            }
            if (error.error_subcode === 2388043) {
                return "❌ Erro de Validação: Ocorreu um problema com os Exemplos de Variáveis. Verifique se todas as variáveis {{1}} têm exemplos correspondentes.";
            }
            if (error.message.includes("does not exist")) {
                return "❌ Erro de Configuração: A conta do WhatsApp (WABA ID) parece incorreta ou não existe.";
            }
            return `❌ Parâmetro Inválido: A Meta rejeitou o formato do template. (${error.message})`;
        }

        // 4. Auth
        if (error.code === 190) {
            return "🔐 Erro de Autenticação: O Token do WhatsApp expirou ou é inválido. Verifique suas credenciais.";
        }

        // 5. Rate Limit
        if (error.code === 80007) {
            return "🚦 Excesso de Requisições: A Meta limitou suas chamadas (Rate Limit). Aguarde alguns minutos.";
        }

        // 6. Permissions
        if (error.code === 200) {
            return "⛔ Permissão Negada: O Token não tem permissão para gerenciar templates (whatsapp_business_management).";
        }

        // Default Fallback
        if (error.error_user_msg) return error.error_user_msg;
        return `Erro Meta (${error.code}): ${error.message}`;
    }
}
