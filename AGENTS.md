<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FPL Auction Hub

## Commands

| Command | What |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (flat config in `eslint.config.mjs`) |
| `npm run lint:fix` | Auto-fix lint |
| `npm run type-check` | `tsc --noEmit` |
| `npm run type-check && npm run lint` | Verify before committing |

CI runs `npm ci` + `npx semantic-release` (conventional commits required, pushes to master).

## Supabase clients — pick the right one

There are **three** clients with different auth behavior:

| Module | Import | Session? | When to use |
|---|---|---|---|
| `@/lib/supabase` | `createClient` | **No** — `auth.uid()` always null | Server-side reads, RLS-unaware ops |
| `@/lib/supabase-browser` | `createSupabaseBrowserClient()` from `@supabase/ssr` | **Yes** — carries the user session | RLS-protected writes in client components |
| `@/lib/supabase-server` | `createSupabaseServerClient()` from `@supabase/ssr` | **Yes** | RLS reads in Server Components |

**Rule of thumb**: if the write hits an RLS policy, use `supabase-browser`. Bare `@/lib/supabase` has no session.

## Streaming SSR with Suspense

Pages that fetch `getFplData()` (`/players`, `/index-builder`, `/teams`) use Streaming SSR:

- `page.tsx` is **synchronous** — the server streams a skeleton immediately
- `getFplData()` lives inside an async child component wrapped in `<Suspense>`
- **Do not add `force-dynamic`** — it prevents static shell optimization. Without it, the skeleton HTML is cached at the edge.
- Skeleton dimensions must match the real layout (same heights, responsive breakpoints, column widths) or the skeleton→content transition causes CLS.

Two of the three pages replace the skeleton atomically. `/teams` has a second loading layer: the Suspense skeleton covers the FPL data fetch, then the inner `teams-client.tsx` skeleton covers client-side Supabase DB queries (leagues, participants, formations). Both layers are correct and should be preserved.

## FPL data cache

Custom Supabase JSONB cache (`fpl_cache` table) — Vercel free tier drops fetch entries >2MB and the FPL bootstrap payload is ~2.6MB.

- Entry point: `getFplData()` in `lib/fpl-data.ts`
- Cache key: `"fpl_data"`, stored as JSONB in `value` column with `ttl_ms`
- Dynamic TTL: 5 min on matchday, 30 min day before, 2h otherwise
- Read cast: `data.value as unknown as FplDataResult` (zero-cost JSONB boundary)
- Write cast: `JSON.parse(JSON.stringify(fresh))` strips non-serializable values
- Table has permissive RLS (public data — no auth needed)

## Key codebase conventions

- **Framework**: Next.js 16.2.7 + React 19.2 — breaking changes from your training data (see top of file)
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss"`, `@theme inline`, `@custom-variant dark`)
- **Animations**: `tw-animate-css` (NOT `tailwindcss-animate`)
- **shadcn/ui**: Style `"base-nova"` in `components.json`, uses `@/components/ui/` aliases
- **Icons**: `lucide-react`
- **Charts**: `recharts`
- **DnD**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Navigation**: `nprogress` for SSR transition feedback (tied to `<NProgressProvider>` in layout)
- **Imports**: `@/*` path alias, `type-imports` preferred with `inline-type-imports` fix style
- **`cn()`**: `clsx` + `tailwind-merge` via `@/lib/utils`
- **`no-explicit-any`** is error — no `as any` casts
- **No emojis** in code
- **Auth middleware**: `proxy.ts` wraps all routes; uses `getSession()` (cookie read) NOT `getUser()` (network). Public: `/login`, `/auth/*`, `/api/*`, `/_next/*`.
- **Database types**: Auto-generated from `supabase gen types typescript` into `lib/database.types.ts` — regenerate when schema changes

## Pitfalls

- **TanStack Table v8 + React Compiler**: incompatible. Components using `useReactTable` must have `"use no memo"` at the top. `react-hooks/incompatible-library` is already OFF globally.
- **`react-hooks/exhaustive-deps` is warn**, not error. Suppress with eslint-disable + comment when intentional (e.g. setState-in-effect, ref patterns).
- **`<img>` without `priority` prop** gets lint warnings — use eslint-disable at file top or switch to `<Image>` with `remotePatterns` configured in `next.config.ts`.
- **`@emnapi/runtime` / `@emnapi/core`** are optional deps but required at runtime. Use `npm ci --include=optional` locally or the lockfile will mismatch CI.
- **Vercel limits**: 10s function timeout, 100k invocations/month. Keep server components lean.
- **No `loading.tsx`** — navigation feedback uses NProgress instead.
- **Version**: Auto-bumped by semantic-release. Do not edit `package.json` version manually.
