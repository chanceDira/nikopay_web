-- FX rates become corridor-currency aware (USDT → local).
-- Column usdt_to_rwf keeps its name as the USDT→local rate for any currency.

alter table public.fx_rates
  add column if not exists currency text;

update public.fx_rates
set currency = 'RWF'
where currency is null;

alter table public.fx_rates
  alter column currency set default 'RWF',
  alter column currency set not null,
  drop constraint if exists fx_rates_currency_check,
  add constraint fx_rates_currency_check
    check (currency ~ '^[A-Z]{3}$');

create index if not exists fx_rates_currency_effective_from_idx
on public.fx_rates (currency, effective_from desc);
