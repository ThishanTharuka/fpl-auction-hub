<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FPL Auction Hub

## Commands

| Command | Action |
|---|---|
| `npm run dev` | Dev server |
| `npm run type-check` | `tsc --noEmit` |
| `npm run lint` | ESLint flat config (`eslint.config.mjs`) |
| `npm run lint:fix` | Auto-fix lint |
| `npm test` | Vitest (node env, `globals: true`, `@/*` alias) |
| `npm run build` | Production build |

Pre-commit order: `npm run type-check && npm run lint`. CI: `npm ci && npm run type-check && npm run lint && npm test` (verify job), then `npx semantic-release` on push to `master`. Conventional commits required.

Node 24 (`.nvmrc`). Install with `npm ci --include=optional` (emnapi optional deps).

## Supabase — three clients

| Module | Session? | When |
|---|---|---|
| `@/lib/supabase` (bare `createClient`) | No — `auth.uid()` null | Server reads, RLS-unaware ops |
| `@/lib/supabase-browser` (`createBrowserClient`) | Yes | RLS writes in client components |
| `@/lib/supabase-server` (`createServerClient`) | Yes | RLS reads in Server Components |

Rule: if the write hits an RLS policy, use `supabase-browser`.

## Auth middleware — `proxy.ts`

Uses `getSession()` (cookie-only, no network). Public paths (no redirect): `/`, `/login`, `/auth/*`, `/privacy`, `/terms`, `/api/*`, `/_next/*`, `/favicon.ico`. Nav is hidden on `/` for unauthenticated visitors.

## Streaming SSR

Pages with large FPL data fetches (`/players`, `/index-builder`, `/teams`):
- `page.tsx` is synchronous — streams skeleton immediately
- Data fetch (`getFplData()`) in an async child inside `<Suspense>`
- **Do not add `force-dynamic`** — skeleton must cache at edge
- `/teams` has two nested loading layers (FPL data + Supabase DB)

## FPL data cache (`fpl_cache` table)

Replaces `next: { revalidate }` (Vercel free tier drops >2MB; FPL bootstrap ~2.6MB).
- Entry: `getFplData()` in `lib/fpl-data.ts`, key `"fpl_data"`, JSONB with `ttl_ms`
- TTL: 5 min matchday / 30 min day before / 2h otherwise
- Read cast: `data.value as unknown as FplDataResult`
- Write cast: `JSON.parse(JSON.stringify(fresh))` strips non-serializable
- Table has permissive RLS (public data)

## Codebase conventions

- **Next.js 16.2.7 + React 19.2** — breaking changes from training data
- **Tailwind CSS v4**: `@import "tailwindcss"`, `@theme inline`, `postcss.config.mjs` uses `@tailwindcss/postcss`
- **Animations**: `tw-animate-css` (NOT `tailwindcss-animate`)
- **shadcn/ui**: style `"base-nova"`, aliases `@/components/ui/`
- **Dark-only theme**: only `:root` block in `globals.css` (no light mode). Page `#061423`, primary `#00e478`, card `#0f1c2c`, border `#3b4b3d` (full spec in `DESIGN.md`)
- **Icons**: `lucide-react` | **Charts**: `recharts` | **DnD**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Drawers**: `vaul` | **Toasts**: `sonner` | **Animations**: `framer-motion`
- **Navigation feedback**: NProgress (no `loading.tsx` — do not create one)
- **`cn()`**: `clsx` + `tailwind-merge` via `@/lib/utils`
- **`@/*` path alias**; type-imports with `inline-type-imports` fix style enforced
- **`no-explicit-any` is error** — no `as any` casts
- **`no-console` is warn** — `console.warn` and `console.error` allowed
- **`noUncheckedIndexedAccess` + `noImplicitOverride`** in tsconfig
- **No emojis** in code
- **Version**: auto-bumped by `semantic-release` on push to `master` — do not edit `package.json` version manually. Release commits to `CHANGELOG.md` and `package.json`, does NOT publish to npm.
- **Git branch**: `master` (not `main`)
- **Database types**: auto-generated from `supabase gen types typescript` into `lib/database.types.ts` — regenerate when schema changes
- **Supabase migrations**: `supabase/migrations/*.sql`, timestamped, apply via `supabase db push`
- **Google Sheets export**: GIS OAuth — token stored in-memory React ref, never sent to server

## Pitfalls

- **TanStack Table v8 + React Compiler**: incompatible. Components using `useReactTable` must have `"use no memo"` at the top. `react-hooks/incompatible-library` is already OFF globally.
- **`react-hooks/exhaustive-deps` is warn**, not error. Suppress with eslint-disable + comment when intentional.
- **`@emnapi/runtime` / `@emnapi/core`**: optional deps required at runtime. `npm ci --include=optional` avoids lockfile mismatch with CI.
- **Vercel limits**: 10s function timeout, 100k invocations/month. `next.config.ts` has image remotePatterns for `resources.premierleague.com` + security headers.
- **Lobby constraint**: Auctioneer can start before all teams are claimed. `canStart` only requires `teams.length > 0`.
- **Tests**: Vitest (node env). `*_test` and `*_spec` patterns auto-detected. Tests in `lib/__tests__/` and `components/__tests__/`. No Playwright/e2e.
- **`.gitignore` excludes `opencode.json`** (contains MCP API keys) and `.vscode/` — do not commit these.
