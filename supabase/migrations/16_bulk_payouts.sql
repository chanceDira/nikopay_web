-- Ops bulk payouts from the PawaPay float. Not USDT collection
-- Each item is a payout_transfers row with payout_id set before POST /v2/payouts/bulk

create table public.bulk_payout_batches (
  id uuid primary key default gen_random_uuid(),
  label text
    check (label is null or char_length(label) between 1 and 80),
  country text not null
    check (country ~ '^[A-Z]{3}$'),
  currency text not null
    check (currency ~ '^[A-Z]{3}$'),
  provider text not null
    check (provider ~ '^[A-Z0-9_]{3,64}$'),
  created_by text not null
    check (created_by ~ '^0x[a-f0-9]{40}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger bulk_payout_batches_set_updated_at
before update on public.bulk_payout_batches
for each row
execute function public.set_updated_at();

create index bulk_payout_batches_created_idx
on public.bulk_payout_batches (created_at desc);

alter table public.payout_transfers
  alter column intent_id drop not null;

alter table public.payout_transfers
  add column if not exists batch_id uuid
    references public.bulk_payout_batches (id) on delete restrict;

alter table public.payout_transfers
  add constraint payout_transfers_intent_xor_batch
  check (
    (intent_id is not null and batch_id is null)
    or (intent_id is null and batch_id is not null)
  );

create index payout_transfers_batch_idx
on public.payout_transfers (batch_id, created_at)
where batch_id is not null;

alter table public.bulk_payout_batches enable row level security;

create policy bulk_payout_batches_select_admin
on public.bulk_payout_batches
for select
to authenticated
using (public.is_admin());
