# UUAIS Business Hub

Internal web app for running UUAIS's business operations — company outreach, contacts, meetings, events, tasks, contracts and idea tracking, in one place.

## Stack

| Layer    | Choice                                                    |
| -------- | --------------------------------------------------------- |
| Framework | [TanStack Start](https://tanstack.com/start) on Vite       |
| UI        | React, Tailwind CSS, [shadcn/ui](https://ui.shadcn.com)    |
| Backend   | [Supabase](https://supabase.com) — Postgres, auth, storage |
| Email     | [Resend](https://resend.com) for invites and resets        |
| Hosting   | Vercel                                                     |

## Getting started

Requires Node 20+.

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev
```

The dev server runs on http://localhost:5173.

### Environment

`.env.example` lists every variable. The `VITE_`-prefixed ones are inlined into the
client bundle at build time; the unprefixed ones are server-only and must never be
exposed to the browser.

| Variable                        | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| `VITE_SUPABASE_URL`             | Supabase project URL (client)                 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (client)        |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key — server only, never exposed |
| `RESEND_API_KEY`                | Transactional email                           |
| `APP_URL`                       | Base URL used to build links inside emails    |

The app throws on boot if the Supabase URL or publishable key is missing, so a blank
`.env` fails loudly rather than silently.

## Scripts

| Command             | Does                                |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Dev server with HMR                 |
| `npm run build`     | Production build                    |
| `npm run preview`   | Serve the production build locally  |
| `npm run lint`      | ESLint                              |
| `npm run format`    | Prettier, writes in place           |

## Project layout

```
src/
  routes/
    _authenticated/   signed-in app — dashboard, outreach, contacts, meetings, …
    auth.tsx          sign-in, password reset, profile setup
  components/         feature components, plus ui/ for shadcn primitives
  lib/                helpers and server functions (queries, email, stale logic)
  integrations/
    supabase/         client, auth middleware, generated types
supabase/
  migrations/         schema history, applied via the Supabase CLI
```

Routing is file-based — `src/routeTree.gen.ts` is generated, so don't edit it by hand.
Anything under `_authenticated/` sits behind the auth guard in `_authenticated/route.tsx`.

## Database

Schema changes are migrations in `supabase/migrations/`, applied with the Supabase CLI:

```bash
supabase db push
```

Migrations do **not** run as part of the app deploy — push them before shipping code
that depends on the new schema.

Access is role-based: `viewer` is read-only, `editor` can write. The rules are enforced
in Postgres via row-level security, not just in the UI.

## Lovable

This project is connected to [Lovable](https://lovable.dev). Commits pushed to the
connected branch sync back into the Lovable editor, so keep that branch in a working
state and avoid rewriting published history — force pushing or rebasing commits that
are already pushed will rewrite history on Lovable's side.
