-- Shareable single-use offramp checkout links
-- Payer still sends USDT on-chain. Not PawaPay hosted checkout (that is collections)

create table public.checkout_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique
    check (token ~ '^[A-Za-z0-9_-]{24,48}$'),
  label text
    check (label is null or char_length(label) between 1 and 80),
  usdt_amount numeric(18, 6) not null
    check (usdt_amount > 0),
  country text not null
    check (country ~ '^[A-Z]{3}$'),
  currency text not null
    check (currency ~ '^[A-Z]{3}$'),
  provider text not null
    check (provider ~ '^[A-Z0-9_]{3,64}$'),
  msisdn text not null
    check (msisdn ~ '^[0-9]{10,15}$'),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by text not null
    check (created_by ~ '^0x[a-f0-9]{40}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger checkout_links_set_updated_at
before update on public.checkout_links
for each row
execute function public.set_updated_at();

create index checkout_links_created_idx
on public.checkout_links (created_at desc);

alter table public.payment_intents
  add column if not exists checkout_id uuid
    references public.checkout_links (id) on delete set null;

create unique index payment_intents_one_per_checkout
on public.payment_intents (checkout_id)
where checkout_id is not null;

alter table public.checkout_links enable row level security;

create policy checkout_links_select_admin
on public.checkout_links
for select
to authenticated
using (public.is_admin());
