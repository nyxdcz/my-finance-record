-- My Finance Records V12.21.0 · Cloud Schema V2 RLS review helper
-- Run in the Supabase SQL Editor. Replace the sample UUIDs only in a disposable test project.
-- This file is intentionally read-only; application writes must be tested through authenticated RPC calls.

select schemaname, tablename, rowsecurity, forcerowsecurity
from pg_tables
where schemaname='public'
  and tablename in ('finance_sync_profiles','finance_sync_records','finance_sync_batches','finance_sync_audit')
order by tablename;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name in ('finance_sync_profiles','finance_sync_records','finance_sync_batches','finance_sync_audit','finance_cloud_devices')
  and grantee in ('anon','authenticated')
order by table_name,grantee,privilege_type;

select routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where specific_schema='public'
  and routine_name like 'finance_sync_%'
  and grantee in ('PUBLIC','anon','authenticated')
order by routine_name,grantee;

select policyname, tablename, roles, cmd, qual
from pg_policies
where schemaname='public'
  and tablename in ('finance_sync_profiles','finance_sync_records','finance_sync_batches','finance_sync_audit')
order by tablename,policyname;

select pubname, schemaname, tablename
from pg_publication_tables
where pubname='supabase_realtime'
  and schemaname='public'
  and tablename in ('finance_sync_audit','finance_cloud_devices')
order by tablename;
