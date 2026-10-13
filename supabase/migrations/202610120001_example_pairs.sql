-- A storefront example is now a pair: the photo that went in and the artwork
-- that came out, shown together so a customer sees what happens to their own
-- photo. Artwork-only examples say nothing about that, so they are dropped
-- rather than shown half-finished.
delete from public.creator_examples;
alter table public.creator_examples
 add column source_url text not null,
 -- Set when the pair was published from a style preview, so the panel knows
 -- it is already on the storefront. The files are copies: re-running or
 -- removing the preview leaves the example as it was.
 add column style_preview_id uuid references public.creator_style_previews on delete set null;
create unique index examples_style_preview on public.creator_examples(style_preview_id)
 where style_preview_id is not null;
