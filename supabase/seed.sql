-- Seed reference data for local/dev

insert into public.chains (id, name, is_testnet, is_active, confirm_blocks)
values
  ('polygon', 'Polygon Amoy', true, true, 1),
  ('base', 'Base Sepolia', true, true, 1)
on conflict (id) do nothing;

insert into public.fx_rates (usdt_to_rwf, fee_percent, min_usdt, effective_from)
values (1450.000000, 1.5000, 5.00000000, timezone('utc', now()));

-- Placeholder USDT contracts (replace with P3 addresses)
insert into public.tokens (chain_id, symbol, contract_address, decimals, is_active)
values
  (
    'polygon',
    'USDT',
    '0x0000000000000000000000000000000000000001',
    6,
    true
  ),
  (
    'base',
    'USDT',
    '0x0000000000000000000000000000000000000002',
    6,
    true
  )
on conflict (chain_id, symbol) do nothing;

insert into public.treasury_wallets (chain_id, token_id, address, label, is_active)
select
  t.chain_id,
  t.id,
  '0x0dfdb5bbaeece3871f826df1c6fe24a2772f5d38',
  'testnet receive',
  true
from public.tokens t
where t.symbol = 'USDT'
on conflict (chain_id, token_id, address) do nothing;
