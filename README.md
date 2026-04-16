# SuperLinks.me

> All-in-one link-in-bio for creators. Built with React Router 7, Cloudflare Workers, Supabase, and Tailwind 4.

## Stack

- **Framework**: React Router 7 (SSR, declarative routes)
- **Runtime**: Cloudflare Workers
- **Database**: Supabase (Postgres + Auth + Realtime + Edge Functions)
- **Styling**: Tailwind CSS 4 + shadcn/ui (new-york)
- **State**: Zustand, React Hook Form, nuqs
- **Payments**: USDC on Base via x402

## Local Development

### Prerequisites

- Node.js ≥ 20
- [pnpm](https://pnpm.io/) (`corepack enable`)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (installed as devDep)

### Setup

```bash
# Install dependencies
pnpm install

# Copy local secrets template
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your Supabase project URL and anon key

# Update wrangler.jsonc vars with your Supabase public values
# SUPABASE_URL and SUPABASE_ANON_KEY

# Generate Cloudflare types
pnpm cf-typegen

# Start dev server
pnpm dev
```

### Supabase

Migrations live in `supabase/migrations/`. Push them with:

```bash
supabase db push
```

Generate TypeScript types:

```bash
SUPABASE_PROJECT_ID=your-project-id pnpm db:types
```

### Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm deploy` | Build + deploy to Cloudflare |
| `pnpm cf-typegen` | Generate Cloudflare + RR types |
| `pnpm db:types` | Generate Supabase types |
| `pnpm typecheck` | Type check |
| `pnpm check` | Type check + build + deploy dry run |
| `pnpm knip` | Find unused exports/deps |

## Project Structure

```
app/
├── routes/              # Thin route modules (loader/action/component)
├── features/            # Feature-first organization
│   ├── auth/            # Login, signup, callback, session helpers
│   ├── editor/          # Link page editor (My Links)
│   ├── store/           # Product CRUD, posts
│   ├── wallet/          # Earn, balance, transactions
│   ├── insights/        # Analytics
│   ├── messages/        # Chat with Supabase Realtime
│   ├── admin/           # Admin panel
│   ├── creator-page/    # Public /:handle page
│   ├── discover/        # Browse creators
│   └── app-viewer/      # Hosted app iframe
├── components/
│   ├── ui/              # shadcn/ui primitives
│   └── shared/          # Cross-feature components
├── lib/                 # Shared infra (env, supabase, commerce, cache)
├── stores/              # Zustand stores
└── types/               # Generated types

workers/
└── app.ts               # Cloudflare Workers entry point

supabase/
└── migrations/          # SQL migrations (source of truth)
```

## Routes

| Path | Description |
|---|---|
| `/` | Marketing landing page |
| `/login` | Google OAuth login |
| `/signup` | Claim username + sign up |
| `/auth/callback` | OAuth callback (provisions wallet + storefront) |
| `/docs` | CLI documentation |
| `/discover` | Browse creators |
| `/app/:id` | Hosted app viewer |
| `/dashboard/links` | Editor: profile, links, theme |
| `/dashboard/products` | Product + post management |
| `/dashboard/insights` | Analytics |
| `/dashboard/earn` | Wallet + transactions |
| `/dashboard/messages` | Conversations |
| `/dashboard/admin` | Admin panel |
| `/dashboard/settings` | Account + theme toggle |
| `/:handle` | Public creator page (catch-all, must be last) |
