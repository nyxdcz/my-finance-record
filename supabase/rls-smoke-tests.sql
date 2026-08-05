-- My Finance Records V12.19.1 · RLS smoke-test guide
-- Use only in a disposable test project or with disposable test users.
-- Replace the UUID placeholders before running each section.

-- 1. Confirm RLS is enabled and forced.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('finance_cloud_state','finance_cloud_devices','finance_payment_operations')
order by c.relname;

-- 2. Confirm payment-operation privileges are append-only.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'finance_payment_operations'
  and grantee in ('anon','authenticated')
order by grantee, privilege_type;

-- Expected: authenticated SELECT and INSERT only; no anon grants.

-- 3. In a transaction, impersonate test user A.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated","aal":"aal1"}';

-- Replace user_id with test user A. This insert should succeed.
insert into public.finance_cloud_devices (user_id, device_id, device_name)
values ('00000000-0000-0000-0000-00000000000a', 'rls-test-device-a', 'RLS Test A')
on conflict (user_id, device_id) do update set device_name = excluded.device_name;

-- Replace user_id with test user B. This insert must fail because auth.uid() is user A.
-- insert into public.finance_cloud_devices (user_id, device_id, device_name)
-- values ('00000000-0000-0000-0000-00000000000b', 'rls-test-device-b', 'Must Fail');

rollback;

-- 4. Payment-operation update/delete attempts by an authenticated client must fail.
-- Perform these tests through the Supabase client signed in as a disposable user,
-- because the SQL Editor normally runs with elevated database privileges.
