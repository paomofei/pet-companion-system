# AGENTS.md

## Scope

This file defines practical guardrails for this repository (solo, fast iteration, stable quality).

## Environment Baseline

- Node.js: `22.x` (or `>=20 <23`)
- Package manager: `npm`
- Install dependencies: `npm ci`

## Working Rules

- Keep diffs small and reviewable.
- Never expose secrets, tokens, or environment variable values in code or logs.
- Prefer type-safe and explicit error handling changes.
- Update tests when behavior changes.

## Verification Policy

For runtime, API, or domain changes, run the fast path first:

1. `npm run check:fast`

Before merge or release, run full verification:

1. `npm run check:full`

## Docs-Only Exception

If changes are docs-only (`docs/**`, `*.md`), you can skip full verification and only keep consistency checks.

## Timeout Triage

If checks are slow or appear stuck:

1. Confirm Node version matches `.nvmrc`.
2. Run `check:fast` before `check:full`.
3. Verify `lint` and `typecheck` work independently.
