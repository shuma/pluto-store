-- A creator's own note on an order: never shown to the customer, never sent
-- to print.
alter table public.orders
 add column creator_note text check (char_length(creator_note) <= 1000);
