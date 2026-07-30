# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Friend groups that play Fantasy Premier League and want to run auction-style drafts instead of the standard FPL game. The tool replaces a manual workflow of spreadsheets, WhatsApp groups, and ad-hoc tracking with a live auction room, squad management, and player valuation in one place.

## Product Purpose

FPL Auction Hub lets a group of friends run a live FPL auction draft — the auctioneer configures rules, nominates players, and manages bids in real time; managers join, claim teams, place bids, and track their squad — all without leaving the browser. Success means the group completes a full auction draft without reverting to spreadsheets.

## Positioning

The only dedicated FPL auction tool that combines a live real-time auction room (countdown timers, bid tracking, sold log) with FPL player stats, squad formation management, and a custom weighted index builder in a single app — replacing the fragmented workflow of spreadsheets + messaging + manual bookkeeping.

## Operating Context

- FPL season runs August to May; auction drafts typically happen once per season before the first gameweek, though some groups may run mid-season auctions.
- The auctioneer is usually one person in the group who sets up the league and runs the auction on a shared screen or stream.
- Bidders join from their own devices — desktop primary, mobile secondary.
- The app must stay responsive during live bidding with sub-second timer updates.

## Capabilities and Constraints

### Confirmed
- Live auction room with real-time bidding, countdown timer, bid history, sold log, pause/resume/extend, rebid
- Auctioneer panel: player search/filter, nominate, sell, unsold, cancel
- Bidder panel: live player card, current bid display, squad summary, bid button with validation
- League lobby: team claiming, auctioneer approval/rejection, password protection
- Player stats table (TanStack Table v8) with sorting, filtering, position tabs, mobile card layout
- Index Builder: custom weighted scoring index with stat categories and weight sliders
- Teams/pitch view: formation grid showing all squads across all leagues
- Profile: display name, password change, account deletion
- Auth: email/password sign-in and sign-up via Supabase Auth
- FPL data cache (Supabase JSONB `fpl_cache` table) with adaptive TTL (5min matchday / 30min eve / 2h default)
- Streaming SSR on data-heavy pages (`/players`, `/index-builder`, `/teams`)
- Google Sheets export via GIS OAuth (client-side, in-memory token)
- Dark-only theme (no light mode)

### Technical Constraints
- Supabase Free tier: 2 GB egress/month, 500 MB database, 50k users, 200 realtime connections
- Vercel Free tier (Hobby): 10s function timeout, 100k serverless invocations/month, 2MB fetch cache limit (mitigated by `fpl_cache` table)
- Open-source (MIT license)
- No e2e tests — Vitest unit tests only
- Conventional commits required; `semantic-release` on push to master auto-bumps version
- CI: verify job (`type-check` + `lint` + `test`) before release

### Undecided
- Future pricing/paid tiers
- Mobile native apps
- Multiple concurrent auctions per user

## Brand Commitments

- Name: **FPL Auction Hub**
- Dark-only theme: page `#061423`, card `#0f1c2c`, sidebar `#020f1e` — no light mode counterpart
- Single accent colour: electric mint `#00e478` for CTAs, active indicators, brand elements — no second accent
- Hairline borders (1px `#3b4b3d`) on cards instead of shadows
- Inter for every typographic role, no mono or display faces
- `rounded-lg` (8px) for cards and buttons, `rounded-xl` (12px) for dialogs, `rounded-full` only for badges
- No gradient text, gradient buttons, or gradient borders — flat colour only
- No emojis in code

## Evidence on Hand

- Running production app on Vercel + Supabase
- README.md with screenshots of all major surfaces: players, index builder, auctioneer panel, bidder view, teams
- DESIGN.md documents the full visual system
- Full Supabase schema in `supabase/migrations/`

## Product Principles

1. **Real-time first.** The auction room is the core experience — timer accuracy, bid propagation, and sold-log updates must be immediate and reliable. Every other feature serves the auction workflow.
2. **Replace the spreadsheet.** Every feature should reduce the need for external tools. If a user reaches for a calculator, notes app, or separate spreadsheet during an auction, the tool has a gap.
3. **Data density with clarity.** FPL involves hundreds of players and dozens of stats. The UI must show as much useful information as possible without overwhelming — hierarchy, not whitespace, carries the signal.
4. **Free-tier honest.** Every query, realtime connection, and byte of egress is accounted for. Features are designed to the Supabase and Vercel free-tier limits, not around a hypothetical paid plan.
5. **Group-owned, not platform-dependent.** The app is self-hostable, open-source, and does not lock groups into a proprietary service. The database schema and data model are designed for portability.

## Accessibility & Inclusion

The app uses standard OS/browser dark-mode contrast ratios. No product-specific accessibility standard has been established. Future work should target WCAG 2.1 AA for the auction room and player table surfaces.
