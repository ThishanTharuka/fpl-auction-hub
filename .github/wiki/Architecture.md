# Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────┐
│                    Next.js 16 App                    │
│  ┌───────────────────────────────────────────────┐  │
│  │              App Router (app/)                 │  │
│  │  pages · layouts · loading · error states     │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │           Components (components/)             │  │
│  │  auth-provider · nav · player-stats-bar · ui  │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │              Library (lib/)                    │  │
│  │  supabase clients · utils · types · calc      │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │          API Routes (app/api/fpl/)             │  │
│  │  bootstrap · fixtures · player/[id]            │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│  Supabase       │    │  FPL API         │
│  PostgreSQL     │    │  (fantasy.premier │
│  Auth           │    │   league.com)     │
│  Realtime       │    └──────────────────┘
└─────────────────┘
```

## Authentication Flow

```
Request → Next.js Middleware (proxy.ts)
  ├── Has session? → Continue to page
  └── No session? → Redirect to /login
```

The middleware runs on every request. It uses Supabase SSR cookies to check authentication. Protected routes require a valid session.

### Supabase Client Patterns

The project uses three distinct Supabase client patterns:

| Client | File | Usage |
|---|---|---|
| **Singleton** | `lib/supabase.ts` | Imported directly in client components |
| **Server Client** | `lib/supabase-server.ts` | Server components and Server Actions (reads cookies) |
| **Browser Client** | `lib/supabase-browser.ts` | Client components needing fresh instances |

## Real-time Data Flow

```
Supabase PostgreSQL
  │
  ├── Realtime Channel (postgres_changes)
  │     ├── lobby-{id}         → team_members table
  │     ├── auctioneer-{id}    → auction_nominations + auction_bids
  │     ├── bid-{id}-{teamId}  → auction_nominations + auction_bids
  │     └── teams-hub-{id}     → auction_results
  │
  └── Client Components subscribe and react to changes
```

## FPL API Proxy

The app proxies the [official FPL API](https://fantasy.premierleague.com/api/) to avoid CORS issues and add enrichment:

| Endpoint | Method | Caching | Purpose |
|---|---|---|---|
| `/api/fpl/bootstrap` | GET | Dynamic | Fetches bootstrap-static + fixtures, enriches player data |
| `/api/fpl/fixtures` | GET | ISR (1hr) | Fetches fixtures with per-team FDR |
| `/api/fpl/player/[id]` | GET | ISR (1hr) | Fetches individual player history and upcoming fixtures |

## Directory Structure

```
app/                     # Next.js App Router
  layout.tsx            # Root layout (auth, nav, fonts, theme)
  page.tsx              # Home page (redirects to /players)
  globals.css           # Global styles (dark theme)
  (pages)               # Route pages
  api/fpl/              # FPL API proxy routes
  auth/                 # Auth callback and password pages

components/             # React components
  auth-provider.tsx     # Auth context provider
  nav.tsx               # Navigation bar
  player-stats-bar.tsx  # Player stats display
  ui/                   # shadcn/ui primitives

lib/                    # Shared library code
  utils.ts              # cn() utility
  supabase*.ts          # Supabase clients
  database.types.ts     # Generated Supabase types
  fpl-types.ts          # FPL API type definitions
  index-calculator.ts   # Weighted index scoring engine
```

## Security

- **Row-Level Security (RLS)** — Supabase tables use RLS policies
- **Security Headers** — configured in `next.config.ts`
- **Middleware Auth** — route protection via `proxy.ts`
- **Environment Variables** — sensitive keys never exposed to client
