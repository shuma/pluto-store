-- Artwork style comes from the creator's reference images alone. The written
-- transformation direction is no longer sent to the model, so a live store no
-- longer needs one. The column is left in place rather than dropped so existing
-- text survives; nothing reads it.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.creators'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%transformation_instruction%'
  loop
    execute format('alter table public.creators drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.creators
  add constraint creators_live_requires_rights
  check (status <> 'live' or rights_confirmed_at is not null);
