-- MoMo → MoMo remittances via PawaPay. Separate from offramp and collections.
-- Sender / recipient KYC payloads stored as jsonb (validated at API boundary).

create table public.remittances (
  id uuid primary key default gen_random_uuid(),
  remittance_id uuid not null unique,
  label text
    check (label is null or char_length(label) between 1 and 80),
  amount numeric(18, 6) not null
    check (amount > 0),
  currency text not null
    check (currency ~ '^[A-Z]{3}$'),
  recipient_country text not null
    check (recipient_country ~ '^[A-Z]{3}$'),
  recipient_provider text not null
    check (recipient_provider ~ '^[A-Z0-9_]{3,64}$'),
  recipient_msisdn text not null
    check (recipient_msisdn ~ '^[0-9]{10,15}$'),
  recipient_details jsonb not null,
  sender_details jsonb not null,
  transaction_details jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'enqueued', 'successful', 'failed')),
  provider_ref text,
  provider_reason text,
  created_by text not null
    check (created_by ~ '^0x[a-f0-9]{40}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger remittances_set_updated_at
before update on public.remittances
for each row
execute function public.set_updated_at();

create index remittances_created_idx
on public.remittances (created_at desc);

create index remittances_status_idx
on public.remittances (status, created_at desc);

alter table public.remittances enable row level security;

create policy remittances_select_admin
on public.remittances
for select
to authenticated
using (public.is_admin());
