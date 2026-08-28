-- PawaPay payout attempts. Does not replace momo_transfers yet.

create table public.payout_transfers (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.payment_intents (id) on delete restrict,
  payout_id uuid not null unique,
  country text not null
    check (country ~ '^[A-Z]{3}$'),
  currency text not null
    check (currency ~ '^[A-Z]{3}$'),
  provider text not null
    check (provider ~ '^[A-Z0-9_]{3,64}$'),
  msisdn text not null
    check (msisdn ~ '^[0-9]{10,15}$'),
  amount numeric(18, 2) not null
    check (amount > 0),
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'enqueued',
        'successful',
        'failed'
      )
    ),
  provider_ref text,
  provider_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger payout_transfers_set_updated_at
before update on public.payout_transfers
for each row
execute function public.set_updated_at();

create index payout_transfers_intent_idx
on public.payout_transfers (intent_id, created_at desc);

create index payout_transfers_open_idx
on public.payout_transfers (created_at)
where status in ('pending', 'enqueued');

create unique index payout_transfers_one_open_per_intent
on public.payout_transfers (intent_id)
where status <> 'failed';

alter table public.payout_transfers enable row level security;

create policy payout_transfers_select_own
on public.payout_transfers
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.payment_intents pi
    where pi.id = payout_transfers.intent_id
      and pi.user_id = auth.uid()
  )
);
