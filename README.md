# FPL Auction Hub

A Fantasy Premier League auction tool with live bidding, squad management, and a weighted player index builder.

## Screenshots

<div align="center">
  <table>
    <tr>
      <td><img width="1896" height="911" alt="players" src="https://github.com/user-attachments/assets/72cd69f3-3e4e-453f-a67c-0492c1bc6efb" /></td>
      <td><img width="1894" height="913" alt="index_builder" src="https://github.com/user-attachments/assets/2bb2ec3e-32b5-4a16-8ad3-eafe306a8d67" /></td>
    </tr>
    <tr>
      <td align="center"><em>Players — sortable data table</em></td>
      <td align="center"><em>Index Builder — custom scoring weights</em></td>
    </tr>
    <tr>
      <td><img width="1894" height="912" alt="auctioneer_panel" src="https://github.com/user-attachments/assets/f1b3c331-ffe7-428c-8e32-e853186b6fee" /></td>
      <td><img width="1892" height="914" alt="bidder" src="https://github.com/user-attachments/assets/fc3483cd-d21c-4f33-96db-c2ffdcb8af2b" /></td>
    </tr>
    <tr>
      <td align="center"><em>Auctioneer — nominate &amp; manage bids</em></td>
      <td align="center"><em>Bidder — live player stats &amp; bidding</em></td>
    </tr>
    <tr>
      <td colspan="2" align="center"><img width="1909" height="910" alt="teams" src="https://github.com/user-attachments/assets/e28da8c2-c9a8-42d4-ad96-d7d3990228f6" /></td>
    </tr>
    <tr>
      <td colspan="2" align="center"><em>Teams — pitch view of all squads</em></td>
    </tr>
  </table>
</div>

## Stack

- **Next.js 16.2** (App Router, React 19, Streaming SSR)
- **Supabase** — auth + database (PostgreSQL, RLS) + real-time channels
- **TanStack Table v8** — sortable/filterable players table
- **shadcn/ui** (style `"base-nova"`) + **Tailwind CSS v4** — UI components
- **TypeScript** — strict mode, `noUncheckedIndexedAccess`

## Pages

| Route | Description |
|---|---|
| `/players` | FPL player data table with sorting, filtering, and player details — **Streaming SSR** |
| `/index-builder` | Custom weighted scoring index for auction valuation — **Streaming SSR** |
| `/teams` | Global teams/pitch overview — **Streaming SSR** (two loading layers) |
| `/auction` | Auction lobby — create or join a session |
| `/auction/[id]` | Auction overview for a session |
| `/auction/[id]/auctioneer` | Auctioneer view — nominate players, manage bids |
| `/auction/[id]/bid` | Bidder view — live player stats, place bids in real time |
| `/auction/[id]/teams` | Pitch view of each participant's squad by formation |

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/<you>/fpl-auction-hub.git
cd fpl-auction-hub
npm ci --include=optional
```

> `@emnapi/runtime` and `@emnapi/core` are optional deps required at runtime — `--include=optional` avoids lockfile mismatch with CI.

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your Supabase project URL and anon key (found in your Supabase project settings under **API**).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run type-check` | Run TypeScript compiler check |
| `npm test` | Run Vitest tests |
| `npm run type-check && npm run lint` | Verify before committing |

## Architecture

### Streaming SSR

Pages that load the FPL bootstrap payload (`/players`, `/index-builder`, `/teams`) use **Streaming SSR with Suspense**. A synchronous `page.tsx` wraps an async data-fetching component inside `<Suspense>` with a skeleton fallback. This gives instant FCP (skeleton streams immediately) while data is fetched server-side.

The `/teams` page has two loading layers: the outer Suspense skeleton for the FPL data fetch, and an inner client-side skeleton for Supabase DB queries (leagues, participants, formations).

### FPL data cache

The FPL bootstrap payload (~2.6MB) exceeds Vercel's free-tier fetch cache limit (2MB). Custom Supabase JSONB cache (`fpl_cache` table) replaces Vercel's `next: { revalidate }`:

- **TTL**: 5 min on matchday, 30 min day before, 2h otherwise
- **Server-only** — fetched in async child components via `getFplData()` in `lib/fpl-data.ts`
- **Typed reads**: `data.value as unknown as FplDataResult` (zero-cost JSONB boundary)
- **Safe writes**: `JSON.parse(JSON.stringify(fresh))` strips non-serializable values

### Three Supabase clients

| Module | Session | Use |
|---|---|---|
| `@/lib/supabase` | No — `auth.uid()` always null | Server reads, RLS-unaware ops |
| `@/lib/supabase-browser` | Yes | RLS-protected writes in client components |
| `@/lib/supabase-server` | Yes | RLS reads in Server Components |

### Auth middleware

`proxy.ts` wraps all routes using `getSession()` (cookie read), not `getUser()` (network). Public routes: `/login`, `/auth/*`, `/api/*`, `/_next/*`.

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in Vercel project settings.
4. Deploy — Vercel auto-detects Next.js.

### CI/CD pipeline

On push to `master`, GitHub Actions runs:

- **verify** — `type-check` → `lint` → `test`. Must all pass before the release job runs.
- **release** — `npx semantic-release` publishes a new version (auto-bumped via conventional commits).

### Vercel deployment checks

To require the `verify` check before promoting to production:

1. In Vercel project settings → **Deployment Checks** → **Add Checks** → **GitHub**.
2. Search for the job name `Release / verify` and add it.
3. Set **Ignore Build Step** to skip `[skip ci]` commits (preventing semantic-release's version bumps from triggering redundant deploys):

   ```
   git log -1 --pretty=format:"%s" | grep -q "\[skip ci\]" && exit 0 || exit 1
   ```

**Vercel free tier limits**: 10s function timeout, 100k invocations/month.

## Code Standards

- **TypeScript**: strict mode, `noUncheckedIndexedAccess`, `noImplicitOverride`, `no-explicit-any` error
- **ESLint**: flat config (`eslint.config.mjs`), `consistent-type-imports` with `inline-type-imports` fix style
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) — CI runs `npx semantic-release` on push to `master`
- **Pre-commit verification**: `npm run type-check && npm run lint`
- **Key reference file**: `AGENTS.md` — critical context for working in this repo

## Key conventions

- **Imports**: `@/*` path alias, type-imports preferred
- **`cn()`**: `clsx` + `tailwind-merge` via `@/lib/utils`
- **Animations**: `tw-animate-css` (NOT `tailwindcss-animate`)
- **TanStack Table v8** components must have `"use no memo"` at the top (React Compiler incompatibility)
- **Navigation feedback**: NProgress (no `loading.tsx` files)
- **No emojis** in code
- **Version** auto-bumped by semantic-release — do not edit `package.json` version manually
