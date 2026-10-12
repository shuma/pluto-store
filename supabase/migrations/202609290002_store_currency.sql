-- Each store sells in one currency, chosen by the creator: US dollars by
-- default, or Swedish kronor. Stores that already sell in kronor keep it, so
-- nothing on sale changes price. Products keep their own currency; only those
-- in the store's currency are offered, so switching back and forth never
-- loses a price.
alter table public.creators
 add column currency text not null default 'usd' check (currency in ('usd','sek'));

update public.creators c set currency = 'sek'
where exists (
 select 1 from public.products p
 where p.creator_id = c.id and p.currency = 'sek' and p.active
);

alter table public.products drop constraint if exists products_currency_check;
alter table public.products add constraint products_currency_check
 check (currency in ('usd','sek'));
