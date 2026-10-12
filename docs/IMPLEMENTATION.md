# pluto-store implementation

## Scope and sequence

1. Foundation: Next.js App Router, strict TypeScript, Tailwind/shadcn primitives, Supabase schema/RLS/storage, root slug routing.
2. Store → private direct-to-storage upload (10 MB; avoids Vercel request body limits), server verification, anonymous HttpOnly capability cookie.
3. Atomic generation rounds, isolated OpenAI editing provider, three private alternatives, selection.
4. Product-backed A3/A2 pricing; immutable order snapshot; Stripe Checkout and authoritative, replay-safe webhooks.
5. Separate print assets with dimension checks; durable fulfillment state; manual default, Gelato adapter and protected retry.
6. Creator magic-link auth, store/reference management and orders; environment-based admin.
7. Error handling, abuse limits, retention fields, tests, production deployment runbook.

## Folder map

app/ — public storefront/create/poster routes, auth, dashboard/admin, thin API handlers
components/ — interactive upload/results/forms and shadcn primitives
lib/ — validation, Supabase clients, stores, generation, payments, orders, fulfillment, print
supabase/migrations/ — schema, indexes, RLS, private storage, atomic claim functions
supabase/seed.sql — development creator and products
public/demo/ — original, repository-owned placeholder illustrations
scripts/ — setup/seed helpers
tests/ — domain and integration contract checks

## Decisions / blockers

- Local development is unblocked. Live verification needs project credentials and deployed webhook configuration.
- Stores sell in USD (default) or SEK, set per store; changing it means repricing, never conversion. The currency sets the market: USD stores ship within the US, SEK stores within Sweden.
- Manual fulfillment by default. Gelato product IDs and physical sample approval are required before automatic production fulfillment.
- No customer login. Random session secret is hashed in DB, stored only in an HttpOnly cookie; session IDs alone grant no access.
- DB compare-and-set claims serialize generation and fulfillment; Stripe idempotency keys recover checkout creation.
- Unknown outcome of Gelato POST is quarantined for reconciliation; never blindly resubmit a potentially accepted order.
- A persistent generation round record makes interrupted work visible and recoverable, with bounded server execution and a polling results page.
- Generated originals remain separate from web previews. Print preparation crops without distortion and rejects insufficient pixels before payment.
- No AI SDK / AI Elements unless they improve this image-edit workflow; the direct provider SDK is confined to one adapter.
