-- A creator curates up to eight reference images and finds out what they do to
-- a photo only when a customer's order arrives. The style preview runs one
-- fixed sample through the current board so curation has a feedback loop.
-- preview_signature records which active images, in which order, produced the
-- stored result, so the board can say when the preview no longer matches it.
alter table public.creators
  add column if not exists preview_storage_path text,
  add column if not exists preview_signature text,
  add column if not exists preview_updated_at timestamptz,
  add column if not exists preview_status text not null default 'idle';
alter table public.creators
  add constraint creators_preview_status
  check (preview_status in ('idle', 'running', 'ready', 'failed'));
