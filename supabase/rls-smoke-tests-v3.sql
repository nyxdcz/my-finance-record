-- My Finance Records V13.0.0 · Cloud Schema V3 RLS smoke-test guide
-- Run only with dedicated test users and a disposable profile. Replace placeholders.
-- Do not run destructive statements against real finance data.

-- 1. Confirm RLS is enabled and forced.
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relnamespace='public'::regnamespace
  and relname like 'finance_v3_%'
order by relname;

-- Expected: relrowsecurity=true and relforcerowsecurity=true for every V3 table.

-- 2. Confirm anonymous access is absent.
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name like 'finance_v3_%' and grantee='anon';

-- Expected: zero rows.

-- 3. Confirm authenticated table access is select-only where granted.
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name like 'finance_v3_%' and grantee='authenticated'
order by table_name, privilege_type;

-- Expected: SELECT only; invitation tokens remain RPC-only.

-- 4. As test user A, call finance_v3_create_profile and note the profile_id.
-- select public.finance_v3_create_profile('Test household','household','TEST-SALT-ONLY',
--   '{"__financeEncrypted":true,"encryptionVersion":1,"algorithm":"AES-256-GCM","iv":"TEST","aad":"profile-check|v13","ciphertext":"TEST"}'::jsonb,
--   310000,130000);

-- 5. As unrelated test user B, direct reads for user A's profile must return zero rows.
-- select * from public.finance_v3_records where profile_id='PROFILE_UUID';
-- select * from public.finance_v3_audit where profile_id='PROFILE_UUID';
-- select * from public.finance_v3_devices where profile_id='PROFILE_UUID';

-- 6. As user B, write RPCs against user A's profile must fail with profile_access_denied.
-- select public.finance_v3_commit_batch('PROFILE_UUID','blocked-test','device-b','13.0.0',130000,'[]'::jsonb,false);

-- 7. After user A creates a Viewer invitation and user B accepts it, user B can read but
-- finance_v3_commit_batch must fail with profile_read_only.

-- 8. An Editor test user can commit an encrypted envelope but cannot submit plaintext.
-- Expected plaintext error: encrypted_payload_required.

-- 9. Verify immutable audit behavior: authenticated direct INSERT/UPDATE/DELETE on
-- finance_v3_audit and finance_v3_payment_operations must fail.

-- 10. Verify device revocation: after owner revokes a test device, register/pull/commit
-- from that device must return status='revoked'.
