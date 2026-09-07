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
| `npm test` | Vitest (node env, `globals: true`, `@/*` alias); default include — `*.test.ts` / `*.spec.ts` |
| `npm run test:watch` | Vitest watch mode |

Pre-commit order: `npm run type-check && npm run lint`. CI: `npm ci --include=optional && npm run type-check && npm run lint && npm test` (verify job), then `npx semantic-release` on push to `master`. Conventional commits required.

CI quirk: `ci.yml` AND `release.yml` both trigger on push to `master` and both run verify + `npx semantic-release`; `discord.yml` only posts webhooks. Duplicate verify/release runs are expected — don't "fix" them.

Node 24 (`.nvmrc`). Install with `npm ci --include=optional` (`@emnapi/runtime` + `@emnapi/core` are optional deps required at runtime).

## Supabase — three clients

| Module | Session? | When |
|---|---|---|
| `@/lib/supabase` (bare `createClient`) | No — `auth.uid()` null | Server reads, RLS-unaware ops |
| `@/lib/supabase-browser` (`createBrowserClient`) | Yes | RLS writes in client components |
| `@/lib/supabase-server` (`createServerClient`) | Yes | RLS reads in Server Components |

Rule: if the write hits an RLS policy, use `supabase-browser`.

## Supabase free tier constraints

Free plan: 2 GB egress, 500 MB DB, 50k users, 200 realtime connections. Every query matters — prefer `select(cols)` over `select(*)`, batch writes, paginate list queries, and keep realtime subscriptions scoped to the minimum data needed. The FPL cache (`fpl_cache` table) already follows this: server-side reads only, single JSONB row, never piped raw to the client.

## Auth middleware — `proxy.ts` (root, not `middleware.ts`)

Next.js 16 convention: the root `proxy.ts` IS the middleware (no `middleware.ts` file exists). Uses `getSession()` (cookie-only, no network). Public paths (no redirect): `/`, `/login`, `/auth/callback`, `/auth/forgot-password`, `/auth/update-password`, `/privacy`, `/terms`, `/api/*`, `/_next/*`, `/favicon.ico`. Nav is hidden on `/` for unauthenticated visitors.

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

## Tournaments & Competitions (`lib/tournament/`)

- **Domain modules**:
  - `auto-score.ts`: state-aware auto-scoring engine with cooldown locks (`auto_score_lock_{competitionId}_gw_{gw}` in `fpl_cache`) and automatic knockout progression.
  - `scoring.ts`: batch-fetches manager points from FPL in chunks of 5 with 50ms pauses to avoid burst rate limits.
  - `fixture-breakdown.ts`: compiles head-to-head Playing 11, bench points, captain multipliers, autosubs, and aggregated team match stats.
  - `knockout.ts` & `knockout-two-path.ts`: resolves single/two-legged ties, aggregate scores, away goals/tiebreakers, and two-path Champions/Europa League bracket trees.
  - `round-robin.ts`: Berger / circle algorithm for single and double round-robin schedules.
  - `parser.ts`: parses raw pasted text fixtures and fuzzy-matches team names to the roster.
  - `standings.ts`: computes group tables (MP, W, D, L, GF, GA, GD, Points) with tiebreakers.
- **FPL Live vs Finalized Scoring**:
  - During live gameweeks (`finished: false`, `data_checked: false`), FPL's `entry_history.points` in `/api/entry/{id}/event/{gw}/picks/` is snapshotted in batch cycles and may lag behind live match element sums on the FPL mobile app until the gameweek is finalized or updated overnight.
- **Fixture Breakdown Route**:
  - `/api/tournaments/[id]/fixtures/[fixtureId]/breakdown` — `[id]` can be the competition ID or `"any"`; the route handler looks up the fixture by `fixtureId` directly.

## Auction Realtime & Server Clock

- **Server Clock Sync**: Countdown timers use `get_server_time` Postgres RPC via `useServerClock` to eliminate client device clock drift between host and bidders.
- **Database Triggers**: Database enforces monotonic bid increments and guards against duplicate concurrent bids.
- **Bid Increments**: Supports both flat increments and tiered increments (`lib/bid-increment.ts`).
- **Lobby constraint**: Auctioneer can start before all teams are claimed. `canStart` only requires `teams.length > 0`.

## Security Invariants

- **SSRF Prevention**: All external API proxy routes (`/api/fpl/...`) must validate query/path parameters using digit regex (`/^\d+$/`) and numeric bounds before passing to `fetch()`. Never interpolate unvalidated string parameters into outgoing URLs.
- **DOM XSS Prevention**: User/database avatar URLs must be validated with `isSafeImageUrl()` allowing only `https:`, `http:`, and `blob:` schemes before rendering in `<img src={...}>`.
- **Workflow Script Injection**: In GitHub Actions (`.github/workflows/*.yml`), never interpolate `${{ ... }}` directly into inline `run: |` shell scripts. Always pass values via `env:` and construct JSON using `jq -n`.
- **Workflow Permissions**: Workflows must declare explicit top-level `permissions` (e.g. `permissions: contents: read` or `permissions: {}`) to enforce least privilege.

## Codebase conventions

- **Next.js ^16.2.11 + React 19.2.4** — breaking changes from training data
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
- **Vercel limits**: 10s function timeout, 100k invocations/month. `next.config.ts` has image remotePatterns for `resources.premierleague.com` + security headers.
- **Tests**: Vitest (node env), default `*.test.ts`/`*.spec.ts` include (NOT `*_test`/`*_spec`). Tests live in `lib/__tests__/` and `components/__tests__/`. No Playwright/e2e.
- **`.gitignore` excludes `opencode.json`** (contains MCP API keys) and `.vscode/` — do not commit these.
