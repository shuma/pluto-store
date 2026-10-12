-- "running" covers minutes of work, so the card could only show a generic
-- spinner. stage says where a run is: claimed and waiting on its inputs, with
-- the image model, or being sized and stored. It is null whenever the card is
-- not running.
alter table public.creator_style_previews
  add column if not exists stage text
  check (stage in ('queued','generating','refining'));
