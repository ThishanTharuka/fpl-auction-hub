# FPL Data Integration

FPL Auction Hub integrates with the [official Fantasy Premier League API](https://fantasy.premierleague.com/api/) to provide live player data, fixtures, and statistics.

## API Proxy Endpoints

All FPL API requests are proxied through Next.js API routes to avoid CORS issues and add player enrichment.

### GET /api/fpl/bootstrap

Fetches the complete bootstrap-static data and fixtures from the FPL API.

**Returns:**
- All players with enriched data:
  - `web_name`, `team`, `element_type` (position)
  - `now_cost` (converted to £m)
  - `total_points`, `form`, `points_per_game`
  - ICT index (influence, creativity, threat)
  - Expected stats (xG, xA, xGI, xGC)
  - Season stats (goals, assists, clean sheets, saves, etc.)
  - `selected_by_percent`, `status`
  - Player photo URL, team crest URL
  - Average FDR for next 5 gameweeks
- All teams (name, short name, strength, crest URL)
- All elements (positions)

**Caching:** Force-dynamic (always fetches fresh data)

### GET /api/fpl/fixtures

Fetches all fixtures and computes per-team FDR (Fixture Difficulty Rating) for the next 5 gameweeks.

**Returns:**
- All fixtures with team names
- Per-team FDR averages for next 5 GWs

**Caching:** ISR with 1-hour revalidation

### GET /api/fpl/player/[id]

Fetches the element-summary for a single player.

**Returns:**
- Match history (past fixtures with points)
- Upcoming fixtures

**Caching:** ISR with 1-hour revalidation

## Data Enrichment

The bootstrap endpoint enriches raw FPL API data:

```typescript
// Enriched player type (lib/fpl-types.ts)
interface EnrichedPlayer {
  id: number
  web_name: string
  team_name: string
  team_short_name: string
  element_type: 'GKP' | 'DEF' | 'MID' | 'FWD'
  now_cost: number        // in £m
  total_points: number
  form: number
  // ... and more
}
```

## Player Stats Display

The `PlayerStatsBar` component (`components/player-stats-bar.tsx`) renders position-aware stat sets:

| Position | Primary Stats |
|---|---|
| GKP | saves, penalties_saved, xGC, goals_conceded, clean_sheets |
| DEF | clean_sheets, goals_conceded, xGC, goals_scored, assists |
| MID | goals_scored, assists, creativity, xGI, xA |
| FWD | goals_scored, xG, threat, assists, xGI |

## Weighted Index Calculator

The index builder (`lib/index-calculator.ts`) uses min-max normalization to compute a weighted score:

```
normalized = (value - min) / (max - min)
inverted  = 1 - normalized  (for stats where lower is better)
weighted  = normalized * weight

final_score = sum of all weighted values
```

Metrics with inverted scoring (lower is better):
- `expected_goals_conceded` (xGC)
- `goals_conceded`
- `fdr_avg` (Fixture Difficulty Rating)
