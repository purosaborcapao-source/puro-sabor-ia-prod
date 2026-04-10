# Atendimento IA

Plataforma de atendimento com integração de IA (Claude), construída com Turborepo, Next.js 14, TypeScript e Supabase.

## Estrutura

```
atendimento-ia/
├── apps/
│   ├── web/          # Cliente Next.js 14
│   └── admin/        # Painel admin Next.js 14
├── packages/
│   ├── shared/       # Types e utilities compartilhados
│   ├── supabase/     # Client Supabase compartilhado
│   └── ai/           # Integração Claude API
└── ...config files
```

## Quick Start

### Prerequisites
- Node.js >= 18
- pnpm >= 8

### Setup

```bash
# 1. Instale dependências
pnpm install

# 2. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais do Supabase e API key do Claude

# 3. Inicie o desenvolvimento
pnpm dev
```

Isso iniciará ambos os aplicativos (web e admin) em paralelo:
- Web: http://localhost:3000
- Admin: http://localhost:3001

## Scripts

- `pnpm dev` - Inicia ambos os apps em desenvolvimento
- `pnpm build` - Faz build de todos os apps
- `pnpm lint` - Executa linter em todos os packages
- `pnpm type-check` - Verifica tipos TypeScript
- `pnpm clean` - Remove node_modules e diretórios de build

## Packages

### `@atendimento-ia/shared`
Types e utilities compartilhados entre apps

### `@atendimento-ia/supabase`
Client Supabase configurado com types do banco de dados

### `@atendimento-ia/ai`
Integração com Claude API da Anthropic

## Stack

- **Framework**: Next.js 14 + TypeScript
- **Monorepo**: Turborepo
- **Banco de dados**: Supabase
- **UI**: Tailwind CSS + shadcn/ui
- **IA**: Claude API (Anthropic)

## License

MIT
