-- Base Sepolia NikoPay test USDT

update public.tokens
set
  contract_address = '0x976691A612095Be4C84f255732cCf14f19800479',
  decimals = 6,
  is_active = true
where chain_id = 'base'
  and symbol = 'USDT';

delete from public.chain_sync
where chain_id = 'base';
