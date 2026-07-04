# UUAIS Business Team — Internal Ops App

Internal tool for 3–8 team members: outreach CRM, events, tasks, team, resources, and a contract generator. Clean neutral UI with a single red (#C41E3A) accent.

## Phase 1 — Foundation (this build)

**Backend (Lovable Cloud / Supabase)**
- Enable Cloud, email/password auth (no public signup)
- Schema:
  - `profiles` (id → auth.users, name, email, avatar_url, must_change_password)
  - `user_roles` (user_id, role: admin|member) + `has_role()` security-definer fn
  - `companies`, `events`, `tasks`, `contracts`, `info_sections`, `contract_templates`
- RLS: all authenticated users read/write app data; only admins mutate `profiles`/`user_roles`/`contract_templates`/`info_sections`
- Trigger to auto-create profile on signup
- Server functions for admin actions (create team member with temp password, delete member, change role) using `supabaseAdmin` behind `requireSupabaseAuth` + admin role check

**Design system (src/styles.css)**
- Neutral palette: white bg, near-black text, subtle gray borders
- Single accent `--accent-red: oklch(...)` = #C41E3A used sparingly (primary buttons, active nav, key badges, logo)
- Status color tokens (planned/confirmed/completed/cancelled, etc.)
- Inter or similar clean sans; tight, professional spacing
- Sidebar layout shell with triangle logo mark (inline SVG matching uploaded logo)

**Auth flow**
- `/auth` login page (email/password only)
- `/auth/change-password` forced when `must_change_password = true`
- `_authenticated/` layout gates the app
- Root subscribes to `onAuthStateChange` to invalidate router/query

**Pages built in Phase 1**
1. **Dashboard** (`/`): stat cards (active outreach, upcoming events 30d, overdue tasks, semester revenue vs cost), next 5 events list, my tasks list
2. **Outreach** (`/outreach`): Kanban (dnd-kit) with status columns + table view toggle; company detail drawer with notes, linked events, "Generate contract" CTA; add/edit/assign

## Phase 2 (follow-up prompt)
Events page, Tasks page, Team management (admin), Info/Resources (accordion + rich text), Contract Generator (live preview + jsPDF export in EN/SV + history).

## Technical notes

- Stack: TanStack Start + Query, shadcn/ui, Tailwind v4, Supabase (via Lovable Cloud), dnd-kit for Kanban, date-fns for dates, jsPDF (Phase 2)
- Currency formatter: `sv-SE` locale → "7 000 SEK"
- No hardcoded roles — always check via `has_role()` RPC or `user_roles` join
- Contract & info template text stored in DB so admins can edit without redeploy
- Component structure: `src/components/{layout,dashboard,outreach,ui}`, server fns in `src/lib/*.functions.ts`

## Scope for this turn
Enable Cloud → schema + RLS + seed → design system + sidebar shell → auth (login + forced password change) → Dashboard → Outreach (Kanban + table + detail). Everything else in the next turn.
