-- MoMo collections (PawaPay deposits). Fiat in to the PawaPay float
-- Not on-chain USDT matching (chain_deposits) and not offramp payment_intents

create table public.deposit_collections (
  id uuid primary key default gen_random_uuid(),
  deposit_id uuid not null unique,
  label text
    check (label is null or char_length(label) between 1 and 80),
  country text not null
    check (country ~ '^[A-Z]{3}$'),
  currency text not null
    check (currency ~ '^[A-Z]{3}$'),
  provider text not null
    check (provider ~ '^[A-Z0-9_]{3,64}$'),
  msisdn text not null
    check (msisdn ~ '^[0-9]{10,15}$'),
  amount numeric(18, 6) not null
    check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'enqueued', 'successful', 'failed')),
  provider_ref text,
  provider_reason text,
  created_by text not null
    check (created_by ~ '^0x[a-f0-9]{40}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger deposit_collections_set_updated_at
before update on public.deposit_collections
for each row
execute function public.set_updated_at();

create index deposit_collections_created_idx
on public.deposit_collections (created_at desc);

create index deposit_collections_status_idx
on public.deposit_collections (status, created_at desc);

alter table public.deposit_collections enable row level security;

create policy deposit_collections_select_admin
on public.deposit_collections
for select
to authenticated
using (public.is_admin());
