# WhatsFlow — Guia de Deploy no VPS example.com

## Arquitetura no VPS

```
VPS SEU_IP_VPS (Easypanel)
├── brabissimo-app (nginx:alpine)  → porta 3080 → brabissimo.example.com
├── whatsflow-app  (node:20-alpine) → porta 3090 → whatsflow.example.com
├── supabase       (postgres)       → porta 5432
├── supabase-studio                 → porta 3000 → supabase.example.com
└── supabase-api   (postgrest)      → porta 8000 → api.example.com
```

## Passo 1: Configurar DNS

No painel do provedor de dominio (onde gerencia example.com), adicione:

```
Tipo: A
Nome: whatsflow
Valor: SEU_IP_VPS
TTL: 300
```

Isso cria o subdominio `whatsflow.example.com` apontando para o VPS.

## Passo 2: Configurar Easypanel

No Easypanel do VPS, crie um novo servico:

1. **Nome**: whatsflow
2. **Tipo**: Custom (reverse proxy)
3. **Dominio**: `whatsflow.example.com`
4. **Target**: `http://localhost:3090`
5. **SSL**: Ativar (Let's Encrypt automatico)
6. **WebSocket**: Ativar (necessario para Supabase Realtime)

## Passo 3: Configurar Secrets no GitHub

No repositorio do WhatsFlow no GitHub, va em Settings → Secrets → Actions e adicione:

| Secret | Valor |
|--------|-------|
| `VPS_HOST` | SEU_IP_VPS |
| `VPS_SSH_KEY` | (mesma chave SSH do brabissimo) |
| `WHATSFLOW_SUPABASE_URL` | https://YOUR_PROJECT_REF.supabase.co |
| `WHATSFLOW_SUPABASE_PUBLISHABLE_KEY` | (anon key JWT) |
| `WHATSFLOW_SUPABASE_SECRET_KEY` | (service role key JWT) |
| `WHATSFLOW_MASTER_PASSWORD` | (senha do dashboard) |
| `WHATSFLOW_API_KEY` | (API key) |
| `WHATSFLOW_ADMIN_KEY` | (admin key) |
| `WHATSFLOW_QSTASH_TOKEN` | (token Upstash) |
| `WHATSFLOW_OPENROUTER_API_KEY` | (OpenRouter key) |
| `WHATSFLOW_MEM0_API_KEY` | (Mem0 key) |
| `WHATSFLOW_N8N_API_KEY` | (N8N key) |

## Passo 4: Primeiro Deploy

Opcao A — Via GitHub Actions (automatico):
```bash
git push origin main
```

Opcao B — Manual no VPS:
```bash
# SSH no VPS
ssh root@SEU_IP_VPS

# Clonar e buildar
cd /opt
git clone https://github.com/luizxhgomes/whatsflow.git whatsflow-repo
cd whatsflow-repo
npm ci && npm run build

# Copiar standalone
mkdir -p /opt/whatsflow/app
cp -r .next/standalone/* /opt/whatsflow/app/
cp -r .next/static /opt/whatsflow/app/.next/static
cp -r public /opt/whatsflow/app/public

# Rodar container
docker run -d \
  --name whatsflow-app \
  --restart always \
  -p 3090:3000 \
  --env-file /opt/whatsflow/.env.production \
  -v /opt/whatsflow/app:/app:ro \
  -w /app \
  node:20-alpine \
  node server.js
```

## Passo 5: Verificar

```bash
# No VPS
curl -sf http://localhost:3090/api/health

# No browser
https://whatsflow.example.com
```

## Troubleshooting

### Container nao inicia
```bash
docker logs whatsflow-app
```

### Porta 3090 em uso
```bash
lsof -i :3090
docker ps -a | grep 3090
```

### SSL nao funciona
- Verificar DNS propagou: `dig whatsflow.example.com`
- Verificar Easypanel: certificado Let's Encrypt pode levar 1-2 min
