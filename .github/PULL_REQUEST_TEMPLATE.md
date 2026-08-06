## Summary

<!-- What changed, and why. -->

## Related issue

<!-- Closes #123 -->

## How it was tested

<!-- What you actually clicked through, not what you intended to. Note which role
     you tested as if the change is permission-sensitive. -->

## Checklist

- [ ] `npm run lint` and `npm run typecheck` pass
- [ ] Checked as both **viewer** and **editor**, if the change touches permissions
- [ ] **Includes a Supabase migration** — if so, say so here. Migrations do not run
      as part of the app deploy and have to be pushed separately, before the code
      that depends on them ships.
- [ ] Branch is in a working state (it syncs back into the Lovable editor)
