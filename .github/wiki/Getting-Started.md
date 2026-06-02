# Getting Started

## Prerequisites

- **Node.js** 18.x or later
- **npm** (comes with Node.js)
- **Supabase** account ([sign up free](https://supabase.com))
- **Vercel** account (for deployment, optional for local development)

## Step 1: Clone the Repository

```bash
git clone https://github.com/ThishanTharuka/fpl-auction-hub.git
cd fpl-auction-hub
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Once created, go to **Project Settings > API** and copy:
   - `Project URL` (your `NEXT_PUBLIC_SUPABASE_URL`)
   - `anon public` key (your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

3. Set up the database tables by running the SQL from the `supabase/` directory (or manually creating the tables listed in the [Database Schema](Database) page).

4. Enable **Realtime** for these tables in the Supabase dashboard:
   - `auction_nominations`
   - `auction_bids`
   - `auction_results`
   - `team_members`

5. Configure **Authentication** in Supabase:
   - Enable **Email/Password** sign-in
   - Configure the Site URL to `http://localhost:3000` for local development

## Step 4: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Step 5: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint across the project |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run type-check` | Run TypeScript type checking |

## Next Steps

- Learn about the [Features](Features)
- Understand the [Auction System](Auction-System)
- Explore the [Architecture](Architecture)
