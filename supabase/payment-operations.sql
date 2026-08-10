-- My Finance Records V12.19.1 · Payment-operation safeguards
-- The unique constraint makes retries idempotent for each expense in a payment or restore operation.

alter table public.finance_payment_operations
  drop constraint if exists finance_payment_operations_once;

alter table public.finance_payment_operations
  add constraint finance_payment_operations_once
  unique (user_id, operation_id, expense_id, operation_type);

create index if not exists finance_payment_operations_transaction_idx
  on public.finance_payment_operations(user_id, operation_id, operation_type);

comment on table public.finance_payment_operations is
  'Idempotent audit log for Mark Paid, Gym month-end auto-pay, and Move to Unpaid restoration operations.';
