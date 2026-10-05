# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

Node 22 (`nvm use`). Copie `.env.example` para `.env` (a chave do Supabase é a publishable: o banco é fechado por RLS e todos os dados passam pela `wardraw-api`).

```bash
yarn dev              # http://localhost:3000 (API em VITE_API_BASE_URL, padrão http://localhost:3333/v1)
yarn build            # tsc -b + vite build
yarn lint             # ESLint
yarn prettier:check   # / yarn prettier:format
```

## Arquitetura

SPA React 18 + Vite + React Router 7 + TanStack Query 5 + Tailwind 3 (tokens da "Dark Combat UI" em `tailwind.config.ts`) + CVA. Supabase só para login (`src/infra/supabase.ts`); o token vai no header pelo interceptor de `src/infra/api/client.ts`.

- **Camadas:** `infra/api` (cliente HTTP, `endpoints.ts` com todos os paths) → `infra/services/*.service.ts` (uma função por chamada) → `infra/hooks/queries.ts` (query keys por fábrica `keys.*` e mutations que invalidam por prefixo) → `pages/` e `components/flows/` (domínio) → `components/shared/ui.tsx` (design system).
- **Erros:** o cliente converte respostas em `ApiError` (`status`, `code`, `details`). `error.needsUpgrade` (HTTP 402 `plan_upgrade_required`) deve virar convite para os planos, nunca um erro genérico.
- **Telas de referência:** as 9 telas "Web" do `Wardraw — Telas do app.html` (Início, Agenda, Planos, Busca de sparring, Perfil do atleta, Serviços e o painel do organizador: Inscrições, Chaves e pesagem, Card com comparação). Siga as mesmas cores, fontes (Anton, Barlow, Barlow Condensed) e componentes; toda tela precisa funcionar a partir de 360 px (RNF-01).
- **Admin (`/admin`):** quase tudo é guiado por dados da API: `ResourcesView` monta CRUD a partir de `GET /admin/resources` (metadados de coluna gerados das migrations), `PlansMatrixView` edita a matriz plano×recurso, `CouponsView` cupons com alvo/público e simulação, `UsersView` descontos individuais e recursos avulsos. Ao criar uma tabela configurável nova na API, ela aparece aqui sem código novo.
- **Módulos (lançamento por área):** `useModules()`/`useModule(code)` em `infra/hooks/queries.ts` leem `GET /modules` (já calcula testadores e super admin). Rotas de módulo ficam dentro de `<ModuleGate code="...">` (`components/flows/LockedModule.tsx`), o menu mostra cadeado em módulos travados e esconde os ocultos, e erros `module_locked` da API viram o card "Em breve" com `LockedFromError`. Tela nova de uma área travável = envolver em `ModuleGate`. Admin em `/admin/modulos`.
- **Regras de produto que a UI respeita:** visitante vê só cards (RN-03); fotos de corpo só logado e sem download (RNF-03); WhatsApp sempre via `POST /contacts/whatsapp` (cota do plano, RF-28/29); a plataforma nunca cobra taxa de inscrição (RF-48).
