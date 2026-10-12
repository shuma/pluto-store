-- Creator payouts through Stripe Connect. Customers keep paying Pluto; each
-- month Pluto transfers every creator what they earned on orders that
-- shipped at least 30 days earlier.

-- The creator's Stripe connected account and whether it can receive money.
alter table public.creators
 add column stripe_account_id text unique,
 add column payouts_status text not null default 'not_started'
  check (payouts_status in ('not_started','pending','enabled','restricted')),
 add column deleted_at timestamptz;

-- One transfer to one creator, for one month and currency. The unique key is
-- what keeps a re-run from paying twice.
create table public.creator_payouts (
 id uuid primary key default gen_random_uuid(),
 creator_id uuid not null references public.creators,
 period text not null check (period ~ '^\d{4}-\d{2}$'),
 currency text not null check (currency in ('usd','sek')),
 amount int not null check (amount > 0),
 order_count int not null check (order_count > 0),
 stripe_transfer_id text unique,
 status text not null default 'pending' check (status in ('pending','paid','failed')),
 failure_reason text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (creator_id, period, currency)
);
create trigger touch_updated_at before update on public.creator_payouts
 for each row execute function public.touch_updated_at();
alter table public.creator_payouts enable row level security;
revoke all on public.creator_payouts from anon, authenticated;
grant all on public.creator_payouts to service_role;

-- What each order earned the creator, fixed when it is paid, and which
-- payout sent it. fulfilled_at starts the 30 days.
alter table public.orders
 add column fulfilled_at timestamptz,
 add column production_cost_amount int check (production_cost_amount >= 0),
 add column payment_fee_amount int check (payment_fee_amount >= 0),
 add column creator_earnings_amount int check (creator_earnings_amount >= 0),
 add column payout_id uuid references public.creator_payouts;
create index orders_unpaid_earnings on public.orders(creator_id, fulfilled_at)
 where payout_id is null and creator_earnings_amount is not null;

-- Stamped by the database, so every path that marks an order fulfilled
-- starts the clock, now and in future.
create function public.stamp_fulfilled_at() returns trigger language plpgsql set search_path='' as $$
begin
 if new.fulfillment_status = 'fulfilled' and old.fulfillment_status is distinct from 'fulfilled' and new.fulfilled_at is null then
  new.fulfilled_at = now();
 end if;
 return new;
end $$;
create trigger stamp_fulfilled_at before update on public.orders
 for each row execute function public.stamp_fulfilled_at();
-- Orders already fulfilled count from when they were last updated.
update public.orders set fulfilled_at = updated_at
 where fulfillment_status = 'fulfilled' and fulfilled_at is null;

-- Which emails a creator wants. Saved now; sending comes with an email
-- provider.
alter table public.profiles
 add column notify_new_order boolean not null default true,
 add column notify_needs_attention boolean not null default true,
 add column notify_payout_sent boolean not null default true;
