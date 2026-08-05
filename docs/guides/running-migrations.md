# Guia: Rodando Migrations Supabase

Guia operacional para aplicar, reverter e validar migrations no projeto `whatsflow`.

## Localização

Todas as migrations vivem em:

```
app/supabase/migrations/
```

Nome do arquivo: `{timestamp}_{slug}.sql`, timestamp no formato `YYYYMMDDHHMMSS`.

## Pré-requisitos

- Supabase CLI instalado (`brew install supabase/tap/supabase`).
- Credenciais de projeto no `.env` (nunca commit):
  - `SUPABASE_DB_URL`: URL direta do Postgres (formato `postgresql://postgres:<pwd>@<host>:5432/postgres`).
  - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`: para conferência via SDK.
- Permissão para rodar `supabase db push` no projeto.

## Fluxo Padrão (Desenvolvimento)

### 1. Criar Migration

```bash
cd whatsflow
supabase migration new {slug}
# Cria arquivo vazio em supabase/migrations/
```

Edite o arquivo adicionando SQL idempotente quando possível:

```sql
-- Sempre preferir CREATE ... IF NOT EXISTS, ALTER ... IF EXISTS, etc.
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS new_field text;

CREATE INDEX IF NOT EXISTS idx_campaigns_new_field
  ON campaigns(new_field);
```

### 2. Aplicar Localmente

```bash
# Se estiver usando Supabase local (Docker):
supabase db reset      # drop + recreate + apply todas migrations
# OU, para aplicar só as novas:
supabase db push --local

# Direto no projeto remoto (dev/staging):
supabase db push
```

### 3. Validar

```bash
# Listar migrations aplicadas vs pendentes
supabase migration list

# Gerar types TypeScript atualizados
npx supabase gen types typescript --project-id <id> > lib/database.types.ts
```

### 4. Testar

- Rodar suite: `npm run test`
- Conferir RLS se a migration afeta políticas.
- Conferir `outputFileTracingIncludes` no `next.config.js`, migrations precisam estar no bundle.

## Regras de Ouro

1. **Idempotência:** toda migration deve poder ser reaplicada sem quebrar. Use `IF NOT EXISTS`/`IF EXISTS`.
2. **Backfill antes de constraints:** se adicionar `NOT NULL` ou `UNIQUE` em tabela existente, faça backfill em migration separada **anterior**.
3. **Sem DROP em produção sem plano de rollback explícito.** Drop de coluna pode quebrar deploy anterior (versão antiga lê coluna removida).
4. **RLS por default:** toda tabela nova deve ter `ENABLE ROW LEVEL SECURITY` + ao menos uma policy.
5. **Migrations são imutáveis:** depois de aplicadas em qualquer ambiente, nunca editar. Crie nova migration de correção.

## Cenários Comuns

### Adicionar Coluna Nullable
```sql
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS notes text;
```
Sem backfill necessário. Deploy seguro.

### Adicionar Coluna NOT NULL
**Duas migrations:**
```sql
-- Migration 1: add nullable + backfill
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status text;
UPDATE contacts SET status = 'unknown' WHERE status IS NULL;
```
```sql
-- Migration 2 (release seguinte, depois de deploy da código que usa coluna)
ALTER TABLE contacts ALTER COLUMN status SET NOT NULL;
```

### Adicionar Unique Constraint em Tabela com Duplicatas
```sql
-- Deduplica antes
DELETE FROM campaign_contacts a
USING campaign_contacts b
WHERE a.id < b.id
  AND a.message_id = b.message_id
  AND a.status = b.status;

-- Só então aplica constraint
ALTER TABLE campaign_contacts
  ADD CONSTRAINT unique_message_status
  UNIQUE (message_id, status);
```

### Alterar RLS Policy
```sql
DROP POLICY IF EXISTS "old_policy_name" ON contacts;
CREATE POLICY "new_policy_name" ON contacts
  FOR SELECT USING (auth.uid() = owner_id);
```

## Rollback

Supabase CLI **não suporta rollback automático**. Para reverter:
1. Criar nova migration que desfaz a anterior.
2. Aplicar normalmente.
3. Nunca editar/remover o arquivo original já aplicado.

## CI/CD

Integração com deploy automatizado (futuro, ver `.github/workflows/ci.yml` quando adicionado):

- PR aberto → CI valida sintaxe SQL (sem aplicar).
- Merge em main → deploy aplica `supabase db push` no ambiente de produção.

## Troubleshooting

| Sintoma | Causa provável | Solução |
|---------|---------------|---------|
| `relation "X" does not exist` | Migration anterior não aplicada | `supabase migration list` + `supabase db push` |
| `cannot alter column` | Dados conflitantes | Backfill antes do ALTER |
| `permission denied for table X` | RLS bloqueando SDK | Use `getSupabaseAdmin()` em server; ajustar policy |
| Types TypeScript desatualizados | `gen types` não rodou | Rodar `npx supabase gen types typescript` |
| Migration aplicada mas código quebra | Deploy fora de ordem | Rollback via nova migration + redeploy |

## Referências

- [Supabase CLI docs](https://supabase.com/docs/reference/cli)
- `app/CLAUDE.md`: convenções Supabase do projeto
- `.claude/rules/agent-authority.md`: @data-engineer é owner das migrations
- `app/supabase/migrations/`: migrations atuais (31+)
