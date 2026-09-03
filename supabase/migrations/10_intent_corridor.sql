-- Corridor fields on payment intents (PawaPay-ready, Rwanda first)
-- Country / currency / provider are stored at intent create so payout
-- uses the user-confirmed corridor instead of hardcoding MTN

alter table public.payment_intents
  add column if not exists country text
    check (country is null or country ~ '^[A-Z]{3}$'),
  add column if not exists currency text
    check (currency is null or currency ~ '^[A-Z]{3}$'),
  add column if not exists provider text
    check (provider is null or provider ~ '^[A-Z0-9_]{3,64}$');

update public.payment_intents
set
  country = coalesce(country, 'RWA'),
  currency = coalesce(currency, 'RWF'),
  provider = coalesce(provider, 'MTN_MOMO_RWA')
where country is null
   or currency is null
   or provider is null;

alter table public.payment_intents
  alter column country set not null,
  alter column currency set not null,
  alter column provider set not null;
