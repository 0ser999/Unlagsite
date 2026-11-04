-- Apply in Supabase before deploying the payment functions.
begin;

create table if not exists public.site_payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('premium', 'ultra')),
  from_plan text not null check (from_plan in ('free', 'premium')),
  amount integer not null check (amount > 0),
  email text,
  created_at timestamptz not null default now(),
  stripe_intent_id text unique,
  unique (user_id, plan, from_plan)
);
alter table public.site_payment_orders enable row level security;
revoke all on public.site_payment_orders from public, anon, authenticated;
grant select, insert, update on public.site_payment_orders to service_role;

create or replace function public.site_reserve_payment(p_user_id uuid, p_plan text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  u auth.users;
  current_plan text;
  target_rank integer;
  current_rank integer;
  payment public.site_payment_orders;
begin
  if p_plan not in ('premium', 'ultra') or p_plan is null then
    raise exception 'invalid plan';
  end if;
  -- Serialize reservations and grants for this account across server instances.
  select * into strict u from auth.users where id = p_user_id for update;
  if u.email_confirmed_at is null then
    return jsonb_build_object('error', 'unverified');
  end if;
  current_plan := coalesce(u.raw_app_meta_data->>'plan', 'free');
  current_rank := case current_plan when 'ultra' then 2 when 'premium' then 1 else 0 end;
  target_rank := case p_plan when 'ultra' then 2 else 1 end;
  if current_rank >= target_rank then
    return jsonb_build_object('error', 'owned');
  end if;
  if current_rank = 0 then current_plan := 'free'; end if;
  insert into public.site_payment_orders(user_id, plan, from_plan, amount, email)
  values (p_user_id, p_plan, current_plan,
    (case p_plan when 'ultra' then 2999 else 1499 end) -
    (case current_plan when 'premium' then 1499 else 0 end), u.email)
  on conflict (user_id, plan, from_plan) do nothing;
  select * into strict payment from public.site_payment_orders
    where user_id = p_user_id and plan = p_plan and from_plan = current_plan;
  return to_jsonb(payment);
end;
$$;

create or replace function public.site_grant_paid_plan(p_user_id uuid, p_plan text, p_payment_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  metadata jsonb;
  current_rank integer;
  target_rank integer;
begin
  if p_plan not in ('premium', 'ultra') or p_plan is null or p_payment_id is null then
    raise exception 'invalid payment';
  end if;
  select coalesce(raw_app_meta_data, '{}'::jsonb) into strict metadata
    from auth.users where id = p_user_id for update;
  current_rank := case metadata->>'plan' when 'ultra' then 2 when 'premium' then 1 else 0 end;
  target_rank := case p_plan when 'ultra' then 2 else 1 end;
  if current_rank >= target_rank then return false; end if;
  update auth.users set raw_app_meta_data = metadata || jsonb_build_object(
    'plan', p_plan, 'paid_at', now(), 'payment_id', p_payment_id), updated_at = now()
    where id = p_user_id;
  return true;
end;
$$;

revoke all on function public.site_reserve_payment(uuid, text) from public, anon, authenticated;
revoke all on function public.site_grant_paid_plan(uuid, text, text) from public, anon, authenticated;
grant execute on function public.site_reserve_payment(uuid, text) to service_role;
grant execute on function public.site_grant_paid_plan(uuid, text, text) to service_role;
commit;
