create extension if not exists pgcrypto;
create type public.creator_status as enum ('draft','live','disabled');
create table public.profiles (
 id uuid primary key references auth.users on delete cascade, display_name text, avatar_url text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.creators (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid unique references public.profiles on delete set null,
 name text not null, slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 63
 and slug not in ('admin','api','auth','checkout','create','dashboard','login','orders','privacy','terms','_next','favicon','robots','sitemap')),
 description text not null default '', avatar_url text, hero_url text, transformation_instruction text not null default '',
 rights_confirmed_at timestamptz, status public.creator_status not null default 'draft',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (status <> 'live' or (rights_confirmed_at is not null and length(transformation_instruction)>0))
);
create table public.creator_reference_images (
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.creators on delete cascade,
 storage_path text not null, sort_order int not null default 0, active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.generation_sessions (
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.creators,
 session_token text not null, source_image_path text not null, round_count int not null default 0 check(round_count between 0 and 10),
 status text not null default 'uploading' check(status in ('uploading','ready','generating','completed','failed')),
 rights_confirmed_at timestamptz not null default now(), source_delete_after timestamptz not null default now()+interval '30 days',
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '1 day'
);
create table public.generation_rounds (
 id uuid primary key default gen_random_uuid(), generation_session_id uuid not null references public.generation_sessions,
 round_number int not null, status text not null default 'running' check(status in ('running','completed','failed')),
 error_code text, created_at timestamptz not null default now(), finished_at timestamptz,
 unique(generation_session_id, round_number)
);
create table public.generated_artworks (
 id uuid primary key default gen_random_uuid(), generation_session_id uuid not null references public.generation_sessions,
 creator_id uuid not null references public.creators, round_id uuid not null references public.generation_rounds,
 storage_path text not null, original_storage_path text not null, print_storage_path text,
 provider text not null, model text not null, provider_metadata jsonb,
 width_px int not null, height_px int not null,
 status text not null default 'ready' check(status in ('ready','failed')), selected boolean not null default false,
 created_at timestamptz not null default now(), delete_after timestamptz not null default now()+interval '30 days'
);
create table public.products (
 id uuid primary key default gen_random_uuid(), creator_id uuid references public.creators,
 name text not null, slug text not null, gelato_product_uid text,
 width_mm numeric not null check(width_mm>0), height_mm numeric not null check(height_mm>0),
 aspect_ratio text not null default 'iso-portrait' check(aspect_ratio='iso-portrait'),
 currency text not null check(currency ~ '^[a-z]{3}$'), price_amount int not null check(price_amount>0),
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique nulls not distinct (creator_id,slug)
);
create table public.orders (
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.creators,
 generation_session_id uuid not null references public.generation_sessions, generated_artwork_id uuid not null references public.generated_artworks,
 product_id uuid not null references public.products, product_snapshot jsonb not null, print_storage_path text not null,
 customer_email text, customer_name text, currency text not null, amount_total int not null check(amount_total>0),
 payment_status text not null default 'pending_payment' check(payment_status in ('pending_payment','paid','expired')),
 fulfillment_status text not null default 'awaiting_payment' check(fulfillment_status in ('awaiting_payment','pending','manual','submitting','submitted','fulfilled','fulfillment_failed','needs_review')),
 stripe_checkout_session_id text unique, stripe_payment_intent_id text, checkout_url text, checkout_attempt int not null default 0,
 gelato_order_id text unique, gelato_status text, gelato_submitted_at timestamptz, provider_response jsonb,
 shipping_address jsonb, fulfillment_error text, fulfillment_claimed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(generation_session_id,generated_artwork_id,product_id)
);
create table public.stripe_events (id text primary key, order_id uuid not null references public.orders, created_at timestamptz not null default now());
create table public.rate_limits (key text primary key, count int not null, reset_at timestamptz not null);
create index reference_creator on public.creator_reference_images(creator_id,sort_order);
create index session_creator on public.generation_sessions(creator_id,created_at desc);
create index session_expiry on public.generation_sessions(expires_at);
create index artwork_session on public.generated_artworks(generation_session_id,created_at);
create index artwork_retention on public.generated_artworks(delete_after);
create index orders_creator on public.orders(creator_id,created_at desc);
create index orders_fulfillment on public.orders(fulfillment_status) where payment_status='paid';
create index rounds_status on public.generation_rounds(status,created_at);
create index product_creator on public.products(creator_id) where active;

create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['profiles','creators','products','orders'] loop
 execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
end loop; end $$;
create function public.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,display_name) values(new.id,new.raw_user_meta_data->>'display_name'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();

do $$ declare t text; begin foreach t in array array['profiles','creators','creator_reference_images','generation_sessions','generation_rounds','generated_artworks','products','orders','stripe_events','rate_limits'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
end loop; end $$;
grant select,update on public.profiles to authenticated;
grant select,insert,update on public.creators to authenticated;
grant select,insert,update,delete on public.creator_reference_images to authenticated;
grant select on public.orders to authenticated;
create policy own_profile on public.profiles for all to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy own_creator on public.creators for all to authenticated using(owner_user_id=(select auth.uid())) with check(owner_user_id=(select auth.uid()));
create policy own_references on public.creator_reference_images for all to authenticated
 using(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=(select auth.uid())))
 with check(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=(select auth.uid())));
create policy own_orders on public.orders for select to authenticated using(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=(select auth.uid())));

-- All object writes go through scoped signed uploads or validated server operations.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('creator-assets','creator-assets',true,10485760,array['image/jpeg','image/png','image/webp']),
 ('creator-reference-images','creator-reference-images',false,10485760,array['image/jpeg','image/png','image/webp']),
 ('customer-uploads','customer-uploads',false,10485760,array['image/jpeg','image/png','image/webp']),
 ('generated-artworks','generated-artworks',false,52428800,array['image/jpeg','image/png','image/webp']),
 ('print-files','print-files',false,104857600,array['image/jpeg','image/png'])
 on conflict(id) do nothing;

-- Serialized claims prevent concurrent requests from spending extra rounds.
create function public.claim_generation(p_session uuid,p_max_rounds int) returns public.generation_rounds
 language plpgsql security definer set search_path='' as $$
declare s public.generation_sessions; r public.generation_rounds;
begin
 select * into s from public.generation_sessions where id=p_session for update;
 if s.id is null or s.expires_at<=now() then raise exception 'session_expired'; end if;
 -- Server deadline is 300s; stale rounds may be recovered after 10 minutes.
 if s.status='generating' and exists(select 1 from public.generation_rounds where generation_session_id=p_session and status='running' and created_at>now()-interval '10 minutes') then return null; end if;
 update public.generation_rounds set status='failed',error_code='interrupted',finished_at=now() where generation_session_id=p_session and status='running';
 if s.status='uploading' or s.round_count>=p_max_rounds then raise exception 'round_limit'; end if;
 update public.generation_sessions set round_count=round_count+1,status='generating' where id=p_session;
 insert into public.generation_rounds(generation_session_id,round_number) values(p_session,s.round_count+1) returning * into r;
 return r;
end $$;

-- Payment transition and event receipt commit together. Duplicate / concurrent events are harmless.
create function public.record_payment(p_event text,p_order uuid,p_session text,p_intent text,p_amount int,p_currency text,p_email text,p_name text,p_address jsonb)
 returns boolean language plpgsql security definer set search_path='' as $$
declare o public.orders;
begin
 select * into o from public.orders where id=p_order for update;
 if o.id is null or o.stripe_checkout_session_id is distinct from p_session or o.amount_total<>p_amount or o.currency<>p_currency then raise exception 'payment_mismatch'; end if;
 if exists(select 1 from public.stripe_events where id=p_event) then return false; end if;
 insert into public.stripe_events(id,order_id) values(p_event,p_order);
 if o.payment_status='paid' then return false; end if;
 update public.orders set payment_status='paid',fulfillment_status='pending',stripe_payment_intent_id=p_intent,customer_email=p_email,customer_name=p_name,shipping_address=p_address where id=p_order;
 return true;
end $$;
create function public.consume_rate_limit(p_key text,p_limit int,p_window_seconds int) returns boolean language plpgsql security definer set search_path='' as $$
declare n int;
begin
 insert into public.rate_limits(key,count,reset_at) values(p_key,1,now()+make_interval(secs=>p_window_seconds))
 on conflict(key) do update set count=case when public.rate_limits.reset_at<=now() then 1 else public.rate_limits.count+1 end,
 reset_at=case when public.rate_limits.reset_at<=now() then now()+make_interval(secs=>p_window_seconds) else public.rate_limits.reset_at end returning count into n;
 return n<=p_limit;
end $$;
revoke all on function public.claim_generation(uuid,int),public.record_payment(text,uuid,text,text,int,text,text,text,jsonb),public.consume_rate_limit(text,int,int) from public,anon,authenticated;
grant execute on function public.claim_generation(uuid,int),public.record_payment(text,uuid,text,text,int,text,text,text,jsonb),public.consume_rate_limit(text,int,int) to service_role;
