-- Per-corridor rail fees for recipient-first quotes:
-- T = X + Y + P + Q, then USDT = T / rate.
-- Y = pawapay_percent of X, P = mno_fixed in local currency.
-- Q (NikoPay) stays on fx_rates.fee_percent.

create table public.corridor_fee_schedules (
  id uuid primary key default gen_random_uuid(),
  country text not null
    check (country ~ '^[A-Z]{3}$'),
  currency text not null
    check (currency ~ '^[A-Z]{3}$'),
  provider text
    check (provider is null or provider ~ '^[A-Z0-9_]{3,64}$'),
  pawapay_percent numeric(8, 4) not null default 1
    check (pawapay_percent >= 0 and pawapay_percent < 100),
  mno_fixed numeric(18, 2) not null default 0
    check (mno_fixed >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index corridor_fee_schedules_match_idx
on public.corridor_fee_schedules (country, currency, coalesce(provider, ''));

create trigger corridor_fee_schedules_set_updated_at
before update on public.corridor_fee_schedules
for each row
execute function public.set_updated_at();

alter table public.corridor_fee_schedules enable row level security;

create policy corridor_fee_schedules_select_admin
on public.corridor_fee_schedules
for select
to authenticated
using (public.is_admin());

insert into public.corridor_fee_schedules
  (country, currency, provider, pawapay_percent, mno_fixed)
values
  ('RWA', 'RWF', 'MTN_MOMO_RWA', 1, 60),
  ('RWA', 'RWF', 'AIRTEL_RWA', 1, 0),
  ('RWA', 'RWF', null, 1, 0),
  ('GHA', 'GHS', null, 1, 0);

alter table public.payment_intents
  add column if not exists pawapay_fee_local numeric(18, 2),
  add column if not exists mno_fee_local numeric(18, 2),
  add column if not exists nikopay_fee_local numeric(18, 2),
  add column if not exists gross_local numeric(18, 2),
  add column if not exists pawapay_percent numeric(8, 4);
