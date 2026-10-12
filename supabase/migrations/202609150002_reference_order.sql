-- Reorder references under a creator lock, avoiding duplicate-position no-op moves.
create function public.move_reference(p_creator uuid,p_reference uuid,p_direction int) returns void
language plpgsql security definer set search_path='' as $$
declare current_position int; target_id uuid; target_position int;
begin
 if p_direction not in (-1,1) then raise exception 'invalid_direction'; end if;
 perform 1 from public.creators where id=p_creator for update;
 -- Normalize existing positions to a stable sequence first.
 with ranked as (select id,row_number() over(order by sort_order,created_at,id)-1 as position from public.creator_reference_images where creator_id=p_creator)
 update public.creator_reference_images r set sort_order=ranked.position from ranked where r.id=ranked.id;
 select sort_order into current_position from public.creator_reference_images where id=p_reference and creator_id=p_creator;
 if current_position is null then raise exception 'reference_not_found'; end if;
 select id,sort_order into target_id,target_position from public.creator_reference_images where creator_id=p_creator and sort_order=current_position+p_direction;
 if target_id is null then return; end if;
 update public.creator_reference_images set sort_order=case when id=p_reference then target_position else current_position end where id in (p_reference,target_id);
end $$;
revoke all on function public.move_reference(uuid,uuid,int) from public,anon,authenticated;
grant execute on function public.move_reference(uuid,uuid,int) to service_role;
