-- Atomically approve a post: update its status, record the points transaction,
-- and increment the athlete's balance in a single transaction.
create or replace function public.approve_post(post_id uuid)
returns void language plpgsql security definer as $$
declare
  v_points_value int;
  v_athlete_id   uuid;
  v_reviewer_id  uuid := auth.uid();
begin
  select pt.points_value, p.athlete_id
  into   v_points_value, v_athlete_id
  from   public.posts p
  join   public.post_types pt on pt.id = p.post_type_id
  where  p.id = post_id and p.status = 'pending';

  if not found then
    raise exception 'Post not found or already reviewed';
  end if;

  update public.posts
  set    status = 'approved',
         points_awarded = v_points_value,
         reviewed_by = v_reviewer_id,
         reviewed_at = now()
  where  id = post_id;

  insert into public.points_transactions (athlete_id, post_id, points, description)
  values (v_athlete_id, post_id, v_points_value, 'Post approved');

  update public.athlete_profiles
  set    points_balance = points_balance + v_points_value
  where  id = v_athlete_id;
end;
$$;

grant execute on function public.approve_post(uuid) to authenticated;
