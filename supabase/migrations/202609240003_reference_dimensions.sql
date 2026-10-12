-- The canvas sizes each card from its image's aspect ratio, which was only
-- known once the image decoded in the browser: every load painted a guessed
-- shape and then snapped to the real one. sharp already measures the trimmed
-- bytes during upload, so keep what it found. Null means "stored before this
-- migration", and the client keeps its deterministic guess for those until
-- pnpm backfill:dimensions has run.
alter table public.creator_reference_images
  add column if not exists width_px integer,
  add column if not exists height_px integer;
alter table public.creator_reference_images
  add constraint creator_reference_images_dimensions
  check (
    (width_px is null or width_px > 0)
    and (height_px is null or height_px > 0)
  );
