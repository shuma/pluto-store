# Hosted Supabase setup

- Project: **pluto-store**
- Organization: **Pameer** (`yelling-peach-lark`)
- Region: **Stockholm** (`eu-north-1`)
- Project ref: `twmdlqypwzpsehfnquii`
- Dashboard: https://supabase.com/dashboard/project/twmdlqypwzpsehfnquii
- API URL: https://twmdlqypwzpsehfnquii.supabase.co

The repo is linked to this project. All three migrations and `supabase/seed.sql` have been applied. The three original reference illustrations have been uploaded. Generated database types are in `lib/supabase/database.types.ts`.

Connection values and a generated database password are saved in the ignored `.env.local` with owner-only filesystem permissions. CLI transient state under `supabase/.temp/` is ignored. No credentials are in this document.

## CLI commands

```sh
pnpm exec supabase migration list --linked
pnpm exec supabase db push --linked
pnpm exec supabase db lint --linked
pnpm exec supabase config push --project-ref twmdlqypwzpsehfnquii
pnpm exec supabase gen types typescript --linked --schema public > lib/supabase/database.types.ts
```

CLI is pinned to 2.72.7: version 2.117.0 failed at startup in this environment with an `AlreadyExists` error for the existing Supabase config directory. The pinned CLI completed provisioning, linking, migrations, configuration, lint and type generation. Recheck the newer release before updating.

## Authentication

- Email authentication enabled, public signup disabled globally.
- Anonymous sign-ins disabled.
- Email confirmation required.
- Existing default TOTP availability retained.
- Site URL: `https://pluto.store`.
- Allowed callbacks: `https://pluto.store/auth/callback`, `http://localhost:3000/auth/callback`.
- Production SMTP has not been supplied or tested. Hosted default email delivery limits still apply.

The requested creator account is provisioned and owns the `high-elf-club` demo store. Its user UUID is saved in `SEED_CREATOR_USER_ID` and `ADMIN_USER_IDS` in ignored `.env.local`. No invitation or sign-in email was sent during provisioning. Sign in through `/auth/login` using the account email. Copy `ADMIN_USER_IDS` to the deployment environment when deploying; local environment settings do not configure Vercel automatically. Without an owner UUID, `pnpm seed` only uploads demo reference artwork.

## Hosted verification completed

- All migrations present in remote history; remote DB lint reports no errors.
- Five buckets exist; only `creator-assets` is public.
- Real scoped signed upload via the app, server-side decoding/normalization, and signed download succeeded.
- Public source-image download and unauthenticated generation access were denied.
- Auth sign-in and automatic profile creation succeeded using a temporary test account.
- An authenticated creator could access their own creator row but could not read another creator or private generation sessions.
- The storefront rendered using hosted data.
- All temporary upload, session, auth and creator test records were removed; no emails were sent.

OpenAI, Stripe and Gelato credentials are still unconfigured. This setup does not establish that generation, payment or fulfillment has passed a live end-to-end test.
