-- Talaan · Cloud Profile management
-- Adds owner-only rename and permanently destructive delete RPCs for Cloud Schema V3.
-- Run once in the Supabase SQL editor after supabase/cloud-profiles-v3.sql.

begin;

create or replace function public.finance_v3_rename_profile(
  p_profile_id uuid,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := trim(coalesce(p_name,''));
  v_updated_at timestamptz;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if coalesce(public.finance_v3_role(p_profile_id),'') <> 'owner' then raise exception 'owner_required'; end if;
  if length(v_name) = 0 then raise exception 'profile_name_required'; end if;
  if length(v_name) > 80 then raise exception 'profile_name_too_long'; end if;

  update public.finance_v3_profiles
  set name = v_name,
      updated_at = now()
  where id = p_profile_id
    and owner_user_id = v_uid
  returning updated_at into v_updated_at;

  if not found then raise exception 'profile_not_found_or_owner'; end if;

  return jsonb_build_object(
    'status','renamed',
    'profile_id',p_profile_id,
    'name',v_name,
    'updated_at',v_updated_at
  );
end;
$$;

create or replace function public.finance_v3_delete_profile(
  p_profile_id uuid,
  p_confirm_name text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.finance_v3_profiles%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;

  select * into v_profile
  from public.finance_v3_profiles
  where id = p_profile_id
  for update;

  if not found then raise exception 'profile_not_found_or_owner'; end if;
  if v_profile.owner_user_id <> v_uid or coalesce(public.finance_v3_role(p_profile_id),'') <> 'owner' then
    raise exception 'owner_required';
  end if;
  if coalesce(p_confirm_name,'') <> v_profile.name then
    raise exception 'profile_name_confirmation_mismatch';
  end if;

  delete from public.finance_v3_profiles
  where id = p_profile_id
    and owner_user_id = v_uid;

  if not found then raise exception 'profile_not_found_or_owner'; end if;

  return jsonb_build_object(
    'status','deleted',
    'profile_id',p_profile_id,
    'name',v_profile.name
  );
end;
$$;

revoke execute on function public.finance_v3_rename_profile(uuid,text) from public,anon;
grant execute on function public.finance_v3_rename_profile(uuid,text) to authenticated;
revoke execute on function public.finance_v3_delete_profile(uuid,text) from public,anon;
grant execute on function public.finance_v3_delete_profile(uuid,text) to authenticated;

comment on function public.finance_v3_rename_profile(uuid,text) is 'Owner-only Cloud Schema V3 profile rename. Does not modify finance records.';
comment on function public.finance_v3_delete_profile(uuid,text) is 'Owner-only destructive Cloud Schema V3 profile deletion requiring an exact profile-name confirmation. Cascading foreign keys remove the profile-scoped cloud dataset.';

commit;
