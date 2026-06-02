# Deployment

## Deploying to Vercel (Recommended)

This project is optimized for [Vercel](https://vercel.com), the platform built by the creators of Next.js.

### Step 1: Push to GitHub

```bash
git add .
git commit -m "feat: initial commit"
git push origin master
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New > Project**
3. Import your `fpl-auction-hub` repository
4. Configure the project:

### Step 3: Environment Variables

Add these environment variables in Vercel's dashboard:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

### Step 4: Deploy

Click **Deploy**. Vercel will automatically:
- Install dependencies
- Build the project
- Deploy to a production URL

### Step 5: Configure Supabase Redirect URLs

In your Supabase dashboard under **Authentication > URL Configuration**:
- Add your Vercel deployment URL to Site URL (e.g., `https://fpl-auction-hub.vercel.app`)
- Add to Redirect URLs for auth callbacks

## Manual Deployment (Other Platforms)

### Build

```bash
npm run build
```

This creates an optimized production build in `.next/`.

### Start

```bash
npm run start
```

Runs the production server on port 3000 (default).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous API key |

## CI/CD

This project includes automated CI/CD via GitHub Actions:

- **Release workflow** (`.github/workflows/release.yml`)
  - Triggered on pushes to `master`
  - Runs `semantic-release` for automated versioning and changelogs
  - Follows Conventional Commits specification

## Monitoring

- **Vercel Analytics** — included via `@vercel/analytics`
- **Vercel Speed Insights** — included via `@vercel/speed-insights`
- **SonarCloud** — code quality analysis configured in `sonar-project.properties`
