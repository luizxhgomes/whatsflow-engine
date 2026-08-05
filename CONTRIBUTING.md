# Contribuindo

Obrigado pelo interesse em contribuir com o WhatsFlow Engine.

## Fluxo
1. Abra uma issue descrevendo o problema ou proposta.
2. Fork + branch a partir de `main` (`feat/...` ou `fix/...`).
3. Commits no padrão Conventional Commits (`feat:`, `fix:`, `docs:`...).
4. Garanta `npm run lint`, `npm run build` e `npm test` verdes em `app/`.
5. Abra o PR referenciando a issue.

## Padrões
- Código em inglês; documentação em pt-BR.
- Arquitetura Page → Hook → Service → API Route — não crie atalhos.
- Todo código novo entra com teste.
- Nenhum segredo em código: use variáveis de ambiente e atualize `app/.env.example`.
