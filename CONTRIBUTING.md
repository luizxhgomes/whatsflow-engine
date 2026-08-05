# Contribuindo

Obrigado pelo interesse em contribuir com o WhatsFlow Engine.

## Fluxo
1. Abra uma issue descrevendo o problema ou proposta.
2. Fork + branch a partir de `main` (`feat/...` ou `fix/...`).
3. Commits no padrão Conventional Commits (`feat:`, `fix:`, `docs:`...).
4. Garanta `npm run lint`, `npm run build` e `npm test` verdes em `app/`.
5. Abra o PR referenciando a issue.

## Jornadas de contribuição

- **Implementador white-label:** siga [`docs/onboarding/`](docs/onboarding/README.md) (5 fases com gates). Problemas de implantação viram issue com label `onboarding`.
- **Contribuidor de segurança/disparo:** o backlog priorizado (P0/P1/P2) vive no roadmap do onboarding; cada item referencia o documento de auditoria em `docs/seguranca/`. Correção de garantia entra com teste que prova a garantia.
- **Contribuidor de feature:** fluxo padrão abaixo.

## Padrões
- Código em inglês; documentação em pt-BR.
- Arquitetura Page → Hook → Service → API Route — não crie atalhos.
- Todo código novo entra com teste.
- Nenhum segredo em código: use variáveis de ambiente e atualize `app/.env.example`.
