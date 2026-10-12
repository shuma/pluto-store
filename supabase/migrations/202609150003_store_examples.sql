-- Public examples are explicitly approved marketing assets, separate from private references.
create table public.creator_examples (
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.creators on delete cascade,
 image_url text not null, caption text not null default 'Creator-approved artwork', sort_order int not null default 0,
 created_at timestamptz not null default now()
);
create index examples_creator on public.creator_examples(creator_id,sort_order);
alter table public.creator_examples enable row level security;
revoke all on public.creator_examples from anon,authenticated;
grant all on public.creator_examples to service_role;
grant select,insert,update,delete on public.creator_examples to authenticated;
create policy own_examples on public.creator_examples for all to authenticated
 using(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=(select auth.uid())))
 with check(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=(select auth.uid())));
