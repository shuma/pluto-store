-- The style preview used one fixed illustration for every creator, which says
-- little about how their style handles the photos their customers actually
-- send. A creator can now upload their own sample; null keeps the built-in one.
alter table public.creators
  add column if not exists preview_sample_path text;
