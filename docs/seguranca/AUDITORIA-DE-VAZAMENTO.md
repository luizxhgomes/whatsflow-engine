# Auditoria de vazamento e isolamento de infraestrutura

Data: 2026-08-05. Escopo: working tree completo e histórico git integral (todos os commits).
Objetivo: garantir que o repositório não expõe nenhum segredo nem identificador de
infraestrutura de origem, e que todo clone provisiona uma infraestrutura nova.

## Resultado: APROVADO

| Verificação | Método | Resultado |
|---|---|---|
| Chaves de API (Anthropic, OpenAI, GitHub, AWS, Meta, Google, Slack) | grep por padrões de prefixo em todos os arquivos | Zero ocorrências reais (única menção é o placeholder de interface `sk-ant-...`) |
| JWTs e chaves privadas (PEM) | grep por assinatura estrutural | Zero fora de fixtures de teste |
| Arquivos `.env` | `git ls-files` + histórico | Somente `.env.example` com placeholders; nenhum `.env` real em nenhum commit |
| IPs, domínios e hosts de infraestrutura de origem | grep por lista de identificadores conhecidos | Zero; guias de deploy usam `SEU_IP_VPS` e `seu-dominio.com` |
| Identificadores de projetos cloud (Supabase refs, Vercel prj_/team_) | grep working tree e histórico | Zero; docs usam `YOUR_PROJECT_REF` |
| Telefones | grep por padrão de número brasileiro | Somente placeholders sequenciais de teste |
| Caminhos absolutos de máquina local | grep por prefixos de filesystem | Zero (matches são rotas de app `/users/:id` em testes) |
| Dados de clientes ou campanhas reais | auditoria de conteúdo e binários | Zero; imagens versionadas são ícones próprios e placeholders neutros |
| Histórico git | `git log -p --all` com os mesmos padrões | Limpo; o repositório nasceu com histórico curado |

Menções intencionais e não sensíveis: a autoria pública do mantenedor (handle de rede
social no rodapé do login e no README) e o nome de ferramentas genéricas de mercado nos
guias de deploy (painéis de VPS, provedores cloud), sem host, conta ou credencial.

## Garantia de isolamento: clonar cria infraestrutura NOVA

1. `app/.env.example` é o contrato completo de credenciais; nada funciona sem preencher.
2. As migrations em `app/supabase/migrations/` criam o schema do zero em qualquer projeto Supabase.
3. O installer embutido (`/api/installer`) provisiona Supabase e Vercel novos para cada instância.
4. `vercel.json` contém apenas cabeçalhos de segurança; nenhum ID de projeto ou time.
5. Webhook exige `META_APP_SECRET` próprio (HMAC fail-close): impossível apontar para a instância de outra pessoa sem o segredo dela.

## Como reproduzir esta auditoria

```bash
# padrões de segredo no working tree e no histórico
git grep -nIE '(sk-ant-|ghp_|gho_|AKIA[0-9A-Z]{16}|EAA[A-Za-z0-9]{30}|-----BEGIN)' $(git rev-list --all) || echo limpo
# arquivos .env em qualquer commit
git log --all --diff-filter=A --name-only | grep -E '^\.env|/\.env' || echo limpo
```

Nova auditoria deve ser rodada antes de cada release que altere docs de infraestrutura.
