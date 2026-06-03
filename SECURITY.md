# Security Policy

Thank you for taking the time to report a vulnerability. This document explains how to report a security issue, what to expect, and what falls in and out of scope for this project.

## Supported Versions

Only the latest version of `master` receives security fixes. The codebase is fast-moving and a hobby-scale project, so older versions are not patched.

| Branch | Supported |
|---|---|
| `master` | Yes |
| `develop` | Yes (will ship in the next release) |
| Older releases | No |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security problems.** Public disclosure before a fix is available puts every deployed instance at risk.

Report privately through one of these channels, in order of preference:

1. **GitHub Security Advisories** — use [the repository's "Report a vulnerability"](../../security/advisories/new) button. This is the recommended channel: the report is private, only the maintainer sees it, and it sets up a clean disclosure thread when a fix is ready.
2. **Direct message to the maintainer** on GitHub if the Advisories flow is unavailable for any reason.

Please include as much of the following as you can:

- A clear description of the issue and the impact you believe it has.
- Steps to reproduce, ideally with a minimal proof-of-concept.
- The affected commit, branch, or version.
- The environment where you observed it (Vercel preview, local dev, a deployed instance).
- Any known workarounds.

If you can, please report in English. If not, get in touch in whatever language is comfortable and we'll work it out.

## What to Expect

This is a single-maintainer project maintained in the maintainer's free time. Realistic timelines:

- **Acknowledgement:** within 7 days of the report.
- **Triage and impact assessment:** within 14 days.
- **Fix and disclosure:** depends on severity and complexity. Critical issues are prioritised; lower-severity issues may be batched into the next regular release.

You will be kept in the loop. If the timeline slips for any reason, you will be told and given a revised estimate.

## Disclosure Process

The default flow is coordinated disclosure:

1. You report privately.
2. The maintainer confirms the issue, develops a fix, and prepares a release.
3. A new version is published and the change ships to the develop environment, then `master`.
4. Once a fix is released, a GitHub Security Advisory is published with full details and credit to the reporter (unless you ask to remain anonymous).

Please give a reasonable amount of time for a fix to be prepared and shipped before disclosing publicly. Holding back for up to 90 days from acknowledgement is standard and appreciated.

## Scope

Things that are in scope and worth reporting:

- Authentication, authorisation, or session handling in the Supabase-backed flows (RLS bypass, privilege escalation, leaked tokens, etc.).
- Auction logic that allows a participant to place bids they shouldn't be able to place (above remaining budget, in a paused nomination, after the timer expired, on behalf of another team, etc.).
- Realtime channel leaks where one participant can observe another league's data.
- Server-side request forgery, cross-site scripting, cross-site request forgery, or injection in the API routes under `app/api/`.
- Leaks of the publishable Supabase key, server-only environment variables, or any other secret.
- Anything in the deploy pipeline (Vercel, GitHub Actions) that could compromise a deployment.

## Out of Scope

- Issues in third-party services we do not control (Supabase, Vercel, the FPL API). Please report those to the upstream maintainer.
- Theoretical issues without a working proof of concept. If you believe something is exploitable, show the path.
- Rate-limiting or denial-of-service concerns against our own infrastructure. We rely on the platform providers for this.
- Missing security headers that have no demonstrated impact in our setup.
- Automated scanner output with no context.

## Security Notes for Contributors

If you are contributing code, keep these in mind:

- **Supabase Row-Level Security.** Any change that touches `app/auction/` or the database must be reviewed for RLS impact. If you add a new table, write an explicit RLS policy in the same migration.
- **No secrets in the repository.** Use environment variables. `.env.local` is git-ignored; do not commit it. Never hardcode Supabase service-role keys, API keys, or player image URLs that embed credentials.
- **Publishable vs. server-only keys.** The `NEXT_PUBLIC_SUPABASE_*` keys are publishable and safe to ship to the browser. Anything marked `server-only` must not be imported into a client component.
- **Input validation.** All API route handlers should validate input with a typed schema (e.g. `zod`) before touching the database.
- **No `dangerouslySetInnerHTML`, no `eval`, no `new Function`.** These will be rejected on review.
- **Dependencies.** A change that pulls in a new dependency must be justified in the PR description. Watch the `npm audit` output and SonarQube results in CI.

## Recognition

Researchers who report valid issues are credited in the published advisory unless they ask to remain anonymous. Thank you for helping keep FPL Auction Hub's users safe.
