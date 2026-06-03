# Contributing to FPL Auction Hub

Thanks for your interest in contributing. This document covers how to get set up, what the project expects from your code, and how to get a pull request merged.

## Project Overview

FPL Auction Hub is a Fantasy Premier League auction tool with live bidding, squad management, and a weighted player index builder.

- **Framework:** Next.js 16 (App Router) on React 19
- **Backend:** Supabase (PostgreSQL, RLS, Realtime channels, Auth)
- **UI:** shadcn/ui on Tailwind CSS v4, TanStack Table v8 for data grids
- **Language:** TypeScript in strict mode with `noUncheckedIndexedAccess`
- **Quality:** ESLint (no `any`, consistent type imports, no `console`/`alert`) and SonarQube
- **Releases:** Fully automated via `semantic-release` on `master`, driven by Conventional Commits. All changes land on `develop` first and are promoted to `master` only after testing.

See `README.md` for the full page map and `AGENTS.md` for an important note about the Next.js version in use.

## Ground Rules

- All new code must pass `npm run lint` and `npm run type-check` with zero errors.
- Match the existing code style. Read one or two neighbouring files before writing yours.
- Don't introduce new dependencies without a clear justification in the PR description.
- Don't commit secrets, `.env.local`, or build artefacts (`node_modules`, `.next`).
- Be respectful. The [Code of Conduct](./CODE_OF_CONDUCT.md) applies to every interaction.

## Reporting Bugs

Open a [bug report](../../issues/new?template=bug_report.md). Include reproduction steps, expected vs. actual behaviour, browser/OS, and screenshots where relevant. Check existing issues first to avoid duplicates.

## Suggesting Features

Open a [feature request](../../issues/new?template=feature_request.md). Describe the problem, the proposed solution, and any alternatives you've considered. Large features are better discussed before code is written — open an issue first.

## Development Setup

1. **Fork and clone**

   ```bash
   git clone https://github.com/<you>/fpl-auction-hub.git
   cd fpl-auction-hub
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project settings. You'll need your own Supabase project to run the auction features locally; the public FPL data table works without one.

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   The app runs at <http://localhost:3000>.

5. **Create a branch**

   ```bash
   git checkout -b feat/short-description
   ```

   Branch prefixes: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`, `style/`.

## Code Standards

These are enforced by ESLint and `tsc`. Run them locally before pushing:

```bash
npm run lint
npm run type-check
```

Key rules to be aware of:

- **No `any`.** Use `unknown` and narrow it, or define a proper type.
- **Type-only imports.** Use `import type { Foo } from "..."` or the inline `import { type Foo }` form.
- **No `console.log`.** `console.warn` and `console.error` are allowed.
- **No `alert`.** Use the UI components.
- **Strict mode.** `strict`, `noUncheckedIndexedAccess`, and `noImplicitOverride` are on — code that doesn't satisfy them will not compile.
- **Reactive state, not manual DOM.** Use React state and refs.
- **Database changes go through migrations.** Anything that touches Supabase must come with an explicit migration and a note about the affected RLS policies.

> **Next.js 16 note:** This is not the Next.js from older training data. Read the relevant guide under `node_modules/next/dist/docs/` before adding new patterns. Heed deprecation notices.

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) because `semantic-release` reads them to determine version bumps and to generate the changelog.

Format:

```
<type>(<scope>): <short summary>

<body — what and why, not how>

<footer — e.g. Closes #123, BREAKING CHANGE: ...>
```

Common types:

- `feat` — a new feature (minor release)
- `fix` — a bug fix (patch release)
- `refactor` — code change that neither fixes a bug nor adds a feature
- `docs` — documentation only
- `chore` — maintenance, CI, build, dependencies
- `style` — formatting only, no code change
- `perf` — performance improvement
- `test` — adding or fixing tests

Breaking changes must include a `BREAKING CHANGE:` footer (major release).

## Branching Workflow

The repository uses a two-branch flow:

- **`develop`** — the integration branch. All work lands here first.
- **`master`** — the release branch. Only updated from `develop` once the changes have been validated in the develop environment.

Typical flow:

```
feature branch ──PR──▶ develop ──(tested)──▶ master ──(semantic-release)──▶ release
```

PRs are never opened directly against `master` from a feature branch.

## Pull Requests

1. Push your branch and open a PR against **`develop`**.
2. Fill in the PR template (`.github/PULL_REQUEST_TEMPLATE.md`). Unchecked boxes will delay review.
3. Make sure CI is green — `lint`, `type-check`, and the build must pass.
4. Keep PRs focused. One concern per PR. Large refactors should be split.
5. Expect review. The maintainer may ask for changes before merging.
6. Squash or rebase before merge if your history is noisy.
7. After the PR is merged to `develop`, the change is deployed to the develop environment and tested.
8. Once the develop environment is green, `develop` is merged into `master` and the release workflow runs.

## Testing Your Changes

There is no formal test suite yet. Verify your changes manually:

- `npm run dev` and walk through the affected pages (lobby, auctioneer, bidder, teams, index builder).
- For DB-touching changes, run through the full auction flow in two browser windows — one as the auctioneer, one as a bidder.
- If you're changing realtime behaviour, open three+ tabs to confirm broadcasts fire correctly.

## Project Structure

```
app/                Next.js App Router pages and route handlers
  api/              Server-side API routes
  auction/          Auction lobby, session, auctioneer, bid, teams views
  index-builder/    Weighted scoring index builder
  players/          FPL players data table
components/         Shared UI components
lib/                Supabase clients, FPL types, shared utilities
.github/            Issue and PR templates, workflows
```

## Release Process

Releases follow a two-stage flow. The develop environment is the source of truth for what has been validated; `master` only receives changes that have already been tested there.

1. PRs land on `develop` and are deployed to the develop environment.
2. Changes are validated in the develop environment (manual smoke tests, auction flow with multiple browser sessions, realtime behaviour checks, etc.).
3. Once the develop environment is stable, `develop` is merged into `master`.
4. The merge to `master` triggers the `release.yml` workflow, which runs `semantic-release`:
   - `fix:` commits → patch release (1.4.0 → 1.4.1)
   - `feat:` commits → minor release (1.4.0 → 1.5.0)
   - Commits with `BREAKING CHANGE:` → major release (1.4.0 → 2.0.0)
   - Other types are documented in the changelog but don't bump the version.

`CHANGELOG.md` and the GitHub release are generated automatically. Don't edit them by hand. Don't open release PRs against `master` directly — go through `develop`.

## Getting Help

- Open an issue for bugs and feature requests.
- Use PR comments for questions about a specific change.
- Be patient. This is maintained in the maintainer's free time.

## License

By contributing, you agree that your contributions will be licensed under the same licence as the project.
