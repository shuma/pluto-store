-- A store can sell in more than one currency, and customers pay in the one
-- they choose. Euros join US dollars and Swedish kronor. The store's
-- `currency` stays as its main currency: what its payouts account is set up
-- for, so it is always dollars or kronor; euros are sold alongside one.
-- Every store sells in all three unless the creator turns one off, and every
-- product gets a price per currency rather than one price in one currency.
-- Prices are never converted: a product without a price in a currency isn't
-- sold in it.
alter table public.creators drop constraint if exists creators_currency_check;
alter table public.creators add constraint creators_currency_check
 check (currency in ('usd','sek'));
alter table public.creators
 add column currencies text[] not null default array['usd','sek','eur'];
alter table public.creators add constraint creators_currencies_check
 check (
  currencies <@ array['usd','sek','eur']::text[]
  and currency = any(currencies)
 );

create table public.product_prices (
 product_id uuid not null references public.products(id) on delete cascade,
 currency text not null check (currency in ('usd','sek','eur')),
 amount int not null check (amount > 0),
 primary key (product_id, currency)
);
alter table public.product_prices enable row level security;

insert into public.product_prices(product_id, currency, amount)
select id, currency, price_amount from public.products;

alter table public.products drop column currency, drop column price_amount;

-- Euro earnings are paid out in euros, like the others in their own.
alter table public.creator_payouts drop constraint if exists creator_payouts_currency_check;
alter table public.creator_payouts add constraint creator_payouts_currency_check
 check (currency in ('usd','sek','eur'));
