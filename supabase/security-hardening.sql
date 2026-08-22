-- Talaan · Legacy cloud security hardening migration
-- Run once after the original schema and policy files.

begin;

alter table public.finance_cloud_state enable row level security;
alter table public.finance_cloud_devices enable row level security;
alter table public.finance_payment_operations enable row level security;

alter table public.finance_cloud_state force row level security;
alter table public.finance_cloud_devices force row level security;
alter table public.finance_payment_operations force row level security;

revoke all on public.finance_cloud_state from anon;
revoke all on public.finance_cloud_devices from anon;
revoke all on public.finance_payment_operations from anon;

revoke update, delete on public.finance_payment_operations from authenticated;
grant select, insert on public.finance_payment_operations to authenticated;

drop policy if exists "finance operations update own" on public.finance_payment_operations;
drop policy if exists "finance operations delete own" on public.finance_payment_operations;

comment on table public.finance_payment_operations is
  'Append-only payment-operation audit rows. Authenticated clients may select and insert their own rows but cannot update or delete them.';

commit;
