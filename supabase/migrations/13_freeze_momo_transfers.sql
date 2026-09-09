-- Freeze historical MTN MoMo rail. Live ops use payout_transfers.
-- Do not drop this table until a backup is confirmed.

comment on table public.momo_transfers is
  'Frozen historical MTN MoMo rail. Live ops use payout_transfers. Do not write.';

comment on column public.payment_intents.momo_ref is
  'Payout reference (provider_ref or payout_id). Column name kept as an alias.';

revoke insert, update, delete on public.momo_transfers from anon, authenticated;

create or replace function public.reject_momo_transfer_writes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'momo_transfers is frozen; use payout_transfers';
end;
$$;

create trigger momo_transfers_freeze_write
before insert or update or delete on public.momo_transfers
for each row
execute function public.reject_momo_transfer_writes();
