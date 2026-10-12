# Verification record

## Locally exercised

Final local checks: `pnpm lint`, `pnpm typecheck`, `pnpm test` (61 tests), and `pnpm build` passed. Client bundles contain no server-secret configuration references.

- Next.js production compile/build without live environment secrets.
- Strict TypeScript and ESLint (with official compatibility packages).
- PGlite executes the actual migrations with Supabase auth/storage bootstrap; pgcrypto extension creation is omitted because `gen_random_uuid` is available in the embedded Postgres runtime.
- Tests cover reserved slugs, integer prices, checkout metadata, state transitions, print resolution/cropping, generation serialization and round limits, payment event deduplication, fulfillment claims, creator RLS, denied anonymous access, durable rate limits, session capability/expiry, Stripe webhook handling, and Gelato payload/ambiguous failures.
- Read-only HTTP fixture confirms server rendering of marketing, storefront, upload, result and poster pages. The private generation API returns 403 without a capability cookie and 200 with the fixture capability.

## Not yet verified

- Browser visual/interaction suite: local downloaded Chromium crashes during launch (SIGSEGV); no connected computer-use browser is available. No screenshots or successful browser test run are claimed. The suite is included for CI/a working browser environment.
- Production magic-link email delivery (SMTP still unconfigured). The intended creator/admin account and demo ownership are provisioned.
- Actual OpenAI output, latency, subject/creator fidelity and print quality.
- Real Stripe Checkout/webhook delivery and external failure recovery.
- Gelato product UIDs, final production dimensions/bleed, order creation and delivery.
- Vercel production deployment and full acceptance journey.

The application must not be described as production-verified until the README acceptance gate is exercised with configured services and a print sample.

## Hosted Supabase follow-up

Project `pluto-store` (`twmdlqypwzpsehfnquii`) is provisioned, migrated and seeded. Remote database lint, signed upload/normalization/download, private source protection, temporary Auth sign-in/profile creation, and authenticated creator isolation passed. Temporary test data was removed and no emails were sent. See [Supabase setup](SUPABASE.md).
