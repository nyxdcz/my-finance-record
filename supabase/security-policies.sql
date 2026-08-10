-- My Finance Records V12.19.1 · Row Level Security
-- Run after supabase/schema.sql.

alter table public.finance_cloud_state enable row level security;
alter table public.finance_cloud_devices enable row level security;
alter table public.finance_payment_operations enable row level security;

alter table public.finance_cloud_state force row level security;
alter table public.finance_cloud_devices force row level security;
alter table public.finance_payment_operations force row level security;

revoke all on public.finance_cloud_state from anon;
revoke all on public.finance_cloud_devices from anon;
revoke all on public.finance_payment_operations from anon;

grant select, insert, update, delete on public.finance_cloud_state to authenticated;
grant select, insert, update, delete on public.finance_cloud_devices to authenticated;
revoke update, delete on public.finance_payment_operations from authenticated;
grant select, insert on public.finance_payment_operations to authenticated;
grant usage, select on sequence public.finance_payment_operations_id_seq to authenticated;

drop policy if exists "finance state select own" on public.finance_cloud_state;
create policy "finance state select own"
on public.finance_cloud_state for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "finance state insert own" on public.finance_cloud_state;
create policy "finance state insert own"
on public.finance_cloud_state for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "finance state update own" on public.finance_cloud_state;
create policy "finance state update own"
on public.finance_cloud_state for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "finance state delete own" on public.finance_cloud_state;
create policy "finance state delete own"
on public.finance_cloud_state for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "finance devices select own" on public.finance_cloud_devices;
create policy "finance devices select own"
on public.finance_cloud_devices for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "finance devices insert own" on public.finance_cloud_devices;
create policy "finance devices insert own"
on public.finance_cloud_devices for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "finance devices update own" on public.finance_cloud_devices;
create policy "finance devices update own"
on public.finance_cloud_devices for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "finance devices delete own" on public.finance_cloud_devices;
create policy "finance devices delete own"
on public.finance_cloud_devices for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "finance operations select own" on public.finance_payment_operations;
create policy "finance operations select own"
on public.finance_payment_operations for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "finance operations insert own" on public.finance_payment_operations;
create policy "finance operations insert own"
on public.finance_payment_operations for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "finance operations update own" on public.finance_payment_operations;
drop policy if exists "finance operations delete own" on public.finance_payment_operations;

comment on table public.finance_payment_operations is
  'Append-only payment-operation audit rows. Authenticated clients may select and insert their own rows but cannot update or delete them.';
