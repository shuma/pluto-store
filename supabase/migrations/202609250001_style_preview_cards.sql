-- One sample says little about how a style handles the range of photos
-- customers send, so a creator can now try up to four side by side. Each card
-- carries what the single preview on creators carried: its own sample (null is
-- the built-in one), its result, the signature of the board that made it, and
-- its run state. position orders the cards and, being unique per creator,
-- stops two concurrent first loads from both creating the first card.
create table public.creator_style_previews (
 id uuid primary key default gen_random_uuid(),
 creator_id uuid not null references public.creators on delete cascade,
 position smallint not null check (position between 0 and 3),
 sample_path text, storage_path text, signature text,
 status text not null default 'idle' check (status in ('idle','running','ready','failed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (creator_id, position)
);
alter table public.creator_style_previews enable row level security;
revoke all on public.creator_style_previews from anon,authenticated;
grant all on public.creator_style_previews to service_role;
-- The existing preview becomes the first card. The creators columns are left
-- in place so code deployed before this migration keeps working; a later
-- migration can drop them.
insert into public.creator_style_previews
 (creator_id,position,sample_path,storage_path,signature,status,updated_at)
select id,0,preview_sample_path,preview_storage_path,preview_signature,preview_status,
 coalesce(preview_updated_at,now())
from public.creators
where preview_status <> 'idle' or preview_sample_path is not null or preview_storage_path is not null;
