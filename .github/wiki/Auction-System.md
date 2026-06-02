# Auction System

The auction system is the heart of FPL Auction Hub. This page explains the full auction lifecycle, from creation to completed squad.

## Overview

Unlike traditional FPL where you pick players within a budget, an **auction draft** lets managers bid against each other for every player. The auction is run in real-time by an **auctioneer** who nominates players, and **bidders** compete to win each player.

## Auction Lifecycle

### 1. Creating a League

An admin creates a league at `/auction/setup` with the following configuration:

| Setting | Description |
|---|---|
| League Name | Display name for the league |
| Password | Optional — restricts access to invited managers |
| Budget Per Team | Total budget each team starts with |
| Timer Seconds | Countdown duration per nomination |
| Bid Increment | Minimum amount each bid must increase by |
| Base Prices | Starting prices per position (GKP, DEF, MID, FWD) |
| Max Per Club | Limit on players from a single FPL club |
| Squad Size | Maximum players per team |

### 2. Adding Teams and Claiming

The auctioneer adds teams with display names and colors. Each team is then claimed by a real user who gets approved by the auctioneer.

### 3. Starting the Auction

Once all teams are claimed, the auctioneer starts the auction. The real-time system connects all participants to the same auction channel.

### 4. Nomination Phase

The auctioneer:
1. Searches for an FPL player
2. Reviews their stats
3. Nominates them with a starting price (base price for their position)
4. The countdown timer begins

### 5. Bidding Phase

Bidders see the nominated player with:
- Full player stats (PlayerStatsBar)
- Current highest bid and bidder name
- Countdown timer

**Placing a bid:**
- Click "Bid £Xm" to place the minimum valid bid
- A bid is valid if it beats the current highest bid by at least the bid increment

**Bid constraints** (enforced client-side and logically):
- Cannot bid on your own nomination (the player who nominated does not appear in the bidder view)
- Cannot outbid yourself
- Must have sufficient remaining budget
- Must have room in your squad (squad size limit)
- Must have room for this position (position limits)
- Must have enough budget left for remaining roster spots

### 6. Timer Mechanics

- The timer starts when a player is nominated
- If a bid is placed in the final seconds, the timer extends (configurable)
- The auctioneer can pause or resume the timer
- If the timer expires, the current highest bidder wins

### 7. Closing a Sale

The auctioneer can:
- **Sell** — the player goes to the current highest bidder (gavel action)
- **Unsold** — mark the player as unsold (no bids or reserve not met)
- **Cancel** — cancel the current nomination

When a player is sold:
- The sale is recorded in `auction_results`
- The winning team's budget is reduced
- The player is added to their squad
- All connected clients see the update in real-time

### 8. Re-bidding

The auctioneer can re-bid a previously sold player, re-entering them into the auction.

## Database Tables

The auction system uses these key tables:

- **`leagues`** — auction configuration
- **`participants`** — teams/managers in a league
- **`team_members`** — user-to-team membership
- **`auction_nominations`** — current and historical player nominations
- **`auction_bids`** — individual bid records
- **`auction_results`** — completed sales
- **`team_formations`** — squad formation configuration

## Real-time Architecture

The auction system uses Supabase Realtime with the following channel naming:

| Channel | Purpose |
|---|---|
| `lobby-{id}` | Team membership updates in the lobby |
| `auctioneer-{id}` | Bid feed and timer state for auctioneer |
| `bid-{id}-{teamId}` | Bid updates specific to a team |
| `teams-hub-{id}` | New auction results for the teams view |
