# Development Guide

## Code Style

This project enforces strict TypeScript and ESLint rules:

- **TypeScript**: Strict mode with `noUncheckedIndexedAccess` and `noImplicitOverride`
- **ESLint**: Flat config (v9) with:
  - `@typescript-eslint/no-explicit-any` — no `any` type allowed
  - `@typescript-eslint/consistent-type-imports` — consistent `import type` syntax
  - `eslint-config-next` — Next.js recommended rules

### Pre-commit

Always run these before committing:

```bash
npm run type-check   # TypeScript compilation check
npm run lint         # ESLint
```

## Project Conventions

### React 19 with Compiler Opt-outs

TanStack Table v8 is incompatible with the React 19 Compiler. Pages using `useReactTable()` include the `"use no memo"` directive at the top of the file:

```typescript
"use no memo"
```

### Naming Conventions

- **Files**: `kebab-case.ts` for utility files, `PascalCase.tsx` for components
- **Routes**: Directory-based, following Next.js App Router conventions
- **Components**: PascalCase
- **Functions**: camelCase
- **Types/Interfaces**: PascalCase

### TypeScript Conventions

- Prefer `interface` over `type` for object shapes
- Use `type` for unions, intersections, and utility types
- Always use `import type` for type-only imports
- No `any` — use `unknown` if the type is truly unknown

## Component Patterns

### Client Components

Add `"use client"` for components that need:
- Browser APIs (event handlers, effects)
- State or context
- Real-time subscriptions

### Server Components

Default (no directive) for:
- Data fetching from Supabase
- Static content
- SEO-critical pages

### shadcn/ui Components

Custom components live in `components/ui/`. To add a new one:

```bash
npx shadcn@latest add button
```

This follows the `components.json` configuration.

## Real-time Development

For local real-time development with Supabase Realtime:

1. Ensure Realtime is enabled on the required tables in your Supabase dashboard
2. Use `supabase-realtime` channel subscriptions in client components
3. The channel naming convention is: `{context}-{leagueId}`

## Database Changes

When modifying the database schema:

1. Update the migration SQL
2. Regenerate TypeScript types using `supabase gen types typescript --linked > lib/database.types.ts`
3. Update this wiki if schema changes

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for semantic-release automation:

```
feat: add new feature
fix: fix a bug
chore: maintenance tasks
docs: documentation changes
refactor: code restructuring
style: formatting changes
test: adding tests
```

## Release Process

Releases are automated via GitHub Actions (`.github/workflows/release.yml`):

1. Push to `master` triggers the workflow
2. `semantic-release` analyzes commits
3. A new GitHub release is created
4. Version is bumped following semver
