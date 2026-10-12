-- Reference images are arranged on a freeform canvas rather than a grid.
-- Coordinates are fractions of the canvas box (0..1) so a board laid out on a
-- wide screen still reads correctly on a narrow one. Null means "never placed":
-- the client scatters those deterministically from the row id.
alter table public.creator_reference_images
  add column if not exists canvas_x numeric,
  add column if not exists canvas_y numeric,
  add column if not exists canvas_rotation numeric not null default 0,
  add column if not exists canvas_z integer not null default 0;
alter table public.creator_reference_images
  add constraint creator_reference_images_canvas_bounds
  check (
    (canvas_x is null or (canvas_x >= 0 and canvas_x <= 1))
    and (canvas_y is null or (canvas_y >= 0 and canvas_y <= 1))
    and canvas_rotation between -30 and 30
  );
