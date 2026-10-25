# Project notes for AI agents

## Deployment stack (the real one)

- **Code:** GitHub `digitalhealthskomanagement-prog/skomoph_Construction_Monitoring`, branch `main`.
- **Hosting:** Vercel project `skomoph-construction-monitoring`. Every push to `main`
  deploys to production automatically, so keep `main` in a working state.
- **Database / Auth / Storage:** Supabase project **`fkfusxleqsupnlcxrcnr`**.
- **Sign-in:** Google OAuth only. User roles live in `public.user_roles` and are
  granted by a super_admin on `/admin/users`.

This project was remixed from a Lovable template. It is **not** connected to Lovable:
nothing syncs back to Lovable, and the old Lovable Supabase project
(`zfhdzasgostibilkslha`) is not used. `.lovable/` and `@lovable.dev/vite-tanstack-config`
are template leftovers; the Vite config package is still the build config, so do not
remove it without replacing it.

## Database migrations

Vercel does **not** run migrations. After adding a file under `supabase/migrations/`,
it must be applied to Supabase `fkfusxleqsupnlcxrcnr` by hand: paste it into the SQL
Editor (https://supabase.com/dashboard/project/fkfusxleqsupnlcxrcnr/sql/new) or run
`supabase db push` from a linked CLI. Always tell the user when this step is needed.

## Environment variables (set in Vercel, and in local `.env`)

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `SESSION_SECRET` (required, 32+ characters; the server refuses to start a session without it)

## Security model

- All writes go through server functions using the service-role client, which bypasses
  RLS. Browser clients (anon/authenticated) only have read access; `user_roles` and
  storage writes are closed to them. Do not add client-side write policies.
- Server functions must authorize with `getAuthContext()` (roles re-read from the DB
  on every call) and `verifyProjectAccess()` for project-scoped data.
- Never take a user id from the request payload; use the verified session or token.
