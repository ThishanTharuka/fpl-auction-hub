# FPL Auction Hub

A Fantasy Premier League auction tool with live bidding, squad management, and a weighted player index builder.

## Stack

- **Next.js 16** (App Router, React 19)
- **Supabase** — auth + database (PostgreSQL, RLS) + real-time channels
- **TanStack Table v8** — sortable/filterable players table
- **shadcn/ui** + **Tailwind CSS v4** — UI components
- **TypeScript** — strict mode + `noUncheckedIndexedAccess`

## Pages

| Route | Description |
|---|---|
| `/players` | FPL players data table with sorting, filtering, and player details |
| `/index-builder` | Weighted scoring index builder for auction valuation |
| `/auction` | Auction lobby — create or join an auction session |
| `/auction/[id]` | Auction overview for a session |
| `/auction/[id]/auctioneer` | Auctioneer view — nominate players, manage bids, advance rounds |
| `/auction/[id]/bid` | Bidder view — live player stats, place bids in real time |
| `/auction/[id]/teams` | Pitch view of each participant's squad by formation |
| `/teams` | Global teams overview |

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/<you>/fpl-auction-hub.git
cd fpl-auction-hub
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Supabase project URL and anon key (found in your Supabase project settings under **API**).

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
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run type-check` | Run TypeScript compiler check |

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy — Vercel auto-detects Next.js, no extra configuration needed.

## Code Standards

- **TypeScript**: strict mode, `noUncheckedIndexedAccess`, `noImplicitOverride`
- **ESLint**: `@typescript-eslint/no-explicit-any` as error, `consistent-type-imports` enforced, `no-alert` / `no-console` rules
- **SonarQube**: `sonar-project.properties` included for SonarCloud integration
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
