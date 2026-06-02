# Features

## 1. FPL Players Data Table

**Route:** `/players`

A comprehensive, sortable, and filterable data table of all FPL players for the current season.

- **Live data** — fetches directly from the official FPL API (bootstrap-static + fixtures)
- **Sorting** — click any column header to sort (price, points, form, xG, etc.)
- **Filtering** — by position (ALL/GKP/DEF/MID/FWD), availability, and price range
- **Column visibility** — choose which metrics to display with grouped checkboxes and tooltips
- **25+ columns** — price, total_points, form, ICT index, expected stats (xG, xA, xGI, xGC), season stats, FDR, status
- **Player detail dialog** — click any player to view key stats in a popup
- **Mobile responsive** — card list view on small screens, table on desktop
- **Skeleton loading** — smooth loading states while data fetches

## 2. Index Builder

**Route:** `/index-builder`

A custom scoring system for auction player valuation that lets you build your own weighted index.

- **21 adjustable metrics** across five groups:
  - **Core:** ict_index, form, total_points
  - **ICT:** influence, creativity, threat
  - **Expected Stats:** xG, xA, xGI, xGC
  - **Season Stats:** goals_scored, assists, clean_sheets, goals_conceded, saves (GKP), penalties_saved (GKP), bonus
  - **Other:** selected_by_percent, minutes, bps, fdr_avg
- **Position-specific presets** — one-click presets for All, GKP, DEF, MID, FWD with pre-tuned weights
- **Real-time ranking** — top 50 players by position recalculate as you adjust sliders
- **Min-max normalization** — fair scoring across different metric ranges
- **Inverted stats** — metrics where lower is better (xGC, goals_conceded, FDR) are inverted automatically
- **Info tooltips** — every metric includes a detailed explanation
- **Mobile drawer** — weight sliders collapse into a drawer on small screens

## 3. Auction System

The core feature of the application — a complete live auction draft system.

### Creating an Auction

**Route:** `/auction/setup`

Configure your league's auction settings:
- League name and password protection
- Budget per team
- Timer duration per nomination
- Bid increment amount
- Base prices per position (GKP, DEF, MID, FWD)
- Max players per club restriction
- Squad size limit
- Add multiple teams with custom colors

### Auction Lobby

**Route:** `/auction/[id]`

- Teams claim their slot and get approved by the auctioneer
- Real-time updates on who has joined
- Auctioneer controls to start the auction

### Auctioneer View

**Route:** `/auction/[id]/auctioneer`

- Search and nominate FPL players for bidding
- Start bidding with a countdown timer
- Live bid feed via Supabase Realtime
- Timer extension, pause, and resume controls
- Gavel to sell to the current highest bidder
- Mark players as unsold or cancel nominations
- Re-bid previously sold players
- Budget tracking sidebar with progress bars
- Sold log showing all completed sales

### Bidder View

**Route:** `/auction/[id]/bid`

- View current nomination with full player stats
- Place bids with automatic increment logic
- Live countdown timer
- Bid constraints enforced:
  - Cannot outbid yourself
  - Budget must be sufficient
  - Position limits checked
  - Squad size limit checked
  - Remaining budget for future slots considered
- My squad overview showing current team

### Teams Hub

**Route:** `/auction/[id]/teams`

- Grid of all participant squads
- Players grouped by position
- Budget bars per team
- Real-time updates on new sales

## 4. Global Teams View

**Route:** `/teams`

- League selector to switch between different leagues
- Interactive football pitch visualization
- Formation selector (4-4-2, 4-3-3, 3-5-2, 5-3-2, 4-2-3-1, 3-4-3)
- Click player tokens to view detail dialog
- Bench display area
- Compare auction price vs FPL price

## 5. Authentication

- Email/password sign-up and sign-in via Supabase Auth
- Display name collection during registration
- Email verification flow
- Password reset (forgot password / update password)
- Middleware-based route protection
- Auth state via React context

## 6. Real-time Updates

Powered by Supabase Realtime Channels:
- **Lobby** — team membership changes
- **Auctioneer** — incoming bids and timer state
- **Bidder** — new nominations, bid updates, timer changes
- **Teams Hub** — new auction results
