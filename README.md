<div align="center">

# UUAIS Business Hub

**Outreach, contacts, meetings, events, tasks and contracts — one internal workspace.**

[![TanStack Start](https://img.shields.io/badge/TanStack_Start-EF4444?style=for-the-badge&logo=react&logoColor=white)](https://tanstack.com/start)
[![React](https://img.shields.io/badge/React_19-087EA4?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)

[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![CI](https://github.com/Williyami/uuaibiz/actions/workflows/ci.yml/badge.svg)](https://github.com/Williyami/uuaibiz/actions/workflows/ci.yml)

</div>

---

## What it does

| | Module | Purpose |
|---|---|---|
| 🎯 | **Outreach** | Company pipeline as a kanban board or table, with industry and status tagging, and stale-deal flagging |
| 👥 | **Contacts** | People attached to companies, with titles and LinkedIn links |
| 📅 | **Meetings** | Internal and external meetings, with time, attendees and `.ics` export |
| 🗓️ | **Events** | Event planning with per-event checklists and grouped status filtering |
| ✅ | **Tasks** | Personal and shared task tracking with multiple assignees |
| 📄 | **Contracts** | Contract records generated from reusable templates, exportable to PDF |
| 💡 | **Ideas** | Idea board with likes and threaded comments |
| 💬 | **Chat** | Lightweight in-app team chat |
| 📊 | **Dashboard** | Cross-module overview with visit tracking |

---

## Architecture

```mermaid
flowchart TB
    subgraph client["🖥️  Browser"]
        UI["React 19 + Tailwind<br/>shadcn/ui components"]
        RT["TanStack Router<br/><i>file-based routes</i>"]
        RQ["TanStack Query<br/><i>cache + invalidation</i>"]
    end

    subgraph edge["▲  Vercel"]
        SSR["TanStack Start<br/>SSR + server functions"]
        MW["Auth middleware<br/><i>attaches session</i>"]
    end

    subgraph supa["⚡  Supabase"]
        PG[("Postgres<br/><b>RLS enforced</b>")]
        AUTH["Auth"]
        STORE["Storage<br/><i>avatars</i>"]
    end

    RESEND["✉️  Resend<br/><i>invites, resets</i>"]

    UI --> RT --> RQ
    RQ -->|"server fn call"| SSR
    SSR --> MW
    MW --> PG
    MW --> AUTH
    UI -.->|"direct client"| PG
    UI -.-> STORE
    SSR --> RESEND

    classDef c fill:#087EA4,stroke:#054e63,color:#fff
    classDef e fill:#333,stroke:#000,color:#fff
    classDef s fill:#3FCF8E,stroke:#1b7a4d,color:#000
    classDef m fill:#f59e0b,stroke:#a16207,color:#000
    class UI,RT,RQ c
    class SSR,MW e
    class PG,AUTH,STORE s
    class RESEND m
```

> [!IMPORTANT]
> Authorization lives in **Postgres**, not the UI. Row-level security decides what
> each role can read and write — hiding a button is a convenience, never the control.

---

## Data model

```mermaid
erDiagram
    profiles     ||--o{ user_roles    : "has"
    profiles     ||--o{ tasks         : "assigned"
    profiles     ||--o{ notifications : "receives"
    companies    ||--o{ contacts      : "employs"
    companies    ||--o{ meetings      : "subject of"
    companies    ||--o{ contracts     : "party to"
    contract_templates ||--o{ contracts : "generates"
    events       ||--o{ tasks         : "breaks into"
    board_posts  ||--o{ idea_comments : "receives"
    board_posts  ||--o{ idea_likes    : "receives"
    profiles     ||--o{ chat_messages : "writes"
    profiles     ||--o{ user_visits   : "logs"

    companies {
        uuid id PK
        text name
        text industry
        text status "pipeline stage"
        bool established_partner
        timestamptz last_contacted "drives stale flag"
    }
    profiles {
        uuid id PK
        text full_name
        text avatar_url
    }
    user_roles {
        uuid user_id FK
        enum role "viewer | editor"
    }
```

**Roles**

| Role | Read | Write | Notes |
|---|:---:|:---:|---|
| `viewer` | ✅ | ❌ | Default for newly approved accounts |
| `editor` | ✅ | ✅ | Granted explicitly via `user_roles` |

New sign-ups land in `access_requests` and stay inert until approved.

---

## Quick start

> Requires **Node 20+**

```bash
npm install
cp .env.example .env        # fill in the values below
npm run dev                 # → http://localhost:5173
```

### Environment

`VITE_`-prefixed variables are **inlined into the client bundle** at build time.
Everything else is server-only.

| Variable | Scope | Purpose |
|---|:---:|---|
| `VITE_SUPABASE_URL` | 🌐 client | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 🌐 client | Anon key — public by design, safe only because RLS is on |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 server | **Bypasses RLS entirely.** Never expose, never commit |
| `RESEND_API_KEY` | 🔒 server | Transactional email |
| `APP_URL` | 🔒 server | Base URL for links inside emails |

> [!WARNING]
> `SUPABASE_SERVICE_ROLE_KEY` is a master key — it ignores every RLS policy you have.
> If it ever lands in a commit, rotate it in the Supabase dashboard. Deleting the file
> is not enough; the key stays valid in every existing clone.

The app throws on boot when the Supabase URL or publishable key is missing, so a blank
`.env` fails loudly instead of silently rendering an empty shell.

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` — Vite strips types, it doesn't check them |
| `npm run format` | Prettier, writes in place |

---

## Layout

```
src/
├── routes/
│   ├── _authenticated/      🔐 signed-in app — guarded by route.tsx
│   │   ├── dashboard.tsx        outreach · contacts · meetings
│   │   ├── events_.$eventId.tsx events · tasks · contracts
│   │   └── ideas.tsx            ideas · chat · team · settings
│   ├── auth.tsx             sign-in, reset, profile setup
│   └── __root.tsx           shell, providers, error boundary
├── components/
│   ├── outreach/            kanban, company table, stale badge
│   ├── events/  meetings/   feature dialogs
│   └── ui/                  shadcn primitives
├── lib/                     server functions, queries, formatting, ics, pdf
└── integrations/supabase/   client, auth middleware, generated types

supabase/migrations/         schema history — applied separately from deploys
```

> [!NOTE]
> `src/routeTree.gen.ts` is generated by the router plugin. Don't hand-edit it.

---

## Database changes

Schema lives in `supabase/migrations/`, applied with the Supabase CLI:

```bash
supabase db push
```

> [!CAUTION]
> Migrations **do not** run as part of the Vercel deploy. Push the migration *before*
> shipping code that depends on it, or production breaks in the window between the two.

---
