-- Creators build their own catalog from Gelato's posters and framed posters,
-- so a product now belongs to a store and remembers where in Gelato it came
-- from. The global A3/A2 defaults every store shared are retired: each existing
-- store gets its own copy first, so nothing on sale disappears, and new stores
-- start empty and add a product before they can go live.
alter table public.products
 add column description text not null default '' check (char_length(description) <= 200),
 add column gelato_catalog text,
 add column gelato_attributes jsonb not null default '{}',
 add column sort_order int not null default 0;

-- Framed sizes such as 50×70 cm or 30×40 cm are not ISO, so the shape is no
-- longer a single allowed value; print preparation crops to width and height.
alter table public.products drop constraint if exists products_aspect_ratio_check;
alter table public.products alter column aspect_ratio set default 'portrait';

insert into public.products
 (creator_id, name, slug, gelato_product_uid, gelato_catalog, width_mm, height_mm,
  aspect_ratio, currency, price_amount, active, sort_order)
select c.id, p.name, p.slug, p.gelato_product_uid,
 case when p.gelato_product_uid is null then null else 'posters' end,
 p.width_mm, p.height_mm, p.aspect_ratio, p.currency, p.price_amount, true,
 row_number() over (partition by c.id order by p.price_amount) - 1
from public.creators c
cross join public.products p
where p.creator_id is null and p.active
on conflict (creator_id, slug) do nothing;

-- Kept, not deleted: past orders reference them.
update public.products set active = false where creator_id is null;

create index product_creator_order on public.products(creator_id, sort_order) where active;
