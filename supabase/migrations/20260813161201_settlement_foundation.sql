-- Settlement foundation: core tables, RLS, and auth profile hook.
-- Aligns with lib/settlement PaymentStatus / ChainId.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

create or replace function public.current_user_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select auth.uid();
$$;

-- user profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  preferred_msisdn text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

--  chains, tokens && treasury
create table public.chains (
  id text primary key
    check (id in ('polygon', 'base')),
  name text not null,
  is_testnet boolean not null default true,
  is_active boolean not null default true,
  confirm_blocks integer not null default 1
    check (confirm_blocks >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.tokens (
  id uuid primary key default gen_random_uuid(),
  chain_id text not null references public.chains (id),
  symbol text not null,
  contract_address text not null
    check (contract_address ~ '^0x[a-fA-F0-9]{40}$'),
  decimals integer not null default 6
    check (decimals >= 0 and decimals <= 36),
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (chain_id, contract_address),
  unique (chain_id, symbol)
);

create table public.treasury_wallets (
  id uuid primary key default gen_random_uuid(),
  chain_id text not null references public.chains (id),
  token_id uuid not null references public.tokens (id),
  address text not null
    check (address ~ '^0x[a-fA-F0-9]{40}$'),
  label text,
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (chain_id, token_id, address)
);

create trigger treasury_wallets_set_updated_at
before update on public.treasury_wallets
for each row
execute function public.set_updated_at();

-- One active receive wallet per chain+token.
create unique index treasury_wallets_one_active_per_token
on public.treasury_wallets (chain_id, token_id)
where is_active;

-- FX
create table public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  usdt_to_rwf numeric(18, 6) not null
    check (usdt_to_rwf > 0),
  fee_percent numeric(8, 4) not null
    check (fee_percent >= 0),
  min_usdt numeric(18, 8) not null
    check (min_usdt > 0),
  effective_from timestamptz not null default timezone('utc', now()),
  effective_to timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (
    effective_to is null
    or effective_to > effective_from
  )
);

create index fx_rates_effective_from_idx
on public.fx_rates (effective_from desc);

-- Payment intents
create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  status text not null default 'awaiting_payment'
    check (
      status in (
        'awaiting_payment',
        'detected',
        'credited',
        'payout_pending',
        'paid',
        'failed',
        'expired',
        'manual_review'
      )
    ),
  chain_id text not null references public.chains (id),
  msisdn text not null
    check (msisdn ~ '^[0-9]{10,15}$'),
  usdt_amount numeric(18, 8) not null
    check (usdt_amount > 0),
  rate numeric(18, 6) not null
    check (rate > 0),
  fee_percent numeric(8, 4) not null
    check (fee_percent >= 0),
  fee_rwf numeric(18, 2) not null
    check (fee_rwf >= 0),
  net_rwf numeric(18, 2) not null
    check (net_rwf >= 0),
  treasury_address text not null
    check (treasury_address ~ '^0x[a-fA-F0-9]{40}$'),
  expires_at timestamptz not null,
  deposit_tx text,
  momo_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger payment_intents_set_updated_at
before update on public.payment_intents
for each row
execute function public.set_updated_at();

create index payment_intents_user_created_idx
on public.payment_intents (user_id, created_at desc);

create index payment_intents_status_idx
on public.payment_intents (status);

create index payment_intents_open_match_idx
on public.payment_intents (chain_id, status, usdt_amount)
where status = 'awaiting_payment';

-- Deposits and momo transfers
create table public.chain_deposits (
  id uuid primary key default gen_random_uuid(),
  chain_id text not null references public.chains (id),
  tx_hash text not null
    check (tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
  log_index integer not null
    check (log_index >= 0),
  from_address text not null
    check (from_address ~ '^0x[a-fA-F0-9]{40}$'),
  to_address text not null
    check (to_address ~ '^0x[a-fA-F0-9]{40}$'),
  token_address text not null
    check (token_address ~ '^0x[a-fA-F0-9]{40}$'),
  amount numeric(36, 18) not null
    check (amount > 0),
  block_number bigint not null
    check (block_number >= 0),
  observed_at timestamptz not null default timezone('utc', now()),
  unique (chain_id, tx_hash, log_index)
);

create table public.intent_deposits (
  intent_id uuid not null references public.payment_intents (id) on delete cascade,
  deposit_id uuid not null references public.chain_deposits (id) on delete cascade,
  matched_at timestamptz not null default timezone('utc', now()),
  primary key (intent_id, deposit_id),
  unique (deposit_id)
);

create table public.momo_transfers (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.payment_intents (id) on delete restrict,
  reference_id uuid not null unique,
  amount_rwf numeric(18, 2) not null
    check (amount_rwf > 0),
  msisdn text not null
    check (msisdn ~ '^[0-9]{10,15}$'),
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'successful',
        'failed',
        'timeout'
      )
    ),
  provider_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger momo_transfers_set_updated_at
before update on public.momo_transfers
for each row
execute function public.set_updated_at();

create index momo_transfers_intent_idx
on public.momo_transfers (intent_id, created_at desc);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (email)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.chains enable row level security;
alter table public.tokens enable row level security;
alter table public.treasury_wallets enable row level security;
alter table public.fx_rates enable row level security;
alter table public.payment_intents enable row level security;
alter table public.chain_deposits enable row level security;
alter table public.intent_deposits enable row level security;
alter table public.momo_transfers enable row level security;
alter table public.waitlist_entries enable row level security;

-- profiles
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- reference data: readable by authenticated users; 
create policy chains_select_authenticated
on public.chains
for select
to authenticated
using (true);

create policy tokens_select_active_or_admin
on public.tokens
for select
to authenticated
using (is_active or public.is_admin());

create policy treasury_wallets_select_active_or_admin
on public.treasury_wallets
for select
to authenticated
using (is_active or public.is_admin());

create policy fx_rates_select_authenticated
on public.fx_rates
for select
to authenticated
using (true);

-- payment intents: owner read/create;
create policy payment_intents_select_own
on public.payment_intents
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy payment_intents_insert_own
on public.payment_intents
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'awaiting_payment'
);

-- deposits / momo: no direct client writes;
create policy chain_deposits_select_via_intent
on public.chain_deposits
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.intent_deposits id
    join public.payment_intents pi on pi.id = id.intent_id
    where id.deposit_id = chain_deposits.id
      and pi.user_id = auth.uid()
  )
);

create policy intent_deposits_select_own
on public.intent_deposits
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.payment_intents pi
    where pi.id = intent_deposits.intent_id
      and pi.user_id = auth.uid()
  )
);

create policy momo_transfers_select_own
on public.momo_transfers
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.payment_intents pi
    where pi.id = momo_transfers.intent_id
      and pi.user_id = auth.uid()
  )
);

-- waitlist: public insert via anon; no public read
create policy waitlist_entries_insert_anon
on public.waitlist_entries
for insert
to anon, authenticated
with check (true);

create policy waitlist_entries_select_admin
on public.waitlist_entries
for select
to authenticated
using (public.is_admin());
