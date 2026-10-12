-- Reference order now comes from canvas position (the "arrange" action rewrites
-- sort_order for the whole set), so the ±1 swap helper has no callers.
drop function if exists public.move_reference(uuid, uuid, int);
