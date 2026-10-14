# pluto-store

A narrow creator-commerce MVP: **Store → Upload → Transform → Choose → Poster → Checkout → Fulfillment**.

Next.js 16 App Router, React, strict TypeScript, Tailwind, shadcn primitives, Supabase, OpenAI image editing, Stripe Checkout and Gelato. Customer accounts, carts, payouts and the wider creator platform are intentionally outside scope.

## Status

Implemented locally with migrations, automated domain/Postgres tests, and browser smoke tests. **Not deployed or verified with live provider credentials.** The production acceptance journey remains a launch gate. There is no fake generation/payment success mode in the application.

## Configured Supabase project

The hosted **pluto-store** project is now provisioned in Pameer / Stockholm, linked to this repo, migrated and seeded. Local connection values are in ignored `.env.local`. Hosted upload/privacy and Auth/RLS checks passed. Creator ownership and local admin access are provisioned; production SMTP and other provider credentials remain unconfigured. See [hosted setup details](docs/SUPABASE.md).

## Quick start

Use Node 24 LTS (the repo contains `.nvmrc`) and pnpm.

```sh
nvm use
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

The landing page works without service credentials. Storefronts and the transaction flow require a configured, seeded Supabase project. Put secrets in `.env.local` or Vercel environment settings, never in source control or browser code.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
# Browser tests use a read-only Supabase HTTP fixture, never live services:
pnpm exec playwright install chromium
pnpm test:browser
```

TypeScript 7 provides `tsc`; the official TypeScript 6 compatibility package provides the compiler API needed by Next/ESLint. `@eslint/compat` bridges Next's transitive plugins to ESLint 10. Current transitive plugin peer ranges still warn about ESLint 10; lint is explicitly verified. Versions are pinned by `pnpm-lock.yaml`.

## Supabase setup

1. Create a Supabase project and copy its URL, publishable key, and service-role key to `.env.local`.
2. Run all files in `supabase/migrations/` in filename order using Supabase's SQL editor. Alternatively initialize/link the Supabase CLI and run `supabase db push`. These migrations target Supabase (its `auth` and `storage` schemas must exist).
3. Run `supabase/seed.sql` **in development only**. It creates the High Elf Club Demo and A3/A2 products. No real High Elf Club artwork is used; original SVG assets and their license are under `public/demo/`.
4. Create/confirm the first creator in **Authentication → Users**. Set their UUID as `SEED_CREATOR_USER_ID`, then run `pnpm seed` to attach the demo creator and upload its original reference assets.
5. Set `ADMIN_USER_IDS` to a comma-separated list of trusted operator UUIDs.
6. Set Auth Site URL to the application origin. Add `http://localhost:3000/auth/callback` and the production callback URL to allowed redirects. Configure production SMTP. Keep public signup disabled; creator accounts are provisioned by an operator. Magic-link login uses `shouldCreateUser: false`.
7. Set a cryptographically random `RATE_LIMIT_SALT` (for example generate with `openssl rand -hex 32`).

### Signing in during development

Set `DEV_AUTH_USER_ID` to a Supabase user UUID and every request is treated as that user, skipping the magic-link round trip. Use the same id as `SEED_CREATOR_USER_ID` so `ownedStore()` finds a store. `DEV_AUTH_EMAIL` sets the address shown in the sidebar.

The bypass requires both `NODE_ENV=development` and the variable, so it is never on by default. Because Next inlines `NODE_ENV` at build time, `next build` eliminates the branch entirely — no production chunk references it. The server logs a warning once per process while it is active.

Public storefront data is loaded server-side. Customer source and artwork access requires a 256-bit browser capability in an HttpOnly, SameSite cookie, hashed in the database. Session IDs alone do not grant access. Anonymous users have no table permissions. RLS restricts creator access; order/payment writes are server-only.

### Storage

Migrations create `creator-assets` (public marketing assets), `creator-reference-images`, `customer-uploads`, `generated-artworks`, and `print-files` (private).

10 MB uploads go directly to scoped signed Supabase upload URLs to avoid Vercel's request body limit. The server checks decoded format and dimensions, rejects animated/oversized input, strips metadata, and saves a normalized JPEG before generation. Bucket permissions do not allow arbitrary anonymous writes. Signed previews expire in 15 minutes; Gelato gets a seven-day print link; admin download links expire in one minute.

## AI provider

Set `OPENAI_API_KEY` and ensure the project can call the configured image editing endpoint. `OPENAI_IMAGE_MODEL` defaults to `gpt-image-2.5-sunburst` and `OPENAI_IMAGE_SIZE` to `1696x2400` — A3 at exactly 144 DPI. Canvas size drives how the artwork reads: at 2416x3424 the model spends the extra pixels on photographic micro-detail and the result looks like a filtered photograph, while at roughly 1700px wide the creator's marks stay proportionally large and read as a drawn medium. Measured with identical prompt and references; see the print section for the A2 consequence. `input_fidelity` is not sent: the API rejects it for this model.

Output settings are tunable so reference fidelity can be measured rather than guessed. `OPENAI_IMAGE_QUALITY` defaults to `xhigh` (`low`, `medium`, `high`, `xhigh`, `max`, `auto`); higher quality preserves more reference detail and costs more. `OPENAI_MAX_REFERENCE_IMAGES` caps how many references are sent (the endpoint takes 16 images including the photograph). `input_fidelity` is not sent: the API rejects it for this model.

The prompt is fixed and contains no style vocabulary. It names the photograph the SUBJECT IMAGE and the creator artwork the STYLE REFERENCE IMAGES, and asks the model to infer the visual language from the references: the references define how the artwork looks, the photograph defines what appears in it. There is no creator-written style direction — a written palette competes with the reference artwork and wins. The photograph's background is treated as visual treatment rather than content: the artwork takes the background treatment of the references, so creators whose work sits on plain grounds get plain grounds instead of the incidental surroundings of a snapshot. A store with no reference images cannot generate.

`pnpm compare:images -- --source photo.jpg --store <slug>` renders the same photograph through those variants into `tmp/image-variants/`, with the prompt used beside each PNG. `--store` pulls the creator's references and direction from Supabase; `--refs ./dir` uses local files instead. `--quality`, `--size`, `--refs-limit` and `--input-fidelity` run a single ad-hoc variant. It bills real generations.

The first input is the photograph, followed by the authorized creator references (1-8). Source recognition and creator-approved rendering are combined inside `lib/ai/providers/openai.ts`; customer instructions are never accepted. The provider interface has no OpenAI dependencies.

A DB transaction claims each round. Three alternatives run concurrently under a 240-second provider timeout and a 300-second Vercel function deadline using Next `after`. There are no automatic billable provider retries. Refreshing the results page polls persisted state. A killed process leaves a running round visible to operations; after ten minutes it can be marked failed by the next claim, consuming the original round. The remaining round can then be used. Partial successful artwork remains selectable.

Defaults: 3 alternatives, 2 rounds/session, 5 uploads/IP/hour, global budget of 100 round-start requests/day. Limits live in Postgres, not instance memory. In production rely on Vercel's trusted forwarding header, enable platform WAF/rate limits, and set a provider spend cap. The daily budget conservatively counts repeated start attempts too.

No AI chat UI or Vercel AI SDK is needed for this dedicated image-edit adapter. Add another implementation of `ImageTransformProvider` if the backend changes.

## Products and print quality

Print files are center-cropped to the product ratio and may be enlarged up to `MAX_PRINT_UPSCALE` (default 1.5x) to reach `MIN_PRINT_DPI`; beyond that the order is refused with `insufficient_print_resolution`. A2 at 144 DPI needs 2382x3368, so the 1696x2400 canvas is enlarged about 1.40x for that product and not at all for A3. The enlargement is safe here because these renders carry drawn marks rather than fine photographic detail — raise the generation size instead if you move to a style that does.

Development prices: A3 399 SEK; A2 599 SEK. The database is authoritative; the UI never supplies a price. These are sample launch prices, **not validated unit economics**. Shipping is included in the product price; quantity is always one. Launch shipping country is `SE`. Configure actual tax treatment and merchant details in Stripe for the launch jurisdiction; there is no custom tax engine.

Each store sells in one currency, US dollars (the default) or Swedish kronor, chosen on its Products page. Products keep the currency they were priced in, and only those in the store's currency are sold; switching currency asks the creator to set new prices rather than converting them.

Original generated artwork, compressed web preview, and order-specific print file are separate objects. `prepare-print-file.ts` centers a crop to the selected product dimensions, never stretches or upscales, and checks effective resolution **before checkout**. The default 144 DPI minimum accommodates A2 from the current practical output ceiling; it is a Pluto threshold, not a Gelato guarantee. For a higher DPI launch requirement, smaller prints or higher source resolution are needed. Do not lower the threshold to bypass a failed test print.

A3/A2 dimensions in seed data are trim sizes. Confirm the selected Gelato SKU's exact print area/bleed requirements and order a sample. Adjust the preparation config/product dimensions if the SKU requires bleed before enabling automatic fulfillment.

## Stripe Checkout

Set Stripe secret key and webhook signing secret from the same test/live environment. Set the public app URL to the exact origin. No client Stripe SDK is necessary for hosted Checkout; the public key is reserved for future Stripe UI use.

```sh
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Put the printed whsec_... secret in .env.local, restart pnpm dev.
```

Use the application's real checkout path and Stripe's test card `4242 4242 4242 4242`, a future expiry and any valid CVC. A generic `stripe trigger checkout.session.completed` does not contain a real Pluto order/session and is expected to fail validation.

Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. The webhook verifies the raw body signature, checks paid status, validates shipping, and commits the payment transition and event receipt atomically. Redirects only display DB state and never mark orders paid.

An order is inserted before Stripe is contacted. A unique session/artwork/product constraint deduplicates concurrent checkout clicks. Stripe uses an order/attempt idempotency key; expired sessions can start another attempt. Immutable product and print snapshots protect an existing order from later price/product edits. No automatic duplicate order is created for a paid selection.

Enable Stripe customer payment receipts and configure the merchant support contact. The confirmation page has a bookmarkable order reference but requires the original browser cookie; no email-access-link feature is implemented.

## Fulfillment

### Manual (default, launchable)

Set `FULFILLMENT_MODE=manual`. Successful payments enter `manual` status. `/dashboard/income` shows a creator's revenue and orders. `/admin` shows all creators, recent orders, failed/running rounds, shipping details, and print downloads. Operators download the actual print file, place the production order, and mark it fulfilled. Creators cannot change payment or fulfillment state. Public example artwork can be explicitly uploaded from the reference-images page; it is stored separately from private references.

### Gelato

Set `FULFILLMENT_MODE=gelato` and `GELATO_API_KEY`. Creators build their own catalog at `/dashboard/store/products`: they browse Gelato's posters and framed posters (Product API, `GELATO_PRODUCT_API_BASE_URL`), and each product they add stores its Gelato `productUid`, size and their price. A store needs at least one active product to go live. Products migrated from the old global A3/A2 defaults have no `gelato_product_uid` and are fulfilled by hand until replaced. The adapter uses `https://order.gelatoapis.com/v4/orders` and an internal order reference. Keep `GELATO_ORDER_TYPE=draft` for initial integration checks: draft orders **do not go to production**. Switch to `order` only after confirming the SKU, address, charges, print area and sample quality. Do not assume a separate sandbox endpoint exists for your account.

A conditional DB claim allows one submission. Definitive rejections become `fulfillment_failed` and can be retried by an admin. Network timeouts, ambiguous server responses and persistence failures after acceptance become `needs_review`. Payment stays paid.

**Never blindly retry `needs_review` or a stale `submitting` state.** In Gelato, search the Pluto order UUID used as `orderReferenceId`. If found, record the provider ID/status and set `submitted` in Supabase; if positively confirmed absent, reset to `fulfillment_failed` and use Retry. Keep an operational note of the reconciliation. The application deliberately offers no one-click reset that could submit a duplicate. There is no assumed Gelato idempotency-header guarantee.

Fulfillment webhooks/tracking sync are outside this wedge: the adapter saves submission response/status, and operators mark final fulfillment after confirmation. Monitor paid `pending`, failed, needs-review and stale submitting orders. A webhook replay retries `pending` work if a previous process died before submission.

## Retention and privacy operations

`source_delete_after`, session `expires_at`, artwork `delete_after`, source/preview/original paths and order print paths support cleanup. **No automatic deletion scheduler is enabled.** Until one is added, run a weekly operator cleanup with an audit trail:

- Remove source objects for sessions past `source_delete_after`, including unverified uploads and orphaned normalization attempts.
- Remove preview/original objects past `delete_after` only when the artwork has no referencing order. Keep order print files needed for fulfillment/support.
- Remove orphaned objects by prefix only after checking DB references; use a generous age threshold to avoid deleting in-flight work.
- Retain order records for the required accounting/support period; purge or anonymize personal information when no longer necessary.
- Delete expired rate-limit rows periodically.

Privacy/Terms are basic product copy, not a finished jurisdiction-specific legal agreement. Before launch add the legal merchant identity, reachable support/privacy contact, applicable delivery/returns details, and a documented retention schedule. Confirm provider data settings and agreements; Pluto does not opt uploads into training or dataset collection.

## Deployment to Vercel

1. Push this repository to your Git host and import it into Vercel. Select Node 24, pnpm, `pnpm build`.
2. Create a separate production Supabase project, apply all migrations, and provision authorized creator/admin users. Do not apply demo seed to an unintended project.
3. Set environment variables from `.env.example` in the correct Vercel environment. Keep service keys server-only. Set `NEXT_PUBLIC_APP_URL=https://pluto.store` and configure the domain.
4. Verify the selected plan supports the 300-second creation route. If it does not, use a supported plan or move `runRound` into a durable worker before accepting customers; do not rely on detached promises.
5. Configure production Supabase auth redirect/SMTP, Stripe webhook endpoint/signing secret and receipts. Keep staging on Stripe test credentials.
6. Start with manual fulfillment. Confirm shipping-inclusive prices and legal/support copy, then test the exact acceptance journey below.
7. Monitor structured server logs and DB failure states. Provider request IDs/status codes are logged without image bytes, customer email, addresses or instructions.

## Production acceptance gate

- Visit `/high-elf-club`; upload a valid photograph with rights confirmation.
- Receive three real transformations; verify recognizability and creator fidelity.
- Choose a result, inspect the crop, test A3 and A2 eligibility.
- Checkout in Stripe test mode; verify the internal order exists before payment.
- Pay; confirm signed webhook marks the order paid and manual fulfillment queued (or one Gelato order submitted).
- Replay the webhook and simultaneous checkout requests; confirm no duplicate order/submission.
- Verify confirmation and creator/admin order views, shipping information and actual print download.
- Test a second browser cannot fetch the source, generation, artwork, confirmation or print URL.
- Test generation failure, exhausted rounds, expired session, checkout cancel/retry and fulfillment failure.
- Approve a physical print sample before automated real Gelato orders.

Stop after this works. No broader Pluto platform features are planned here.

## Official references checked

- [Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Supabase SSR clients and Proxy](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [OpenAI image generation and editing](https://developers.openai.com/api/docs/guides/image-generation)
- [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Gelato v4 create order](https://dashboard.gelato.com/docs/orders/v4/create/)
- [TypeScript 7 compatibility API](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [ESLint compatibility utilities](https://eslint.org/blog/2024/05/eslint-compatibility-utilities/)

See [the implementation plan](docs/IMPLEMENTATION.md) for the initial scope and folder map.
