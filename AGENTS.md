<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FPL Auction Hub

## Commands — run in this order before committing

| Command | Action |
|---|---|
| `npm run dev` | Dev server |
| `npm run type-check` | `tsc --noEmit` |
| `npm run lint` | ESLint flat config (`eslint.config.mjs`) |
| `npm run lint:fix` | Auto-fix lint |
| `npm test` | Vitest (node env) |
| `npm run build` | Production build |

CI: `npm ci && npm run type-check && npm run lint` (verify and release via `npx semantic-release` on push to master). Conventional commits required.

## Supabase clients — three, not one

| Module | Session? | When |
|---|---|---|
| `@/lib/supabase` (bare `createClient`) | No — `auth.uid()` always null | Server reads, RLS-unaware ops |
| `@/lib/supabase-browser` (from `@supabase/ssr`) | Yes | RLS writes in client components |
| `@/lib/supabase-server` (from `@supabase/ssr`) | Yes | RLS reads in Server Components |

Rule: if the write hits an RLS policy, use `supabase-browser`.

## Auth middleware — `proxy.ts`

`proxy.ts` uses `getSession()` (cookie read, no network). **Public paths** (no redirect): `/`, `/login`, `/auth/*`, `/api/*`, `/_next/*`, `/favicon.ico`, `/privacy`, `/terms`.

The landing page (`/`) is public — Google OAuth requires it. The nav is hidden on `/` for unauthenticated visitors but visible for logged-in users.

## Streaming SSR pattern

Pages with large FPL data fetches (`/players`, `/index-builder`, `/teams`):
- `page.tsx` is synchronous — streams skeleton immediately
- Data fetch (`getFplData()`) lives in an async child inside `<Suspense>`
- **Do not add `force-dynamic`** — skeleton HTML must cache at edge
- Skeleton dimensions must match real layout (prevents CLS)
- `/teams` has two nested loading layers (FPL data + Supabase DB queries)

## FPL data cache (`fpl_cache` table)

Vercel free tier drops fetch entries >2MB; FPL bootstrap is ~2.6MB. Custom Supabase JSONB cache replaces `next: { revalidate }`.
- Entry: `getFplData()` in `lib/fpl-data.ts`
- Key: `"fpl_data"`, stored as JSONB with `ttl_ms`
- TTL: 5 min matchday / 30 min day before / 2h otherwise
- Read cast: `data.value as unknown as FplDataResult`
- Write cast: `JSON.parse(JSON.stringify(fresh))` strips non-serializable values
- Table has permissive RLS (public data)

## Codebase conventions

- **Next.js 16.2.7 + React 19.2** — breaking changes from training data
- **Tailwind CSS v4**: `@import "tailwindcss"`, `@theme inline`, `@custom-variant dark`
- **Animations**: `tw-animate-css` (NOT `tailwindcss-animate`)
- **shadcn/ui**: style `"base-nova"`, aliases `@/components/ui/`
- **Dark-only theme**: page `#061423`, primary `#00e478`, card `#0f1c2c`, border `#3b4b3d` (full spec in `DESIGN.md`)
- **Icons**: `lucide-react` | **Charts**: `recharts` | **DnD**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Navigation feedback**: NProgress (no `loading.tsx`)
- **`cn()`**: `clsx` + `tailwind-merge` via `@/lib/utils`
- **`@/*` path alias**; type-imports with `inline-type-imports` fix style enforced
- **`no-explicit-any` is error** — no `as any` casts
- **No emojis** in code
- **Version**: auto-bumped by semantic-release — do not edit `package.json` version manually
- **Database types**: auto-generated from `supabase gen types typescript` into `lib/database.types.ts` — regenerate when schema changes
- **Supabase migrations**: `supabase/migrations/*.sql`, timestamped, apply via `supabase db push`

## Pitfalls

- **TanStack Table v8 + React Compiler**: incompatible. Components using `useReactTable` must have `"use no memo"` at the top. `react-hooks/incompatible-library` is already OFF globally.
- **`react-hooks/exhaustive-deps` is warn**, not error. Suppress with eslint-disable + comment when intentional (e.g. setState-in-effect).
- **`@emnapi/runtime` / `@emnapi/core`**: optional deps required at runtime. Use `npm ci --include=optional` locally or lockfile mismatches CI.
- **Vercel limits**: 10s function timeout, 100k invocations/month. Keep server components lean.
- **Lobby constraint**: Auctioneer can start before all teams are claimed — managers claim teams at any status (setup or live). `canStart` only requires `teams.length > 0`.
- **Tests**: Vitest (node env), `globals: true` in `vitest.config.ts`, `@*/` path alias resolved. Tests in `lib/__tests__/` and `components/__tests__/`.
- **CRON_SECRET**: required env var for `POST /api/tournament/auto-score`. Set it in `.env.local` and as Supabase secret. Supabase cron can hit `/api/tournament/auto-score` with `Authorization: Bearer ${CRON_SECRET}` header to auto-score finished GWs across all active tournaments.
- **Swiss stages**: matches are generated on-the-fly per-round in the scoring API (not pre-generated like round-robin/knockout). The `POST /api/tournament/[id]/score` endpoint calls `generateSwissRound()` before scoring if no matches exist for the target GW. Same logic in `/api/tournament/auto-score`.
- **Knockout bracket**: view page renders a visual bracket (`<KnockoutBracket>`) for knockout stages instead of the flat match table.
- **RPC functions**: `insert_tournament_matches(jsonb)` and `upsert_tournament_standings(jsonb)` created via migration `atomic_tournament_insert_rpc` — use for atomic bulk inserts.
