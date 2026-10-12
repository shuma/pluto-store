-- A cart: a customer can buy several of the artworks from one visit, in
-- several sizes and quantities, in one payment. An order stays the purchase
-- (one payment, one address, one print order, the totals earnings and payouts
-- run on); what was bought moves to order_items.

-- What a visit means to buy, until it pays. Limits: 10 of one print here, 20
-- in all (enforced by the app, which knows the whole cart).
create table public.cart_items (
 id uuid primary key default gen_random_uuid(),
 generation_session_id uuid not null references public.generation_sessions on delete cascade,
 generated_artwork_id uuid not null references public.generated_artworks on delete cascade,
 product_id uuid not null references public.products,
 quantity int not null check (quantity between 1 and 10),
 created_at timestamptz not null default now(),
 unique (generation_session_id, generated_artwork_id, product_id)
);
create index cart_session on public.cart_items(generation_session_id, created_at);
alter table public.cart_items enable row level security;
revoke all on public.cart_items from anon, authenticated;
grant all on public.cart_items to service_role;

-- What one order bought: each print, how many, at what price, and the file
-- that is printed. The product is snapshotted, like orders did, so a later
-- edit never rewrites a sale.
create table public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders on delete cascade,
 generated_artwork_id uuid not null references public.generated_artworks,
 product_id uuid not null references public.products,
 product_snapshot jsonb not null,
 quantity int not null check (quantity between 1 and 10),
 unit_amount int not null check (unit_amount > 0),
 print_storage_path text not null,
 created_at timestamptz not null default now()
);
create index order_items_order on public.order_items(order_id, created_at);
alter table public.order_items enable row level security;
revoke all on public.order_items from anon, authenticated;
grant all on public.order_items to service_role;
-- Creators read their own orders' items, as they read their orders.
grant select on public.order_items to authenticated;
create policy own_order_items on public.order_items for select to authenticated
 using (exists (
  select 1 from public.orders o join public.creators c on c.id = o.creator_id
  where o.id = order_id and c.owner_user_id = (select auth.uid())
 ));

-- Every order so far bought one print: it becomes that order's one item.
insert into public.order_items
 (order_id, generated_artwork_id, product_id, product_snapshot, quantity,
  unit_amount, print_storage_path, created_at)
select id, generated_artwork_id, product_id, product_snapshot, 1,
 amount_total, print_storage_path, created_at
from public.orders;

-- The single-print columns stay on old orders and are no longer written.
alter table public.orders
 alter column generated_artwork_id drop not null,
 alter column product_id drop not null,
 alter column product_snapshot drop not null,
 alter column print_storage_path drop not null,
 -- What the order was made from, so checking out the same cart twice
 -- reuses its order. Old orders have none.
 add column cart_key text,
 add constraint orders_session_cart unique (generation_session_id, cart_key);

-- One order per artwork and size per visit no longer holds. The constraint's
-- generated name was cut to Postgres's limit, so it is found by its columns.
do $$ declare c text; begin
 select conname into c from pg_constraint
 where conrelid = 'public.orders'::regclass and contype = 'u'
  and conkey = array(
   select attnum from pg_attribute where attrelid = 'public.orders'::regclass
    and attname in ('generation_session_id','generated_artwork_id','product_id')
   order by attnum)::smallint[];
 if c is not null then execute format('alter table public.orders drop constraint %I', c); end if;
end $$;

-- Paying empties the cart of what was bought. Anything added after checkout
-- opened stays for next time.
create or replace function public.record_payment(p_event text,p_order uuid,p_session text,p_intent text,p_amount int,p_currency text,p_email text,p_name text,p_address jsonb)
 returns boolean language plpgsql security definer set search_path='' as $$
declare o public.orders;
begin
 select * into o from public.orders where id=p_order for update;
 if o.id is null or o.stripe_checkout_session_id is distinct from p_session or o.amount_total<>p_amount or o.currency<>p_currency then raise exception 'payment_mismatch'; end if;
 if exists(select 1 from public.stripe_events where id=p_event) then return false; end if;
 insert into public.stripe_events(id,order_id) values(p_event,p_order);
 if o.payment_status='paid' then return false; end if;
 update public.orders set payment_status='paid',fulfillment_status='pending',stripe_payment_intent_id=p_intent,customer_email=p_email,customer_name=p_name,shipping_address=p_address where id=p_order;
 delete from public.cart_items c using public.order_items i
  where i.order_id=p_order and c.generation_session_id=o.generation_session_id
   and c.generated_artwork_id=i.generated_artwork_id and c.product_id=i.product_id;
 return true;
end $$;
