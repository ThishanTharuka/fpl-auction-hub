# Database Schema

FPL Auction Hub uses **Supabase PostgreSQL** with 7 main tables. The full TypeScript types are in `lib/database.types.ts`.

## Entity Relationship

```
leagues
  ├── participants
  │     ├── team_members (join table with users)
  │     ├── auction_bids
  │     ├── auction_results
  │     └── team_formations
  │
leagues
  └── auction_nominations
        └── auction_bids
```

## Tables

### leagues

Auction league configuration.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Primary key |
| `name` | `text` | League display name |
| `budget_per_team` | `numeric` | Starting budget per team |
| `timer_seconds` | `integer` | Countdown duration |
| `bid_increment` | `numeric` | Minimum bid increment |
| `base_price_gkp` | `numeric` | Base price for goalkeepers |
| `base_price_def` | `numeric` | Base price for defenders |
| `base_price_mid` | `numeric` | Base price for midfielders |
| `base_price_fwd` | `numeric` | Base price for forwards |
| `max_per_club` | `integer` | Max players from one FPL club |
| `room_password` | `text` | Optional room password |
| `squad_size` | `integer` | Max squad size |
| `status` | `text` | `setup`, `active`, `completed` |
| `created_at` | `timestamptz` | Creation timestamp |

### participants

Teams in a league.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Primary key |
| `league_id` | `uuid` FK → leagues | Parent league |
| `name` | `text` | Team name |
| `color` | `text` | Team display color |
| `user_id` | `uuid` | Supabase Auth user ID |
| `created_at` | `timestamptz` | Creation timestamp |

### team_members

Mapping between users and teams with approval workflow.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Primary key |
| `league_id` | `uuid` FK → leagues | League |
| `participant_id` | `uuid` FK → participants | Team |
| `user_id` | `uuid` | Supabase Auth user ID |
| `user_email` | `text` | User's email |
| `user_name` | `text` | User's display name |
| `status` | `text` | `pending`, `approved`, `rejected` |
| `created_at` | `timestamptz` | Creation timestamp |

### auction_nominations

Active and historical player nominations.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Primary key |
| `league_id` | `uuid` FK → leagues | League |
| `fpl_player_id` | `integer` | FPL API player ID |
| `player_name` | `text` | Player display name |
| `player_team` | `text` | FPL club name |
| `position` | `text` | `GKP`, `DEF`, `MID`, `FWD` |
| `starting_price` | `numeric` | Initial bid price |
| `current_bid` | `numeric` | Current highest bid |
| `current_bidder_id` | `uuid` | Highest bidder's participant ID |
| `current_bidder_name` | `text` | Highest bidder's display name |
| `bid_end_time` | `timestamptz` | Timer expiration |
| `is_paused` | `boolean` | Whether timer is paused |
| `paused_seconds` | `integer` | Seconds remaining when paused |
| `status` | `text` | `open`, `sold`, `cancelled`, `unsold` |
| `winning_participant_id` | `uuid` | Winner (if sold) |
| `winning_price` | `numeric` | Final price (if sold) |
| `created_at` | `timestamptz` | Creation timestamp |

### auction_bids

Individual bid records.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Primary key |
| `nomination_id` | `uuid` FK → auction_nominations | Parent nomination |
| `participant_id` | `uuid` FK → participants | Bidding team |
| `participant_name` | `text` | Bidding team name |
| `amount` | `numeric` | Bid amount |
| `created_at` | `timestamptz` | Timestamp |

### auction_results

Completed player sales.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Primary key |
| `league_id` | `uuid` FK → leagues | League |
| `participant_id` | `uuid` FK → participants | Buying team |
| `fpl_player_id` | `integer` | FPL API player ID |
| `price_paid` | `numeric` | Winning bid |
| `position_slot` | `text` | Assigned position |
| `player_name` | `text` | Player name |
| `player_team` | `text` | FPL club |
| `created_at` | `timestamptz` | Timestamp |

### team_formations

Squad formation configuration.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Primary key |
| `participant_id` | `uuid` FK → participants | Team |
| `formation` | `jsonb` | Formation data (player positions) |
| `updated_at` | `timestamptz` | Last update timestamp |

## Realtime Configuration

Enable Realtime on these tables in the Supabase dashboard for live auction functionality:

- `auction_nominations`
- `auction_bids`
- `auction_results`
- `team_members`
