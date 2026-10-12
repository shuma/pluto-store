-- Pluto's fee on each order, fixed when the order is created so a later
-- change to the rate never rewrites what past orders owed. Null on orders
-- from before the fee existed.
alter table public.orders
 add column platform_fee_amount int check (platform_fee_amount >= 0);
