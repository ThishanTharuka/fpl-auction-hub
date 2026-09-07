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

## Tech Stack

- **Framework**: **Next.js 16** (App Router, React 19, Streaming SSR with Suspense)
- **Backend / Database**: **Supabase** (PostgreSQL, Row-Level Security, Realtime Channels, Edge Functions & RPCs)
- **Tables & Filtering**: **TanStack Table v8** with React 19 `"use no memo"` directive
- **Styling & UI**: **Tailwind CSS v4** + **shadcn/ui** (style `"base-nova"`) + **tw-animate-css**
- **Motion & UI**: **Framer Motion**, **Vaul** (drawers), **Sonner** (toasts), **Lucide React** (icons)
- **Data Visualization**: **Recharts**
- **Drag & Drop**: **@dnd-kit/core** + **@dnd-kit/sortable**
- **Type Safety**: **TypeScript 5** (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`)
- **Testing**: **Vitest 4** (Node environment, `@/*` alias support)
- **CI / CD**: **GitHub Actions** (`verify` + `semantic-release` on push to `master`)

## Pages

### Core & Analytics
| Route | Description |
|---|---|
| `/` | Landing page with platform overview and feature showcase |
| `/players` | Sortable/filterable FPL player database with detailed stats modal — **Streaming SSR** |
| `/index-builder` | Custom weighted scoring engine for player auction valuation — **Streaming SSR** |
| `/insights` | Auction spending trends, value buys, and squad balance analytics |
| `/teams` | Global pitch view of squads across all leagues — **Streaming SSR** (two loading layers) |

### Live Auction System
| Route | Description |
|---|---|
| `/auction` | Live & upcoming auction lobby directory |
| `/auction/setup` | Auction creation wizard with rule configuration |
| `/auction/[id]` | Auction lobby — team claiming, host approvals, live chat, and rules settings |
| `/auction/[id]/auctioneer` | Host control desk — player search, nominations, countdown timers, bid actions (Sold/Unsold/Rebid) |
| `/auction/[id]/bid` | Manager bidding room — synchronized live timer, player stats, 1-click validated bidding |
| `/auction/[id]/spectate` | Real-time read-only spectator view with live chat |
| `/auction/[id]/chat` | Dedicated auction chat view |
| `/auction/[id]/teams` | Pitch view of squad formations (4-3-3, 3-4-3, etc.), drag-and-drop starter/bench allocation |
| `/auction/[id]/teams/[participantId]/edit` | Manager profile — custom crest upload and verified FPL ID linking |

### Tournament & Competition System
| Route | Description |
|---|---|
| `/tournaments` | Tournaments directory and manager dashboard |
| `/tournaments/new` | Tournament wizard — formats, starting Gameweek, group allocation, and rosters |
| `/tournaments/[id]` | Admin tournament workspace — automated schedule builder, bracket management, and live scores |
| `/tournaments/[id]/public` | Public spectator view for tournament fixtures, standings, and brackets |

### User & Auth
| Route | Description |
|---|---|
| `/profile` | User profile management |
| `/login`, `/auth/forgot-password`, `/auth/update-password` | Authentication pages |
| `/privacy`, `/terms` | Privacy policy and terms of service |

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

## User Guide

### 1. The Auction Workflow

#### Step 1: Create an Auction
Navigate to `/auction` and click **+ New Auction** (or `/auction/setup`). Configure:
* **General**: League name and optional room password.
* **Economics**: Starting budget (£m per team), minimum starting bid by position (GKP, DEF, MID, FWD), and maximum players allowed from any single Premier League club.
* **Bidding Rules**: Flat increment or **Tiered Bid Increments** (e.g., £0.5m under £10m, £1m under £30m, £2m above).
* **Timers**: Nomination countdown duration (15–120 seconds).
* **Teams**: Define participating team slots (minimum 2).

#### Step 2: Lobby & Team Claiming (`/auction/[id]`)
* Share the lobby link with managers.
* Managers click **Claim** on their team slot.
* Managers customize their team at `/auction/[id]/teams/[participantId]/edit`: upload custom team crests and link their official FPL Manager ID.
* The host reviews and approves team claims.
* The host can start the auction at any time once at least one team is present.

#### Step 3: Running the Auction (`/auction/[id]/auctioneer`)
* Search and filter all FPL players from the left panel.
* Select a player to stage them, choose a countdown duration, and click **Start Bidding**.
* Controls available to the host during active bidding:
  * **Pause / Resume**: Temporarily freeze the countdown.
  * **Extend (+15s)**: Add emergency seconds to the timer.
  * **SOLD**: Finalize sale to the current highest bidder (automatically deducts budget, updates squad counts, and records sale).
  * **UNSOLD**: Pass the nomination if no bids are placed.
  * **Rebid (↩)**: Undo a previous sale from the sold log and re-nominate the player.

#### Step 4: Placing Bids (`/auction/[id]/bid`)
* Real-time synchronized timer backed by Supabase server clock RPC to prevent device clock skew.
* Single-click bid buttons with instant client and database validation:
  * Budget verification (cannot exceed remaining funds).
  * Position limits (e.g., max 2 GKP).
  * Self-outbid prevention (cannot bid against yourself).
  * Duplicate and monotonic bid protections enforced via Postgres database triggers.
* Spectators can join via `/auction/[id]/spectate` for a read-only live feed and chat participation.

#### Step 5: Squad Management & Google Sheets Export (`/auction/[id]/teams`)
* Interactive pitch visualizer for squads across standard formations (4-3-3, 3-4-3, 4-4-2, 3-5-2, 5-3-2, 4-5-1).
* Drag-and-drop starter vs bench allocation.
* One-click Google Sheets export: Uses Google Identity Services (GIS) OAuth in-memory token authentication without saving credentials on the server.

---

### 2. Tournaments & Competition Manager

#### Step 1: Create a Tournament (`/tournaments/new`)
* Formats supported:
  * **Single Round-Robin** (every team plays each other once)
  * **Double Round-Robin** (home and away legs)
  * **Group Stage + Two-Path Knockout** (Champions League & Europa League brackets)
* Set starting gameweek (`start_gw`) and assign team rosters to groups (Group A, Group B).

#### Step 2: Fixture Scheduling (`/tournaments/[id]`)
* **Auto-Schedule Generator**: Generates balanced group stage matchdays using the Berger / circle round-robin algorithm.
* **Text Fixture Parser**: Paste raw text fixtures copied from external spreadsheets or match planners; the parser fuzzy-matches team names to the tournament roster with match accuracy scoring.

#### Step 3: Automated Scoring & Knockout Progression (`/api/tournaments/auto-score`)
* Fetches live matchday performance and official points from the FPL API based on each team's linked `fpl_manager_id`.
* Automatic state-aware polling:
  * Checks whether gameweeks are `live`, `finished_unchecked` (matches ended, autosubs pending), or `finalized`.
  * Protects against FPL burst limits with chunked batching (5 managers per batch with interval delays).
  * Concurrency lock via `fpl_cache` (`auto_score_lock_...`) to prevent duplicate executions.
* Automatically updates group standings (MP, W, D, L, GF, GA, GD, Points) with tiebreakers.
* Automatically resolves knockout winners across single-leg or two-legged ties and advances qualifying teams into the visual bracket.

#### Step 4: Head-to-Head Match Breakdown (`FixtureBreakdownModal`)
Click any fixture card to open the comprehensive head-to-head match inspection dialog:
* **Playing 11 vs Playing 11**: Pitch-order breakdown with position color badges, captain 2x / 3x multipliers, and automatic substitution indicators (`subbedIn` / `subbedOut`).
* **Bench**: Real gameweek points scored by reserve players.
* **Match Stats Summary**: Comparative team statistics including goals, assists, clean sheets, saves, bonus points, yellow/red cards, own goals, and captain points.

---

### 3. Analytics & Research Tools

* **Players Database (`/players`)**: Complete FPL player statistics powered by TanStack Table v8 with instant filtering by club, position, and price. Includes detailed individual player history modals.
* **Index Builder (`/index-builder`)**: Tailor-made auction valuation engine. Assign custom weights to stats (Total Points, Form, xG, xA, ICT Index, Clean Sheets, Minutes, Bonus Points) to generate customized player rankings and price targets.
* **Insights (`/insights`)**: Interactive charts (powered by Recharts) visualizing league economy trends, spend-by-position distributions, and squad efficiency.

---

## Architectural Deep Dive

### 1. Streaming SSR with Suspense
Pages loading the heavy FPL dataset (`/players`, `/index-builder`, `/teams`):
* `page.tsx` is synchronous and immediately streams the layout and skeleton components to the client for instant First Contentful Paint (FCP).
* The data fetch (`getFplData()`) runs inside an async child component wrapped in `<Suspense>`.
* **No `force-dynamic`**: Skeleton layers are cached at the edge.

### 2. High-Capacity FPL Data Cache (`fpl_cache` Table)
The complete FPL bootstrap payload (~2.6MB) exceeds Vercel's free-tier fetch cache threshold (2MB). A PostgreSQL JSONB cache table (`fpl_cache`) replaces `next: { revalidate }`:
* **Matchday TTL**: 5 minutes during live matches.
* **Pre-matchday TTL**: 30 minutes the day before gameweek kickoff.
* **Off-peak TTL**: 2 hours.
* Typed zero-cost JSONB reads (`data.value as unknown as FplDataResult`) and safe serializable write serialization.

### 3. Three-Client Supabase Architecture
To strictly respect Row-Level Security (RLS) and optimize connection limits:
| Client | Module | Session Context | Purpose |
|---|---|---|---|
| **Bare Client** | `@/lib/supabase` | No (`auth.uid()` null) | Server-side public reads, RLS-unaware background sync |
| **Browser Client** | `@/lib/supabase-browser` | Yes (Cookies) | RLS-protected client operations (bidding, team management) |
| **Server Client** | `@/lib/supabase-server` | Yes (Cookies) | Authenticated reads within Server Components |

### 4. Auth & Navigation Middleware (`proxy.ts`)
In Next.js 16, the root `proxy.ts` serves as the middleware (no `middleware.ts`). It uses cookie-based `getSession()` rather than network-dependent `getUser()` to prevent latency on every route transition. Public paths (such as `/`, `/login`, `/auth/*`, `/api/*`) pass through unconditionally.

### 5. Server Clock Synchronization
Countdown timers in live auctions rely on Postgres `get_server_time()` RPC via the `useServerClock` hook, ensuring accurate timer expiration down to the millisecond across all connected devices regardless of local clock drift.

### 6. Security Standards
* **SSRF Prevention**: All external API proxy routes strictly validate query parameters using integer digit regex (`/^\d+$/`) and numeric bounds before interpolating into outgoing requests.
* **DOM XSS Mitigation**: Image URLs are strictly validated against safe protocols (`https:`, `http:`, `blob:`) before injection into `<img src>` elements.
* **Workflow Protection**: GitHub Actions workflows utilize environment variables (`env:`) and `jq` for JSON payload generation to prevent script injection and cache poisoning. Workflows enforce explicit least-privilege token permissions.

---

### 5. Automated Scoring via Cron (`/api/tournaments/auto-score`)
The tournament engine supports scheduled automated scoring via HTTP POST. Configure an external cron job (e.g. Vercel Cron or GitHub Actions):
* **Method**: `POST`
* **Header**: `Authorization: Bearer <CRON_SECRET>` (or `?secret=<CRON_SECRET>`)
* Runs state-aware scoring across all active tournaments, honors matchday cooldown locks, and automatically progresses tournament brackets.

### 6. Realtime Synchronization
The live auction and chat features leverage Supabase PostgreSQL Realtime channels:
* Synchronizes `nominations`, `auction_bids`, `auction_results`, `chat_messages`, and `leagues` without manual polling.
* Realtime connection health is visually monitored by the built-in `ConnectionStatus` indicator.

---

## Deployment & CI/CD

### Automated Releases
Pushes to the `master` branch trigger the GitHub Actions verification pipeline:
1. `npm run type-check` (`tsc --noEmit`)
2. `npm run lint` (`eslint .`)
3. `npm test` (`vitest run`)
4. On success, `npx semantic-release` automatically analyzes commit messages ([Conventional Commits](https://www.conventionalcommits.org/)), determines version bumps, updates `CHANGELOG.md`, and creates GitHub releases.

---

## License

This project is open-source software licensed under the [MIT License](LICENSE) — see the [LICENSE](LICENSE) file for details.
