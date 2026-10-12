-- What each image-model call was billed for, one row per call. A customer
-- round asks for all its alternatives in one call, so a row can cover several
-- images: images says how many. The token counts are the source of truth;
-- cost_usd is derived from them with the per-million rates stored beside it,
-- so a later price change never rewrites what past calls cost, and a call on a
-- model with no known rates still records its tokens with a null cost.
create table public.ai_usage (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 creator_id uuid references public.creators on delete set null,
 purpose text not null check (purpose in ('generation','style_preview')),
 generation_round_id uuid references public.generation_rounds on delete set null,
 style_preview_id uuid references public.creator_style_previews on delete set null,
 provider text not null, model text not null, quality text, size text,
 images int not null check (images > 0),
 reference_images int not null check (reference_images >= 0),
 input_text_tokens int check (input_text_tokens >= 0),
 input_image_tokens int check (input_image_tokens >= 0),
 output_tokens int check (output_tokens >= 0),
 total_tokens int check (total_tokens >= 0),
 -- USD per million tokens, as applied to this row.
 rate_input_text numeric(10,4), rate_input_image numeric(10,4), rate_output numeric(10,4),
 cost_usd numeric(12,6) check (cost_usd >= 0)
);
create index ai_usage_creator on public.ai_usage(creator_id, created_at);
create index ai_usage_created on public.ai_usage(created_at);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon,authenticated;
grant all on public.ai_usage to service_role;
