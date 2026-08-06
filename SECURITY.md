# Security

## Reporting

This is an internal project. Report anything security-relevant privately to the
repository owner — open a [security advisory](https://github.com/Williyami/uuaibiz/security/advisories/new)
rather than a public issue, so the details aren't visible while a fix is in progress.

## Credentials

The keys this project uses are not equally sensitive, and the difference matters.

| Variable | Exposure | If leaked |
|---|---|---|
| `VITE_SUPABASE_URL` | Ships in the client bundle | Not a secret |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Ships in the client bundle | Not a secret **provided RLS is enabled** |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | **Critical** — rotate immediately |
| `RESEND_API_KEY` | Server only | Rotate — allows sending mail as your domain |

Anything prefixed `VITE_` is inlined into the JavaScript served to browsers. Treat it as
published the moment it's built. Never give a `VITE_` name to something that must stay secret.

### The service role key

`SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security entirely. It is not "an admin key
with extra permissions" — it ignores every policy in the database and grants unrestricted
read, write and delete on every table.

It must never appear in:

- client-side code, or any file bundled by Vite
- committed files, **including markdown, plans, notes and setup instructions**
- issue bodies, PR descriptions, or screenshots

That third category is the one that actually catches people. A setup doc that pastes a real
key as an "example" is indistinguishable, to anyone who finds it, from the key itself.

## If a credential is committed

Deleting the file is not a fix. Git keeps the blob, and every existing clone keeps a working
copy. Anyone who has ever cloned the repo still holds a valid key.

1. **Rotate first.** Supabase dashboard → Settings → API → rotate. This is the step that
   actually revokes access; everything below is cleanup.
2. Update the key wherever it's consumed — local `.env` files, Vercel environment variables,
   any scripts that read it.
3. Remove it from the working tree and commit.
4. Optionally scrub history with `git filter-repo`. Note this rewrites published history,
   which conflicts with the Lovable sync constraint in the README — weigh it against the
   fact that step 1 has already made the old key useless.

Assume a committed key is compromised even if the repo is private. Private is not a
security boundary you should be relying on; it's a delay.

## Authorization

Access control is enforced in Postgres through row-level security, not in the React layer.
Hiding a button is a usability choice. A `viewer` who calls the API directly must still be
refused by the database — if that isn't true for some table, that's a bug worth reporting.
