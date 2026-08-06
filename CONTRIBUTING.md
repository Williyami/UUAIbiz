# Contributing

## Before you start

```bash
npm install
cp .env.example .env
npm run dev
```

If `npm run dev` throws about missing Supabase variables, that's the guard in
`src/integrations/supabase/client.ts` doing its job — fill in `.env` rather than
working around it.

## Branches

Branch off `main`. Name it by intent:

| Prefix | For |
|---|---|
| `feat/` | new functionality |
| `fix/` | bug fixes |
| `docs/` | documentation only |
| `chore/` | tooling, config, dependencies |
| `ci/` | workflow changes |

## Before opening a PR

```bash
npm run lint
npm run typecheck
npm run build
```

`npm run build` does **not** type-check — Vite strips types via esbuild rather than
verifying them. `npm run typecheck` is the one that catches real type errors, so
running only the build tells you less than it appears to.

## Migrations

Schema changes go in `supabase/migrations/` as a new timestamped file. Never edit a
migration that has already been applied — write a new one that alters the previous state.

**Migrations don't run as part of the Vercel deploy.** Push the migration before merging
code that depends on it. Getting this backwards breaks production in the gap between the
two, and the gap is however long it takes someone to notice.

If your PR includes a migration, say so in the description. That's what the checkbox in
the PR template is for.

## Permissions

Authorization is enforced by row-level security in Postgres, not by the UI. If you add a
table or a new query path, add the policy alongside it.

Test as **both** roles when touching anything permission-adjacent. A `viewer` who can't see
a button but can still hit the endpoint is not restricted — the database has to refuse it.

## Generated files

Don't hand-edit these; they're regenerated:

- `src/routeTree.gen.ts` — the router plugin writes it
- `src/integrations/supabase/types.ts` — generated from the database schema

## Style

Prettier and ESLint decide formatting. Run `npm run format` rather than arguing with them.

Match the surrounding code. Components use the shadcn primitives in `src/components/ui/`
— reach for an existing one before adding a dependency.

## Lovable

Commits on the connected branch sync into the [Lovable](https://lovable.dev) editor, so
keep it in a working state. Don't force-push, rebase or amend anything already pushed —
it rewrites history on Lovable's side and can lose project history.
